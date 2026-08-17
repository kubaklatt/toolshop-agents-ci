# Healer notes

Ran the full suite (`ui`, `api-clean`, `api-buggy` — 25 tests). 8 were red.
After the changes below, 6 are still red — all 6 are either an intentional
"broken build" defect or an external account lockout I cannot clear from
`tests/`. Details per failure, and the verdict for each, below.

## What I changed

### 1. `tests/api/support/api.ts` — test bug, fixed

`ULID` was `/^[0-9A-HJKMNP-TV-Z]{26}$/`, uppercase-only. Against the real API
(`api-clean`), `GET /brands` returns ids such as `01m071zb8nc57x5cwakgz83xzp` —
26 characters, correct Crockford-base32 alphabet, valid ULID — just
lower-case. `GET /products` happens to come back upper-case. Crockford base32
is a case-insensitive encoding; neither response is wrong, and the test's own
comment says the point of this regex is to assert the *shape*, not a
specific value. The regex was asserting casing it never promised to assert.

Fix: added the `i` flag. This does not weaken what the regex catches — it
still requires exactly 26 characters from the Crockford alphabet and still
rejects the integers `api-buggy` returns (`1`, `2`, …), which is what
`GET /brands` and `GET /products` on `api-buggy` are cataloguing as defects
(see `scripts/assert-bugs-caught.ts`). Verified both projects still behave
correctly: `api-clean` now passes, `api-buggy` still fails on exactly the
same two catalogued defects as before.

### 2. `tests/api/auth.spec.ts` — test bug, fixed

`'POST /users/login rejects a wrong password with 401'` sent the real
`DEMO_CUSTOMER` email with a wrong password, on every run, against a public
shared demo API. That account now returns `423` on *any* login attempt,
correct password or not: `{"error":"Account locked, too many failed
attempts. Please contact the administrator."}`. This test — sending a wrong
password for that account on every single CI run, from every fork of this
exercise — is a plausible cause of that lockout, and would keep re-arming it
even after a manual unlock, since a human contact-the-administrator recovery
doesn't stop the next CI run from immediately relocking it.

Fix: the negative-credentials test now posts a made-up, timestamped email
instead of the shared demo customer's, keeping the same assertion
(`expect(response.status()).toBe(401)`, unchanged) but no longer touching an
account other tests depend on. This is still a faithful test of "bad
credentials get 401" — real APIs (this one included) return the same generic
401 for "wrong password" and "no such user" precisely to avoid leaking which
one it was.

## What I could not fix — environment problem, left failing

`tests/api/auth.spec.ts`:
- `POST /users/login issues a token for the demo customer` — expects `200`,
  gets `423`.
- `GET /invoices serves the caller once authenticated` — fails inside
  `loginAsCustomer` with the same `423`.

The shared demo account (`customer@practicesoftwaretesting.com`, the
credential pair published in the app's own README) is currently locked on
the real API and the API's own error message says to contact an
administrator — there's no unlock endpoint, no documented cool-down, and I
have no admin access to `api.practicesoftwaretesting.com`. I confirmed this
is not a per-request fluke: I ran the suite four times over the course of
this session, minutes apart, and got `423` every time with an identical
message. Per the guardrails I cannot `test.skip`/`test.fixme`/comment these
out, and weakening the assertion to accept `423` would hide a real
regression the next time the account *is* unlocked, so they are left
failing, honestly, with this explanation.

**What a reviewer should check by hand:** whether
`customer@practicesoftwaretesting.com` / `welcome01` still logs in at
`https://api.practicesoftwaretesting.com` via `curl`. If it's locked,
someone with access to that demo deployment needs to reset it; if I've
guessed the cause correctly, it should no longer re-lock itself now that the
wrong-password test no longer targets that account.

## Left alone — by design, not a bug

The four `api-buggy` failures below are `scripts/assert-bugs-caught.ts`'s
catalogued defects, run deliberately against
`api-with-bugs.practicesoftwaretesting.com` (see `playwright.config.ts` and
the README's "The suite must fail against a build that is known to be
broken" section). They are supposed to fail; fixing them would defeat the
purpose of the `api-buggy` project. I did not touch them:

- `GET /invoices refuses to serve invoices to an anonymous caller` (401
  expected, `200` received — authorisation bypass in the buggy build)
- `GET /brands returns ULID identifiers, not sequential integers` (integer
  ids / placeholder names in the buggy build)
- `GET /products returns a self-consistent page envelope` (integer product
  ids in the buggy build)
- `GET /products/{unknown id} returns 404, not an empty 200` (id coercion bug
  in the buggy build)

## Verdicts, summarised

| Failure | Verdict | Action |
| --- | --- | --- |
| `brands.spec.ts` ULID case mismatch | Test bug | Fixed (case-insensitive regex) |
| `auth.spec.ts` wrong-password locking the shared account | Test bug (self-inflicted side effect on shared state) | Fixed (stopped using the shared demo account for the negative case) |
| `auth.spec.ts` demo-customer login / authenticated invoices | Environment problem (account already locked, no self-service recovery) | Left failing, documented |
| 4× `api-buggy` failures | Intentional — not a bug in this repo's tests | Left untouched |

All `ui` tests and all other `api-clean`/`api-buggy` tests pass.
