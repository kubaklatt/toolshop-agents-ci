---
name: review-agent-test
description: Review a Playwright test that an AI agent wrote or repaired, before it is committed. Use after a generator or healer agent produces or edits a test, when reviewing a PR that touches tests/, or whenever a test needs checking for whether it can actually fail.
---

# Reviewing a test an agent wrote

A generated test that passes tells you two things at once and they are easy to
confuse: the feature works, or the test cannot fail. This is the checklist for
telling them apart. Work through it in order — the first three catch most of it.

## 1. Make it fail

Before reading anything else, break the thing the test claims to check and
confirm the test goes red. Change the expected text, point it at the broken
build, comment out the feature. If it stays green, stop: nothing else about the
test matters.

In this repo that check is automated for the API suite — `pnpm bug-hunt` runs the
same tests against a deliberately broken build and fails if they *pass* there.
For a UI test, do it by hand once.

Cheap version: temporarily invert the assertion. If the inverted test also
passes, the assertion is not connected to anything.

## 2. Does it assert on state, or on its own actions?

The most common agent failure. The agent clicks something, the click succeeds, and
it asserts that the click succeeded.

```ts
// asserts nothing about the product: clicking always "works"
await page.getByTestId( 'add-to-cart' ).click();
await expect( page.getByTestId( 'add-to-cart' ) ).toBeVisible();

// asserts the outcome
await page.getByTestId( 'add-to-cart' ).click();
await expect( page.getByTestId( 'cart-quantity' ) ).toHaveText( '1' );
```

Ask: if the feature were removed entirely, would this test notice?

## 3. Can the assertion fail at all?

Watch for:

- No `expect` anywhere — the test passes by reaching the end.
- `expect( await locator.count() ).toBeGreaterThanOrEqual( 0 )` and friends —
  true for every possible state.
- The assertion inside `if`, `try`, or a `.catch()`, so the branch never runs.
- `expect( true ).toBe( true )` left behind after a rescue attempt.
- A soft assertion with nothing checking the result afterwards.

## 4. Locators: will they survive next week?

- Hardcoded ids are the trap in this app. Product, category and brand elements
  carry a ULID in the attribute — `data-test="product-01KZPDA9NK..."` — and those
  change on every database reseed. Match the prefix or use the accessible name.
- `getByRole` / `getByLabel` / `getByTestId` over CSS and XPath. Note this app
  uses `data-test`, not `data-testid`; the config sets `testIdAttribute`, and
  without it every `getByTestId` matches nothing and fails confusingly.
- `.first()` or `.nth(0)` on an unscoped locator asserts about "whichever element
  came back first". Scope the parent instead.
- A locator built from text that a translation would change, in an app with a
  language switcher.

## 5. Waiting

- Any `waitForTimeout` is a defect, not a style issue. It converts a race into a
  slow intermittent failure.
- `waitUntil: 'networkidle'` never settles on this app — it hangs to timeout.
- Prefer web-first assertions (`toBeVisible`, `toHaveText`), which retry, over a
  bare check on an already-resolved value, which does not.

## 6. Isolation

- Does the test depend on data another test creates, or on running in order?
- On a shared public demo, does it assert on records it did not create? Other
  people are mutating that database while your suite runs.
- Does it clean up, or does the tenth run behave differently from the first?

## 7. Did the agent silence something?

Check the diff, not just the file:

- `test.skip` or `test.fixme` added. Playwright's own healer agent definition is
  explicitly permitted to `test.fixme()` a test it cannot fix, so this is the
  expected failure mode, not a rare one.
- An assertion loosened — `toHaveText` weakened to `toContainText`, an exact
  count replaced by `toBeGreaterThan( 0 )`, a specific error replaced by a
  regex that matches anything.
- A test deleted or commented out in a commit that claims to fix it.
- Timeouts raised instead of the underlying wait being fixed.

`pnpm lint` blocks most of these mechanically. The loosened assertion is the one
that needs human eyes — read the diff of the assertion, not the new line alone.

## Verdict

Say one of three things, and nothing vaguer:

- **Ship it** — and name the specific failure you confirmed it catches.
- **Fix first** — list what must change, with the line.
- **Delete it** — the scenario is not worth automating, or the test cannot be
  made to fail meaningfully. This is a legitimate outcome and it is better than
  keeping a test nobody trusts.
