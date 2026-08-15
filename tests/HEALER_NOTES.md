# Healer notes

## Verdict: test bug (stale selector)

## What was broken

25 tests total. Before the fix, 5 were red:

- `ui/search.spec.ts` › "Searching for a term with no matches shows an
  explicit empty state" — timed out after 30s waiting on
  `page.getByTestId('search-input')`.
- 4 tests under the `api-buggy` project (`api/auth.spec.ts`,
  `api/brands.spec.ts`, `api/products.spec.ts` ×2).

## What I changed

Only `tests/ui/search.spec.ts`, one line:

```diff
- await page.getByTestId( 'search-input' ).fill( searchTerm );
+ await page.getByTestId( 'search-query' ).fill( searchTerm );
```

The search box's `data-test` attribute on the live site is
`search-query`; there is no element carrying `search-input`. I
confirmed this by inspecting the live DOM (`document.querySelectorAll
('[data-test]')` on `https://practicesoftwaretesting.com/`), which
lists `search-query`, `search-reset`, `search-submit`,
`search-caption`, `search-term`, `search-result-count`, `no-results`,
etc. Every other selector already used by the test
(`search-submit`, `search-caption`, `no-results`, and the
`cards`/`pageButtons` locators from `tests/ui/support/catalog.ts`)
matched the live markup and its rendered text exactly
("Searched for: zzzznoresultsxyz123" / "There are no products
found."), so no other line needed touching. This is a plain stale
locator — a prior rename of the input's test id — not a timing issue,
so no waits were added and no assertions were weakened.

Verified: `ui/search.spec.ts` now passes on its own and as part of the
full run.

## The 4 `api-buggy` failures — not touched, and shouldn't be

These are **expected** failures, not something to heal. Per
`playwright.config.ts` and `scripts/assert-bugs-caught.ts`, the
`api-buggy` project deliberately runs the exact same
`tests/api/**/*.spec.ts` code against
`api-with-bugs.practicesoftwaretesting.com`, a build with catalogued
defects. `assert-bugs-caught.ts` asserts the suite fails *exactly* at
these four titles:

- `GET /invoices refuses to serve invoices to an anonymous caller`
  (authz bypass: anonymous request returns 200 with other customers'
  invoices instead of 401)
- `GET /brands returns ULID identifiers, not sequential integers`
  (integer ids / placeholder names instead of ULIDs)
- `GET /products returns a self-consistent page envelope` (integer
  product ids instead of ULIDs)
- `GET /products/{unknown id} returns 404, not an empty 200` (id
  coercion resolves a malformed id to the wrong product instead of
  404)

The run after my fix reproduces precisely these four failures on
`api-buggy` and nothing else — i.e. the suite is catching every known
defect and raising no new ones. Weakening any of these assertions
would defeat the purpose of the `api-buggy` project (and is exactly
what the guardrails/`assert-bugs-caught.ts` script is designed to
catch: "the suite stopped detecting a known defect"). I left
`tests/api/*.spec.ts` untouched.

## What a reviewer should check by hand

- Confirm `search-query` really is the intended, stable `data-test`
  name for the search input (vs. `search-input` being a rename that
  should instead have been applied to the app). I only have access to
  the deployed site, not its source, so I verified against the live
  DOM rather than a component template.
- Re-run the `tests` workflow and confirm the `api-buggy` job still
  ends with exactly the 4 catalogued failures above; if
  `assert-bugs-caught.ts` goes green with 0 failures or fails somewhere
  else, that's a product change upstream, not something to fix here.
