# Unified Draw Sync Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, with final read-only review.

**Goal:** User-approved permanent synchronization: local preview prioritizes the published online50-draw snapshot; opening, returning to page and manual refresh check updates; failures preserve verified data and timestamp.

**Architecture:** Pure draw-sync helper chooses the canonical production snapshot for loopback hosts, same-origin snapshot for deployed hosts, and adds a request version to avoid stale CDN responses. Hook owns a single cancellable request,12s deadline, focus/visibility/online listeners,5s automatic-event coalescing; manual refresh bypasses coalescing. Keep cache/bundled fallback and prevent period downgrade. Preserve generator/history and source panel placement.

**Constraints:** No new backend, official crawling or deployment on a browser click. All50 records still validated. Keep original fetchedAt on failure. No new dependency. Current snapshot update is retained from the previous local sync. No push/deploy until requested.

- [x] Failing helper tests: loopback/canonical/same-origin URLs and cache version, complete data upgrade, old/incomplete/invalid response rejection, cancellation/failure preservation.
- [x] Implement helper and single-flight hook with cleanup and honest source status copy.
- [x] Browser: stale local bundle upgraded by canonical online data; refresh and page-return update without reload; network/offline/timeouts and obsolete data preserve snapshot; coalesce duplicate events; generation/history and selected analysis window preserved.
- [x] Run tests,TS/build/budget/diff checks and final read-only review.

## Verification

-52 tests passed; strict TypeScript, build, bundle budget and whitespace checks passed. Initial JS361139bytes/gzip114870bytes.
-Real browser CORS check: local preview fetched canonical production JSON with query version, latest26123 and original fetchedAt2026-10-28T14:34:17.725Z; zero local snapshot HTTP requests.
-Isolated browser fixtures verified manual upgrade, return-to-page upgrade, overlapping focus/visibility coalescing, outdated response rejection, offline preservation,12s timeout releasing refresh, online-event recovery, generation/history and10-period analysis state preservation. No page errors. Synthetic future periods were used only in isolated routed browser responses, never written to project or production data.
-Read-only review found no blockers and independently passed5 helper tests.
-No push or production deployment performed.
