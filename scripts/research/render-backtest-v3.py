"""Build a standalone human-readable report with standard scientific plots."""
import base64,hashlib,html,json,math,platform,subprocess
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/backtest-2026-11-11'
r=json.loads((OUT/'results.json').read_text());a=json.loads((OUT/'analysis.json').read_text());e=json.loads((OUT/'exact-probabilities.json').read_text())
for font in ['/System/Library/Fonts/STHeiti Light.ttc','/System/Library/Fonts/PingFang.ttc']:
 if Path(font).exists():
  font_manager.fontManager.addfont(font);plt.rcParams['font.family']=font_manager.FontProperties(fname=font).get_name();break
plt.rcParams.update({'axes.unicode_minus':False,'svg.hashsalt':'dlt-backtest-20261111','axes.spines.top':False,'axes.spines.right':False,'font.size':11})
methods=r['methods'];labels={'random':'独立随机','currentV2':'当前量化V2','v2NoHistory':'量化去历史项','disjoint':'五注完全分散','uniqueBackPairs':'后区组合去重','hot50':'近50期热号','cold50':'近50期冷号','overdue50':'近50期遗漏'}
old=a['segments']['old'];late=a['segments']['late'];forward=a['segments']['forward'];theory=e['closedForm'];m=methods.index('disjoint');current=methods.index('currentV2')
pct=lambda value:f'{value*100:.2f}%'
pp=lambda value:f'{value*100:+.2f}'
ci=lambda values:f'[{values[0]*100:+.2f}, {values[1]*100:+.2f}]'
colors=['#94a3b8' if method=='random' else '#059669' if method=='disjoint' else '#2563eb' if method=='currentV2' else '#64748b' for method in methods]
def save(fig,name):
 fig.savefig(OUT/f'{name}.png',dpi=170,bbox_inches='tight');fig.savefig(OUT/f'{name}.svg',bbox_inches='tight');plt.close(fig)
fig,ax=plt.subplots(figsize=(10.5,5),layout='constrained');values=np.array(old['mean'])[:,1]*100
bars=ax.barh([labels[x] for x in methods],values,color=colors);ax.bar_label(bars,labels=[f'{v:.2f}%' for v in values],padding=5);ax.invert_yaxis();ax.set_xlim(0,37);ax.set_xlabel('五注至少一注中任意奖的批次比例');ax.set_title('回顾1000期：同样五注，批次中奖频率不同');ax.grid(axis='x',alpha=.15);ax.set_axisbelow(True);save(fig,'historical-batch-win')
fig,ax=plt.subplots(figsize=(10.5,5),layout='constrained')
for i,method in enumerate(methods[1:]):
 mean=old['difference'][i][1]*100;lo,hi=np.array(old['primarySimultaneousCI95'][i])*100
 ax.errorbar(mean,i,xerr=[[mean-lo],[hi-mean]],fmt='o',color=colors[i+1],capsize=5)
ax.set_yticks(range(7),[labels[x] for x in methods[1:]]);ax.invert_yaxis();ax.axvline(0,color='#dc2626',linewidth=1);ax.set_xlabel('相对独立随机的差值（百分点）');ax.set_title('原1000期主指标：七项比较的名义95%同时区间');ax.grid(axis='x',alpha=.15);save(fig,'paired-differences')
fig,axes=plt.subplots(1,2,figsize=(11,4.2),layout='constrained')
names=['独立随机','当前量化V2','完全分散'];cols=['#94a3b8','#2563eb','#059669'];single=theory['singleAnyPrize']['probability']
for ax,vals,title,limit in [(axes[0],[single]*3,'任意固定单注：理论概率相同',8),(axes[1],[theory['randomFiveAnyPrize']['probability'],e['methods']['currentV2']['mean'],theory['disjointFiveAnyPrize']['probability']],'五注至少一注：组合结构影响覆盖',38)]:
 bars=ax.bar(names,np.array(vals)*100,color=cols);ax.bar_label(bars,labels=[pct(v) for v in vals],padding=4);ax.set_ylim(0,limit);ax.set_ylabel('概率（%）');ax.set_title(title,fontsize=12);ax.grid(axis='y',alpha=.15);ax.set_axisbelow(True)
fig.suptitle('公平、独立开奖假设下；当前量化五注数值为100个固定批次的均值',fontsize=12);save(fig,'exact-coverage')
mainrows=[];newrows=[];exactrows=[]
for i,method in enumerate(methods):
 mainrows.append([labels[method],pct(old['mean'][i][0]),pct(old['mean'][i][1]),'基准' if i==0 else pp(old['difference'][i-1][1])+' 个百分点','—' if i==0 else ci(old['primarySimultaneousCI95'][i-1])])
 newrows.append([labels[method],pct(late['mean'][i][1]),pct(forward['mean'][i][1]),pct(forward['mean'][i][0])])
 exactrows.append([labels[method],pct(e['methods'][method]['mean']),pct(e['methods'][method]['min'])+'–'+pct(e['methods'][method]['max'])])
def mdtable(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+['| '+' | '.join(map(str,row))+' |' for row in rows])
def table(headers,rows):return '<div class="table-scroll"><table><thead><tr>'+''.join('<th>'+html.escape(x)+'</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in row)+'</tr>' for row in rows)+'</tbody></table></div>'
primaryheaders=['方法','单注任意奖','五注至少一注任意奖','相对随机差值','差值同时区间：百分点']
newheaders=['方法','原末300期：五注任意奖','新增5期：五注任意奖','新增5期：单注任意奖']
exactheaders=['方法','100批次条件概率均值','这100批次的最小–最大值']
exact_disjoint=theory['disjointFiveAnyPrize']['probability'];random_prob=theory['randomFiveAnyPrize']['probability'];current_prob=e['methods']['currentV2']['mean']
gain=(exact_disjoint-current_prob)*100;relative=(exact_disjoint/current_prob-1)*100
first=r['perDraw'][0];last=r['perDraw'][-1];cutoff=datetime.fromisoformat(r['audit']['fetchedAt'].replace('Z','+00:00')).astimezone(ZoneInfo('Asia/Shanghai')).strftime('%Y-%m-%d %H:%M')
summary=f'尚未找到历史冷热或遗漏策略提高单注中奖概率的证据。进一步可验证的空间在“五注如何组合”：完全分散的五注任意奖概率为{pct(exact_disjoint)}；当前量化100个固定批次的均值为{pct(current_prob)}，样本均值相差约{gain:.2f}个百分点。'
limitations='上述数学概率依赖公平、独立开奖假设。任意奖包含最低奖，中奖不等于回本或盈利。任意固定单注的理论概率均为'+pct(single)+'；五个不同完整组合的头奖概率均为5/21425712。完全分散只改变同一批次的中奖集中程度，五注期望中奖注数仍为'+f"{theory['expectedWinningTicketsFive']['probability']:.6f}"+'，未增加。'
method_descriptions=[
 '当前量化直接调用生产生成器；去历史项量化仅将热号集合置空，其余形态与组间分散算法不变。',
 '完全分散：均匀抽取25个不重复前区号、10个不重复后区号，按随机顺序分成五注。单注仍均匀随机；仅适用于本轮五注预算。',
 '后区组合去重：允许单个后区号跨注重叠，但五个二元组合不同；前区独立随机。',
 '热号、冷号、遗漏只使用此前50期，按平均名次给前后区0.75–1.25的弱权重，不做窗口或参数搜索。遗漏未在50期出现时统一截断50。']
recommendations=[
 ('优先讨论：五注完全分散',f'回顾1000期五注中奖批次为{pct(old["mean"][m][1])}，当前量化为{pct(old["mean"][current][1])}；原末300期为{pct(late["mean"][m][1])}对{pct(late["mean"][current][1])}。精确条件概率核算也显示结构性覆盖优势。若采用，目标应写成“同预算五注更容易至少中一注，包含最低奖”，不能写成提高单注或头奖概率。本轮未证明它是所有五注组合中的全局最优。'),
 ('暂不强化：热号、冷号、遗漏', '三种历史加权对随机的主指标同时区间均跨0，末300期方向也不一致；去掉当前量化的历史项后结果接近，不能据微小差异证明热号有效。没有理由据本轮结果再加大历史权重或引入更复杂预测模型。'),
 ('继续积累：上线后的真实新期次',f'目前仅新增5期，即使每期重复1000次，真实时间样本仍为5。此段当前量化{pct(forward["mean"][current][1])}、完全分散{pct(forward["mean"][m][1])}，不足以支持稳定性结论。后续应冻结方案后继续积累新开奖；本报告不改生产算法。')]
rule_url='https://m.lottery.gov.cn/ksjz/m/yxgz_dlt/'
unchanged_url='https://www.nmtc.com.cn/zxdt/30026.html'
md=['# 历史回测与随机对照报告 V3','',f'2026-11-11 · 数据核验截止 {cutoff}（北京时间） · 生产基线 {r["gitCommit"][:7]}','',summary,'',limitations,'','## 本次样本与方法','',f'原始已归档1100期重新验SHA256；原1050期规范化数据加5期新增，共1055期。前50期预热，回测目标1005期（{first["period"]} / {first["date"]} 至 {last["period"]} / {last["date"]}）。中央最新100期与旧档95期重叠一致，福建最新50期和已发布50期全部交叉核对一致。','', '原1000期每期每方法50轮；新增5期每期1000轮；每轮五注。每方法合计275000模拟注，八方法合计2200000注。模拟轮次用于减小抽样噪声，不能增加独立历史样本数。各段按真实期次先平均，未用重复次数给新增期加权。','']+['- '+s for s in method_descriptions]+['','## 原1000期：回顾性比较','',mdtable(primaryheaders,mainrows),'','![历史五注中奖比例](historical-batch-win.png)','', '原1000期在上一轮研究中已经使用，原末300期也参与过V2工程检验，均为回顾/探索性结果。表内区间针对五注任意奖主指标的七项对随机比较：按真实期次聚类、长度20期移动区块bootstrap20000次，采用Bonferroni名义95%同时区间；不能据此推断未来稳定预测能力。','', '![差值同时区间](paired-differences.png)','', '另做长度50期、5000次区块敏感性分析，完整95%区间见analysis.json。近似bootstrap p值以零假设中心化差值计算并作Holm校正，离散并列值用1e-12容差；这些p值不是精确检验，尾部分位数仍有重抽样数值误差。末300期、分年、次指标均属探索性，未纳入该七项主比较的同时覆盖声明。','','## 末300期与新增5期','',mdtable(newheaders,newrows),'', '新增段为26124、26125、26126、26127、26128，日期2026-10-31至2026-11-09。当前V2在这些期次之前已固定；本轮新候选策略是事后提出，且检索中已经看到公开最新结果，因此不能称预注册前瞻或盲测。新增5期只作描述，不作强显著性判断。','','## 与历史结果独立的数学核算','', '![单注与五注组合概率](exact-coverage.png)','', f'均匀随机五注的平均批次概率可解析求出：{pct(random_prob)}；只去重后区组合为{pct(theory["uniqueBackPairsFiveAnyPrize"]["probability"])}；前后区完全分散为{pct(exact_disjoint)}（精确分数{theory["disjointFiveAnyPrize"]["fraction"]}）。完全分散相对独立随机提高{(exact_disjoint-random_prob)*100:.2f}个百分点。','', f'当前量化100个预先固定生成批次的条件概率均值为{pct(current_prob)}；完全分散比这份样本均值高{gain:.2f}个百分点（相对约{relative:.1f}%）。这不是当前生成器总体均值的精确估计，也不是某一期中奖保证。','',mdtable(exactheaders,exactrows),'', '每个固定批次都完整计算C(35,5)×C(12,2)=21425712种等可能结果的中奖事件数量；枚举通过前区命中状态压缩，与全枚举等价。100批次/方法取自原1000期中等距20个仅含此前数据的上下文，每上下文5种子。表中的最小–最大值及JSON中的p025/p975为这100个批次条件概率的分布，不是生成器总体均值的置信区间。','', '任意固定单注中奖概率精确为6187/92752（约6.670476%）。五注预期中奖注数约0.333524保持不变；分散让中奖更少集中在同一批次的多注上。利用并集上界，五注至少一注中奖不超过五注预期中奖注数约33.35%；这是粗上界，不是已证明可达到的优化目标。单注头奖为1/21425712，五个不同完整组合至少一注头奖为5/21425712，不随冷热、形态或分散方法提高。','','## 可以优化的方向','']
for title,body in recommendations:md += ['### '+title,'',body,'']
md += ['## 规则依据与可复现文件','',f'任意中奖事件统一为前区≥3，或前区≥2且后区≥1，或后区=2。[官方游戏规则]({rule_url})列明相应13种中奖条件；2026年自26014期调整九个奖级为七个，[官方说明]({unchanged_url})确认13种中奖条件保持不变。本次数据最早2019年9月，按统一中奖事件比较，不混算不同时期奖金、追加投注、派奖或收益率。','', '- protocol.md：计算前固定方案；data/manifest.json及压缩原始响应：数据审计。','- results.json：逐期均值、原1000期/末300期/新5期联合命中分布、每轮汇总和输入哈希。','- analysis.json：聚类区间、多重比较、区块敏感性、分年及模拟误差。','- theory-batches.json、exact-probabilities.json：800个预先固定批次和精确条件概率。','- reproducibility.json：全部研究脚本、生产基线、数据与结果的SHA256及复现命令。','', '本报告保留旧报告，不改动当前量化模式、页面、生产开奖数据或部署配置。']
(OUT/'report.md').write_text('\n'.join(md)+'\n')
def image(name,caption):
 content=base64.b64encode((OUT/f'{name}.png').read_bytes()).decode()
 return f'<figure><div class="chart-scroll"><img alt="{html.escape(caption)}" src="data:image/png;base64,{content}"></div><figcaption>{html.escape(caption)}</figcaption></figure>'
body=f'''<header><p class="eyebrow">研究报告 · 2026-11-11</p><h1>历史回测与随机对照 V3</h1><p class="sub">截至 {cutoff} · 最新26128期 · 生产基线 {r['gitCommit'][:7]}</p><p class="lead">{summary}</p></header>
<div class="cards"><div><b>1005</b><span>真实回测期次：1000旧期＋5新期</span></div><div><b>32.28%</b><span>完全分散五注至少一注任意奖</span></div><div><b>6.67%</b><span>任意固定单注理论概率</span></div></div>
<aside>{limitations}</aside>
<section><h2>本次检查了什么</h2><p>八种方法，各275000模拟注；全部真实开奖逐期只使用此前50期。原1100期原始归档与SHA256复验，选用原1050期加5期新增，前50期预热。中央100期、福建50期与已发布50期重叠记录全部一致。</p><ul>{''.join('<li>'+s+'</li>' for s in method_descriptions)}</ul><p class="note">原1000期各50轮，新5期各1000轮；增加模拟次数不等于增加真实样本。按真实期次先平均，各段内每期等权。</p></section>
<section><h2>原1000期：五注更分散，中奖批次更多</h2>{table(primaryheaders,mainrows)}{image('historical-batch-win','历史数据的模拟频率，不是未来中奖承诺。')}
<p>原1000期和末300期均已被此前研究查看，本轮结果属于回顾性比较。没有找到冷热或遗漏加权提高单注中奖概率的稳定证据。</p>
{image('paired-differences','真实期次聚类，长度20期区块bootstrap20000次；七项主比较Bonferroni名义95%同时区间。')}
<p class="note">区块50的敏感性结果、Holm校正的零假设中心化近似p值、分年及模拟误差详见analysis.json。次指标、末300期和年度分组为探索性，不能延用本图的同时覆盖声明。</p></section>
<section><h2>新增5期：不足以验证稳定预测能力</h2>{table(newheaders,newrows)}<p>新增期为26124–26128，日期2026-10-31至2026-11-09。当前V2此前已固定；本轮新策略是事后提出，且已见公开最新结果，不能称预注册前瞻或盲测。</p></section>
<section><h2>数学核算：优化的是五注的覆盖结构</h2>{image('exact-coverage','每个固定批次穷举全部21425712种完整开奖结果；当前量化五注数值为100个批次的条件概率均值。')}
<p>独立随机五注解析概率{pct(random_prob)}；后区组合去重{pct(theory['uniqueBackPairsFiveAnyPrize']['probability'])}；完全分散{pct(exact_disjoint)}。完全分散比随机高{(exact_disjoint-random_prob)*100:.2f}个百分点。</p>
<p>当前量化样本均值{pct(current_prob)}，完全分散约高{gain:.2f}个百分点。完全分散不是已证明的全局最优，样本均值也不是生成器总体的精确期望。</p>
<details><summary>查看八种方法的100批次条件概率分布</summary>{table(exactheaders,exactrows)}<p class="note">取自等距20个过去数据上下文，各5种子。每个批次概率是精确值，但100批次均值仍是抽样结果；最小–最大值及JSON分位数不是生成器均值置信区间。</p></details>
<p>任意固定单注理论中奖概率为6187/92752。五个不同完整组合至少一注头奖概率均为5/21425712；五注预期中奖注数仍为0.333524。并集粗上界约33.35%仅是上界，未证明可以达到。任意奖含最低奖，中奖不等于回本。</p></section>
<section><h2>建议讨论的优化</h2>{''.join('<article><h3>'+title+'</h3><p>'+body+'</p></article>' for title,body in recommendations)}</section>
<section><h2>依据与复现</h2><p>现行中奖事件：前区≥3，或前区≥2且后区≥1，或后区=2。<a href="{rule_url}">官方游戏规则</a>；<a href="{unchanged_url}">2026年奖级合并、13种条件不变的官方说明</a>。不跨年混算奖金、派奖或收益。</p><p>完整方法见protocol.md；原始来源及校验见data/manifest.json；逐期结果见results.json；不确定性分析见analysis.json；全部脚本与SHA256见reproducibility.json。</p><p class="note">生产文件未修改，旧报告保留。本报告不发布任何选号或部署变更。</p></section>'''
css='''*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#172033;font:16px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}main{max-width:1100px;margin:0 auto;padding:40px 24px 70px}header{padding:10px 0 24px}.eyebrow{color:#2563eb;font-weight:700;letter-spacing:.08em}h1{font-size:36px;line-height:1.3;margin:12px 0}h2{font-size:24px;line-height:1.5;margin:0 0 18px}h3{font-size:18px;margin:0 0 8px}.sub,.note,figcaption{color:#657187;font-size:14px}.lead{font-size:19px;max-width:1000px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:10px 0 22px}.cards>div,section,aside{background:white;border:1px solid #e0e6ef;border-radius:18px;padding:24px}.cards b{display:block;font-size:32px;color:#136d51}.cards span{font-size:14px;color:#657187}aside{background:#eef4ff;border-color:#d7e4ff;margin-bottom:24px}section{margin-bottom:24px}article{padding:18px 0;border-top:1px solid #e8edf4}article:first-of-type{border-top:0}p{margin:12px 0}.table-scroll,.chart-scroll{overflow-x:auto;max-width:100%}table{border-collapse:collapse;width:100%;min-width:690px;font-size:14px;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:13px 12px;border-bottom:1px solid #e6ebf3}th{background:#f1f5fb;color:#3d4b62}tr:nth-child(4){background:#edf9f4}figure{margin:26px 0}.chart-scroll img{width:100%;min-width:640px;height:auto;display:block}figcaption{margin-top:8px}a{color:#1d4ed8}summary{cursor:pointer;color:#1d4ed8;font-weight:600}details{margin:20px 0}ul{padding-left:24px}@media(max-width:640px){main{padding:22px 14px 40px}h1{font-size:27px}h2{font-size:21px}.lead{font-size:17px}.cards{grid-template-columns:1fr;gap:10px}.cards>div{padding:14px 18px}.cards b{font-size:27px}.cards span{display:block}section,aside{padding:19px 16px;border-radius:15px}body{font-size:15px}}@media print{body{background:white}main{max-width:none;padding:0}section,aside{break-inside:avoid;border:0;padding:12px 0}.cards{grid-template-columns:repeat(3,1fr)}.table-scroll,.chart-scroll{overflow:visible}table,.chart-scroll img{min-width:0}details{display:block}summary{display:none}}'''
(OUT/'report.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>历史回测与随机对照 V3 · 2026-11-11</title><style>'+css+'</style><main>'+body+'</main></html>\n')
# Separate final manifest covers all scripts and artifacts, beyond the simulator input hashes.
paths=[p for p in (ROOT/'scripts/research').iterdir() if ('v3' in p.name) and p.is_file()]+[ROOT/'scripts/backtest-v3.test.ts']
paths += [ROOT/p for p in r['sourceHashes']]
paths+= [p for p in OUT.rglob('*') if p.is_file() and p.name!='reproducibility.json']
manifest={'generatedAt':datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(),'gitCommit':r['gitCommit'],'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':platform.python_version(),'computeNumpy':'2.3.5','plotNumpy':np.__version__,'matplotlib':matplotlib.__version__,'commands':['npx tsx scripts/research/prepare-backtest-v3.ts --from-archive --check-only  # offline SHA and normalization verification','npx tsx scripts/research/run-backtest-v3.ts --offset N --stride 4  # N=0,1,2,3, wait for all four','npx tsx scripts/research/merge-backtest-v3.ts','python scripts/research/analyze-backtest-v3.py','npx tsx scripts/research/sample-backtest-v3-theory.ts','python scripts/research/calculate-backtest-v3-exact.py','MPLCONFIGDIR=/private/tmp/dlt-v3-mpl-cache python scripts/research/render-backtest-v3.py','npx tsx --test scripts/backtest-v3.test.ts','python scripts/research/test_backtest_v3_exact.py'],'files':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths))}}
(OUT/'reproducibility.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print('Report HTML, Markdown, three PNG/SVG figures and full hash manifest written.')
