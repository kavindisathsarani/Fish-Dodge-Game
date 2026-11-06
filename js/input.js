/* input.js - keyboard events. THEME: event-driven programming.
   Keeps track of which keys are held and announces Esc/P as a 'pause-key' event.
*/
import { emit } from './events.js';
const held = new Set();
const norm = e => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

addEventListener('keydown', e => {
  const k = norm(e);
  if (['ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
  if ((k === 'Escape' || k === 'p') && !e.repeat && e.target.tagName !== 'INPUT') emit('pause-key');
  held.add(k);
});
addEventListener('keyup', e => held.delete(norm(e)));
addEventListener('blur', () => held.clear());

export const up = () => held.has('ArrowUp') || held.has('w');
export const down = () => held.has('ArrowDown') || held.has('s');

// On-screen buttons for phones and tablets (pointer events work for touch and mouse)
function holdButton(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); held.add(key); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, () => held.delete(key)));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
holdButton('btn-up', 'ArrowUp');
holdButton('btn-down', 'ArrowDown');
