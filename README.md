# AI-generated Playwright tests, reviewed like production code

[![test suite](https://github.com/kubaklatt/toolshop-agents-ci/actions/workflows/ci.yml/badge.svg)](https://github.com/kubaklatt/toolshop-agents-ci/actions/workflows/ci.yml)

This is a small Playwright suite for the public
[Toolshop](https://practicesoftwaretesting.com) demo. Claude agents explored the
catalogue, planned coverage and generated four UI scenarios; I selected the
scope, reviewed the output and verified that the tests fail for the right reason.

The result is deliberately small: **5 UI tests, 10 API tests and one CI workflow**.

## The 3-minute review

1. Read [`docs/prompt-to-test.md`](docs/prompt-to-test.md). It follows one test
   from prompt, through flawed generated code, to a passing and meaningful test.
2. Open the [raw generator output](https://github.com/kubaklatt/toolshop-agents-ci/commit/02ddf74)
   and the [initial review diff](https://github.com/kubaklatt/toolshop-agents-ci/compare/02ddf74...52d9baf).
   No clone is needed; locally, the same comparison is `git diff 02ddf74 52d9baf`.
3. Look at [`scripts/assert-bugs-caught.ts`](scripts/assert-bugs-caught.ts). It
   fails CI if the API suite stops detecting four known defects in Toolshop's
   deliberately broken API build.

## What happened

The planner produced 28 catalogue scenarios. I selected four that exercise four
different mechanisms: pagination, empty search results, numeric sorting and
hierarchical filters. Generating permutations of the other 24 would add volume,
not much new information.

The generator created all four UI tests in about four minutes. Three failed on
the first run. Review found:

- one-shot DOM reads racing a re-render;
- a sorting assertion that could pass with only one product and test no ordering;
- a selector bug in my seed test that the agent copied faithfully;
- a live locator resolving to a different checkbox after a click.

The raw plan and generated tests were committed before corrections, so the Git
history preserves the actual process.

## Proving the tests have teeth

Toolshop exposes both a healthy API and a build with deliberate defects. The same
API test code runs against both:

```bash
pnpm test:api   # 10 tests must pass against the healthy API
pnpm bug-hunt  # exactly 4 known defects must be detected in the broken API
```

The broken build includes an anonymous invoice-access vulnerability, malformed
contracts and path-id coercion. `bug-hunt` fails if a known defect is missed or
an unexpected test fails.

## Run it

Requires Node.js 24 and pnpm 11.

```bash
pnpm install
pnpm exec playwright install chromium

pnpm typecheck
pnpm lint
pnpm guardrails
pnpm test       # 5 UI + 10 healthy-API tests
pnpm bug-hunt
```

`pnpm guardrails` checks that seven lint guardrails still reject skips/`fixme`,
focused tests, missing assertions, conditional logic, fixed sleeps, `networkidle`
and commented-out tests.

CI keeps one retry so a trace is captured, but `failOnFlakyTests` ensures a test
that passes only on retry still fails the workflow.

## Repository map

```text
docs/prompt-to-test.md        prompt → generated test → review → green
specs/product-catalog.md      raw planner output (limitations noted in specs/ABOUT.md)
tests/ui/                     four generated scenarios after review
tests/api/                    API contract and authorisation tests
scripts/assert-bugs-caught.ts proof that the API tests detect known defects
.claude/                      the agent setup and my review checklist
.github/workflows/ci.yml      one reproducible CI pipeline
```

Because Toolshop is a shared sandbox, assertions target contracts and invariants
rather than fixed records. Scope decisions are in
[`docs/trade-offs.md`](docs/trade-offs.md).
