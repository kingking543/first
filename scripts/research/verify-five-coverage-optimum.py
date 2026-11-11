"""Research certificate for the global five-ticket any-prize coverage optimum.

No historical outcomes are optimized. Product code and prior reports are read only.
Run with NumPy >= 2.0 (the existing exact engine uses np.bitwise_count).
"""
import argparse
import hashlib
import html
import json
import platform
import time
from collections import Counter
from datetime import datetime
from fractions import Fraction
from itertools import combinations, combinations_with_replacement, permutations, product
from math import comb
from pathlib import Path
from zoneinfo import ZoneInfo

from backtest_v3_exact import ExactBatch, closed_form

ROOT = Path(__file__).resolve().parents[2]
PRIOR = ROOT / 'reports/backtest-2026-11-11'
OUT = ROOT / 'reports/coverage-optimum-2026-11-11'


def polynomial_front_no_win(active):
    """Independent coefficient calculation: active tickets need >=2, others >=3."""
    coefficients = [1] + [0] * 5
    factors = [[1, 5]] * active + [[1, 5, 10]] * (5 - active)
    factors += [[comb(10, k) for k in range(6)]]
    for factor in factors:
        coefficients = [sum(coefficients[d-k] * factor[k]
                            for k in range(min(d, len(factor)-1)+1))
                        for d in range(6)]
    return coefficients[5]


def analytic_certificate():
    denominator = comb(35, 5) * comb(12, 2)
    no_win = {k: polynomial_front_no_win(k) for k in range(3)}
    failure = no_win[0] + 20 * no_win[1] + 40 * no_win[2]
    optimum = Fraction(denominator-failure, denominator)
    baseline = closed_form()
    assert optimum == baseline['disjointFiveAnyPrize']
    assert optimum == Fraction(987995, 3060816)
    return {'winningOutcomes': denominator-failure, 'allOutcomes': denominator,
            'fraction': str(optimum), 'probability': float(optimum),
            'noWinFrontCountsByOneBackHitTickets': no_win,
            'backDrawClasses': {'automaticWin': 5, 'twoOneHits': 40,
                                'oneOneHit': 20, 'zeroHits': 1},
            'looseUnionBound': float(baseline['expectedWinningTicketsFive']),
            'randomFive': float(baseline['randomFiveAnyPrize']),
            'single': float(baseline['singleAnyPrize'])}


def split_lemma_exhaustive_check():
    """Independent literal enumeration, including unequal and impossible thresholds.

    All 220 unordered families of three size-2 sets in a five-number universe;
    all available shared-to-unused splits, modulo complementary partitions;
    all 4^3 labeled threshold vectors; draw sizes 1,2,3,4. This tests the
    splitting lemma even where full disjointness is infeasible (six slots>five).
    """
    universe = set(range(5))
    sets = [set(c) for c in combinations(range(5), 2)]
    draws = {k: [set(c) for c in combinations(range(5), k)] for k in range(1, 5)}
    thresholds = list(product(range(4), repeat=3))
    count = 0
    local_splits = 0
    for indices in combinations_with_replacement(range(len(sets)), 3):
        family = [sets[i] for i in indices]
        unused = sorted(universe - set.union(*family))
        if not unused:
            continue
        before_hits = {k: [[len(d & s) for s in family] for d in ds]
                       for k, ds in draws.items()}
        before = {(k, th): sum(any(h[i] >= th[i] for i in range(3)) for h in hs)
                  for k, hs in before_hits.items() for th in thresholds}
        for shared in sorted(set.union(*family)):
            owners = [i for i, s in enumerate(family) if shared in s]
            if len(owners) < 2:
                continue
            # Keep first owner in A: complementary partitions give equal counts.
            for moved_count in range(1, len(owners)):
                for moved in combinations(owners[1:], moved_count):
                    for fresh in unused:
                        after = [s.copy() for s in family]
                        for i in moved:
                            after[i].remove(shared)
                            after[i].add(fresh)
                        local_splits += 1
                        for k, ds in draws.items():
                            hits = [[len(d & s) for s in after] for d in ds]
                            for th in thresholds:
                                value = sum(any(h[i] >= th[i] for i in range(3))
                                            for h in hits)
                                assert value >= before[k, th], (family, after, k, th)
                                count += 1
    return {'universe': 5, 'tickets': 3, 'ticketSize': 2,
            'thresholds': [0, 1, 2, 3], 'drawSizes': [1, 2, 3, 4],
            'families': comb(len(sets)+3-1, 3), 'localSplits': local_splits,
            'thresholdAndDrawSizeComparisons': count, 'decreases': 0}


def disjoint_batch():
    return [{'front': list(range(5*i+1, 5*i+6)), 'back': [2*i+1, 2*i+2]}
            for i in range(5)]


def copy_batch(tickets):
    return [{z: list(t[z]) for z in ['front', 'back']} for t in tickets]


def split_to_disjoint(tickets, engine):
    current = copy_batch(tickets)
    trace = [{'winningOutcomes': engine.numerator(current),
              'frontCoverage': len(set.union(*(set(t['front']) for t in current))),
              'backCoverage': len(set.union(*(set(t['back']) for t in current)))}]
    for zone, size in [('front', 35), ('back', 12)]:
        while True:
            owners = {v: [i for i, t in enumerate(current) if v in t[zone]]
                      for v in range(1, size+1)}
            shared = next((v for v, indexes in owners.items() if len(indexes) > 1), None)
            if shared is None:
                break
            fresh = next(v for v, indexes in owners.items() if not indexes)
            moved = owners[shared][-1]
            current[moved][zone].remove(shared)
            current[moved][zone].append(fresh)
            current[moved][zone].sort()
            value = engine.numerator(current)
            assert value >= trace[-1]['winningOutcomes']
            trace.append({'zone': zone, 'ticket': moved, 'replaced': shared,
                          'newNumber': fresh, 'winningOutcomes': value,
                          'frontCoverage': len(set.union(*(set(t['front']) for t in current))),
                          'backCoverage': len(set.union(*(set(t['back']) for t in current)))})
    assert trace[-1]['frontCoverage'] == 25 and trace[-1]['backCoverage'] == 10
    return {'initial': tickets, 'final': current, 'steps': trace}


def set_partitions(values):
    if not values:
        yield ()
        return
    first, *rest = values
    for partition in set_partitions(rest):
        yield ((first,),) + partition
        for i in range(len(partition)):
            yield partition[:i] + ((first,) + partition[i],) + partition[i+1:]


def partition_batch(front_partition, back_partition):
    tickets = [{'front': [], 'back': []} for _ in range(5)]
    for zone, partition, ticket_size in [('front', front_partition, 5),
                                         ('back', back_partition, 2)]:
        value = 1
        for block in partition:
            for i in block:
                tickets[i][zone].append(value)
            value += 1
        for ticket in tickets:
            while len(ticket[zone]) < ticket_size:
                ticket[zone].append(value)
                value += 1
    return tickets


def partition_representatives():
    """Enumerate paired partitions modulo simultaneous relabeling of five tickets.

    One common number per block, with all remaining slots private. This is a
    bounded structural experiment, not the basis for the global proof.
    """
    parts = list(set_partitions(list(range(5))))
    assert len(parts) == 52
    relabelings = list(permutations(range(5)))
    encoded = [[tuple(sorted(sum(1 << p[i] for i in block) for block in part))
                for p in relabelings] for part in parts]
    seen = set()
    for i, front in enumerate(parts):
        for j, back in enumerate(parts):
            key = min(zip(encoded[i], encoded[j]))
            if key not in seen:
                seen.add(key)
                yield front, back


def audited_inputs():
    manifest = json.loads((PRIOR / 'reproducibility.json').read_text())
    names = ['reports/backtest-2026-11-11/theory-batches.json',
             'reports/backtest-2026-11-11/exact-probabilities.json',
             'scripts/research/backtest_v3_exact.py']
    hashes = {}
    for name in names:
        digest = hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
        assert digest == manifest['files'][name], name
        hashes[name] = digest
    return hashes


def run_experiments():
    start = time.perf_counter()
    inputs = audited_inputs()
    analytic = analytic_certificate()
    lemma = split_lemma_exhaustive_check()
    print('Small-universe lemma:', json.dumps(lemma), flush=True)
    engine = ExactBatch()
    optimum = analytic['winningOutcomes']
    base = disjoint_batch()
    assert engine.numerator(base) == optimum
    neighbors = []
    # Every legal one-number substitution at the disjoint reference batch.
    for zone, size in [('front', 35), ('back', 12)]:
        for i, ticket in enumerate(base):
            for old in ticket[zone]:
                for new in range(1, size+1):
                    if new in ticket[zone]:
                        continue
                    batch = copy_batch(base)
                    batch[i][zone].remove(old)
                    batch[i][zone].append(new)
                    value = engine.numerator(batch)
                    assert value <= optimum
                    neighbors.append({'zone': zone, 'ticket': i, 'old': old,
                                      'new': new, 'winningOutcomes': value})
    print('All single substitutions:', len(neighbors), flush=True)
    structures = []
    for front, back in partition_representatives():
        batch = partition_batch(front, back)
        value = engine.numerator(batch)
        assert value <= optimum
        structures.append({'frontPartition': front, 'backPartition': back,
                           'tickets': batch, 'winningOutcomes': value})
    print('Paired-partition representatives:', len(structures), flush=True)
    batches = json.loads((PRIOR/'theory-batches.json').read_text())['batches']
    counts = Counter()
    traces = []
    for row in batches:
        if counts[row['method']] >= 3:
            continue
        counts[row['method']] += 1
        trace = split_to_disjoint(row['tickets'], engine)
        assert trace['steps'][-1]['winningOutcomes'] == optimum
        traces.append({'method': row['method'], 'context': row['context'],
                       'trial': row['trial'], **trace})
    print('Split paths:', len(traces), 'steps:', sum(len(t['steps'])-1 for t in traces), flush=True)
    prior_exact = json.loads((PRIOR/'exact-probabilities.json').read_text())
    assert all(row['winningOutcomes'] <= optimum for row in prior_exact['samples'])
    result = {'generatedAt': datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(),
              'assumptions': ['Five tickets chosen before a draw, each with five distinct front numbers and two distinct back numbers.',
                              'Conditional on all selection information and randomness, the next draw is uniform over C(35,5)*C(12,2) outcomes.',
                              'Objective: at least one ticket wins any prize; winnings and expected payout are different objectives.'],
              'analytic': analytic, 'lemmaExhaustion': lemma,
              'singleSubstitutions': neighbors, 'pairedPartitions': structures,
              'splitPaths': traces, 'priorFixedBatchesChecked': len(prior_exact['samples']),
              'currentV2Prior100BatchMean': prior_exact['methods']['currentV2']['mean'],
              'uniqueVennStructuresComputed': len(engine.cache),
              'inputHashes': inputs, 'python': platform.python_version(),
              'numpy': __import__('numpy').__version__,
              'elapsedSeconds': time.perf_counter()-start}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'certificate.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    return result


def render_report(result):
    a = result['analytic']
    p = a['probability']
    current = result['currentV2Prior100BatchMean']
    gap = (p-current)*100
    neighbor = result['singleSubstitutions']
    structures = result['pairedPartitions']
    steps = sum(len(t['steps'])-1 for t in result['splitPaths'])
    tied = sum(x['winningOutcomes'] == a['winningOutcomes'] for x in neighbor)
    display_time = datetime.fromisoformat(result['generatedAt']).strftime('%Y-%m-%d %H:%M（北京时间）')
    body = f'''# 五注精确组合优化：全局最优性补充报告

研究时间：{display_time}。本报告补充此前V3回测；不新增开奖样本、不修改生产生成器。

## 结论

在公平、独立开奖、开奖前固定五注、每注5前区＋2后区、目标为“至少一注中任意奖”的条件下，**前区25个不同号码、后区10个不同号码的完全分散方案，已经达到全局最大概率**：

**987995 / 3060816 = {p*100:.10f}%（约32.28%）。**

这不是只在本次搜索样本中最好：下面的拆分论证覆盖所有合法五注，包括根据历史或随机生成的五注。可能存在并列最优，本报告不主张唯一性。

| 方法 | 五注至少一注任意奖 |
| --- | ---: |
| 独立均匀随机：解析平均 | {a['randomFive']*100:.4f}% |
| 当前量化V2：此前100个固定批次条件概率的样本均值 | {current*100:.4f}% |
| 完全分散：全局最大值 | {p*100:.4f}% |

相对当前量化上述样本均值的差为{gap:.4f}个百分点。当前生成器总体均值未被精确求出；32.28%上限则与生成器、历史窗口无关。

## 为什么重叠无法超过完全分散

任意奖判定为：前区命中≥3，或前区≥2且后区≥1，或后区命中2。

先固定后区的开奖结果。每注对前区的要求变成：后区0个时至少3个，后区1个时至少2个，后区2个时已经中奖。因此，各注都是达到某个命中门槛即中奖。

假设前区号码a同时属于多注，号码z没有被任何一注使用。将持有a的注分成非空的两组A、B，只把B组中的a换成z，每注仍有五个不同前区号。

固定本次抽奖除a、z之外的所有号码后，逐对比较等可能的开奖结果：

- a、z都没开出：每注命中数不变。
- a、z都开出：每注命中数仍不变，因为原来每注只持有a，替换后每注只持有a或z。
- 只开出一个：比较“开a”和“开z”这一对等可能结果。如果其他号码已经让某注中奖，两种方案都赢；否则设U、V分别表示给A组、B组增加一次命中就能使组内至少一注中奖。原方案中奖结果数为1[U或V]，拆分后为1[U]+1[V]。后者总不小于前者。

因此，每次拆开重叠号码，都不会降低至少一注中奖概率。只要前区还有重叠，25个号码位置所用的不同号码就少于25，35个号码中必有未使用号码。重复拆分，最终前区完全分散。

接着固定任一前区开奖结果。每注对后区的门槛是：前区≥3时已经中奖，前区=2时至少1个，前区≤1时至少2个。同样的拆分论证适用。后区共10个号码位置，号码池为12，也能拆到完全分散。

由此，任何五注都可以在中奖概率不下降的情况下变成前后区完全分散。所有完全分散五注仅差号码重命名，概率相同，所以它们达到全局最大值。

如果生成器使用历史、评分或随机数：给定这些信息，生成结果仍是一批固定五注；每批均不超过上限，平均也不超过。这里要求未来开奖在这些信息条件下仍公平、独立。

## 精确概率的独立计算

总开奖结果数为C(35,5)×C(12,2)＝{a['allOutcomes']}。

完全分散的五个后区二元组，将66种后区结果分为：

- 5种：恰好命中某注两个后区号，必有一注中奖。
- 40种：分别命中不同两注的一个后区号。
- 20种：命中一注的一个后区号，另一个号未被使用。
- 1种：两个后区号均未被使用。

设k是“命中一个后区号”的注数，五注均未中奖的前区结果数为：

Nₖ＝[x⁵] (1＋5x)ᵏ (1＋5x＋10x²)⁽⁵⁻ᵏ⁾ (1＋x)¹⁰。

其中N₀＝302127，N₁＝261927，N₂＝224227。因此：

P＝1－(N₀＋20N₁＋40N₂) / {a['allOutcomes']}
  ＝{a['winningOutcomes']} / {a['allOutcomes']}
  ＝987995 / 3060816。

多项式计数、原报告的分配组合求和、完整结果空间的命中状态枚举，三种实现结果一致。

## 可复现验证

证明决定全局结论，下面的有限计算用于检查实现和发现反例，不能单独替代证明。

- 小号码池穷举：三组各2个号、号码池5个，全部{result['lemmaExhaustion']['families']}种无序集合族；有可拆分条件时，检查所有不同拆分、各注门槛0/1/2/3、抽取1/2/3/4个号码。共{result['lemmaExhaustion']['localSplits']}种局部拆分、{result['lemmaExhaustion']['thresholdAndDrawSizeComparisons']}项比较，概率下降0次。门槛0代表已中奖，门槛3代表无法中奖。
- 完全分散参考五注的全部{len(neighbor)}个合法单号码替换：均未超过上限。其中{tied}个维持上限，均只是用未使用号码替换，不引入重叠；其余{len(neighbor)-tied}个引入重叠，概率更低。
- 前后区各自52种票号分区，成对组合后按五注的共同重命名合并，共{len(structures)}类代表结构：均未超过上限。每个分区块共享一个号码，其余位置为各注独有；这不是全部重叠结构的穷举。
- 从旧报告八种方法各取最先列出的3批，共{len(result['splitPaths'])}批，逐步拆分，共{steps}步：每一步精确概率不下降，最后都达到上限。选取规则确定，不挑选最好批次。
- 旧报告全部{result['priorFixedBatchesChecked']}个固定批次均未超过上限；其来源与精确计算器SHA256均已核对旧清单。

每个完整五注批次的概率用原报告ExactBatch计算，等价于枚举全部21425712种等可能开奖；通过集合成员结构缓存复用计算。本次实际计算{result['uniqueVennStructuresComputed']}种结构，用时{result['elapsedSeconds']:.2f}秒（不代表独立历史样本数）。原始整数结果、拆分路径和输入哈希见certificate.json。

## 对产品的含义

如果继续以五注至少一注中任意奖为目标，完全分散已经足够；无需继续搜索声称超过32.28%的五注算法。此前33.35%是有效但不紧的并集粗上界，本次将其收紧到可达到的32.28%。旧报告“尚未证明全局最优”的表述保留为当时研究状态，由本补充报告更新。

单注任意奖概率仍为约6.67%。五注期望中奖注数仍为约0.333524。五个不同完整组合的头奖概率仍为5/21425712。更容易至少中一次任意奖，不等于提高头奖概率、期望奖金或盈利概率；本次没有研究回本、收益、不同预算、复式、胆拖或派奖。

生产生成器、量化模式名称、页面和部署均未改动。是否采用完全分散，应另行决定。

## 依据与复现

- [官方游戏规则](https://m.lottery.gov.cn/ksjz/m/yxgz_dlt/)：开奖空间与中奖条件。
- [2026年奖级合并的官方说明](https://www.nmtc.com.cn/zxdt/30026.html)：13种中奖条件不变。
- [原V3回测报告](../backtest-2026-11-11/report.html)：历史数据与随机对照。
- verify-five-coverage-optimum.py：拆分验证、代表结构与精确计算、报告生成。
- certificate.json：所有计算记录。reproducibility.json：脚本、报告与输入SHA256。

复现：使用原报告的NumPy环境，运行 python scripts/research/verify-five-coverage-optimum.py。使用 --check-only 可只跑解析核算与小号码池拆分穷举，不写报告。
'''
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'report.md').write_text(body)
    # A compact Markdown subset renderer, keeping source text and math searchable.
    import re
    lines = body.splitlines()
    content = []
    in_list = False
    table_lines = []
    def inline(s):
        s = html.escape(s)
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
    def flush_table():
        if not table_lines:
            return
        rows = [[c.strip() for c in line.strip('|').split('|')] for line in table_lines]
        content.append('<div class="scroll"><table><thead><tr>'+''.join('<th>'+inline(c)+'</th>' for c in rows[0])+'</tr></thead><tbody>')
        for row in rows[2:]:
            content.append('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>')
        content.append('</tbody></table></div>')
        table_lines.clear()
    for line in lines:
        if line.startswith('|'):
            table_lines.append(line)
            continue
        flush_table()
        if in_list and not line.startswith('- '):
            content.append('</ul>')
            in_list = False
        if line.startswith('# '):
            content.append('<h1>'+inline(line[2:])+'</h1>')
        elif line.startswith('## '):
            content.append('<h2>'+inline(line[3:])+'</h2>')
        elif line.startswith('- '):
            if not in_list:
                content.append('<ul>')
                in_list = True
            content.append('<li>'+inline(line[2:])+'</li>')
        elif line:
            content.append('<p>'+inline(line)+'</p>')
    flush_table()
    if in_list:
        content.append('</ul>')
    css = '''*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font:16px/1.9 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}main{max-width:960px;margin:32px auto;padding:32px 38px;background:white;border:1px solid #dde5ef;border-radius:18px}h1{font-size:30px;line-height:1.4}h2{font-size:22px;margin:36px 0 14px;border-top:1px solid #e3e9f1;padding-top:22px}p{margin:14px 0}strong{color:#087457}a{color:#1d4ed8}li{margin:10px 0}ul{padding-left:24px}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:0;font-size:15px}th,td{padding:12px 14px;border-bottom:1px solid #e3e9f1;text-align:left}th{background:#eef4ff}td:last-child{white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}tr:last-child td{color:#087457;font-weight:700}@media(max-width:640px){main{margin:0;padding:22px 18px;border:0;border-radius:0}h1{font-size:25px}h2{font-size:21px}body{font-size:15px}}'''
    document = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>五注精确组合优化：全局最优性补充报告</title><style>'+css+'</style><main>'+''.join(content)+'</main></html>\n'
    (OUT/'report.html').write_text(document)
    paths = [Path(__file__).resolve(), ROOT/'scripts/research/backtest_v3_exact.py',
             OUT/'certificate.json', OUT/'report.md', OUT/'report.html']
    manifest = {'generatedAt': result['generatedAt'], 'python': result['python'],
                'numpy': result['numpy'], 'command': 'PYTHONDONTWRITEBYTECODE=1 python scripts/research/verify-five-coverage-optimum.py',
                'inputHashes': result['inputHashes'],
                'files': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                          for p in paths}}
    (OUT/'reproducibility.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print('Wrote', OUT, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    if args.check_only:
        print(json.dumps({'analytic': analytic_certificate(),
                          'lemmaExhaustion': split_lemma_exhaustive_check()},
                         ensure_ascii=False, indent=2))
    else:
        render_report(run_experiments())
