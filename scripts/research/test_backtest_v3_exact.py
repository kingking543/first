import unittest
from itertools import combinations
from fractions import Fraction
from backtest_v3_exact import ExactBatch,closed_form,wins,single_probability

class ExactProbabilityTests(unittest.TestCase):
    def test_analytic_independent_values(self):
        c=closed_form()
        self.assertEqual(c['singleAnyPrize'],Fraction(6187,92752))
        self.assertEqual(c['disjointFiveAnyPrize'],Fraction(987995,3060816))
        self.assertAlmostEqual(float(c['randomFiveAnyPrize']),.2918989282949935)
        self.assertAlmostEqual(float(c['uniqueBackPairsFiveAnyPrize']),.2940371839736701)
    def test_small_universe_matches_independent_literal_enumeration(self):
        tickets=[{'front':[1,2,3],'back':[1,2]},{'front':[3,4,5],'back':[2,3]},{'front':[5,6,7],'back':[4,5]}]
        expected=0;total=0
        for front in combinations(range(1,8),3):
            for back in combinations(range(1,6),2):
                total+=1
                hits=[(len(set(front)&set(t['front'])),len(set(back)&set(t['back']))) for t in tickets]
                if any(f>=3 or (f>=2 and b>=1) or b==2 for f,b in hits):expected+=1
        exact=ExactBatch(7,3,5)
        self.assertEqual(exact.probability(tickets),Fraction(expected,total))
        self.assertEqual(exact.probability(list(reversed(tickets))),Fraction(expected,total))
    def test_single_duplicate_and_disjoint_full_universe(self):
        exact=ExactBatch();ticket={'front':[1,2,3,4,5],'back':[1,2]}
        self.assertEqual(exact.probability([ticket]),single_probability())
        self.assertEqual(exact.probability([ticket]*5),single_probability())
        batch=[{'front':list(range(i*5+1,i*5+6)),'back':[i*2+1,i*2+2]} for i in range(5)]
        self.assertEqual(exact.probability(batch),closed_form()['disjointFiveAnyPrize'])
    def test_all_cells_are_explicit(self):
        self.assertEqual(sum(wins(f,b) for f in range(6) for b in range(3)),13)

if __name__=='__main__':unittest.main()
