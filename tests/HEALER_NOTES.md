# Healer notes

## Verdict: environment problem (external shared fixture), not a test or product bug

No test files were modified. Here is why.

### What the failing run looked like

25 tests ran, 6 failed:

- `api-clean` › `api/auth.spec.ts` — "POST /users/login issues a token for the
  demo customer" (expected 200, got 423)
- `api-clean` › `api/auth.spec.ts` — "GET /invoices serves the caller once
  authenticated" (fails in the `loginAsCustomer` helper with the same 423)
- 4 tests on **api-buggy** (`auth.spec.ts` anonymous-invoices, `brands.spec.ts`,
  `products.spec.ts` envelope, `products.spec.ts` unknown-id)

All `ui` tests (`seed.spec.ts` plus the four `ui/*.spec.ts` specs) passed, and
passed again on two subsequent full re-runs, so there is nothing to fix there.

### The 4 `api-buggy` failures are supposed to be red — left untouched

`scripts/assert-bugs-caught.ts` runs the same spec files a second time against
`api-with-bugs.practicesoftwaretesting.com` and asserts the suite fails in
*exactly* the four cataloged places (`KNOWN_DEFECTS`): integer ids instead of
ULIDs on `/brands` and `/products`, no 404 on a malformed product id, and an
anonymous-auth bypass on `/invoices`. I compared the failing test titles above
against that catalogue — they match exactly, nothing undetected and nothing
new. Touching those tests to make them pass on `api-buggy` would be exactly
the "weakened assertion" the guardrails forbid, and would defeat the purpose
of that project. Left as-is.

### The 2 `api-clean` `auth.spec.ts` failures: the demo account is locked out

Both real failures trace back to one thing: `customer@practicesoftwaretesting.com`
(the fixture in `DEMO_CUSTOMER`, published in the app's own README) is
currently locked on the live host `api.practicesoftwaretesting.com`. I
confirmed this directly, independent of the test runner, by opening a page on
`practicesoftwaretesting.com` and calling `fetch()` against
`https://api.practicesoftwaretesting.com/users/login` with the exact
`DEMO_CUSTOMER` credentials from `tests/api/support/api.ts`:

```
{ "error": "Account locked, too many failed attempts. Please contact the administrator." }
```

Status `423`, reproduced three times in a row, with no variation. This is not
a timed lockout that clears itself — the message says "contact the
administrator," and there is no unlock/reset endpoint exposed anywhere this
suite (or any test in the repo) has access to.

The test code itself is already correct and already defends against being the
cause of this:

- `POST /users/login rejects a wrong password with 401` deliberately uses a
  freshly-generated fake email (`not-a-real-user-${Date.now()}@...`), **not**
  `DEMO_CUSTOMER`, specifically so it can't hammer the shared account. The
  comment in the test explains this was a lesson learned from a previous
  self-inflicted lockout.
- `loginAsCustomer()` in `tests/api/support/api.ts` already throws a clear,
  diagnostic error (`Login failed with 423: ...`) instead of failing
  obscurely — that's why test 4 ("GET /invoices serves the caller once
  authenticated") reports the real cause instead of a confusing timeout or
  null-token error.

There is no code change available here: the two tests need the documented
demo account to be able to log in, and right now it structurally cannot,
through no fault of the request being sent. Retrying, polling, or lengthening
a timeout would not help (the API gives no indication the lock is
time-limited) and raising a timeout is explicitly against the hard rules
anyway. Renaming/replacing `DEMO_CUSTOMER` with some other account would
change what the test is actually verifying (that *the specific, documented*
demo customer can authenticate), not fix a defect in the test.

### What I did not change and why

- I did not touch `tests/api/auth.spec.ts` or `tests/api/support/api.ts`: the
  assertions, selectors, and error handling are already correct; the failure
  is a live-data/shared-fixture state problem on the external host, not
  something expressible as a code fix under the hard rules.
- I did not add retries, raise any timeout, or wait for anything — the 423 is
  not a transient/race condition (reproduced 3/3 on demand, no timing
  dependency), and none of those techniques are permitted or would help here.
- I did not touch the 4 `api-buggy` failures — they are the intended,
  catalogued output of running the real suite against a known-broken build.
- Per instructions, since I cannot fix these two tests, I am leaving them
  failing rather than marking them `test.fixme()` (forbidden in this repo
  anyway) or weakening their assertions.

### What a reviewer should check by hand

- Log in to `api.practicesoftwaretesting.com` (or its admin surface) and
  unlock/reset `customer@practicesoftwaretesting.com`, or ask whoever
  administers the shared demo environment to do so. Once unlocked, re-run
  `tests/api/auth.spec.ts` on `api-clean` — no code changes should be needed
  for it to go green again.
- If this keeps recurring, it's worth asking upstream whether the demo API
  can expose a lockout-reset endpoint, or whether the lockout threshold/window
  can be relaxed for the shared CI fixture account, since any CI (this repo's
  or a fork's) that still sends a wrong password against `DEMO_CUSTOMER` will
  re-trigger it.
- Confirm `scripts/assert-bugs-caught.ts` / the `bug-hunt` job is what gates
  the 4 `api-buggy` failures separately from this `tests` workflow, so a
  healthy `tests` run was never expected to require those 4 to pass.
