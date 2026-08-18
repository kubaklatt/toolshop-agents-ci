---
name: review-agent-test
description: Review generated Playwright tests for meaningful failures before commit
---

# Reviewing a test an agent wrote

Use this checklist to distinguish a working feature from a test that cannot fail.

## 1. Make it fail

Break the behaviour under test and confirm the test goes red. Change the expected
value, disable the behaviour or point the suite at a broken build. If it stays
green, stop and fix the assertion.

`pnpm bug-hunt` automates this for the API suite. For UI tests, verify it manually
at least once; temporarily inverting the assertion is a quick alternative.

## 2. Does it assert on state, or on its own actions?

Assert the resulting product state, not merely that an interaction completed.

```ts
// asserts nothing about the product: clicking always "works"
await page.getByTestId( 'add-to-cart' ).click();
await expect( page.getByTestId( 'add-to-cart' ) ).toBeVisible();

// asserts the outcome
await page.getByTestId( 'add-to-cart' ).click();
await expect( page.getByTestId( 'cart-quantity' ) ).toHaveText( '1' );
```

Ask whether removing the feature would make the test fail.

## 3. Can the assertion fail at all?

Watch for:

- No `expect` — the test passes by reaching the end.
- `expect( await locator.count() ).toBeGreaterThanOrEqual( 0 )` and friends —
  true for every possible state.
- The assertion inside `if`, `try`, or a `.catch()`, so the branch never runs.
- `expect( true ).toBe( true )` or an equivalent tautology.
- A soft assertion with nothing checking the result afterwards.

## 4. Locators: will they survive next week?

- Product, category and brand ids contain ULIDs that change on reseed. Match the
  prefix or use an accessible locator instead of hardcoding the full id.
- Prefer `getByRole`, `getByLabel` and `getByTestId` over CSS or XPath. Toolshop
  uses `data-test`; `playwright.config.ts` maps it through `testIdAttribute`.
- `.first()` or `.nth(0)` on an unscoped locator asserts about "whichever element
  came back first". Scope the parent instead.
- Avoid translated text when a stable semantic locator exists.

## 5. Waiting

- Reject `waitForTimeout`; wait for observable state.
- `waitUntil: 'networkidle'` never settles on this app — it hangs to timeout.
- Prefer retrying web-first assertions over checks on already-resolved values.

## 6. Isolation

- Does the test depend on data another test creates, or on running in order?
- On a shared demo, avoid fixed assertions on records the test did not create.
- Does it clean up, or does the tenth run behave differently from the first?

## 7. Did the generated diff silence something?

Check the diff, not only the final file:

- `test.skip` or `test.fixme` added, turning a visible failure into an invisible
  coverage gap.
- An assertion loosened — `toHaveText` weakened to `toContainText`, an exact
  count replaced by `toBeGreaterThan( 0 )`, a specific error replaced by a
  regex that matches anything.
- A test deleted or commented out in a commit that claims to fix it.
- Timeouts raised instead of the underlying wait being fixed.

`pnpm lint` blocks most of these. Assertion strength still requires review.

## Verdict

Return one explicit verdict:

- **Ship it** — and name the specific failure you confirmed it catches.
- **Fix first** — list what must change, with the line.
- **Delete it** — the scenario is not worth automating or cannot fail meaningfully.
