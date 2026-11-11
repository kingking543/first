import json,math,time
from pathlib import Path
from fractions import Fraction
import numpy as np
from backtest_v3_exact import ExactBatch,closed_form
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/backtest-2026-11-11'
batches=json.loads((OUT/'theory-batches.json').read_text())['batches']
engine=ExactBatch();rows=[];start=time.perf_counter()
for i,b in enumerate(batches):
    count=engine.numerator(b['tickets'])
    rows.append({k:v for k,v in b.items() if k!='tickets'}|{'winningOutcomes':count,'allOutcomes':engine.denominator,'probability':count/engine.denominator})
    if (i+1)%100==0:print('exact',i+1,'/',len(batches),round(time.perf_counter()-start,2),'s',flush=True)
methods=list(dict.fromkeys(b['method'] for b in batches))
summary={}
for method in methods:
    a=np.array([r['probability'] for r in rows if r['method']==method]);summary[method]={'nBatches':len(a),'mean':float(a.mean()),'min':float(a.min()),'max':float(a.max()),'sampleSD':float(a.std(ddof=1)),'p025':float(np.quantile(a,.025)),'p975':float(np.quantile(a,.975))}
closed={k:{'fraction':str(v),'probability':float(v)} for k,v in closed_form().items()}
assert all(Fraction(r['winningOutcomes'],r['allOutcomes'])==closed_form()['disjointFiveAnyPrize'] for r in rows if r['method']=='disjoint')
result={'assumption':'Uniform independent front/back draw; per-batch exact conditional probability, not historical predictive advantage. Sample means for100batches are not exact generator-population expectations.','closedForm':closed,'methods':summary,'samples':rows,'distinctVennStructuresEvaluated':len(engine.cache),'elapsedSeconds':time.perf_counter()-start}
(OUT/'exact-probabilities.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False),flush=True)
