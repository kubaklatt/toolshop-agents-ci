# From prompt to passing test

One scenario from prompt to a test that can fail meaningfully.

## The 60-second version

- Claude generated four Playwright scenarios and said they looked correct.
- Three failed on their first run; lint identified only part of the problem.
- One sorting test could also pass with a single product while proving no order.
- I replaced the race with a polled invariant and added explicit preconditions.

The [raw generator output](https://github.com/kubaklatt/toolshop-agents-ci/commit/02ddf74)
and [initial review diff](https://github.com/kubaklatt/toolshop-agents-ci/compare/02ddf74...52d9baf)
preserve both stages.

The sorting test is useful because tooling caught its race, but not its
meaningless assertion.

## 1. The prompt

The planner produced 28 scenarios in `specs/product-catalog.md`, committed
unedited in `915a44b`. I selected four and asked the generator for exactly those:

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

Run as `claude -p "…" --agent playwright-test-generator`. The prompt did not
mention lint rules, so they remained an independent check.

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

The agent reported *"All four files look correct."* Three failed on the first run.

## 3. What was wrong

### Failure one — a race. The tooling found this.

`selectOption` triggers a re-render. The immediate `allTextContents()` read can
capture the old grid or an empty transition state. The actual failure:

```
Error: expect(received).toBe(expected)
Expected: Infinity
Received: undefined

  > 21 |   expect( lowToHigh[ 0 ] ).toBe( Math.min( ...lowToHigh ) );
```

The empty array produced both `undefined` and `Math.min() === Infinity`.

`pnpm lint` flagged this shape via `playwright/prefer-web-first-assertions` in two
files. A similar one-shot read in `category-brand-filters.spec.ts` did not match
the rule, showing that lint narrows review but does not replace it.

### Failure two — the test could pass while checking nothing. No tool found this.

With one product the loop never executes, while the final assertion reduces to
`expect( 14.15 ).toBe( 14.15 )`. The test passes without checking order.

The code contains assertions, so `expect-expect` is satisfied. Review still has
to ask: *under what conditions does this pass?*

### A seed bug propagated into generated code

The seed used `[data-test^="product-"]`, which also matches `product-name` and
`product-price`; nine products were counted as 27 elements. The generator copied
that pattern. Scoping it to `a[data-test^="product-"]` fixed the source and tests.

## 4. The fix

```ts
const initialPrices = await pricesOnPage();
expect( initialPrices.length ).toBeGreaterThanOrEqual( 2 );
expect( new Set( initialPrices ).size ).toBeGreaterThanOrEqual( 2 );

// Establish a known order, then prove both transitions.
await sort.selectOption( 'Price (High - Low)' );
await expect.poll( async () => isDescending( await pricesOnPage() ) ).toBe( true );

await sort.selectOption( 'Price (Low - High)' );
await expect
	.poll( async () => isAscending( await pricesOnPage() ), {
		message: 'prices should settle into ascending order'
	} )
	.toBe( true );

const lowToHigh = await pricesOnPage();
await sort.selectOption( 'Price (High - Low)' );
await expect.poll( async () => isDescending( await pricesOnPage() ) ).toBe( true );
expect( await pricesOnPage() ).not.toEqual( lowToHigh );
```

Polling waits for the grid to settle. The preconditions prevent a vacuous pass,
and two transitions prove both sort directions change the result. The order
predicates live in `tests/ui/support/catalog.ts` because conditional logic is
blocked in test bodies.

## 5. Green

```
✓ tests/ui/grid-browsing.spec.ts          Navigating between pages … without duplicates
✓ tests/ui/search.spec.ts                 … no matches shows an explicit empty state
✓ tests/ui/sorting.spec.ts                Sorting by Price … orders products numerically
✓ tests/ui/category-brand-filters.spec.ts Checking a parent category auto-selects …
✓ tests/seed.spec.ts                      seed: storefront lists products

5 passed
```

The original review is `git diff 02ddf74 52d9baf`; the current test also includes
the stronger two-transition check above.

## What I take from this

The generator handled locators and test mechanics well, while lint caught common
mechanical failures. Neither established whether every assertion was meaningful.
That remained the reviewer's responsibility: *does this test pass only when the
feature works?*
