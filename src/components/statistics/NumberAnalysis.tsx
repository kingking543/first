import { LayoutGrid, Sparkles } from 'lucide-react';
import { formatOmission, rankNumbers } from '../../lib/statistics.ts';
import type { NumberStat } from '../../lib/statistics.ts';

interface Props { zone: '前区' | '后区'; rows: NumberStat[]; count: number; }
const numberText = (number: number) => String(number).padStart(2, '0');

export default function NumberAnalysis({ zone, rows, count }: Props) {
  const front = zone === '前区';
  const maximum = Math.max(1, ...rows.map(row => row.freq));
  const Icon = front ? LayoutGrid : Sparkles;
  const palette = front
    ? ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e40af']
    : ['#fef2f2', '#fecaca', '#f87171', '#dc2626', '#991b1b'];
  return (
    <section aria-label={`${zone}号码分析`} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="flex items-center gap-2 font-bold text-gray-800">
        <Icon aria-hidden="true" className={`h-5 w-5 ${front ? 'text-blue-500' : 'text-red-500'}`} />
        {zone}号码分析
      </h3>
      {front && (
        <div className="mt-4 space-y-3 border-b border-gray-100 pb-4 text-xs leading-relaxed">
          <div>
            <p className="mb-1.5 font-semibold text-gray-500">出现次数前 5</p>
            <ul aria-label="出现次数前五" className="grid grid-cols-5 gap-1.5">
              {rankNumbers(rows, 'freq').map(row => (
                <li key={row.number} aria-label={`前区${numberText(row.number)}，出现${row.freq}次`} className="flex min-w-0 flex-col items-center gap-1.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 sm:h-10 sm:w-10">{numberText(row.number)}</span>
                  <span className="whitespace-nowrap text-[11px] text-gray-600 sm:text-xs">{row.freq}次</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-gray-500">当前遗漏前 5</p>
            <ul aria-label="当前遗漏前五" className="grid grid-cols-5 gap-1.5">
              {rankNumbers(rows, 'overdue').map(row => (
                <li key={row.number} aria-label={`前区${numberText(row.number)}，当前遗漏${row.freq === 0 ? `至少${count}期` : formatOmission(row, count)}`} className="flex min-w-0 flex-col items-center gap-1.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-sm font-bold text-orange-700 sm:h-10 sm:w-10">{numberText(row.number)}</span>
                  <span className="whitespace-nowrap text-[11px] text-gray-600 sm:text-xs">{formatOmission(row, count)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <ul aria-label={`${zone}全部号码`} className={`mt-4 grid gap-1.5 sm:gap-2 ${front ? 'grid-cols-5 sm:grid-cols-7' : 'grid-cols-4 sm:grid-cols-6'}`}>
        {rows.map(row => {
          const omission = formatOmission(row, count);
          const level = row.freq === 0 ? -1 : Math.min(4, Math.ceil(row.freq / maximum * 5) - 1);
          const backgroundColor = level < 0 ? '#f8fafc' : palette[level];
          const color = level >= 3 ? '#ffffff' : front ? '#172554' : '#450a0a';
          return (
            <li key={row.number} aria-label={`${zone}${numberText(row.number)}，出现${row.freq}次，当前遗漏${row.freq === 0 ? `至少${count}期` : omission}`}
              className="flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-3 text-center"
              style={{ backgroundColor, color }}>
              <span className="text-base font-bold">{numberText(row.number)}</span>
              <span className="mt-1 text-xs">{row.freq}次</span>
              <span className="mt-0.5 whitespace-nowrap text-[10px] sm:text-xs">遗漏{omission}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-sm border border-gray-200 bg-slate-50" />未出现</span>
        <span className="inline-flex items-center gap-1.5">少<span role="img" aria-label="出现次数从少到多的五档颜色" className="inline-flex gap-0.5">{palette.map(fill => <span key={fill} className="h-3 w-4 rounded-sm" style={{ backgroundColor: fill }} />)}</span>多</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">颜色越深，所选期数内出现次数越多；颜色仅在本区内比较。</p>
    </section>
  );
}
