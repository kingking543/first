# Analysis Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, with a final read-only review.

**Goal:** Deliver the user-approved first round: remove duplicate bar chart, merge front-zone highlights, add back-zone omission, 10/30/50-window selection and explicit range.

**Architecture:** The generator continues using all50 draws. Analysis independently slices the latest10/30/50, computes both zone frequencies and current omission, and renders a shared number grid with dynamic per-zone color scale. Window selection lives in App to survive navigation. Keep source panel at the bottom.

**Tech Stack:** Existing React/TypeScript/Vite/node:test. No added dependency.

## Scope and decisions

- The user's preceding approval is the spec: no shape charts in this first round, no change to generator or scoring.
- Default50; selected window affects all analysis summaries and grids together. Show actual count, period and date range. Source continues describing the50-record base snapshot.
- A number absent from the selected window displays ≥N期, not a falsely exact omission. A number in the newest draw displays0期.
- Keep compact frequent and current-omission top5 inside the front grid card; ties sort by number. Both zones show count and omission for every number.
- Each zone color is normalized by its selected-window maximum; label relative within-zone scale and retain numeric counts.
- Remove FrequencyChart and unused Recharts dependency once no imports remain.
- Continue current checkout preserving pending data reliability fixes. Do not push/deploy.

## Tasks

- [x] Write failing tests for back omission, selected-window totals/boundaries, capped omissions, tie order and unchanged generator50-data.
- [x] Add pure analysis helpers and back omission; wire window state and consolidated accessible analysis UI.
- [x] Remove obsolete chart/dependency; update README.
- [x] Full test/TS/build/budget/diff checks, browser10/30/50 values and navigation, 320/393/1280 screenshots; fresh read-only review.

## Verification evidence

- 47 tests passed; strict TypeScript, production build, bundle budget and diff checks passed.
- Analysis lazy chunk reduced from363260bytes to4423bytes (gzip1892); initial JS360198bytes. Recharts removed with40 unused packages, no remaining imports.
- Browser320/393/1280: verified all47 number cells against raw records for each10/30/50 window (423 cell checks), period/date summaries, exact/at-least omissions, range button state, no chart, no horizontal overflow or page errors.
- Browser also verified range retained after generator navigation, quant mode and generation still work, refresh remains unique, source remains below the back-zone panel, statistics lazy chunk requested only once.
- Screenshots inspected, including320px. Read-only review passed; fixed README statistical-window wording flagged as minor.
- Pending data-reliability work retained. No push or production deployment.
