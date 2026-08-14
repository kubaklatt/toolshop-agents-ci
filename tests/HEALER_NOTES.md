# Healer notes

## Summary

Two real bugs found and fixed, both **test bugs** (stale/incorrect assertions
in the test code, not defects in the application). Everything else that was
red is expected and must stay red — see "Not touched" below.

## Fix 1 — `tests/ui/search.spec.ts` (test bug)

**Symptom:** `Search › Searching for a term with no matches shows an explicit
empty state` timed out after 30s waiting on
`page.getByTestId('search-input')`.

**Diagnosis:** Ran the test under `test_debug` and inspected the live page
with a snapshot + `document.querySelectorAll('[data-test]')`. The sidebar
search box's real attribute is `data-test="search-query"` — there is no
`search-input` anywhere on the page. `search-submit`, `search-caption`,
`no-results`, `search-term`, `search-result-count` etc. all exist exactly as
the test expects, and the app's own test plan
(`specs/product-catalog.md`) explicitly documents `search-query` as the
stable id for this field. So the field id in the test was simply wrong (typed
by whoever generated the test, never matched the app) — a test bug, not a
selector that changed underneath us.

**Fix:** Changed `getByTestId('search-input')` to `getByTestId('search-query')`.
No behavioural assertions were touched.

**Verified:** test now passes against the real storefront.

## Fix 2 — `tests/api/support/api.ts` (test bug)

**Symptom:** `GET /brands returns ULID identifiers, not sequential integers`
failed on `api-clean` (the *working* API) with:
```
Expected pattern: /^[0-9A-HJKMNP-TV-Z]{26}$/
Received string:  "01m018nprd8p9wvz8c1zxm2j15"
```

**Diagnosis:** The received value is a syntactically valid 26-character
Crockford base32 ULID — just lower-case. Crockford base32 is explicitly
case-insensitive (a compliant consumer must accept upper, lower, or mixed
case), and this API leans on that: product and category ids come back
upper-case (verified in the UI DOM, e.g. `category-01M0182E9RDATC0F2TG4J0QYER`,
product URLs like `/product/01M0182EAWF0FPZBGD17N4P2NC`) while brand ids come
back lower-case (`brand-01m018nprd8p9wvz8c1zxm2j15`). Both are correct ULIDs;
the shared `ULID` regex in the test support module simply assumed upper-case
only, so it flagged a correct, well-formed id as broken.

**Fix:** Added the `i` flag to `ULID` in `tests/api/support/api.ts`
(`/^[0-9A-HJKMNP-TV-Z]{26}$/i`). This does not weaken what is being verified:
it still requires exactly 26 characters from the Crockford alphabet
(excluding I, L, O, U in either case) and still rejects integer ids — the
`api-buggy` variant of this same test (`brands` returning
`1, 2, 3…`/"Brand name 1") still fails afterwards, for the right reason
(`typeof brand.id` is `"number"`, not the regex). Only the case-sensitivity
assumption was relaxed, and only because the spec for what a ULID is says
case must not matter.

**Verified:** `api-clean` brands test passes; `api-buggy` brands test still
fails on the `typeof brand.id` check as before.

## Not touched — `api-buggy` project failures (expected, by design)

`playwright.config.ts` runs the same `api/**/*.spec.ts` suite twice: once
against `api-clean` (a working build) and once against `api-buggy` (a
deliberately broken build), and `scripts/assert-bugs-caught.ts` asserts that
the buggy run fails in **exactly** four cataloged places:

- `GET /invoices refuses to serve invoices to an anonymous caller` (auth
  bypass in the buggy build — anonymous callers get other customers'
  invoices)
- `GET /brands returns ULID identifiers, not sequential integers` (buggy
  build returns integer ids)
- `GET /products returns a self-consistent page envelope` (buggy build
  returns integer ids)
- `GET /products/{unknown id} returns 404, not an empty 200` (buggy build
  coerces a malformed/unknown ULID id to an integer and returns the wrong
  product instead of 404)

These four `api-buggy` failures are still present after my changes, exactly
as before, and that is correct: they are the tests doing their job against a
build that is known to be broken. Marking them `fixme`/skip, weakening their
assertions, or "fixing" them would defeat the entire point of the
`api-buggy` project and would make `assert-bugs-caught.ts` fail instead
(undetected regressions). I left them alone.

## What a reviewer should check by hand

- Confirm `search-query` really is the intended, stable id for the search
  box (it is documented in `specs/product-catalog.md` line 11 and matches
  every other search-related test id already in use elsewhere in the
  suite), not a second regression hiding behind the first.
- Confirm that lower-case brand ULIDs vs. upper-case product/category ULIDs
  is intentional/stable behaviour of the real API rather than something that
  should itself be filed as a (very minor) inconsistency bug upstream. I
  treated it as intentional/acceptable per the ULID spec's case-insensitivity,
  but a human closer to the API contract may want to confirm.
- All 21 non-`api-buggy`-known-defect tests are green (`ui`, `api-clean`, and
  the 4 `api-buggy` tests that are *not* known defects). The 4 remaining
  `api-buggy` failures are expected and should stay red.
