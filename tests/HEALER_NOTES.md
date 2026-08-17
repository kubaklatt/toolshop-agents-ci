# Healer notes

Re-ran the full suite today (`ui`, `api-clean`, `api-buggy` — 25 tests) to
diagnose the failing `tests` workflow. 6 tests were red. I made **no code
changes** this session: the repository already contains the fixes from a
previous healing pass (case-insensitive `ULID` regex, and a non-shared
credential for the "wrong password" negative test — see below), and the
6 remaining failures are exactly the two categories that were already
investigated and are not fixable from `tests/` under the guardrails. I
re-verified each of them by hand rather than assuming the prior notes still
held.

## Current state of the fixes already in the repo (verified, untouched)

### `tests/api/support/api.ts` — `ULID` regex

`ULID` is `/^[0-9A-HJKMNP-TV-Z]{26}$/i` (case-insensitive). Against the real
API (`api-clean`), `GET /brands` returns lower-case ids and `GET /products`
returns upper-case ids; Crockford base32 is case-insensitive, and the
regex's own job (per its comment) is to assert *shape*, not casing. Verified
this is correct and still passing on `api-clean`: `brands.spec.ts` and the
`products.spec.ts` id assertions are green. On `api-buggy` the same regex
still correctly fails against the integer ids that build returns — it has
not been weakened.

### `tests/api/auth.spec.ts` — wrong-password test uses a throwaway email

`'POST /users/login rejects a wrong password with 401'` posts a
timestamped, made-up address instead of the shared `DEMO_CUSTOMER` fixture,
so this test no longer contributes failed attempts against the shared
account. Assertion is unchanged (`expect(response.status()).toBe(401)`).
Confirmed still green on both `api-clean` and `api-buggy`.

## What is still failing, and why — environment problem, left failing

`tests/api/auth.spec.ts`:
- `POST /users/login issues a token for the demo customer` (line 4) —
  expects `200`, gets `423`.
- `GET /invoices serves the caller once authenticated` (line 45) — fails
  inside `loginAsCustomer` with the same `423`.

Both hit the real `api.practicesoftwaretesting.com` with the demo
credentials published in the app's README
(`customer@practicesoftwaretesting.com` / `welcome01`) and get:

```json
{"error":"Account locked, too many failed attempts. Please contact the administrator."}
```

I ran `tests/api/auth.spec.ts` against `api-clean` twice more in this
session, a few minutes apart, and got an identical `423` both times, on
every attempt — not a one-off. The account is locked on the server side;
there is no unlock endpoint, no documented cool-down, and nothing under
`tests/` can reset account state on a third-party demo deployment. Per the
guardrails I did not use `test.skip`/`test.fixme`, did not comment the test
out, and did not weaken the `toBe(200)` assertion to also accept `423` —
that would silently stop catching a real regression the next time this
account is unlocked. So both are left failing, honestly, with this
explanation.

**Verdict: environment problem.** No test-code fix exists for "a shared
third-party credential is locked out server-side."

**What a reviewer should check by hand:** confirm
`customer@practicesoftwaretesting.com` / `welcome01` is still rejected with
`423` at `https://api.practicesoftwaretesting.com/users/login` (e.g. via
curl). If so, this needs an administrator of that demo deployment to reset
the account — nothing in this PR can do that. Since the wrong-password test
no longer targets the shared account (see above), the account should not
re-lock itself once it is cleared.

## Left alone — by design, not a bug in this repo

The four `api-buggy` failures are `scripts/assert-bugs-caught.ts`'s
catalogued defects, run deliberately against
`api-with-bugs.practicesoftwaretesting.com` (see `playwright.config.ts`).
The whole point of the `api-buggy` project is that these tests *must* fail
there; "fixing" them would defeat the purpose of the bug-hunt job. Verified
each still fails for exactly the catalogued reason, nothing more:

- `GET /invoices refuses to serve invoices to an anonymous caller` — `200`
  instead of `401` (authorisation bypass in the buggy build).
- `GET /brands returns ULID identifiers, not sequential integers` — integer
  ids / placeholder names (`"Brand name 1"`) in the buggy build.
- `GET /products returns a self-consistent page envelope` — integer product
  ids in the buggy build.
- `GET /products/{unknown id} returns 404, not an empty 200` — id coercion
  bug in the buggy build (`01ZZZ…` resolves to product `1` instead of 404).

## Verdicts, summarised

| Failure | Verdict | Action |
| --- | --- | --- |
| `brands.spec.ts` / `products.spec.ts` ULID case mismatch | Test bug | Already fixed in repo (case-insensitive regex); re-verified, untouched |
| `auth.spec.ts` wrong-password locking the shared account | Test bug (self-inflicted side effect on shared state) | Already fixed in repo (no longer touches the shared demo account); re-verified, untouched |
| `auth.spec.ts` demo-customer login / authenticated invoices | Environment problem (shared demo account locked server-side, no self-service recovery) | Left failing, documented; re-confirmed persistent across multiple runs today |
| 4× `api-buggy` failures | Intentional — not a bug in this repo's tests | Left untouched, re-verified against `scripts/assert-bugs-caught.ts`'s catalogue |

All `ui` tests and all other `api-clean`/`api-buggy` tests pass. No files
were modified in this session; the repository was already in the correct
state given the guardrails, and I found no new regressions to fix.
