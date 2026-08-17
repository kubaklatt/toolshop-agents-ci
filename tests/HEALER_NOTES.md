# Healer notes

## Verdict: race / environment (transient), not a test or product bug

No test files were modified. Here is why.

### What the failing run looked like

The reported `tests` run had 9 failures:

- `tests/seed.spec.ts` — "storefront lists products"
- `tests/ui/category-brand-filters.spec.ts`
- `tests/ui/grid-browsing.spec.ts`
- `tests/ui/sorting.spec.ts`
- `tests/api/brands.spec.ts` on **api-clean**
- 4 tests on **api-buggy** (`auth.spec.ts` anonymous-invoices, `brands.spec.ts`,
  `products.spec.ts` envelope, `products.spec.ts` unknown-id)

### Investigation

1. Re-running the four `ui` specs plus `seed.spec.ts` individually (via
   `test_debug` and `test_run`) passed immediately, first try, no code touched.
2. Re-running `api/brands.spec.ts` against `api-clean` also passed immediately.
3. I then ran the **entire** suite twice more, back to back. Both runs were
   identical: all 21 tests against `ui` and `api-clean` passed, and *exactly*
   the same 4 tests failed on `api-buggy`.
4. Those 4 `api-buggy` failures are not a regression — `scripts/assert-bugs-caught.ts`
   documents them as `KNOWN_DEFECTS` in the deliberately-broken build that
   `api-buggy` points at (integer ids instead of ULIDs on `/brands` and
   `/products`, no 404 on a malformed product id, and an anonymous-auth bypass
   on `/invoices`). That script's whole job is to fail the `bug-hunt` step if
   the buggy build's known bugs *stop* being caught, or if something *new*
   breaks. Both runs matched the catalogue exactly — nothing undetected,
   nothing unexpected. These are meant to stay red and must not be touched
   (doing so would itself be the kind of "weakened assertion" the guardrails
   are watching for).

So the only failures that mattered — the ones against `ui` and `api-clean`,
which are supposed to be always-green — could not be reproduced across three
full runs. The tests themselves already follow the house rules called out in
their own comments (`seed.spec.ts`: "Keep it boring and always-green. If this
fails, the environment is wrong, not the product"; `grid-browsing.spec.ts`:
waits on grid content rather than on the active-page class or the network).
They use `expect(...).toBeVisible()`/`toHaveText()` polling, not
`waitForTimeout` or `networkidle`, so there was no sloppy wait to tighten.

The most plausible explanation is a one-off slow/cold response from the
public demo hosts (`practicesoftwaretesting.com` /
`api.practicesoftwaretesting.com`) at the time the original job ran — e.g. the
first request(s) in each of several parallel workers landing during a cold
start — rather than any defect in the test code or the product itself.

### What I did not change and why

- I did not raise any timeout or add `waitForTimeout`/`networkidle` — that
  would violate the hard rules and wouldn't address a hypothesised one-off
  slow response anyway.
- I did not touch the 4 `api-buggy` failures: they are the intended, catalogued
  output of running the real test suite against a known-broken build. They are
  a genuine product defect in `api-with-bugs.practicesoftwaretesting.com`,
  reported correctly by the existing tests, and must stay failing.
- I made no edits to any file under `tests/` because I could not reproduce a
  reproducible defect in the test code after three consecutive full-suite runs.

### What a reviewer should check by hand

- If the `tests` workflow fails again on `ui` or `api-clean` with the same
  "element not found" / empty-array symptoms, check whether it correlates with
  load on the shared demo hosts (e.g. many CI jobs from other forks hitting
  `practicesoftwaretesting.com` concurrently), rather than assuming the test
  code regressed.
- Confirm the `bug-hunt` step (`pnpm run bug-hunt`, driven by
  `scripts/assert-bugs-caught.ts`) is what gates the 4 `api-buggy` failures
  separately from the `tests` workflow, so a healthy `tests` run is not
  expected to require those 4 to pass.
