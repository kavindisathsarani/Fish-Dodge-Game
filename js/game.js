/* game.js - gameplay engine: loop, scrolling, collisions, lives, safe position, drawing.
   THEME: event-driven programming (emits 'hud', 'life-lost', 'out-of-lives', 'level-complete')
   and low coupling (no DOM except the canvas; never touches menus, API or database).
*/
import { WORLD, levelConfig, buildRocks } from './levels.js';
import { ROCK_POINTS, LEVEL_POINTS } from './scoring.js';
import * as input from './input.js';
import { emit } from './events.js';

const { W, H, TOP, BOTTOM, SPEED, FISH_X } = WORLD;
const FISH_SPEED = 230;
let canvas, ctx, raf = 0, last = 0, lastPct = -1;
const s = { level: 1, banked: 0, lives: 3, levelScore: 0, worldX: 0, y: 260, length: 0, rocks: [],
            safe: { worldX: 0, y: 260 }, colLeft: [], inv: 0, running: false, paused: true, bubbles: [] };

export function init(c) {
  canvas = c; canvas.width = W; canvas.height = H; ctx = c.getContext('2d');
  s.bubbles = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 4, v: .2 + Math.random() * .5 }));
}

/** Start (or restart) a level from the very beginning with 3 lives. */
export function startLevel(level, banked, startScore = 0) {
  Object.assign(s, { level, banked, lives: 3, levelScore: startScore, worldX: 0, y: (TOP + BOTTOM) / 2,
                     length: levelConfig(level).length, rocks: buildRocks(level), inv: 0, running: true, paused: false });
  s.safe = { worldX: 0, y: s.y };                      // last safe position (used internally, never drawn)
  s.colLeft = []; s.rocks.forEach(r => { s.colLeft[r.col] = (s.colLeft[r.col] || 0) + 1; });
  last = performance.now(); lastPct = -1;
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  hud(true);
}
export const pause = () => { s.paused = true; };
export const resume = () => { if (s.running) { s.paused = false; last = performance.now(); } };
export const stop = () => { s.running = false; cancelAnimationFrame(raf); };
export const getState = () => ({ running: s.running, level: s.level, levelScore: s.levelScore, lives: s.lives, total: s.banked + s.levelScore });

function hud(force) {
  const pct = Math.min(100, Math.round((s.worldX + FISH_X) / s.length * 100));
  if (force || pct !== lastPct) { lastPct = pct; emit('hud', { level: s.level, pct, lives: s.lives, score: s.banked + s.levelScore }); }
}

function loop(t) {
  if (!s.running) return;
  const dt = Math.min((t - last) / 1000, 0.05); last = t;
  if (!s.paused) update(dt);
  draw();
  raf = requestAnimationFrame(loop);
}

function hits(r, fx) { // circle (rock) against the fish's rectangle
  const cx = Math.max(fx - 30, Math.min(r.x, fx + 30)), cy = Math.max(s.y - 16, Math.min(r.y, s.y + 16));
  return Math.hypot(r.x - cx, r.y - cy) < r.r * 0.85;
}

function update(dt) {
  const dir = (input.down() ? 1 : 0) - (input.up() ? 1 : 0);
  s.y = Math.max(TOP, Math.min(BOTTOM, s.y + dir * FISH_SPEED * dt)); // fish moves up/down only
  s.worldX += SPEED * dt;                                              // world scrolls at a constant speed
  if (s.inv > 0) s.inv -= dt;
  const fx = s.worldX + FISH_X;
  for (const r of s.rocks) {
    if (!r.passed && r.x + r.r < fx - 32) {          // rock passed
      r.passed = true;
      if (--s.colLeft[r.col] === 0) {                 // whole rock wall passed safely
        s.levelScore += ROCK_POINTS;
        s.safe = { worldX: s.worldX, y: s.y };        // remember the last safe position
        hud(true);
      }
    } else if (s.inv <= 0 && hits(r, fx)) return loseLife();
  }
  if (fx >= s.length) return finish();
  hud(false);
}

function loseLife() {
  s.lives--; emit('life-lost', { lives: s.lives });
  if (s.lives <= 0) { s.paused = true; hud(true); emit('out-of-lives', getState()); return; }
  s.worldX = s.safe.worldX; s.y = s.safe.y; s.inv = 1.2; // back to last safe position, brief protection
  hud(true);
}

function finish() {
  s.levelScore += LEVEL_POINTS; hud(true);
  const d = { level: s.level, levelScore: s.levelScore };
  stop(); emit('level-complete', d);
}

// ---------------- drawing ----------------
function rock(x, y, r, j) {
  ctx.beginPath();
  j.forEach((v, i) => { const a = i / j.length * 6.283, rr = r * (.82 + v * .3), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * .88; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.closePath(); ctx.fillStyle = '#808c99'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#505c69'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(x - r * .25, y - r * .3, r * .35, r * .2, -.4, 0, 7); ctx.fill();
}
function fish(x, y) {
  ctx.save(); ctx.translate(x, y);
  if (s.inv > 0 && Math.floor(performance.now() / 100) % 2) ctx.globalAlpha = .4;
  ctx.fillStyle = '#1b62d6';
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-48, -20); ctx.quadraticCurveTo(-40, 0, -48, 20); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, -20); ctx.quadraticCurveTo(8, -38, 24, -20); ctx.fill();
  const g = ctx.createLinearGradient(0, -24, 0, 24); g.addColorStop(0, '#7fd0ff'); g.addColorStop(1, '#1b62d6');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 36, 22, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(18, -6, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#12284a'; ctx.beginPath(); ctx.arc(20, -5, 4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#12284a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(24, 8, 6, .2, 1.6); ctx.stroke();
  ctx.restore();
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#79d9ee'); g.addColorStop(.55, '#2d9bdc'); g.addColorStop(1, '#0e5aa8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.45)';                                   // bubbles
  for (const b of s.bubbles) {
    const x = ((b.x - s.worldX * .25) % W + W) % W;
    ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 7); ctx.fill();
    if (!s.paused) { b.y -= b.v; if (b.y < -5) b.y = H + 5; }
  }
  ctx.strokeStyle = '#2fa84f'; ctx.lineWidth = 7; ctx.lineCap = 'round';      // sea plants (scroll slower = depth)
  for (let i = 0; i < 14; i++) {
    const x = ((i * 140 - s.worldX * .6) % (W + 140) + W + 140) % (W + 140) - 70;
    ctx.beginPath(); ctx.moveTo(x, H - 40); ctx.quadraticCurveTo(x + 18, H - 90 - (i % 3) * 18, x - 4, H - 150 - (i % 4) * 15); ctx.stroke();
  }
  ctx.fillStyle = '#e9c985'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 45);
  ctx.quadraticCurveTo(W / 2, H - 75, W, H - 45); ctx.lineTo(W, H); ctx.fill();   // sand
  const fl = s.length - s.worldX;                                              // finish line
  if (fl < W + 40) {
    for (let r = 0; r < 20; r++) for (let c = 0; c < 2; c++) { ctx.fillStyle = (r + c) % 2 ? '#fff' : '#111'; ctx.fillRect(fl + c * 16, 60 + r * 19, 16, 19); }
    ctx.fillStyle = '#0b4b86'; ctx.fillRect(fl - 22, 28, 76, 26); ctx.fillStyle = '#fff'; ctx.font = '700 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Finish', fl + 16, 47);
  }
  for (const r of s.rocks) { const sx = r.x - s.worldX; if (sx > -60 && sx < W + 60) rock(sx, r.y, r.r, r.j); }
  fish(FISH_X, s.y);
}
