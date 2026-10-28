import { calculateDrawStats } from './draws.ts';
import type { DrawStats, WinningDraw } from './draws.ts';

export const ANALYSIS_WINDOWS = [10, 30, 50] as const;
export type AnalysisWindow = typeof ANALYSIS_WINDOWS[number];
export type NumberStat = DrawStats['frontData'][number];

export function analyzeDrawWindow(draws: WinningDraw[], count: AnalysisWindow) {
  const selected = draws.slice(0, count);
  return { draws: selected, stats: calculateDrawStats(selected) };
}
export function formatOmission(row: Pick<NumberStat, 'freq' | 'overdue'>, count: number) {
  return row.freq === 0 ? `≥${count}期` : `${row.overdue}期`;
}
export function rankNumbers(rows: NumberStat[], metric: 'freq' | 'overdue') {
  return [...rows].sort((a, b) => b[metric] - a[metric] || a.number - b.number).slice(0, 5);
}
