/* levels.js - level settings and automatic rock generation. THEME: high cohesion (no DOM, no drawing).
   Difficulty rises only through level LENGTH and ROCK COUNT/patterns; speed is constant.
   Every column is a wall of rocks with one free gap, so a safe path always exists.
*/
export const TOTAL_LEVELS = 20;
export const WORLD = { W: 960, H: 540, TOP: 70, BOTTOM: 445, SPEED: 210, FISH_X: 150 };

// Small seeded random generator: same level number = same layout (fair restarts)
const rng = seed => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

export const levelConfig = n => ({
  length: 3000 + 400 * n,              // level 1 = 3400px ... level 20 = 11000px
  columns: Math.round(5 + 0.9 * n),    // reef walls along the path: 6 (L1) ... 23 (L20)
  gap: Math.round(190 - 4 * n)         // height of the free gap: 186 (L1) ... 110 (L20)
});

/** Each column is a wall of rocks with ONE free gap, so the fish must line up with the gap.
    The gap moves a limited distance between columns, so a safe path always exists. */
export function buildRocks(n) {
  const { TOP, BOTTOM } = WORLD, { length, columns, gap } = levelConfig(n);
  const rand = rng(n * 9973 + 17), rocks = [];
  const start = 900, end = length - 500, step = (end - start) / (columns - 1);
  let gapY = (TOP + BOTTOM) / 2;
  for (let c = 0; c < columns; c++) {
    gapY = Math.max(TOP + gap / 2, Math.min(BOTTOM - gap / 2, gapY + (rand() - 0.5) * 440));
    const colX = start + c * step;
    const fill = (edge, dir, limit) => { // stack rocks from the gap edge outwards
      for (let y = edge; dir < 0 ? y > limit : y < limit;) {
        const r = 24 + rand() * 7;
        rocks.push({ x: colX + (rand() - 0.5) * 16, y: y + dir * r, r, col: c, passed: false, j: Array.from({ length: 8 }, rand) });
        y += dir * r * 1.7;
      }
    };
    fill(gapY - gap / 2, -1, TOP - 25);
    fill(gapY + gap / 2, 1, BOTTOM + 25);
  }
  return rocks;
}
