# Healer notes

## Verdict: test bug (selector drift)

One real fix was needed, in `tests/ui/search.spec.ts`.

### What was broken

`Searching for a term with no matches shows an explicit empty state` timed
out waiting for `page.getByTestId('search-input')`. Since this project's
`testIdAttribute` is `data-test`, that locator resolves to
`[data-test="search-input"]`.

I loaded the storefront and enumerated every `[data-test]` attribute in the
sidebar search widget. The actual input carries `data-test="search-query"`;
there is no `search-input` anywhere on the page. The submit button
(`search-submit`), the reset button (`search-reset`), the results caption
(`search-caption`) and the empty-state element (`no-results`) all match the
test's other locators exactly, so this was an isolated typo/drift in a
single selector rather than a broader rename.

I manually drove the search flow with the corrected selector
(`search-query`) and confirmed the app renders `search-caption` with
"Searched for: …", a `search-result-count` paragraph, and `no-results` with
the text "There are no products found." — exactly what the test already
asserts. No other assertions needed to change.

### Fix

`tests/ui/search.spec.ts`: `getByTestId('search-input')` →
`getByTestId('search-query')`.

Confirmed no other spec references `search-input`.

## The four `api-buggy` failures are expected, not bugs to fix

Every other failure on the initial full run was in the `api-buggy` project:

- `GET /invoices refuses to serve invoices to an anonymous caller`
- `GET /brands returns ULID identifiers, not sequential integers`
- `GET /products returns a self-consistent page envelope`
- `GET /products/{unknown id} returns 404, not an empty 200`

`playwright.config.ts` runs the exact same `api/**/*.spec.ts` test code
twice: once against `api-clean` (the real backend, all green) and once
against `api-buggy`, a deliberately broken build
(`api-with-bugs.practicesoftwaretesting.com`). `scripts/assert-bugs-caught.ts`
then asserts the `api-buggy` run failed in *exactly* these four
catalogued places (auth bypass on `/invoices`, integer ids instead of
ULIDs for brands/products, and integer-coercion on the product id path
segment returning 200 instead of 404 for a malformed id). These are
product defects in the intentionally-buggy build, verified by hand
according to that script's comments — the tests are doing their job
correctly by failing. "Fixing" them (e.g. relaxing the ULID regex or the
expected status code) would be weakening a real assertion and would make
`assert-bugs-caught.ts` fail the job anyway (it treats a newly-passing
catalogued-defect test as "the suite stopped detecting it").

I left these four untouched and did not mark anything `test.fixme`/`skip`
per the hard rules — they are supposed to be red on `api-buggy`.

## Result

Full suite: 21 passed, 4 failed (all four are the catalogued `api-buggy`
defects, matching `KNOWN_DEFECTS` in `scripts/assert-bugs-caught.ts`
exactly). `api-clean` and `ui` projects are fully green.

## What a reviewer should check by hand

- Confirm `search-query` is indeed the stable/intended data-test name for
  the search input (it matches the sibling `search-reset`/`search-submit`
  naming convention, so this looks like the correct name rather than
  another moving target).
- Confirm the four `api-buggy` failures still line up 1:1 with
  `KNOWN_DEFECTS` in `scripts/assert-bugs-caught.ts` (they do, as of this
  run) — if that script's list ever changes, these tests don't need to.
