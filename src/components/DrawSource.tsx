/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OFFICIAL_SOURCE_URL } from '../lib/draws.ts';
import type { DrawLoadStatus, DrawSnapshot } from '../lib/draws.ts';

interface Props { drawSnapshot: DrawSnapshot; drawStatus: DrawLoadStatus; }
export default function DrawSource({ drawSnapshot, drawStatus }: Props) {
  return (
    <section aria-label="开奖数据来源" className="mt-6 sm:mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
      <p className="font-semibold text-gray-700">
        数据来源：<a href={OFFICIAL_SOURCE_URL} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">中国体彩网</a>
      </p>
      <p className="mt-1 text-xs text-gray-600">最近 {drawSnapshot.draws.length} 期真实开奖 · {drawSnapshot.draws.at(-1)!.period}–{drawSnapshot.draws[0].period} 期</p>
      <p className="mt-1 text-xs text-gray-600">最新第 {drawSnapshot.draws[0].period} 期 · {drawSnapshot.draws[0].date}</p>
      <p className="mt-1 text-xs text-gray-500">官方采集时间：{new Date(drawSnapshot.fetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</p>
      <p role="status" className={`mt-2 text-xs ${drawStatus === 'saved' ? 'text-amber-700' : 'text-gray-500'}`}>
        {drawStatus === 'syncing' ? '正在核对站点开奖，当前展示已保存的真实数据。' :
          drawStatus === 'live' ? '已读取站点最新数据，统计和筛选均使用以上真实开奖。' :
          '暂未读取到站点更新，当前展示已保存的真实开奖，可重试刷新。'}
      </p>
    </section>
  );
}
