# Healer notes

## Verdict: environment problem (external shared fixture locked out), not a test or product bug

No test files were modified. Here is why.

### Scope: what the `tests` workflow actually runs

`.github/workflows/tests.yml` runs exactly:

```
pnpm exec playwright test --project=ui --project=api-clean
```

`api-buggy` is **not** part of this workflow (it belongs to `bug-hunt.yml`), so its
results are out of scope for diagnosing why the `tests` workflow failed, even
though `test_run` with no filter exercises it too. I re-ran with
`--project=ui --project=api-clean` explicitly to match the workflow, three
times total, to check for flake.

### Result, every time: 13 pass, 2 fail, always the same 2

- `api-clean` › `api/auth.spec.ts` › "POST /users/login issues a token for the
  demo customer" — expected `200`, got `423`.
- `api-clean` › `api/auth.spec.ts` › "GET /invoices serves the caller once
  authenticated" — fails inside the `loginAsCustomer()` helper with the same
  `423` before the test's own assertions even run.

All `ui` tests (`seed.spec.ts` + the four `ui/*.spec.ts` specs) and the other
two `api-clean` `auth.spec.ts` tests passed consistently across all runs.

### Root cause: the shared demo account is locked

Both failures resolve to one fact: `customer@practicesoftwaretesting.com` (the
`DEMO_CUSTOMER` fixture in `tests/api/support/api.ts`, published in the app's
own README) is currently locked on `api.practicesoftwaretesting.com`. The API
itself says so, verbatim, in the response body:

```
423 { "error": "Account locked, too many failed attempts. Please contact the administrator." }
```

Reproduced identically on three separate full test-runner invocations, with no
variation in status code or body — this is not a timing-sensitive or
intermittent condition, it is a persistent state on the external host.

### The test code is already correct and already defends against causing this

- `POST /users/login rejects a wrong password with 401` deliberately does
  **not** use `DEMO_CUSTOMER`. It posts a freshly generated, nonexistent
  address (`` `not-a-real-user-${Date.now()}@...` ``) specifically so that
  exercising the "bad credentials" path can't hammer the shared account. The
  comment above it explains this was a lesson learned from a previous
  self-inflicted lockout.
- `loginAsCustomer()` in `tests/api/support/api.ts` already checks
  `response.ok()` and throws a precise, diagnostic error
  (`Login failed with 423: ...`) rather than failing on a confusing
  downstream null-token dereference — which is exactly why the second failure
  above reports the true cause instead of masking it.

Neither file needed to change. Nothing in this suite is what re-triggered or
maintains the lock.

### Why I did not "fix" this by editing tests

- Raising a timeout or adding retries would not help: the API gives no signal
  that the lock is time-limited, and it isn't a race — 3/3 reproductions, same
  status, same body, no variance.
- Swapping `DEMO_CUSTOMER` for a different account, or loosening the
  assertions (e.g. accepting `423` as well as `200`), would stop the test from
  verifying the thing it exists to verify — that the specific, documented demo
  customer can authenticate — which the hard rules explicitly forbid
  ("no weakening an assertion to make it pass").
- `test.fixme()` / `test.skip()` are forbidden in this repository regardless of
  circumstance, so per the instructions the correct action is to leave these
  two failing rather than hide them.

### What I did not change and why

- `tests/api/auth.spec.ts`, `tests/api/support/api.ts`: assertions, fixtures,
  and error handling are already correct; the failure is external, shared-state
  data on `api.practicesoftwaretesting.com`, not an expressible code fix under
  `tests/`.
- The 4 `api-buggy` failures seen in an unfiltered `test_run` (auth anonymous
  invoices, brands ids, products envelope, products unknown-id) are the
  intended, catalogued output of `scripts/assert-bugs-caught.ts`'s
  `KNOWN_DEFECTS` list, gated by the separate `bug-hunt` workflow, not by
  `tests`. They are out of scope here and were left untouched — "fixing" them
  would defeat the purpose of that project.

### What a reviewer should check by hand

- Ask whoever administers `api.practicesoftwaretesting.com` to unlock
  `customer@practicesoftwaretesting.com`, or reset/reseed the shared demo
  account. Once unlocked, re-run
  `pnpm exec playwright test --project=ui --project=api-clean` — no code
  changes should be required for it to go green.
- If this recurs, it may be worth asking upstream for a lockout-reset
  endpoint, or a relaxed lockout threshold for the shared CI fixture account,
  since any consumer of this demo API that ever sends a wrong password against
  `DEMO_CUSTOMER` can re-trigger the same lock.
- Confirm that `bug-hunt.yml` (not `tests.yml`) is what is expected to gate the
  4 `api-buggy` failures, so a healthy `tests` run was never supposed to
  require those four to pass.
