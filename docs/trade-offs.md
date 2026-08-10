# Trade-offs

Measured on this repository, not in general. One application, one afternoon.

## Where the agents paid for themselves

| Task | Agent | Wall clock | Output |
| --- | --- | --- | --- |
| Explore the product catalogue and plan tests | planner | ~19 min | 28 scenarios, 23 KB, unedited (`915a44b`) |
| Turn 4 of those scenarios into Playwright code | generator | ~4 min | 4 files, 3 of which failed on the first run (`02ddf74`) |
| Review and repair those 4 tests | me | ~40 min | all 5 UI tests green (`52d9baf`) |

The planner is the clear win. Nineteen minutes for 28 scenarios is faster than I
would write them, and it found four behaviours I had not told it about and had not
noticed myself:

- checking a parent category auto-checks its children, but unchecking a child does
  **not** visually revoke the parent
- filter, sort and search state never reaches the URL, so nothing is shareable or
  reloadable
- applying a filter while on page 2 silently resets you to page 1
- category landing pages drop the price slider and the search box entirely

The generator is a good typist and a poor judge. It produced correct locators,
honoured `data-test` over `data-testid`, and picked the ULID-prefix pattern out of
my seed test unprompted — then reported "all four files look correct" about four
files, three of which could not pass.

## Where they did not

**The authenticated checkout flow: no result at all.** The same planner, same
prompt style, pointed at cart → checkout → invoice with a login step. I killed it
at **42 minutes** with nothing written. The read-only catalogue took 19 minutes;
the flow with authentication and multiple dependent steps did not converge at
2.2× that budget. That is the honest boundary I found: exploration of a stateless
surface is cheap, exploration of a stateful flow is not. `specs/checkout.md` does
not exist for that reason, rather than because I ran out of interest.

**The agents never looked at the API.** Not their fault — I never asked. But it
matters, because the four defects in this repository's bug hunt all live there,
and the worst of them by a distance is an authorisation bypass: anonymous
`GET /invoices` returns other customers' invoices. No amount of UI test generation
would have found it. It took twenty minutes of `curl` against both builds. **The
highest-value finding in this repo came from hand-probing, not from an agent.**

## What the tooling caught, and what it could not

| | Caught by `pnpm lint` | Needed a human |
| --- | --- | --- |
| One-shot DOM read after an action (race) | 2 of 3 occurrences | the 3rd, whose assertion shape did not match the rule |
| Test that passes with ≤1 product, asserting nothing | no | yes — the code is entirely ordinary |
| Hardcoded category names, against the stated reseed rule | no | yes |
| Live `:checked` locator resolving to the wrong element after a click | no | yes |

Lint is worth having and it is not a review. It closed the mechanical half.

## Cost

Roughly $4–6 of API usage for the planner and generator runs together, including
the 42 minutes that produced nothing. Against ~40 minutes of my own review time,
the trade is clearly worth it — but only because I reviewed. Merging the raw
output would have bought a suite with three broken tests and a false green.

## Choices I would defend, and their price

- **Four tests, not twenty-eight.** The remaining 24 scenarios are mostly
  permutations of the same three mechanisms (filter, sort, paginate). Each costs
  generator time plus review time and adds little independent signal. Four
  scenarios covering four distinct mechanisms is where the value is; scenario
  count is not coverage.
- **The API suite is hand-written.** Contract and authorisation assertions are
  exactly where a generated `expect( response.ok() )` is most dangerous, because
  it looks like coverage.
- **`api-buggy` runs the same code, not a copy.** One suite, two hosts. If it
  drifted into two suites, the inverted assertion would stop meaning anything.
- **One lint warning left visible.** `playwright/prefer-locator` false-positives on
  a locator factory (`pageButton( 2 ).click()`). Suppressing it with an
  `eslint-disable` would be one more suppression for a future reader to audit, so
  it stays as a warning.
- **TypeScript pinned to 6.0.3, not 7.x.** `typescript-eslint` requires
  `typescript <6.1.0`. Working guardrails are worth more here than a newer
  compiler.

## Time lost to things that were nobody's fault

Recorded because they are what actually eats an afternoon:

- The app annotates with `data-test`, not `data-testid`. Until `testIdAttribute`
  is set, every `getByTestId` matches nothing.
- Product and category test ids embed a ULID that rotates on reseed.
- `waitUntil: 'networkidle'` never settles on this app.
- Playwright wipes `test-results/` at the start of a run, which silently ate the
  JSON report I was redirecting into it.
- GitHub Actions cannot start on this account — *"your account is locked due to a
  billing issue"* — which is why `heal.yml` is reviewed but unexercised.
