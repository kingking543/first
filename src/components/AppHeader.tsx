/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { BarChart3, LayoutGrid, Sparkles } from 'lucide-react';

export type AppView = 'generator' | 'stats';
interface Props { view: AppView; onChange: (view: AppView) => void; }
export default function AppHeader({ view, onChange }: Props) {
  return (
    <header className="text-center mb-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center justify-center p-2 bg-blue-50 rounded-full mb-4"
      >
        <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wider">大乐透助手</span>
      </motion.div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">大乐透号码助手</h1>

      {/* View Switcher */}
      <div className="flex justify-center mt-6">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex shadow-inner">
          <button
            onClick={() => onChange('generator')}
            className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'generator' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            号码生成
          </button>
          <button
            onClick={() => onChange('stats')}
            className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'stats' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            数据分析
          </button>
        </div>
      </div>
    </header>
  );
}
