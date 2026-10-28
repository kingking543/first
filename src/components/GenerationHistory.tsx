/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Check, Copy, History, Trash2, Zap } from 'lucide-react';
import { scoreLabel } from '../lib/lotto.ts';
import type { LottoSet } from '../lib/lotto.ts';

interface Props { history: LottoSet[]; copiedId: string | null; onClear: () => void; onCopy: (set: LottoSet) => void; }
export default function GenerationHistory({ history, copiedId, onClear, onCopy }: Props) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center text-gray-700 font-bold text-sm sm:text-base">
          <History className="w-5 h-5 mr-2 text-gray-400" />
          历史生成记录
        </div>
        {history.length > 0 && (
          <button onClick={onClear} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center transition-colors">
            <Trash2 className="w-3.5 h-3.5 mr-1" />清空
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
        {history.length > 0 ? (
          history.map((set) => (
            <div key={set.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex gap-0.5 min-[375px]:gap-1">
                  {set.front.map((n) => (
                    <span key={n} className="w-6 h-6 min-[375px]:w-7 min-[375px]:h-7 sm:w-9 sm:h-9 rounded-full bg-blue-50 text-blue-600 text-xs sm:text-sm font-bold flex items-center justify-center border border-blue-100">
                      {n < 10 ? `0${n}` : n}
                    </span>
                  ))}
                </div>
                <div className="w-px h-6 bg-gray-100"></div>
                <div className="flex gap-0.5 min-[375px]:gap-1">
                  {set.back.map((n) => (
                    <span key={n} className="w-6 h-6 min-[375px]:w-7 min-[375px]:h-7 sm:w-9 sm:h-9 rounded-full bg-red-50 text-red-600 text-xs sm:text-sm font-bold flex items-center justify-center border border-red-100">
                      {n < 10 ? `0${n}` : n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {set.isSmart && typeof set.score === 'number' && (
                  <span className="inline-flex shrink-0" title={scoreLabel(set)}>
                    <Zap className="w-3 h-3 text-blue-400" aria-label={scoreLabel(set)} />
                  </span>
                )}
                <button aria-label="复制此组生成号码" onClick={() => onCopy(set)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100">
                  {copiedId === set.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-gray-400 text-sm">暂无历史生成记录</div>
        )}
      </div>
    </div>
  );
}
