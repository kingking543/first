"""Analyze the frozen simulation with period-cluster moving-block bootstrap."""
import json, math, hashlib
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
font_path=Path('/System/Library/Fonts/STHeiti Light.ttc')
if font_path.exists():
 font_manager.fontManager.addfont(str(font_path))
 plt.rcParams['font.family']=font_manager.FontProperties(fname=str(font_path)).get_name()
 plt.rcParams['axes.unicode_minus']=False
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'reports/backtest-2026-10-28'
r=json.loads((OUT/'results.json').read_text())
x=np.array([d['means'] for d in r['perDraw']],dtype=float)
metrics=r['metrics']; methods=r['methods']; rng=np.random.default_rng(20261028)
analysis={'metrics':metrics,'methods':methods,'segments':{},'bootstrap':{'blockLength':20,'repetitions':2000,'seed':20261028},'theory':{}}
for label,section in [('all',slice(None)),('early',slice(0,700)),('late',slice(700,None))]:
 a=x[section]; n=len(a);delta=a[:,1:]-a[:,0,None,:]
 # Each entire period is one cluster; repeated Monte Carlo trials are already averaged.
 blocks=math.ceil(n/20);starts=rng.integers(0,n-20+1,size=(2000,blocks));idx=(starts[:,:,None]+np.arange(20)).reshape(2000,-1)[:,:n]
 bs=delta[idx].mean(axis=1)
 seg={'n':n,'mean':a.mean(axis=0).tolist(),'difference':delta.mean(axis=0).tolist(),'ci95':np.quantile(bs,[.025,.975],axis=0).transpose(1,2,0).tolist(),'ci975':np.quantile(bs,[.0125,.9875],axis=0).transpose(1,2,0).tolist()}
 analysis['segments'][label]=seg
frontprob=[math.comb(5,k)*math.comb(30,5-k)/math.comb(35,5) for k in range(6)]
backprob=[math.comb(2,k)*math.comb(10,2-k)/math.comb(12,2) for k in range(3)]
analysis['theory']={'frontMean':25/35,'backMean':4/12,'anyFront3':1-(1-sum(frontprob[3:]))**5,'anyBack2':1-(1-backprob[2])**5,'joint3and1':sum(frontprob[3:])*sum(backprob[1:]),'firstPrizeDenominator':math.comb(35,5)*math.comb(12,2),'frontHistogram':frontprob,'backHistogram':backprob}
trials=np.array(r['trials']);analysis['monteCarlo']={'trialMeanSD':trials.std(axis=0,ddof=1).tolist(),'differenceMeanSE':(trials[:,1:]-trials[:,0,None,:]).std(axis=0,ddof=1).__truediv__(math.sqrt(len(trials))).tolist()}
analysis['yearly']={year:{'n':sum(d['date'].startswith(year) for d in r['perDraw']),'mean':x[[d['date'].startswith(year) for d in r['perDraw']]].mean(axis=0).tolist()} for year in sorted(set(d['date'][:4] for d in r['perDraw']))}
(OUT/'analysis.json').write_text(json.dumps(analysis,indent=2)+'\n')
fig,axes=plt.subplots(2,2,figsize=(11,7),layout='constrained')
for ax,k,title,mult in zip(axes.flat,[0,1,2,3],['前区平均命中 / 注','后区平均命中 / 注','五注中至少一注前区命中≥3','五注中至少一注后区全中'],[1,1,100,100]):
 for y,(segment,arm,label,color) in enumerate([('all',0,'Current / all1000','#2563eb'),('all',1,'Shape only / all1000','#94a3b8'),('late',0,'Current / last300','#2563eb'),('late',1,'Shape only / last300','#94a3b8')]):
  s=analysis['segments'][segment];mean=s['difference'][arm][k]*mult;lo,hi=np.array(s['ci95'][arm][k])*mult
  ax.errorbar(mean,y,xerr=[[mean-lo],[hi-mean]],fmt='o',color=color,capsize=4)
 ax.axvline(0,color='#dc2626',linewidth=1);ax.set_yticks(range(4),['当前量化 / 全1000期','仅形态 / 全1000期','当前量化 / 末300期','仅形态 / 末300期']);ax.invert_yaxis();ax.set_title(title,fontsize=10);ax.grid(axis='x',alpha=.2);ax.set_xlabel('相对纯随机的差值'+('（百分点）' if mult==100 else '（命中个数）'))
fig.suptitle('历史差值与95%区块重抽样区间（跨零不支持明确优势）',fontsize=13)
fig.savefig(OUT/'difference-intervals.svg');fig.savefig(OUT/'difference-intervals.png',dpi=160);plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(9,3.5),layout='constrained')
for ax,k,title in zip(axes,[5,6],['五注前区平均覆盖号码数','五注后区平均覆盖号码数']):
 values=np.array(analysis['segments']['all']['mean'])[:,k];bars=ax.bar(['纯随机','当前量化','仅形态'],values,color=['#94a3b8','#2563eb','#60a5fa']);ax.bar_label(bars,fmt='%.2f');ax.set_ylim(0,max(values)*1.2);ax.set_title(title,fontsize=11);ax.grid(axis='y',alpha=.15)
fig.savefig(OUT/'batch-coverage.svg');fig.savefig(OUT/'batch-coverage.png',dpi=160);plt.close(fig)
for label,seg in analysis['segments'].items():
 print(label,seg['n'])
 for m,values in zip(methods,seg['mean']):print(m,dict(zip(metrics,values)))
 print('current-random',seg['difference'][0]);print('95%',seg['ci95'][0])
