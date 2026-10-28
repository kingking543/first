export function unitRandom(random: () => number) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random value must be in [0, 1)');
  return value;
}
export function sampleNumbers(count: number, maximum: number, random: () => number): number[] {
  const pool = Array.from({ length: maximum }, (_, i) => i + 1);
  for (let i = 0; i < count; i++) {
    const target = i + Math.floor(unitRandom(random) * (maximum - i));
    [pool[i], pool[target]] = [pool[target], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}
