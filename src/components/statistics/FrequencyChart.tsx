/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarChart3, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DrawStats } from '../../lib/draws.ts';

interface Props { stats: DrawStats; drawCount: number; }
export default function FrequencyChart({ stats, drawCount }: Props) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
          前区号码出现频率 (最近{drawCount}期)
        </h3>
        <div className="text-xs text-gray-400 flex items-center">
          <Info className="w-3 h-3 mr-1" />
          基于真实历史开奖
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
              {stats.frontData.map((entry) => (
                <Cell key={entry.number} fill={entry.freq > 10 ? '#3b82f6' : '#93c5fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
