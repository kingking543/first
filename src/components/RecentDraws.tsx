/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calendar, RefreshCw, Trophy } from 'lucide-react';
import type { DrawLoadStatus, WinningDraw } from '../lib/draws.ts';

interface Props { draws: WinningDraw[]; drawStatus: DrawLoadStatus; onRefresh: () => void; }
export default function RecentDraws({ draws, drawStatus, onRefresh }: Props) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
          近 5 期开奖号码
        </h3>
        <button onClick={onRefresh} disabled={drawStatus === 'syncing'} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
          <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${drawStatus === 'syncing' ? 'animate-spin' : ''}`} />
          刷新开奖
        </button>
      </div>
      <div className="space-y-3">
        {draws.map((draw) => (
          <div key={draw.period} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-gray-50/50 border border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between sm:justify-start gap-4 mb-3 sm:mb-0">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-600">第 {draw.period} 期</span>
                <span className="text-[10px] text-gray-400 flex items-center mt-0.5">
                  <Calendar className="w-3 h-3 mr-1" />
                  {draw.date}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <div className="flex gap-1">
                {draw.front.map((num, i) => (
                  <span key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-700 text-xs sm:text-sm font-bold flex items-center justify-center border border-blue-200">
                    {num < 10 ? `0${num}` : num}
                  </span>
                ))}
              </div>
              <div className="w-px h-5 bg-gray-200 mx-1"></div>
              <div className="flex gap-1">
                {draw.back.map((num, i) => (
                  <span key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 text-red-700 text-xs sm:text-sm font-bold flex items-center justify-center border border-red-200">
                    {num < 10 ? `0${num}` : num}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
