/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AppHeader from './components/AppHeader.tsx';
import DrawSource from './components/DrawSource.tsx';
import GeneratorView from './components/GeneratorView.tsx';
import StatisticsBoundary from './components/StatisticsBoundary.tsx';
import { useOfficialDraws } from './hooks/useOfficialDraws.ts';
import { useLottoGenerator } from './hooks/useLottoGenerator.ts';
import { useClipboard } from './hooks/useClipboard.ts';
import { calculateDrawStats } from './lib/draws.ts';
import { buildHotNumbers, formatLottoSet } from './lib/lotto.ts';
import type { AppView } from './components/AppHeader.tsx';
import type { LottoSet } from './lib/lotto.ts';

const StatisticsView = lazy(() => import('./components/statistics/StatisticsView.tsx'));

export default function App() {
  const [view, setView] = useState<AppView>('generator');
  const { snapshot, status, refresh } = useOfficialDraws();
  const stats = useMemo(() => calculateDrawStats(snapshot.draws), [snapshot.draws]);
  const hotNumbers = useMemo(() => buildHotNumbers(stats.frontData), [stats.frontData]);
  const generator = useLottoGenerator(hotNumbers);
  const { copiedId, error: copyError, copy } = useClipboard();
  const onCopy = useCallback((set: LottoSet) => {
    void copy(set.id, formatLottoSet(set));
  }, [copy]);
  const onCopyAll = useCallback(() => {
    void copy('all', generator.currentSets.map(formatLottoSet).join('\n'));
  }, [copy, generator.currentSets]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AppHeader view={view} onChange={setView} />
        <AnimatePresence mode="wait">
          {view === 'generator' ? (
            <motion.div
              key="generator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 sm:space-y-8"
            >
              <GeneratorView
                generator={generator}
                copiedId={copiedId}
                draws={snapshot.draws.slice(0, 5)}
                drawStatus={status}
                onRefresh={refresh}
                onCopy={onCopy}
                onCopyAll={onCopyAll}
              />
            </motion.div>
          ) : (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <StatisticsBoundary>
                <Suspense fallback={<div role="status" className="min-h-[300px] rounded-3xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">正在加载数据分析…</div>}>
                  <StatisticsView stats={stats} drawCount={snapshot.draws.length} />
                </Suspense>
              </StatisticsBoundary>
            </motion.div>
          )}
        </AnimatePresence>
        {copyError && <p role="alert" className="mt-4 text-sm text-red-600">{copyError}</p>}
        <DrawSource drawSnapshot={snapshot} drawStatus={status} />
        <footer className="mt-12 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} 大乐透号码生成器</p>
          <p className="mt-1">彩票有风险，投注需谨慎。本工具仅供娱乐。</p>
        </footer>
      </div>
    </div>
  );
}
