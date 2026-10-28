# Draw Update Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make scheduled official draw updates work on GitHub Runner and expose stale data honestly.

**Architecture:** Keep the static Pages snapshot. Add a server-side retrying official collector with central and Fujian official sources; validate against the newest local/published baseline. Track provenance in snapshots and derive freshness from successful official verification time.

**Tech Stack:** Existing Node 20+, TypeScript, React, GitHub Actions; no new dependency.

**Spec:** docs/superpowers/specs/2026-10-28-draw-update-reliability-design.md

## Global Constraints

- Exactly 50 draws; retain existing number, date, game and period validation.
- No downgrade or conflicting overlapping draw, including fallback sources.
- Maximum 3 transient retries, do not retry HTTP 567/401/403.
- Stale at 36 hours; future clock tolerance 5 minutes; never renew fetchedAt on failure.
- Source panel stays at bottom; one refresh button remains by recent draws.
- Keep strict scheduled failure and saved-data option for code deployments.

## Review Focus

- Partial or malformed backup results must not pass.
- Aborted requests must stop retries and prevent fallback.
- Retry-After must be bounded; response body timeouts must be covered.
- New source metadata must work with existing browser caches and snapshots.
- A site JSON reload must not clear an official freshness warning.

### Task 1: Reliable official collector

- [x] Add failing unit tests for transient retry, blocked responses, cancellation, secondary official parsing, conflicts and downgrade.
- [x] Implement scripts/fetch-draws.ts with bounded complete-request retries and strict validation.
- [x] Integrate collector into scripts/update-draws.ts and extend subprocess tests for backup success/failure.
- [x] Prove strict collection in temporary remote diagnostic workflow without production deployment.

### Task 2: Freshness and provenance

- [x] Add failing pure tests for source compatibility and freshness boundaries.
- [x] Extend DrawSnapshot and parsing, derive freshness in useOfficialDraws, display warning and actual source.
- [x] Keep refresh placement and statistics lazy loading; browser-test fresh/stale/failure/clock scenarios.

### Task 3: Workflow and verification

- [x] Add 23:15 recovery schedule and update README with source, retry and stale semantics.
- [x] Run tests, TypeScript, build, bundle and diff checks.
- [x] Request read-only code review, fix valid findings, and recheck affected flows.

## Verification evidence

- Local: 43 tests passed; strict TypeScript, production build, bundle budget, and diff whitespace checks passed.
- Native HTTP slow-body test exercises the actual fetch deadline and bounded retries; it is not only a mocked signal test.
- GitHub Runner Node 20 strict update and full checks: https://github.com/kingking543/first/actions/runs/40676414263 (final run status checked before delivery).
- Earlier strict run 40675748964 collected 50 verified draws through Fujian after central HTTP 567; its artifact was compared with all 50 local official draws and copied as the bundled snapshot. Latest period 26122, date 2026-10-26; verified 2026-10-28T10:54:24.902Z.
- Browser: fresh source attribution and source location, unique refresh, statistics lazy loading, stale warning preserved after old JSON reload, newer verification clears it, failed sync retains data and generation, clock skew notice, minute timer crossing the 36-hour boundary; no page errors or mobile overflow.
- Read-only review closed the new-period gap issue and added local/published overlap conflict protection; no remaining review findings.
- Production main and Pages were not changed; deployment remains a separate user action.
