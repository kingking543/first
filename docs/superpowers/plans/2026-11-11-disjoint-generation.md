# Disjoint Quantified Generation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline, then one fresh whole-change review.

**Goal:** Make five smart tickets fully disjoint without another switch.
**Architecture:** Preserve the ordinary sampler and score format; expose its ordered draw sequence to a disjoint smart path. Keep V2 only for larger unsupported-by-disjoint batches and frozen research.
**Tech Stack:** TypeScript, React/Vite, node:test/tsx, Playwright.
**Spec:** ../specs/2026-11-11-disjoint-generation-design.md (approved conversation recorded).

## Global Constraints

- Keep 量化增强模式, one/five UI actions, ordinary random output, scoreVersion2 and saved history.
- Uniform ordered sampling, partition first, sort per ticket; never reject by historical or shape score.
- Disjoint for 1–6; preserve V2 bounded fallback for 7–50. No push/deploy.
- Keep archived numerical reports; freeze V2 sources and reroute research arms.

## Review Focus

- Sorting the pool globally biases early tickets: test high numbers in the first ticket.
- Counts beyond zone capacity: existing constant-RNG50 test and new 6/7 boundary checks.
- RNG endpoints/invalid input: existing invalid-input and constant-input tests.
- Ordinary output and stored scores: existing deterministic and history-version tests.
- Old research silently tracks new production: compare frozen V2 outputs with archived batches.

### Task 1: Generation, explanation and research preservation

**Files:** src/lib/number-sampling.ts, quantified.ts, quantified.test.ts, disjoint.test.ts; src/components/SmartModeControl.tsx; README.md; scripts/research/baseline-v2/*, backtest-v3-lib.ts, merge-backtest-v3.ts; scripts/backtest-v3.test.ts.
**Interfaces:** sampleNumbers stays sorted; sampleNumbersInOrder returns a uniform ordered sample. selectQuantified retains its signature. LottoSet and score format stay unchanged.

- [x] Freeze V2 byte-for-byte and record source hashes; baseline npm test must pass.
- [x] Write coverage/history-independence/first-ticket high-number tests and observe failure before production edits.
- [x] Add ordered sampler and disjoint 1–6 path; retain V2 fallback for 7–50.
- [x] Reroute frozen research and verify old archived number batches.
- [x] Update short helper, rules explanation and README: generation separate from descriptive score.
- [x] Run npm test, npm run lint, npm run build, npm run check:bundle and diff checks.
- [x] Independently review and exercise browser single/five, toggle, scores, reload history at mobile/desktop sizes.
- [x] Report local result; no commit/push/deploy requested.

## Validation evidence

- Baseline: 68 tests passed before modification.
- RED: four new behavior tests failed on the original V2 implementation; boundary compatibility test already passed.
- GREEN: all29 targeted tests passed, including200 archived V2 fixed batches; final full suite74 passed,0 failed.
- TypeScript check, production build, bundle budgets and whitespace checks passed. Final initial JS364471bytes/gzip116054bytes.
- Browser on320/393/1280px: five-ticket25/10coverage, single generation, ordinary mode, descriptive score badges, old history and reload persistence all passed; one existing mode switch, no horizontal page overflow or JS errors. Browser used isolated storage and the existing snapshot fixture to test generation independently of live collection.
- Independent review found no material issue. Three V2 source copies matchHEAD30a30b1 byte-for-byte;22 original report artifacts remain unchanged.
- Ruling: implement in the current checkout to preserve its ongoing preview and untracked research; no new worktree, commit, push or deployment. Previously approved conversation is the small design approval; no duplicate approval gate.
- Final copy was shortened after mobile inspection to avoid a trailing single-character line; algorithm and score semantics unchanged.
