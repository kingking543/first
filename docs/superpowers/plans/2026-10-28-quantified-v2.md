# Quantified Mode V2 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline with a final read-only review.

**Goal:** User-approved1/2/3: retain量化增强模式name and numerical scores; jointly diversify five tickets, soften hot constraints, redefine score as rule conformity.

**Architecture:** Shared bounded uniform sampling; smart mode builds a bounded unique candidate pool, chooses with mild shape preference and stronger batch novelty/overlap weights; no score threshold. Random mode retains independent uniform sampling. Rule conformity is recomputed for each ticket against the final batch and saved with scoreVersion2. Old scores are retained and labelled旧规则, not recalculated.

## Rules and constraints

- Keep name/switch/one/five/copy/history/analysis/source unchanged in behavior; update explanations to actual semantics.
- Rule conformity0–100: sum up to30 (30−0.4*abs(sum−90),minimum0); odd2/3=25,1/4=16,0/5=8; consecutive adjacent pairs<=1=20,2=12,>=3=4; hot count1..3=5,otherwise2; batch spread up to20 (20−3*maximum shared front−3*maximum shared back,minimum0). Single ticket spread20, disclosed. Rounded total.
- Hot set remains based on prior/latest50 draws but contributes only5 points maximum and no hard inclusion threshold. Every candidate has positive selection preference.
- Smart mode ensures whole-ticket uniqueness; both zones participate in novelty. Constant randomness must terminate with bounded deterministic rotation fallback. Support1–50 library count; UI1/5. Preserve pure random mode.
- New scoreVersion2 saved; historic scores not relabelled as new conformity or erased. Unknown version metadata stripped preserving valid numbers.
- Freeze exact old generator for research reproduction; no overwrite of historical report outcomes. New comparison is an engineering check on already-inspected data, not unseen validation.
- Pending schedule change and research artifacts preserved. No push/deployment in this task.

## Tasks

- [x] Failing tests for exact score semantics/final-batch context, unique valid bounded generation, softer hot inclusion, score variation, coverage against old and random, history version compatibility.
- [x] Implement sampling/quantified modules and generator integration; update truthful rule/score labels.
- [x] Run fixed300-target30-seed engineering comparison versus frozen old generator and random; save reproducible metrics and limitations.
- [x] Full tests/TS/build/budget/diff, browser320/393/1280 switch/generate/score/copy/history checks, final read-only review.

## Verification completed

- Full test suite: 61 passed, 0 failed. Includes exact score calculation, final-batch context, history compatibility, bounded repeated-RNG handling, spread and softened hot inclusion, and unchanged pure-random sequences against the frozen V1.
- TypeScript, production build and bundle budget passed. Initial JavaScript 363678 bytes / gzip115816 bytes; statistics chunk remains lazy.
- Browser at320/393/1280px: retained mode name and switch; open/close rule explanation; generate five unique tickets; independently recalculate stored scores; copy five lines; preserve old scores; toggle to random; reload history; no page errors/overflow. Narrow switch44px and history copy actions visible.
- Engineering comparison on already-inspected300 targets ×30 seeds: V2 five-ticket coverage21.727front/8.763back vs frozenV1 18.191/7.185. V2 scores span53 values; no claim of improved future winning probability.
- Frozen baseline byte-identical to d8a1108:src/lib/lotto.ts and its SHA matches the original backtest. Tracked diff and new source/document whitespace checks passed. Generated plotting SVG whitespace is retained as tool output.
- Final read-only review: no actionable findings. No commit, push or deployment performed.
