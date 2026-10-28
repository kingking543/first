/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Check, Copy, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { scoreLabel } from '../lib/lotto.ts';
import type { LottoSet } from '../lib/lotto.ts';

interface Props { currentSets: LottoSet[]; isGenerating: boolean; copiedId: string | null; onGenerate: (count: number) => void; onCopy: (set: LottoSet) => void; onCopyAll: () => void; }
export default function NumberResults({ currentSets, isGenerating, copiedId, onGenerate, onCopy, onCopyAll }: Props) {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 sm:p-10 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-red-500"></div>

      <div className="space-y-6 sm:space-y-10 mb-8 sm:mb-12">
        <AnimatePresence mode="popLayout">
          {currentSets.length > 0 ? (
            currentSets.map((set, setIdx) => (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: setIdx * 0.1 }}
                className="relative group"
              >
                {set.isSmart && typeof set.score === 'number' && (
                  <div aria-label={scoreLabel(set)} title={scoreLabel(set)} className="absolute -top-5 right-0 sm:-right-4 flex items-center bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shadow-sm z-10">
                    <Zap className="w-2.5 h-2.5 text-blue-600 mr-1" />
                    <span className="text-[10px] font-bold text-blue-700">{set.score}分</span>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                  <div className="flex gap-1.5 sm:gap-3">
                    {set.front.map((num, i) => (
                      <motion.div
                        key={`front-${set.id}-${i}`}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: (setIdx * 0.1) + (i * 0.05), type: 'spring', stiffness: 260, damping: 20 }}
                        className="w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-sm sm:text-xl font-bold text-blue-700 shadow-sm"
                      >
                        {num < 10 ? `0${num}` : num}
                      </motion.div>
                    ))}
                  </div>
                  <div className="w-px h-9 sm:h-14 bg-gray-100 mx-0.5 sm:mx-1"></div>
                  <div className="flex gap-1.5 sm:gap-3">
                    {set.back.map((num, i) => (
                      <motion.div
                        key={`back-${set.id}-${i}`}
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: (setIdx * 0.1) + (i + 5) * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
                        className="w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center text-sm sm:text-xl font-bold text-red-700 shadow-sm"
                      >
                        {num < 10 ? `0${num}` : num}
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={() => onCopy(set)}
                    className="p-2 text-gray-300 hover:text-blue-500 transition-colors hidden sm:flex items-center"
                    title="复制此组"
                  >
                    {copiedId === set.id ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-12 text-gray-400 italic text-sm sm:text-base">点击下方按钮开始生成幸运号码</div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex w-full sm:w-auto gap-3">
          <button
            onClick={() => onGenerate(1)}
            disabled={isGenerating}
            className="flex-1 sm:flex-none group relative whitespace-nowrap px-3 py-4 sm:px-6 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-black/10 hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            生成一组
          </button>

          <button
            onClick={() => onGenerate(5)}
            disabled={isGenerating}
            className="flex-1 sm:flex-none group relative whitespace-nowrap px-3 py-4 sm:px-6 bg-blue-600 text-white rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            生成五组
          </button>
        </div>

        {currentSets.length > 0 && (
          <button
            onClick={onCopyAll}
            className="w-full sm:w-auto px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-semibold text-sm sm:text-base hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            {copiedId === 'all' ? (
              <><Check className="w-4 h-4 mr-2 text-green-500" />全部复制</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" />全部复制</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
