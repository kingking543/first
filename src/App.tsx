/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Copy, History, Trash2, Check, Sparkles, BarChart3, LayoutGrid, Info, ArrowUpRight, Clock, Zap, Settings2, Trophy, Calendar, HelpCircle, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface LottoSet {
  id: string;
  front: number[];
  back: number[];
  timestamp: number;
  isSmart?: boolean;
  score?: number;
}

interface WinningDraw {
  period: string;
  date: string;
  front: number[];
  back: number[];
}

// Mock recent winning draws
const RECENT_WINNING_DRAWS: WinningDraw[] = [
  { period: '26032', date: '2026-03-21', front: [5, 12, 18, 24, 31], back: [4, 9] },
  { period: '26031', date: '2026-03-18', front: [2, 8, 15, 22, 33], back: [1, 11] },
  { period: '26030', date: '2026-03-14', front: [7, 14, 21, 28, 35], back: [6, 10] },
  { period: '26029', date: '2026-03-11', front: [3, 11, 19, 27, 30], back: [5, 8] },
  { period: '26027', date: '2026-03-07', front: [1, 9, 17, 25, 32], back: [2, 12] },
];

// Mock historical data (50 sets) for analysis demonstration
const MOCK_HISTORY: Omit<LottoSet, 'id' | 'timestamp'>[] = Array.from({ length: 50 }, () => {
  const front: number[] = [];
  while (front.length < 5) {
    const num = Math.floor(Math.random() * 35) + 1;
    if (!front.includes(num)) front.push(num);
  }
  const back: number[] = [];
  while (back.length < 2) {
    const num = Math.floor(Math.random() * 12) + 1;
    if (!back.includes(num)) back.push(num);
  }
  return { front: front.sort((a, b) => a - b), back: back.sort((a, b) => a - b) };
});

export default function App() {
  const [view, setView] = useState<'generator' | 'stats'>('generator');
  const [isSmartMode, setIsSmartMode] = useState(true);
  const [currentSets, setCurrentSets] = useState<LottoSet[]>([]);
  const [history, setHistory] = useState<LottoSet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  // Statistics Calculation (used for smart generation)
  const stats = useMemo(() => {
    const frontFreq = Array(36).fill(0);
    const backFreq = Array(13).fill(0);
    const frontOverdue = Array(36).fill(MOCK_HISTORY.length);

    MOCK_HISTORY.forEach((draw, index) => {
      draw.front.forEach(num => {
        frontFreq[num]++;
        if (frontOverdue[num] === MOCK_HISTORY.length) frontOverdue[num] = index;
      });
      draw.back.forEach(num => backFreq[num]++);
    });

    const frontData = Array.from({ length: 35 }, (_, i) => ({
      number: i + 1,
      freq: frontFreq[i + 1],
      overdue: frontOverdue[i + 1],
    }));

    const backData = Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      freq: backFreq[i + 1],
    }));

    return { frontData, backData, frontFreq, backFreq };
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('lotto_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('lotto_history', JSON.stringify(history));
  }, [history]);

  // Quantitative Scoring Function
  const calculateScore = (front: number[], back: number[]) => {
    let score = 0;
    
    // 1. Sum Range (Ideal: 70-120)
    const sum = front.reduce((a, b) => a + b, 0);
    if (sum >= 70 && sum <= 120) score += 30;
    else if (sum >= 50 && sum <= 140) score += 15;

    // 2. Odd/Even Ratio (Ideal: 3:2 or 2:3)
    const odds = front.filter(n => n % 2 !== 0).length;
    if (odds === 2 || odds === 3) score += 25;
    else score += 10;

    // 3. Hot/Cold Balance (Ideal: 2-3 hot numbers)
    // Hot numbers are top 10 in frequency
    const hotNumbers = [...stats.frontData].sort((a, b) => b.freq - a.freq).slice(0, 10).map(d => d.number);
    const hotCount = front.filter(n => hotNumbers.includes(n)).length;
    if (hotCount >= 2 && hotCount <= 3) score += 25;
    else score += 10;

    // 4. Consecutive Numbers (Ideal: 0 or 1 pair)
    let consecutiveCount = 0;
    for (let i = 0; i < front.length - 1; i++) {
      if (front[i+1] - front[i] === 1) consecutiveCount++;
    }
    if (consecutiveCount <= 1) score += 20;

    return score;
  };

  const generateSets = useCallback((count: number = 1) => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const newSets: LottoSet[] = [];
      
      for (let s = 0; s < count; s++) {
        let bestSet: { front: number[], back: number[], score: number } | null = null;
        const iterations = isSmartMode ? 100 : 1;

        for (let i = 0; i < iterations; i++) {
          const front: number[] = [];
          while (front.length < 5) {
            const num = Math.floor(Math.random() * 35) + 1;
            if (!front.includes(num)) front.push(num);
          }
          front.sort((a, b) => a - b);

          const back: number[] = [];
          while (back.length < 2) {
            const num = Math.floor(Math.random() * 12) + 1;
            if (!back.includes(num)) back.push(num);
          }
          back.sort((a, b) => a - b);

          const score = calculateScore(front, back);
          if (!bestSet || score > bestSet.score) {
            bestSet = { front, back, score };
          }
          if (isSmartMode && score >= 90) break;
        }

        if (bestSet) {
          newSets.push({
            id: Math.random().toString(36).substr(2, 9),
            front: bestSet.front,
            back: bestSet.back,
            timestamp: Date.now(),
            isSmart: isSmartMode,
            score: bestSet.score,
          });
        }
      }

      setCurrentSets(newSets);
      setHistory(prev => [...newSets, ...prev].slice(0, 50));
      setIsGenerating(false);
    }, 600);
  }, [isSmartMode, stats]);

  const copyToClipboard = (set: LottoSet) => {
    const text = `前区: ${set.front.join(', ')} | 后区: ${set.back.join(', ')}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(set.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const copyAllToClipboard = () => {
    const text = currentSets.map(set => `前区: ${set.front.join(', ')} | 后区: ${set.back.join(', ')}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空所有历史记录吗？')) {
      setHistory([]);
    }
  };

  const topFrequentFront = [...stats.frontData].sort((a, b) => b.freq - a.freq).slice(0, 5);
  const topOverdueFront = [...stats.frontData].sort((a, b) => b.overdue - a.overdue).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
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
                onClick={() => setView('generator')}
                className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'generator' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                号码生成
              </button>
              <button
                onClick={() => setView('stats')}
                className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'stats' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                数据分析
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'generator' ? (
            <motion.div
              key="generator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Smart Mode Toggle with Integrated Rules */}
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
                    onClick={() => setIsSmartMode(!isSmartMode)}
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
                        <button onClick={() => setShowRules(false)} className="sm:hidden text-gray-500">
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

              {/* Main Generator Card */}
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
                          {set.isSmart && (
                            <div className="absolute -top-3 right-0 sm:-right-4 flex items-center bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shadow-sm z-10">
                              <Zap className="w-2.5 h-2.5 text-blue-600 mr-1" />
                              <span className="text-[8px] font-bold text-blue-700">{set.score}</span>
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
                              onClick={() => copyToClipboard(set)}
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
                      onClick={() => generateSets(1)}
                      disabled={isGenerating}
                      className="flex-1 sm:flex-none group relative px-6 py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-black/10 hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                      生成一组
                    </button>
                    
                    <button
                      onClick={() => generateSets(5)}
                      disabled={isGenerating}
                      className="flex-1 sm:flex-none group relative px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm sm:text-base shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成五组
                    </button>
                  </div>
                  
                  {currentSets.length > 0 && (
                    <button
                      onClick={copyAllToClipboard}
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

              {/* History Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div className="flex items-center text-gray-700 font-bold text-sm sm:text-base">
                    <History className="w-5 h-5 mr-2 text-gray-400" />
                    历史记录
                  </div>
                  {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />清空
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
                  {history.length > 0 ? (
                    history.map((set) => (
                      <div key={set.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex gap-1">
                            {set.front.map((n) => (
                              <span key={n} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-blue-50 text-blue-600 text-xs sm:text-sm font-bold flex items-center justify-center border border-blue-100">
                                {n < 10 ? `0${n}` : n}
                              </span>
                            ))}
                          </div>
                          <div className="w-px h-6 bg-gray-100"></div>
                          <div className="flex gap-1">
                            {set.back.map((n) => (
                              <span key={n} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-red-50 text-red-600 text-xs sm:text-sm font-bold flex items-center justify-center border border-red-100">
                                {n < 10 ? `0${n}` : n}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {set.isSmart && <Zap className="w-3 h-3 text-blue-400 shrink-0" title={`量化评分: ${set.score}`} />}
                          <button onClick={() => copyToClipboard(set)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100">
                            {copiedId === set.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-gray-400 text-sm">暂无历史记录</div>
                  )}
                </div>
              </div>

              {/* Recent Winning Numbers Section (Moved to Bottom) */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                    近 5 期开奖号码
                  </h3>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">Official Data</span>
                </div>
                <div className="space-y-3">
                  {RECENT_WINNING_DRAWS.map((draw) => (
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
            </motion.div>
          ) : (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Quantitative Rules Info (Removed from stats view as it's now a popover) */}

              {/* Summary Cards */}
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

              {/* Frequency Chart */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    前区号码出现频率 (最近50期)
                  </h3>
                  <div className="text-xs text-gray-400 flex items-center">
                    <Info className="w-3 h-3 mr-1" />
                    基于模拟历史数据
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.frontData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="number" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f8f9fa' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="freq" radius={[4, 4, 0, 0]}>
                        {stats.frontData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.freq > 10 ? '#3b82f6' : '#93c5fd'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="mt-12 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} 大乐透号码生成器</p>
          <p className="mt-1">彩票有风险，投注需谨慎。本工具仅供娱乐。</p>
        </footer>
      </div>
    </div>
  );
}
