/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Settings2, X, Zap } from 'lucide-react';

interface Props { isSmartMode: boolean; onToggle: () => void; }
export default function SmartModeControl({ isSmartMode, onToggle }: Props) {
  const [showRules, setShowRules] = useState(false);
  return (
    <div className="relative bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2.5 rounded-xl mr-3 sm:mr-4 transition-colors ${isSmartMode ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm sm:text-base">量化增强模式</h3>
              <button
                aria-label="查看量化筛选规则"
                onMouseEnter={() => setShowRules(true)}
                onMouseLeave={() => setShowRules(false)}
                onClick={() => setShowRules(!showRules)}
                className="text-gray-300 hover:text-blue-500 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400">基于和值、奇偶比、冷热平衡等规则筛选</p>
          </div>
        </div>
        <button
          role="switch" aria-checked={isSmartMode} aria-label="量化增强模式"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isSmartMode ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSmartMode ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Quantitative Rules Popover */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#1A1A1A] text-white p-5 rounded-2xl shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-blue-400">
                <Settings2 className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">量化筛选逻辑</span>
              </div>
              <button aria-label="关闭筛选规则" onClick={() => setShowRules(false)} className="sm:hidden text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">1</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">和值控制：</span>前区总和锁定在 70-120 之间，符合历史高频区间。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">2</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">奇偶平衡：</span>强制控制奇偶比为 3:2 或 2:3，避免极端组合。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">3</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">冷热对冲：</span>自动包含 2-3 个高频热号，并搭配冷号平衡。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">4</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">连号限制：</span>限制连续数字出现，降低极低概率组合的生成。</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
