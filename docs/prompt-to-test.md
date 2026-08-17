# From prompt to passing test

One scenario, end to end, including the part that is usually left out.

## The 60-second version

- Claude generated four Playwright scenarios and said they looked correct.
- Three failed on their first run; lint identified only part of the problem.
- One sorting test could also pass with a single product while proving no order.
- I replaced the race with a polled invariant and added a precondition that makes
  a meaningless ordering assertion fail loudly.

The raw generator output is commit `02ddf74`; the reviewed version is `52d9baf`.
The rest of this page shows the evidence.

I picked the sorting test for this walkthrough because it failed in two different
ways: one that tooling caught, and one that no tool could have caught. The gap
between those two is the whole job.

## 1. The prompt

The planner had already produced `specs/product-catalog.md` — 28 scenarios, from a
single prompt, committed unedited in `915a44b`. I picked four of them and asked
the generator for exactly those:

```
Generate Playwright tests for EXACTLY these four scenarios from
specs/product-catalog.md, and no others:

- 1.2. Navigating between pages updates the product set without duplicates
- 2.3. Searching for a term with no matches shows an explicit empty state
- 3.2. Sorting by Price (Low-High) and (High-Low) orders products numerically
- 5.2. Checking a parent category auto-selects all of its subcategories

Place them under tests/ui/. Read tests/seed.spec.ts first — it records two
constraints about this application that apply to everything you write.
```

Run as `claude -p "…" --agent playwright-test-generator`. I deliberately did *not*
mention the lint rules, because I wanted to see what an unsupervised agent
produces, not what it produces when warned.

## 2. What came back

Committed raw in `02ddf74`. Here is the sorting test as generated:

```ts
const parsePrices = async () =>
	( await prices.allTextContents() ).map( text => parseFloat( text.replace( /[^0-9.]/g, '' ) ) );

// 1. Select 'Price (Low - High)' from the Sort dropdown.
await sort.selectOption( 'Price (Low - High)' );
const lowToHigh = await parsePrices();
for ( let i = 1; i < lowToHigh.length; i++ ) {
	expect( lowToHigh[ i ] ).toBeGreaterThanOrEqual( lowToHigh[ i - 1 ] );
}
expect( lowToHigh[ 0 ] ).toBe( Math.min( ...lowToHigh ) );
```

The agent's own closing summary said: *"All four files look correct."*

Three of the four failed on the first run.

## 3. What was wrong

### Failure one — a race. The tooling found this.

`selectOption` triggers a re-fetch and re-render. `allTextContents()` is a
one-shot read that happens immediately, so it can read the grid as it was before
sorting — or before it has any rows at all. The actual failure:

```
Error: expect(received).toBe(expected)
Expected: Infinity
Received: undefined

  > 21 |   expect( lowToHigh[ 0 ] ).toBe( Math.min( ...lowToHigh ) );
```

`undefined` because the array was empty. `Infinity` because that is what
`Math.min()` returns with no arguments.

`pnpm lint` flagged this shape via `playwright/prefer-web-first-assertions` — in
two of the three files where it occurred. In the third
(`category-brand-filters.spec.ts`) the same bug was written as
`expect( names.length ).toBeGreaterThan( 0 )`, which does not match the rule's
pattern, so it went through silently. **The rules narrowed the problem down. They
did not close it.**

### Failure two — the test could pass while checking nothing. No tool found this.

Look again at the loop. With **one** product, `lowToHigh.length === 1`, so the
loop body never executes — and `expect( lowToHigh[ 0 ] ).toBe( Math.min( ...lowToHigh ) )`
reduces to `expect( 14.15 ).toBe( 14.15 )`. Green. Nothing about ordering was
checked.

There is no lint rule for this and there should not be: the code is entirely
ordinary. `expect-expect` is satisfied — there are assertions. They just cannot
fail. Catching it means asking the only question that matters about a generated
test: *under what conditions does this pass?*

### And two bugs of mine, surfaced by the same review

- The seed test I wrote to teach the agent reseed-safe locators used
  `[data-test^="product-"]`. That prefix also matches `product-name` and
  `product-price`, so a page of 9 products counts as 27 cards. The generator
  copied my pattern faithfully. My bug, propagated by the agent.
- Fixing the filter test, I unchecked a box through the live `:checked` locator.
  The moment it is unchecked it leaves that set, so `.nth( 1 )` then points at a
  *different*, still-checked box, and the assertion failed against the wrong
  element.

## 4. The fix

```ts
// Precondition, asserted once and loudly — an ordering claim over fewer than two
// values is vacuous, and should fail here rather than pass quietly later.
expect(
	( await pricesOnPage() ).length,
	'an ordering assertion is meaningless with fewer than two prices'
).toBeGreaterThanOrEqual( 2 );

await sort.selectOption( 'Price (Low - High)' );
await expect
	.poll( async () => isAscending( await pricesOnPage() ), {
		message: 'prices should settle into ascending order'
	} )
	.toBe( true );
```

Polling replaces the race: it retries until the grid settles. The separate
precondition removes the vacuous-pass. And `isAscending` lives in
`tests/ui/support/catalog.ts` rather than in the test body, because
`playwright/no-conditional-in-test` rejects the `&&`/`||` inside it — the
guardrail caught me as well as the generator, and it was right to.

## 5. Green

```
✓ tests/ui/grid-browsing.spec.ts          Navigating between pages … without duplicates
✓ tests/ui/search.spec.ts                 … no matches shows an explicit empty state
✓ tests/ui/sorting.spec.ts                Sorting by Price … orders products numerically
✓ tests/ui/category-brand-filters.spec.ts Checking a parent category auto-selects …
✓ tests/seed.spec.ts                      seed: storefront lists products

5 passed
```

The full review is `git diff 02ddf74 52d9baf`.

## What I take from this

The generator is genuinely good at the mechanical part: it found the right
locators, respected `data-test` over `data-testid`, and picked up the ULID-prefix
trick from my seed test without being told twice. It is not good at knowing
whether its test can fail. It reported "all four files look correct" about a set
where three could not pass.

So the useful division of labour is not "the agent writes tests and I approve
them". It is: the agent writes the mechanics, lint catches the mechanical
failures, and the one question left for a human is the one neither of them can
answer — *when does this test pass, and is that the same thing as the feature
working?*
