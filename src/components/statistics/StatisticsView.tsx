/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo, useMemo } from 'react';
import { ANALYSIS_WINDOWS, analyzeDrawWindow } from '../../lib/statistics.ts';
import type { AnalysisWindow } from '../../lib/statistics.ts';
import type { WinningDraw } from '../../lib/draws.ts';
import NumberAnalysis from './NumberAnalysis.tsx';

interface Props { draws: WinningDraw[]; windowSize: AnalysisWindow; onWindowChange: (count: AnalysisWindow) => void; }
function StatisticsView({ draws, windowSize, onWindowChange }: Props) {
  const analysis = useMemo(() => analyzeDrawWindow(draws, windowSize), [draws, windowSize]);
  const newest = analysis.draws[0];
  const oldest = analysis.draws.at(-1);
  const count = analysis.draws.length;
  if (!newest || !oldest) return <p role="status">暂无可分析的开奖记录。</p>;
  return (
    <>
      <section aria-label="统计范围" className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-gray-800">统计范围</h2>
          <div role="group" aria-label="选择统计期数" className="inline-flex rounded-xl bg-gray-100 p-1">
            {ANALYSIS_WINDOWS.map(size => (
              <button key={size} aria-pressed={size === windowSize} onClick={() => onWindowChange(size)}
                className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${size === windowSize ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                近 {size} 期
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-700">最近 {count} 期 · {oldest.period}–{newest.period} 期</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{oldest.date} 至 {newest.date} · 截至第 {newest.period} 期</p>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">次数为所选范围内的出现次数。当前遗漏指距上次出现的期数，当期出现记 0 期；≥ 表示范围内未出现，实际遗漏可能更长。</p>
      </section>
      <NumberAnalysis zone="前区" rows={analysis.stats.frontData} count={count} />
      <NumberAnalysis zone="后区" rows={analysis.stats.backData} count={count} />
      <p className="px-1 text-xs leading-relaxed text-gray-500">前五摘要同值时按号码从小到大展示。以上为历史统计，不能据此判断下期中奖概率。</p>
    </>
  );
}
export default memo(StatisticsView);
