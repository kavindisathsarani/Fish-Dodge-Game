/* scoring.js - pure score rules (no DOM, no API). THEME: high cohesion.
*/
export const ROCK_POINTS = 25;   // each rock wall (column) passed safely
export const LEVEL_POINTS = 250; // finishing a level
export const FISH_POINTS = 50;   // correct Fish Count answer
// Each level is scored separately; the run total is the sum of the levels.
export const runTotal = (bankedLevels, currentLevelScore) => bankedLevels + currentLevelScore;
