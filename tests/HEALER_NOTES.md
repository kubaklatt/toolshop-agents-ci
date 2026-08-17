# Healer notes

## Summary

Of the 25 tests, one had a genuine test bug (fixed), four are *expected*
failures by design (the `api-buggy` bug-hunt project), and one is failing
because of data pollution in the shared public demo environment that this
suite cannot fix. Final state: 20 passed, 4 expected/by-design failures,
1 failing and left failing (see below), 0 skipped.

## 1. Fixed — test bug: `tests/ui/search.spec.ts`

**Verdict: test bug.**

The test filled `page.getByTestId( 'search-input' )`, but the application's
search box carries `data-test="search-query"` (confirmed against the live
DOM, and also consistent with `tests/seed.spec.ts`, which already uses
`search-query` as one of its "stable landmark" testids). There is no
`search-input` element anywhere on the page, so the test timed out waiting
for an element that was never going to appear — a stale/incorrect selector,
not an application defect.

Fix: changed the selector to `page.getByTestId( 'search-query' )`. Verified
the rest of the test's assumptions against the live app before touching
anything else: after submitting a no-match search, `search-caption` reads
"Searched for: zzzznoresultsxyz123" and `no-results` reads "There are no
products found.", exactly as asserted. Re-ran the test — passes.

## 2. Left failing, by design: `api-buggy` project (4 tests)

**Verdict: not a bug in our tests at all — expected behaviour.**

`playwright.config.ts` (not modified, per the rules) runs the same
`tests/api/**` spec files twice: once against `api-clean` (a working build)
and once against `api-buggy` (`api-with-bugs.practicesoftwaretesting.com`,
a deliberately broken build). `scripts/assert-bugs-caught.ts` then asserts
that the `api-buggy` run fails in *exactly* the four cataloged places:

- `GET /invoices refuses to serve invoices to an anonymous caller`
- `GET /brands returns ULID identifiers, not sequential integers`
- `GET /products returns a self-consistent page envelope`
- `GET /products/{unknown id} returns 404, not an empty 200`

All four, and only these four, failed against `api-buggy` in every run I
did. This is the suite working correctly — it is catching the cataloged
defects on the buggy build. Changing these tests to pass against
`api-buggy` would be hiding real bugs, which the guardrails and
`assert-bugs-caught.ts` both exist to prevent. I left them exactly as they
were.

## 3. Left failing — environment problem: `tests/api/brands.spec.ts` on `api-clean`

**Verdict: environment problem, not a test bug and not something fixable
here.**

`GET /brands` against the *clean* API (`api.practicesoftwaretesting.com`,
the real target, not the buggy one) currently returns 7 records:

```json
[
  { "id": "01M071FEGJGFAA622QZ43YFWT3", "name": "ForgeFlex Tools", "slug": "forgeflex-tools" },
  { "id": "01M071FEGJGFAA622QZ43YFWT4", "name": "MightyCraft Hardware", "slug": "mightycraft-hardware" },
  { "id": "01m071zb8nc57x5cwakgz83xzp", "name": "some name", "slug": "aetas-clam-adeptio" },
  { "id": "01m072x1989a8zgdeepk53jg8q", "name": "some name", "slug": "nostrum-degusto-explicabo" },
  { "id": "01m07365ed1twp7t921zy7d04w", "name": "some name", "slug": "enim-adfectus-coerceo" },
  { "id": "01m073f649ksbwzgepbbwkp5h6", "name": "some name", "slug": "vesper-conturbo-uxor" },
  { "id": "01m073r7dswsea3veckgetmqeb", "name": "some name", "slug": "curatio-vomica-bibo" }
]
```

The two real catalogue brands have properly-cased, 26-character Crockford
ULIDs, matching the app's own product/category ids (e.g.
`product-01M071FEWBW9RV5ZAHKST8K31D` on the storefront). The other five are
placeholder records — literal name `"some name"`, Latin-lorem-ipsum-style
slugs (`aetas-clam-adeptio`, `nostrum-degusto-explicabo`, …) that look
faker-generated — with lower-case, non-canonical pseudo-ULID ids. These are
visible in the live storefront DOM too (`data-test="brand-01m071zb8..."` on
the checkbox filter list), so this is not a stale fixture in our test data,
it's what the shared public demo is serving right now.

This is not something our test got wrong: `expect(String(brand.id)).toMatch(ULID)`
is exactly the assertion that is supposed to catch non-conforming ids
(it's the intentional twin of the cataloged defect on `api-buggy`). Making
it accept lower-case ids would be weakening the very check the test exists
for, and hard rule 3 forbids that. Nor is it a code defect we can point at
in this build — there is no code path in this repo that creates these
records; they read like leftover write-side pollution from other
tests/agents hitting the same shared, publicly-writable demo backend, and
they persisted across multiple full runs during this investigation (not a
one-off flake).

I left `GET /brands returns ULID identifiers, not sequential integers`
(`api-clean` project) failing rather than editing the assertion.

**What a reviewer should check by hand:** query
`https://api.practicesoftwaretesting.com/brands` directly. If the five
`"some name"` records are still present, this is demo-environment data that
needs cleaning up (or the seeding/reset job needs to stop leaking synthetic
brands into the public catalogue) — it is outside this repository's
control. If they've disappeared on a later run, this was transient pollution
and the test should already be green again with no code changes needed.
