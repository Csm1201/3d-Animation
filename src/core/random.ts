/**
 * Seeded PRNG (mulberry32). Same seed -> same sequence on every render,
 * every machine. Never use Math.random() in this project.
 */
export const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Build a fixed array of values from a seed. */
export const seededArray = <T,>(seed: number, n: number, make: (rnd: () => number, i: number) => T): T[] => {
  const rnd = seeded(seed);
  return Array.from({length: n}, (_, i) => make(rnd, i));
};
