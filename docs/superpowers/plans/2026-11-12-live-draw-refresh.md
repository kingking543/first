# Live Draw Refresh Implementation Plan

> Use native execution and test-driven-development, followed by one independent whole-change review.

**Goal:** Refresh official draws even when GitHub scheduling never runs.
**Architecture:** Fixed-source bounded Node endpoint with validated snapshot fallback; client preserves verification status and monotonic data.
**Spec:** ../specs/2026-11-12-live-draw-refresh-design.md
**Stack:** TypeScript, Vercel Node Web handlers, React/Vite, node:test, Playwright.

## Constraints and review focus

No new settings or secrets; no fabricated verification timestamps; no official-data downgrade or conflicting overlap. Both sources queried, newest selected. Preserve previous research files. Verify real deployed runtime imports/CORS/rewrites, not only local mocks.

- [x] Baseline suite; write failing client tests and endpoint/service tests.
- [x] Shared compatibility validation; parallel bounded collector; Web handler and Vercel rewrite.
- [x] Client primary/fallback routing and verification state, timeout and source wording.
- [x] Unit/integration tests, typecheck, normal/Vercel builds and bundle budgets; independent review.
- [ ] Commit/push only this fix and its tests/docs; watch Pages/Vercel deployment.
- [ ] Live real API and two-site browser refresh validation, including fallback UI; report evidence and remaining limitations.

## Predeployment evidence

Baseline77tests; meaningful client RED failures for endpoint routing and verification classification. Final local suite92passed, including15new synchronization cases;20targeted client/service tests and existing collector regressions passed. Independent review found no material issue; reviewer was sandbox-blocked only on the existing socket-binding test, which passed in the parent full run.

Typecheck, normal and Vercel builds, bundle budgets and diff checks passed. Initial JS365804bytes/gzip116507bytes. Desktop1280px and mobile393px fixtures exercised official success and snapshot fallback with old26128cache, retained26129data and original verification time, no JS errors. These simulated-browser checks are not real-runtime verification; real Vercel function packaging, outbound requests, rewrite and cross-origin behavior remain the release gate.

Ruling: work in current checkout to retain active preview and uncommitted score research. User continued the production-staleness repair; publish this fix and validate live. Stage only sync code/tests/docs, leaving separate score-analysis files untouched. API inherits the collector's proven IPv4-first/no-family-racing settings. No secrets or new dependencies.
