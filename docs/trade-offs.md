# Scope and trade-offs

These are decisions made for this repository, not general claims about AI testing.

## Why only four generated UI scenarios?

The planner produced 28 scenarios in about 19 minutes. I selected four that cover
different mechanisms: pagination, search, sorting and hierarchical filters. Most
of the remaining scenarios are permutations of those mechanisms. Every generated
test still costs review and maintenance, so scenario count is not the same as
useful coverage.

## Where AI helped

| Work | Time | Result |
| --- | ---: | --- |
| Explore the catalogue and propose scenarios | ~19 min | 28 scenarios and several behaviours I had not noticed |
| Generate four Playwright tests | ~4 min | four test files with useful locators and structure |
| Review and repair | ~40 min | three broken tests fixed; one false-green condition removed |

The planner was the clearest productivity win. The generator was useful for
mechanics, but not capable of deciding whether its assertions were meaningful.

## Why the API suite is included

The highest-impact defect I found was an authorisation bypass on anonymous
`GET /invoices`. UI generation would not have found it. The API suite demonstrates
that choosing the correct test layer matters more than generating more UI cases.

The same API tests run against healthy and deliberately broken builds. This is a
lightweight mutation check: a test is only trusted after it has been observed
failing for a relevant product defect.

## What is intentionally absent

- No checkout automation. The planner did not converge on the authenticated,
  stateful flow within a reasonable time budget.
- No native mobile coverage. Playwright can emulate mobile web viewports but is
  not a substitute for Appium.
- No autonomous healer in CI. I experimented with one, but it added a second
  story and a much larger security boundary without improving this submission's
  core evidence. The experiment remains visible in Git history.

## Limitation

Toolshop is a shared public sandbox. Data, availability and response time can
change independently of this repository. Assertions therefore focus on shapes,
relationships and observable behaviour rather than fixed seeded values.
