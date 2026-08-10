---
name: flake-triage
description: Triage a failing or intermittent CI test run and produce a verdict — product bug, test bug, environment, or timing — with the minimal fix. Use when a pipeline goes red, when a test passes on retry, or before rerunning anything.
---

# Triaging a red run

The instinct on a red pipeline is to rerun it. Resist that for five minutes,
because a rerun destroys the evidence and, if it goes green, teaches the team
that red means nothing.

Every failure gets exactly one of four verdicts. Reach a verdict before touching
the test.

## Gather first

- The trace, not the screenshot. `pnpm exec playwright show-trace <trace.zip>`
  gives you the DOM at the moment of failure, the network log, and the console.
- Did it pass on retry? Playwright marks that `flaky`, which is a symptom, not a
  verdict.
- Is it failing on one project only (`ui` but not `api-clean`), one browser, one
  shard?
- Was it green on the previous commit? `git log` the test file and the code it
  covers.
- Did the nightly run fail too? A test that only fails on the nightly is usually
  pointing at the environment, not the code.

## The four verdicts

### Product bug

The application actually misbehaves. The trace shows the wrong state, the API
returned the wrong status, the value is genuinely incorrect.

Action: file it with the trace attached, and leave the test failing. A failing
test is the correct state of the world while a bug is open. Do not skip it to get
a green board — that is trading a visible problem for an invisible one.

### Test bug

The application is fine; the test asserted the wrong thing or looked in the wrong
place. Includes hardcoded data that a reseed changed, a locator matching a ULID
that rotated, an assertion on text that translation changed.

Action: fix the test, and say in the commit message what it was asserting that
was never true.

### Environment

Nothing to do with either. Rate limiting, DNS, an expired token, the demo
database reseeded mid-run, a dependency that vanished from the registry, a runner
out of disk.

Action: make the failure legible — a clear error rather than a mystery timeout —
and, if it recurs, make the pipeline resilient (retry the request, not the whole
test).

### Timing

The test races the application. Symptoms: passes locally, fails in CI; passes
alone, fails in parallel; passes on retry.

Action: find the condition the test should have waited for and wait for that. A
raised timeout is not a fix — it makes the same race slower. A `waitForTimeout`
is not a fix either. If the application genuinely offers nothing to wait on,
that itself is worth reporting: an untestable state is usually also an
unobservable one for users.

## Then, and only then

- Rerun to confirm the diagnosis, not to hide it.
- If the same test earns a "timing" verdict three times, stop fixing it and
  redesign it, or delete it. A test the team reruns by reflex has negative value:
  it costs time and trains people to ignore red.
- Record what you found. The next person to see this test go red should not have
  to repeat the investigation.

## Output format

```
Test:     <name>  (<file>:<line>)
Verdict:  product bug | test bug | environment | timing
Evidence: what in the trace or log shows this
Fix:      the minimal change, or "none — bug filed as <link>"
Confidence: high | medium | low, and what would raise it
```

State low confidence when you have it. A guessed verdict that sends someone
chasing a product bug that was a locator problem costs more than saying "I do
not know yet, here is what I would check next".
