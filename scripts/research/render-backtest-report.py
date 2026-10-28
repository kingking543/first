from pathlib import Path
import json,html,re,hashlib,platform,subprocess
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/backtest-2026-10-28'
r=json.loads((OUT/'results.json').read_text());a=json.loads((OUT/'analysis.json').read_text());full=a['segments']['all'];late=a['segments']['late'];early=a['segments']['early'];names=['纯随机','当前量化','仅形态（移除热号约束）']
for h in r['histogram']:
 assert sum(h['front'])==sum(h['back'])==1000000
 assert sum(h['lateFront'])==sum(h['lateBack'])==300000
assert abs(full['mean'][0][0]-25/35)<.005
assert abs(full['mean'][0][1]-4/12)<.003

def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+['| '+' | '.join(map(str,row))+' |' for row in rows])
def results(seg):return table(['方法','前区平均命中/注','后区平均命中/注','五注至少一注前区≥3','五注至少一注后区全中','单注前区≥3且后区≥1'],[[names[m],f'{v[0]:.6f}',f'{v[1]:.6f}',f'{v[2]*100:.3f}%',f'{v[3]*100:.3f}%',f'{v[4]*100:.4f}%'] for m,v in enumerate(seg['mean'])])
def differences(seg):
 rows=[]
 for k,label,mult,unit in [(0,'前区平均命中',1,'个/注'),(1,'后区平均命中',1,'个/注'),(2,'五注至少一注前区≥3',100,'个百分点'),(3,'五注至少一注后区全中',100,'个百分点'),(4,'单注前区≥3且后区≥1',100,'个百分点')]:
  lo,hi=seg['ci95'][0][k];rows.append([label,f'{seg["difference"][0][k]*mult:+.6f} {unit}',f'[{lo*mult:+.6f}, {hi*mult:+.6f}] {unit}'])
 return table(['当前量化减纯随机','历史差值','95%区块重抽样区间'],rows)
N=len(r['perDraw']);first=r['perDraw'][0];last=r['perDraw'][-1];hold=r['perDraw'][700];earlylast=r['perDraw'][699]
coverage=table(['方法','五注前区不同号码数','五注后区不同号码数','符合当前全部满分规则比例'],[[names[i],f'{v[5]:.4f}',f'{v[6]:.4f}',f'{v[8]*100:.2f}%'] for i,v in enumerate(full['mean'])])
yearly=table(['年份','真实目标期数','随机前区均值','当前前区均值','当前减随机'],[[year,d['n'],f'{d["mean"][0][0]:.5f}',f'{d["mean"][1][0]:.5f}',f'{d["mean"][1][0]-d["mean"][0][0]:+.5f}'] for year,d in a['yearly'].items()])
fronttable=table(['前区命中数']+names,[[k]+[f'{r["histogram"][m]["front"][k]/10000:.4f}%（{r["histogram"][m]["front"][k]:,}注）' for m in range(3)] for k in range(6)])
backtable=table(['后区命中数']+names,[[k]+[f'{r["histogram"][m]["back"][k]/10000:.4f}%（{r["histogram"][m]["back"][k]:,}注）' for m in range(3)] for k in range(3)])
text=f'''# 历史回测与随机对照报告

评估日期：2026-10-28。本报告冻结评估当时的原量化规则与解释性对照。文中“当前量化”均指回测时的V1，不是后续新版。复现脚本已锁定baseline-lotto.ts原代码；后续产品调整不改变这里的历史结果。

## 结论

**在本次1000期历史样本、每期5注预算与所设模拟方案下，没有观察到当前量化逻辑稳定优于纯随机的命中优势。** 全段前区平均命中仅高{full['difference'][0][0]:.6f}个/注，最新300期反而低{-late['difference'][0][0]:.6f}个/注；这些差异的区块重抽样区间均跨过零，不能据此宣布提高或降低未来命中率，也不构成两者完全等效的证明。

较明确的产品发现是：**当前量化把五注前区覆盖从{full['mean'][0][5]:.2f}个不同号码压缩到{full['mean'][1][5]:.2f}个，且本次生成结果100%达到现有规则100分。** 分数表达的是满足规则，不是准确率；热号约束使组合更集中。

## 数据与核验

- 来源：[中国体彩网公开历史查询](https://www.lottery.gov.cn/kj/kjlb.html?dlt)所用gameNo=85历史接口；11页、每页100条。原始响应已压缩归档，逐页保存URL和SHA256。
- 实际下载1100期，选最新1050期用于研究：{r['audit']['earliest']['period']}期（{r['audit']['earliest']['date']}）至{r['audit']['latest']['period']}期（{r['audit']['latest']['date']}）。最早50期仅作预热，其后1000期为目标期。
- 目标期范围：{first['period']}期（{first['date']}）至{last['period']}期（{last['date']}）。较早700期截至{earlylast['period']}期；末段300期为{hold['period']}期（{hold['date']}）至{last['period']}期。
- 校验了彩种、号码范围、区内去重、期号/日期唯一性和顺序、同年期号连续及跨年001衔接；与项目中已核验的福建官方快照逐期比较了重叠50期，日期和号码完全一致。其余1000期未逐期做独立双源复验。跨年衔接不等于独立确认上一年最后期号。
- `data/history.json`中的fetchedAt及结果generatedAt是整理/运行时间，不是官方开奖发布时间，也不是原始响应的可独立证明下载时间。归档哈希证明所保存文件的完整性，不单独证明抓取时间。

## 实验如何保证可比较

1. 每个目标期只读取**之前50期**，按生产代码的最新在前顺序构造热号；当期及未来结果不进入生成输入。按时间隔离输入的理由参见[时间序列验证文档](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html)。
2. 纯随机和当前量化直接调用现有`generateLottoSets`，未另写一个近似算法替代。第三组只把热号评分贡献固定为25分，保留原和值/奇偶/连号规则、采样方式、最多100候选和≥90提前停止机制。
3. 每期每方法5注，重复200轮，三方法各100万注，共300万注。**相同的是每期注数/投注预算，计算量不同**：随机每注1个候选，筛选每注最多100个。
4. 各方法在同一轮/同一期使用相同伪随机流起点，便于配对；采用可复现Mulberry32和固定种子函数。200000组轮次/期号有199992个不同32位种子，即8次跨组合碰撞，影响微小；不声称所有流严格独立。
5. **真实历史样本仍是1000期，末段仍是300期。** 200轮仅减少固定历史结果上的模拟抽样误差，不能视为200份独立历史。
6. 方案在计算结果前内部固定，但没有外部预注册。最新300期是本次预先指定的**回溯末段检查**，不是前瞻验证，也不能证明规则设计者从未见过这些历史结果。没有据本次结果调参后再反复挑选同一末段。
7. 不计算投注收益、回本率或跨年奖级：历史奖级/奖金额度发生过变化，且本次未导入逐期奖金。下列事件是号码匹配指标，不能直接当成中奖率或某一奖级。

## 全段结果：1000期

{results(full)}

前区均值的纯随机理论基准为25/35≈0.714286，后区为4/12≈0.333333；模拟随机结果与之接近。随机五注至少一注前区≥3的理论值约{a['theory']['anyFront3']*100:.3f}%，后区全中约{a['theory']['anyBack2']*100:.3f}%，用于抽样实现的量级校准，不把有限模拟与理论值的差异当成策略优势。

## 末段检查：最新300期

{results(late)}

全段当前量化前区均值略高，末段略低，方向未保持；移除热号约束的组也没有显示明确的命中提升，**本报告不据此宣布一个新的胜出算法**。后区三组均为随机抽取，数值差异来自有限模拟，不能解释成已验证的后区预测能力差异。

## 差异是否足够可靠

先对每期200轮求平均，再以期为单位计算“当前量化−随机”的配对差；采用长度20期、2000次移动区块bootstrap，尽量保留相邻期依赖。红色零线右侧表示历史点估计较高，区间穿零表示本方法下不足以区分。

![历史差异与区间](difference-intervals.svg)

全段差值：

{differences(full)}

末段差值：

{differences(late)}

两个主指标是前区/后区每注平均命中。其他指标和分段用于解释，未作全套多重比较校正，不以某一条突出结果作上线依据。即使将两个主指标区间扩为97.5%来收紧双指标判断，全段及末段仍都跨零，结论不变；该扩展仅为报告中的补充保守检查。

区块长度20依赖近似平稳性假设，不保证已覆盖50期滚动窗口引入的全部依赖；有限样本、随机数实现和区块选择都会影响区间。区间描述给定数据与重抽样设定下的历史不确定性，不是未来开奖承诺。未发现显著优势，不等于证明差异严格为零。

## 组合分布：比命中均值更清楚的发现

{coverage}

![五注覆盖](batch-coverage.svg)

当前量化五注前区平均少覆盖{full['mean'][0][5]-full['mean'][1][5]:.4f}个号码，约减少{(1-full['mean'][1][5]/full['mean'][0][5])*100:.2f}%；移除热号约束后恢复到{full['mean'][2][5]:.2f}个。当前量化与随机的覆盖差95%区间为[{full['ci95'][0][5][0]:.4f}, {full['ci95'][0][5][1]:.4f}]个，显示本次样本中集中效应较稳定。**覆盖更广不等于单注中奖率更高**，只说明五注之间的分散程度。

现有评分可能值中90以上只有100，因此“≥90停止”几乎就是等待满分；本次当前量化100万注全部满分。纯随机约{full['mean'][0][8]*100:.2f}%也能满足现有满分规则。它是规则符合度，不能为预测准确性提供证据。

三组均未观察到同一五注内的完整重复组合；该事件本来就很罕见，不能把“加去重”描述为本次已证实能大幅提升命中。

## 分年检查（描述性）

{yearly}

各年期数不同，不能挑选其中表现最好的年份作为未来承诺。全段与末段才是本次预定的主要时间范围。

## 可讨论的优化方向

| 优先级 | 方向 | 本次证据与边界 |
| --- | --- | --- |
| 优先 | 处理100分展示/解释 | 满分几乎恒定，缺少区分度；可改为明确的规则符合度或逐条原因，不表示准确率。属于表达清晰度改进。 |
| 优先 | 五组联合控制重叠与覆盖 | 当前前区覆盖低于随机；可设计“同样5注、更分散”的候选方案再测。目标是组合多样性，不宣称单注预测提升。 |
| 可实验 | 放松热号硬约束 | 消融组覆盖恢复，但未证明命中更高。可把热号作为展示参考或降低约束，需讨论目标后再决定。 |
| 谨慎 | 调整历史窗口/经验阈值 | 30/50/100期、动态和值区间等本次未测试，属于新假设；不能用这份报告替它们背书。需另留检验期，防止在同一末段上反复调参。 |
| 不优先 | 给遗漏/后区冷热增加预测权重 | 本次没有支持证据；未测试的复杂规则不因“用更多历史”就更有效。 |
| 长期 | 保存生成版本、数据截止期号和目标期 | 可支持之后真正按时间前进的验证、对账和复现，避免事后挑选记录。 |

**建议讨论顺序：先明确希望优化“组合分散”还是“历史匹配指标”，再决定评分表达与热号约束如何调整。本报告阶段不直接替换生成器；后续用户确认后的实现另见quantified-v2-engineering-check.json。**

## 完整命中分布（各组100万注）

{fronttable}

{backtable}

在公平、独立开奖的前提下，合法固定单注的理论命中分布相同，头奖概率为1/{a['theory']['firstPrizeDenominator']:,}。100万注理论头奖期望不足0.05次，本次规模不适合识别头奖优势；不能以“有没有碰巧中头奖”评价算法。

## 复现与文件

- 预定方案：[protocol.md](protocol.md)
- 原始归档与来源哈希：[data/manifest.json](data/manifest.json)，同目录11份page-XX.json.gz。
- 规范化研究数据：[data/history.json](data/history.json)
- 逐期/逐轮模拟汇总：[results.json](results.json)；区间及分年统计：[analysis.json](analysis.json)。
- 回测所用原生成器SHA256：`{r['productionCodeSha256']}`；记录的Git基线：`{r['gitCommit']}`。
- 研究脚本、方案、数据、结果及运行环境哈希见：[reproducibility.json](reproducibility.json)。研究脚本尚未提交，单靠Git基线不足以复现，须保留本目录与scripts/research文件。

在项目根目录运行：

```sh
node --import tsx --test scripts/backtest.test.ts
node --import tsx scripts/research/run-backtest.ts
python3 scripts/research/analyze-backtest.py
python3 scripts/research/render-backtest-report.py
```

分析脚本需要numpy和matplotlib；报告生成仅使用Python标准库。运行会使用已归档原始响应，不再次联网；生成时间元数据可能变化，固定种子下指标数值可重现。归档分页URL已保存，可另行重新获取，但新增开奖后分页内容会变，不能用新下载的分页冒充原数据。
'''
(OUT/'report.md').write_text(text)

def inline(s):
 s=html.escape(s)
 s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
 s=re.sub(r'\*\*(.*?)\*\*',r'<strong>\1</strong>',s)
 return re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
lines=text.splitlines();parts=[];i=0
while i<len(lines):
 line=lines[i]
 if not line.strip():i+=1;continue
 if line.startswith('```'):
  block=[];i+=1
  while i<len(lines) and not lines[i].startswith('```'):block.append(lines[i]);i+=1
  parts.append('<pre><code>'+html.escape('\n'.join(block))+'</code></pre>');i+=1;continue
 if line.startswith('#'):
  level=len(line)-len(line.lstrip('#'));parts.append(f'<h{level}>'+inline(line[level:].strip())+f'</h{level}>');i+=1;continue
 if line.startswith('!['):
  m=re.match(r'!\[([^\]]*)\]\(([^)]+)\)',line);svg=(OUT/m[2]).read_text();svg=svg[svg.index('<svg'):];parts.append('<figure>'+svg+'<figcaption>'+html.escape(m[1])+'</figcaption></figure>');i+=1;continue
 if line.startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   cells=[c.strip() for c in lines[i].strip('|').split('|')]
   if not all(re.fullmatch(r'[-: ]+',c) for c in cells):rows.append(cells)
   i+=1
  parts.append('<div class="table"><table><thead><tr>'+''.join('<th>'+inline(c)+'</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in row)+'</tr>' for row in rows[1:])+'</tbody></table></div>');continue
 if line.startswith('- ') or re.match(r'^\d+\. ',line):
  items=[]
  while i<len(lines) and (lines[i].startswith('- ') or re.match(r'^\d+\. ',lines[i])):
   items.append(re.sub(r'^(?:- |\d+\. )','',lines[i]));i+=1
  parts.append('<ul>'+''.join('<li>'+inline(c)+'</li>' for c in items)+'</ul>');continue
 parts.append('<p>'+inline(line)+'</p>');i+=1
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>历史回测与随机对照报告</title><style>body{margin:0;background:#f5f7fb;color:#1f2937;font:15px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}main{max-width:1100px;margin:24px auto;padding:32px;background:white;border-radius:16px}h1{font-size:28px;line-height:1.4;color:#0f172a}h2{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:21px}a{color:#1d4ed8}li{margin:8px 0}.table{overflow:auto;margin:20px 0}table{border-collapse:collapse;min-width:620px;width:100%;font-size:13px}th,td{border-bottom:1px solid #e2e8f0;padding:10px;text-align:left;vertical-align:top}th{background:#eef2ff}tr:nth-child(even){background:#f8fafc}code{overflow-wrap:anywhere;background:#f1f5f9;padding:2px 4px}pre{overflow:auto;padding:16px;background:#f1f5f9}figure{margin:20px 0}figure svg{width:100%;height:auto}figcaption{text-align:center;color:#64748b;font-size:12px}@media(max-width:700px){main{margin:0;padding:20px;border-radius:0}h1{font-size:24px}body{font-size:14px}}</style><main>'''+''.join(parts)+'</main></html>'
(OUT/'report.html').write_text(page)
files=[ROOT/'scripts/research/baseline-lotto.ts',ROOT/'scripts/backtest.test.ts']+list((ROOT/'scripts/research').glob('*.*'))+[OUT/'protocol.md',OUT/'results.json',OUT/'analysis.json',OUT/'data/history.json',OUT/'data/manifest.json']
repro={'analysisPackages':{'numpy':'2.5.4','matplotlib':'3.11.2'},'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':platform.python_version(),'files':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},'note':'No changes to production generator/UI. Protocol fixed internally before results; not external preregistration. history.fetchedAt is normalization time.'}
(OUT/'reproducibility.json').write_text(json.dumps(repro,indent=2)+'\n')
print('Generated',OUT/'report.md',OUT/'report.html')
