/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Settings2, X, Zap } from 'lucide-react';

interface Props { isSmartMode: boolean; onToggle: () => void; }
export default function SmartModeControl({ isSmartMode, onToggle }: Props) {
  const [showRules, setShowRules] = useState(false);
  const rulesId = useId();
  return (
    <div className="relative bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center pr-3">
          <div className={`shrink-0 p-2.5 rounded-xl mr-3 sm:mr-4 transition-colors ${isSmartMode ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm sm:text-base">量化增强模式</h3>
              <button
                aria-label="查看量化筛选规则"
                aria-expanded={showRules}
                aria-controls={rulesId}
                onClick={() => setShowRules(!showRules)}
                className="text-gray-300 hover:text-blue-500 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400">综合组合形态与组间分散，分数表示规则符合度</p>
          </div>
        </div>
        <button
          role="switch" aria-checked={isSmartMode} aria-label="量化增强模式"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${isSmartMode ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSmartMode ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Quantitative Rules Popover */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            id={rulesId}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 max-h-[70vh] overflow-y-auto bg-[#1A1A1A] text-white p-5 rounded-2xl shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-blue-400">
                <Settings2 className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">量化筛选逻辑</span>
              </div>
              <button aria-label="关闭筛选规则" onClick={() => setShowRules(false)} className="text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">1</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">和值控制：</span>最多30分：前区和值越接近90，得分越高，偏离时逐步降低，不锁定固定区间。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">2</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">奇偶平衡：</span>最多25分：奇偶比为3:2或2:3得25分，1:4或4:1得16分，全奇或全偶得8分。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">3</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">历史参考：</span>最多5分：参考最近50期前十高频号码，包含1–3个得5分，其余得2分，不再强制包含热号。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">4</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">连号形态：</span>最多20分：相邻连号对数不超过1对得20分，2对得12分，3对及以上得4分。</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">5</div>
                <p className="text-gray-300 leading-relaxed"><span className="text-white font-semibold">组间分散：</span>最多20分：每组与其余组合的最大前区、后区重叠数，每个各扣3分，最低0分；生成一组时此项按20分计。</p>
              </div>
              <p className="text-gray-400 leading-relaxed">总分四舍五入为0–100分，只表示规则符合度，不是中奖概率。多组统筹选择以减少重叠，不以满分作为生成门槛。</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
