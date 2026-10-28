/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo, useMemo } from 'react';
import { ArrowUpRight, Clock, LayoutGrid, Sparkles } from 'lucide-react';
import FrequencyChart from './FrequencyChart.tsx';
import type { DrawStats } from '../../lib/draws.ts';

interface Props { stats: DrawStats; drawCount: number; }
function StatisticsView({ stats, drawCount }: Props) {
  const topFrequentFront = useMemo(() => [...stats.frontData].sort((a, b) => b.freq - a.freq).slice(0, 5), [stats.frontData]);
  const topOverdueFront = useMemo(() => [...stats.frontData].sort((a, b) => b.overdue - a.overdue).slice(0, 5), [stats.frontData]);
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center text-blue-600 mb-4">
          <ArrowUpRight className="w-5 h-5 mr-2" />
          <h3 className="font-bold">前区高频号码 (Top 5)</h3>
        </div>
        <div className="flex gap-2">
          {topFrequentFront.map(d => (
            <div key={d.number} className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 mb-1">
                {d.number < 10 ? `0${d.number}` : d.number}
              </div>
              <span className="text-[10px] text-gray-400">{d.freq}次</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center text-orange-600 mb-4">
          <Clock className="w-5 h-5 mr-2" />
          <h3 className="font-bold">前区遗漏最久 (Top 5)</h3>
        </div>
        <div className="flex gap-2">
          {topOverdueFront.map(d => (
            <div key={d.number} className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center font-bold text-orange-700 mb-1">
                {d.number < 10 ? `0${d.number}` : d.number}
              </div>
              <span className="text-[10px] text-gray-400">{d.overdue}期</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <FrequencyChart stats={stats} drawCount={drawCount} />

    {/* Heat Map Grid */}
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <h3 className="font-bold mb-6 flex items-center">
        <LayoutGrid className="w-5 h-5 mr-2 text-red-500" />
        前区号码热力分布
      </h3>
      <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
        {stats.frontData.map(d => {
          const intensity = Math.min(d.freq / 15, 1);
          return (
            <div
              key={d.number}
              className="aspect-square rounded-xl border border-gray-50 flex flex-col items-center justify-center transition-all hover:scale-105"
              style={{ backgroundColor: `rgba(59, 130, 246, ${0.05 + intensity * 0.4})` }}
            >
              <span className="text-sm font-bold text-gray-800">{d.number < 10 ? `0${d.number}` : d.number}</span>
              <span className="text-[8px] text-gray-500">{d.freq}次</span>
            </div>
          );
        })}
      </div>
    </div>

    {/* Back Zone Stats */}
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <h3 className="font-bold mb-6 flex items-center">
        <Sparkles className="w-5 h-5 mr-2 text-red-500" />
        后区号码分析
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {stats.backData.map(d => (
          <div key={d.number} className="p-3 rounded-2xl bg-red-50/50 border border-red-100 flex flex-col items-center">
            <span className="text-lg font-bold text-red-600">{d.number < 10 ? `0${d.number}` : d.number}</span>
            <div className="flex flex-col items-center mt-1">
              <span className="text-[10px] text-gray-500">频次: {d.freq}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

export default memo(StatisticsView);
