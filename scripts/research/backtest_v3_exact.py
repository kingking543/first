"""Exact fair-draw probabilities. No historical outcome is used by this module."""
from fractions import Fraction
from itertools import combinations
from math import comb
import numpy as np

def wins(front, back):
    return front >= 3 or (front >= 2 and back >= 1) or back == 2

def single_probability():
    front=[Fraction(comb(5,k)*comb(30,5-k),comb(35,5)) for k in range(6)]
    back=[Fraction(comb(2,k)*comb(10,2-k),comb(12,2)) for k in range(3)]
    return sum((front[f]*back[b] for f in range(6) for b in range(3) if wins(f,b)),Fraction())

def allocations(total, capacities):
    if len(capacities)==1:
        if total<=capacities[0]:yield (total,),comb(capacities[0],total)
        return
    for k in range(min(total,capacities[0])+1):
        for rest,weight in allocations(total-k,capacities[1:]):
            yield (k,)+rest,comb(capacities[0],k)*weight

def closed_form():
    p=single_probability()
    front2=Fraction(sum(comb(5,k)*comb(30,5-k) for k in range(2,6)),comb(35,5))
    front3=Fraction(sum(comb(5,k)*comb(30,5-k) for k in range(3,6)),comb(35,5))
    pair_no_win=sum((Fraction(comb(20,k)*comb(45,5-k),comb(66,5))*(1-front2)**k*(1-front3)**(5-k) for k in range(6)),Fraction())
    total=0;winning=0
    for f,wf in allocations(5,[5,5,5,5,5,10]):
        for b,wb in allocations(2,[2,2,2,2,2,2]):
            total+=wf*wb
            if any(wins(f[i],b[i]) for i in range(5)):winning+=wf*wb
    assert total==comb(35,5)*comb(12,2)
    return {'singleAnyPrize':p,'randomFiveAnyPrize':1-(1-p)**5,'uniqueBackPairsFiveAnyPrize':1-pair_no_win,'disjointFiveAnyPrize':Fraction(winning,total),'singleFirstPrize':Fraction(1,total),'fiveDistinctFirstPrize':Fraction(5,total),'expectedWinningTicketsFive':5*p}

class ExactBatch:
    def __init__(self, front_size=35, front_picks=5, back_size=12):
        self.front_size=front_size;self.back_size=back_size
        self.front_masks=np.fromiter((sum(1<<n for n in numbers) for numbers in combinations(range(front_size),front_picks)),dtype=np.uint64,count=comb(front_size,front_picks))
        self.back_draws=list(combinations(range(1,back_size+1),2));self.denominator=len(self.front_masks)*len(self.back_draws);self.cache={}
    @staticmethod
    def membership_counts(tickets, zone, size):
        values=[0]*(2**len(tickets))
        for number in range(1,size+1):
            values[sum((1<<i) for i,t in enumerate(tickets) if number in t[zone])]+=1
        return tuple(values)
    def numerator(self,tickets):
        n=len(tickets)
        key=(n,self.membership_counts(tickets,'front',self.front_size),self.membership_counts(tickets,'back',self.back_size))
        if key in self.cache:return self.cache[key]
        states=np.zeros(len(self.front_masks),dtype=np.int16)
        for i,t in enumerate(tickets):
            mask=np.uint64(sum(1<<(v-1) for v in t['front']))
            hit=np.bitwise_count(self.front_masks & mask)
            states+=np.where(hit>=3,2,np.where(hit>=2,1,0)).astype(np.int16)*(3**i)
        frequency=np.bincount(states,minlength=3**n)
        code=np.arange(3**n);digits=np.array([(code//(3**i))%3 for i in range(n)])
        numerator=0
        for back in self.back_draws:
            hits=[len(set(t['back']).intersection(back)) for t in tickets]
            if 2 in hits:numerator+=len(self.front_masks);continue
            good=np.any((digits==2)|((digits==1)&(np.array(hits)[:,None]>=1)),axis=0)
            numerator+=int(frequency[good].sum())
        self.cache[key]=numerator
        return numerator
    def probability(self,tickets):return Fraction(self.numerator(tickets),self.denominator)
