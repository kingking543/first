"""Period-cluster paired analysis; Monte Carlo repeats are not extra history."""
import json,math
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/backtest-2026-11-11'
r=json.loads((OUT/'results.json').read_text());x=np.array([d['means'] for d in r['perDraw']]);methods=r['methods'];metrics=r['metrics']
def bootstrap(a,block,count,seed):
    n=len(a);delta=a[:,1:]-a[:,0,None,:];obs=delta.mean(axis=0);rng=np.random.default_rng(seed)
    c=np.concatenate([np.zeros_like(delta[:1]),delta.cumsum(axis=0)],axis=0);sums=c[block:]-c[:-block]
    full,remainder=divmod(n,block);answer=np.empty((count,)+obs.shape)
    for begin in range(0,count,256):
        end=min(begin+256,count);starts=rng.integers(0,n-block+1,size=(end-begin,full+(remainder>0)))
        value=sums[starts[:,:full]].sum(axis=1)
        if remainder:value+=c[starts[:,-1]+remainder]-c[starts[:,-1]]
        answer[begin:end]=value/n
    p=(1+(np.abs(answer[:,:,1]-obs[None,:,1])>=np.abs(obs[None,:,1])-1e-12).sum(axis=0))/(count+1)
    order=np.argsort(p);holm=np.empty_like(p);running=0
    for rank,index in enumerate(order):running=max(running,min(1,p[index]*(len(p)-rank)));holm[index]=running
    return {'n':n,'mean':a.mean(axis=0).tolist(),'difference':obs.tolist(),'ci95':np.quantile(answer,[.025,.975],axis=0).transpose(1,2,0).tolist(),'primarySimultaneousCI95':np.quantile(answer[:,:,1],[.05/(2*7),1-.05/(2*7)],axis=0).T.tolist(),'primaryApproxBootstrapP':p.tolist(),'primaryHolmP':holm.tolist()}
analysis={'methods':methods,'metrics':metrics,'bootstrap':{'blockLength':20,'repetitions':20000,'seed':20261111,'primaryFamily':'Seven comparisons to random, old1000 only; last300 and secondary metrics exploratory','pMethod':'two-sided null-centered paired block-bootstrap; approximate, not exact p-values','finiteTailCaution':'Bonferroni quantiles have finite resampling numerical error'},'segments':{},'sensitivityBlock50':{},'monteCarlo':{},'yearly':{}}
for label,part in [('old',slice(0,1000)),('late',slice(700,1000))]:
    a=x[part];analysis['segments'][label]=bootstrap(a,20,20000,20261111+(label=='late'))
    sensitivity=bootstrap(a,50,5000,20261161+(label=='late'));analysis['sensitivityBlock50'][label]={'n':len(a),'ci95':sensitivity['ci95']}
for label,part in [('forward',slice(1000,None)),('all',slice(None))]:
    a=x[part];analysis['segments'][label]={'n':len(a),'mean':a.mean(axis=0).tolist(),'difference':(a[:,1:]-a[:,0,None,:]).mean(axis=0).tolist(),'note':'descriptive only; no strong inference from five new periods' if label=='forward' else 'period-weighted descriptive aggregate'}
for label in ['old','late','forward']:
    values=np.array([t[label] for t in r['trials'] if label in t]);se=values.std(axis=0,ddof=1)/math.sqrt(len(values));delta=values[:,1:]-values[:,0,None,:]
    analysis['monteCarlo'][label]={'repetitions':len(values),'meanSE':se.tolist(),'pairedDifferenceSE':(delta.std(axis=0,ddof=1)/math.sqrt(len(values))).tolist(),'interpretation':'simulation noise only, not uncertainty about future real draws'}
for year in sorted({d['date'][:4] for d in r['perDraw']}):
    ids=[i for i,d in enumerate(r['perDraw']) if d['date'].startswith(year)];analysis['yearly'][year]={'n':len(ids),'mean':x[ids].mean(axis=0).tolist()}
(OUT/'analysis.json').write_text(json.dumps(analysis,indent=2)+'\n')
for label in ['old','late','forward']:
 print(label,analysis['segments'][label]['n'])
 for method,row in zip(methods,analysis['segments'][label]['mean']):print(method,'batchAnyPrize',round(row[1],6),'ticketAnyPrize',round(row[0],6),'coverage',round(row[8],3),round(row[9],3))
 if label=='old':
  for method,d,ci,p in zip(methods[1:],analysis['segments'][label]['difference'],analysis['segments'][label]['primarySimultaneousCI95'],analysis['segments'][label]['primaryHolmP']):print('comparison',method,'delta',d[1],'simultaneousCI',ci,'HolmApproxP',p)
