import { useCallback, useEffect, useRef, useState } from 'react';
import { appendGeneratedHistory, GENERATED_HISTORY_KEY, generateLottoSets, parseGeneratedHistory } from '../lib/lotto.ts';
import type { LottoSet } from '../lib/lotto.ts';

function loadHistory() {
  try { return parseGeneratedHistory(localStorage.getItem(GENERATED_HISTORY_KEY)); }
  catch { return []; }
}

export function useLottoGenerator(hotNumbers: ReadonlySet<number>) {
  const [isSmartMode, setSmartMode] = useState(true);
  const [currentSets, setCurrentSets] = useState<LottoSet[]>([]);
  const [history, setHistory] = useState(loadHistory);
  const [isGenerating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try { localStorage.setItem(GENERATED_HISTORY_KEY, JSON.stringify(history)); }
    catch { /* Storage restrictions must not prevent number generation. */ }
  }, [history]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const generateSets = useCallback((count: number) => {
    if (timer.current !== undefined) return;
    setGenerating(true);
    timer.current = setTimeout(() => {
      try {
        const sets = generateLottoSets(count, isSmartMode, hotNumbers);
        setCurrentSets(sets);
        setHistory(previous => appendGeneratedHistory(previous, sets));
      } finally {
        timer.current = undefined;
        setGenerating(false);
      }
    }, 600);
  }, [isSmartMode, hotNumbers]);

  const toggleSmartMode = useCallback(() => setSmartMode(previous => !previous), []);
  const clearHistory = useCallback(() => {
    if (window.confirm('确定要清空所有历史生成记录吗？')) setHistory([]);
  }, []);

  return { isSmartMode, currentSets, history, isGenerating, generateSets, toggleSmartMode, clearHistory };
}

export type LottoGenerator = ReturnType<typeof useLottoGenerator>;
