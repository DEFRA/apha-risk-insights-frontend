---
name: build-feature
description: Builds a feature end to end in one linear run, with no questions to the user and no subagents - plan from the request and the codebase, build with strict TDD, refactor, self-review, fix blocking findings, then hand back a summary. Use when the user invokes "$build-feature" or asks for a feature to be built start to finish without a Q&A planning session.
---

# Build Feature Skill

Runs one fixed pipeline, in order, for a feature request: **plan → build (TDD) → refactor → review → hand back**. You do all of it yourself in this context. It never asks the user questions, never waits for approval and never delegates to a subagent. Where the request is ambiguous, pick the most reasonable option, record it as an assumption and carry on.

---

## Rules

- **No questions.** Do not use `20qs`, `ask_user` or any other prompt to the user. Resolve gaps by reading the code and docs, then record assumptions in the plan.
- **No approval gates.** Do not pause between phases.
- **No subagents.** Do every phase yourself.
- **Strict TDD.** No implementation code without a preceding failing test that you have run and seen fail.
- **Order is fixed.** Never skip the refactor phase, and never run it after the review phase. The review must see the final refactored state.
- **Follow the repo.** Match existing structure, naming, test location and runner config rather than assuming a layout. Follow the repo's AGENTS/instructions files and `adr/` decisions.
- **Stop after phase 5.** No commit, PR, merge or deploy unless the user asks.
- **Show progress.** State the current phase as you go.

---

## Workflow

### 1. Plan

1. Read the request, then the code it touches: routes, presenters, views, data source, tests, ADRs in `adr/`, and any referenced wireframe or handoff notes.
2. Write a short plan covering:
   - **Goal** - what is being built, in one or two sentences.
   - **Scope** - files and areas in, and what is explicitly out.
   - **Acceptance criteria** - observable behaviour, each testable.
   - **Assumptions** - every point you resolved yourself because the request was silent or ambiguous.
3. Check once whether any decision is hard to reverse (architecture, data model, dependency, security boundary). If so, note it for the summary and suggest an ADR via the `create-adr` skill. Do not write the ADR in this run.
4. Continue straight to phase 2.

### 2. Build (strict red-green TDD)

1. **Set up a test feedback loop.** If Docker is running, use the repo's watch-mode test container (for example `npm run docker:test:watch`) and read its output with the `monitor-test-output` skill. If Docker is not available, run the repo's test command directly (for example `npm test`). Record which mode you are in. If neither works, stop and report that the skill needs a working test runner.
2. **Derive test scenarios** from the acceptance criteria, defensively: unhappy paths and edge cases first (invalid or missing input, dependency failures, empty, null, boundary values), then happy paths. For a bug fix, include a regression test that reproduces the bug. Do not play the scenarios back to the user.
3. **Loop over each scenario, one slice at a time:**
   1. Pick the test type. Use a unit test for pure logic. Use a narrow integration test for one boundary (an HTTP handler, a data source, a render); mock only what is outside that boundary with `vi.mock()` / `vi.fn()`.
   2. Write one focused failing test.
   3. Run it and confirm it **fails** for the expected reason. If it passes unexpectedly, stop and find out why before continuing.
   4. Write the minimum code to make it pass. Nothing speculative.
   5. Run it and confirm it **passes**.
   6. Run the full test suite to catch regressions before the next slice.
4. Follow the repo's standards while building: ES modules, JSDoc, no commented-out code, no magic values, config through the config module only, Joi validation on input, GOV.UK Design System components and WCAG 2.2 AA for UI.
5. Run the linter and formatter (for example `npx eslint .` and `npx prettier --check .`) and fix everything.

**Gate:** all new and existing tests pass and lint is clean. If not, fix it before moving on.

### 3. Refactor

Scope is the files changed on this branch only.

1. List the changed files, including uncommitted ones: `git diff --name-only <base>...HEAD` plus `git status --short`. Use the upstream tracking branch as the base if one exists, otherwise `main`.
2. For each file in turn:
   1. Look for duplication (against the other changed files), unnecessary complexity, poor naming and dead code left by the build.
   2. Apply the change, keeping behaviour exactly the same.
   3. Run the full test suite.
   4. If a test fails, revert that file's change immediately and move on. Do not retry.
3. If you notice something high-risk (swallowed errors, missing validation, security or data-loss concerns), do not fix it here. Note it for the summary.

**Gate:** tests still pass and behaviour is unchanged.

### 4. Review

Review the final refactored diff yourself, in this order, skipping categories that do not apply:

1. **Correctness** - does it meet each acceptance criterion; are edge cases and error paths handled without leaking internals.
2. **Tests** - happy and key error paths covered, names describe behaviour, coverage has not dropped (target 90% minimum).
3. **Security** - no secrets in code, input validated, no PII in logs or errors, CSRF on state-changing routes, security headers present.
4. **Performance and reliability** - nothing blocks the event loop, external calls have timeouts.
5. **Maintainability** - descriptive names, no commented-out code, no magic numbers or strings, no duplicated blocks.
6. **Architecture** - follows the existing structure and ADRs, dependencies flow inward.
7. **Documentation** - JSDoc on public functions, README updated if setup or endpoints changed.
8. **Accessibility** (frontend changes) - WCAG 2.2 AA, keyboard access, labels, error summaries linking to fields.

Label each finding **Blocking** (incorrect behaviour, security issue, failing test), **Recommended** or **Nit**.

- Fix every **Blocking** finding with TDD: write the failing test, fix, run the full suite and lint. Then review those changes again. Allow at most two fix-and-review passes; if blocking findings remain, stop and report them.
- Do not action **Recommended** or **Nit** findings. List them in the summary.
- A design flaw that invalidates the plan counts as blocking. Fix it here; do not return to planning.

**Gate:** no blocking findings remain, or the two-pass limit was reached and the remainder is reported.

### 5. Hand back

Stop. Summarise:

- what was built
- **assumptions made** in phase 1, so the user can correct any that are wrong
- test results and how they were run (Docker watch container or direct)
- refactor summary: applied, reverted, high-risk observations
- review findings and how each blocking one was resolved; recommended and nit findings left open
- any ADR suggested in phase 1
- anything the user should decide next, such as raising a PR or extending scope

Wait for the user's next instruction.

---

## Pre-flight checklist

- [ ] Plan written from the request and the code, with assumptions listed
- [ ] No question was put to the user, no approval was waited for, and no subagent was used
- [ ] Every test was seen to fail before its implementation was written
- [ ] Implementation was the minimum needed for each test
- [ ] Full suite was run after each green and after each refactor edit
- [ ] Refactor ran before review, only touched this branch's files, and reverted anything that broke a test
- [ ] Review covered the final refactored diff; blocking findings were fixed with TDD
- [ ] Lint and format are clean
- [ ] No commit, PR, merge or deploy was made
- [ ] Summary includes assumptions, test results, refactor summary and review findings
