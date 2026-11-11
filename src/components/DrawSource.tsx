/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DRAW_SOURCES } from '../lib/draws.ts';
import type { DrawLoadStatus, DrawSnapshot } from '../lib/draws.ts';

interface Props { drawSnapshot: DrawSnapshot; drawStatus: DrawLoadStatus; }
export default function DrawSource({ drawSnapshot, drawStatus }: Props) {
  const source = DRAW_SOURCES[drawSnapshot.source ?? 'china-sporttery'];
  return (
    <section aria-label="开奖数据来源" className="mt-6 sm:mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
      <p className="font-semibold text-gray-700">
        数据来源：<a href={source.url} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">{source.name}</a>
      </p>
      <p className="mt-1 text-xs text-gray-600">最近 {drawSnapshot.draws.length} 期真实开奖 · {drawSnapshot.draws.at(-1)!.period}–{drawSnapshot.draws[0].period} 期</p>
      <p className="mt-1 text-xs text-gray-600">最新第 {drawSnapshot.draws[0].period} 期 · {drawSnapshot.draws[0].date}</p>
      <p className="mt-1 text-xs text-gray-500">官方核验时间：{new Date(drawSnapshot.fetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</p>
      <p role="status" className={`mt-2 text-xs ${drawStatus === 'saved' ? 'text-amber-700' : 'text-gray-500'}`}>
        {drawStatus === 'syncing' ? '正在向官方核验开奖，当前保留已保存的真实数据。' :
          drawStatus === 'live' ? '已向官方核验，统计和评分使用以上真实数据。' :
          '官方实时核验暂未成功，当前显示最近已核验快照，可重试刷新。'}
      </p>
    </section>
  );
}
