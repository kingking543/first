# Frozen quantified V2 baseline

Byte-for-byte copies of `src/lib/lotto.ts`, `quantified.ts`, and `number-sampling.ts` from commit `30a30b1`, before the disjoint-generation change. Local imports stay inside this directory. The V3 research arms `currentV2` and `v2NoHistory` must use these files; product changes must not rewrite the meaning of archived results.

Source paths in older report manifests describe that historical baseline. Use these copies to verify the three historical source hashes after production evolves. Reports and numeric results remain unchanged.
