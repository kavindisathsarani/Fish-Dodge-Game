/* ui.js - everything that changes what is shown on screen (no game rules, no API, no database).
   THEME: high cohesion - the only file that builds HUD / menu / leaderboard HTML.
 */
import { TOTAL_LEVELS } from './levels.js';

export const $ = s => document.querySelector(s);
export const show = id => document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === id));
export const setText = (sel, t) => { $(sel).textContent = t; };

export function hearts(sel, n) {
  $(sel).innerHTML = Array.from({ length: 3 }, (_, i) => `<svg class="${i < n ? '' : 'off'}"><use href="#heart"/></svg>`).join('');
}
export function renderHud({ level, pct, lives, score }) {
  setText('#hud-level', `Level ${level}/${TOTAL_LEVELS}`);
  $('#hud-bar').style.width = pct + '%'; setText('#hud-pct', pct + '%');
  hearts('#hud-hearts', lives); setText('#hud-score', 'Score: ' + score);
}
export function renderMenu(user, p) {
  setText('#m-welcome', `Welcome, ${user.username}!`);
  setText('#m-level', `${p.current_level}/${TOTAL_LEVELS}`);
  setText('#m-best', p.highest_score.toLocaleString()); setText('#m-games', p.games_played);
}
export function renderLeaderboard(p, runs) {
  setText('#lb-best', p.highest_score.toLocaleString());
  setText('#lb-level', `${p.highest_level}/${TOTAL_LEVELS}`); setText('#lb-games', p.games_played);
  const newest = runs.reduce((a, r) => (!a || new Date(r.played_at) > new Date(a.played_at) ? r : a), null);
  $('#lb-body').innerHTML = runs.length ? runs.map((r, i) => `<tr>
    <td>${i + 1}</td><td>${new Date(r.played_at).toLocaleDateString()}${i === 0 && r === newest ? '<span class="badge">NEW BEST</span>' : ''}</td>
    <td>Level ${r.level_reached}/${TOTAL_LEVELS}<span class="mini"><i style="width:${r.level_reached / TOTAL_LEVELS * 100}%"></i></span></td>
    <td>⭐ ${r.score.toLocaleString()}</td></tr>`).join('')
    : '<tr><td colspan="4" class="lab">No runs yet. Play a game to see it here!</td></tr>';
}
export function decorate() { // sand floor, kelp and rocks behind every non-game screen
  document.querySelectorAll('.screen:not(#game)').forEach(sc => sc.insertAdjacentHTML('beforeend',
    '<div class="deco"><div class="floor"></div><svg style="left:4%"><use href="#plant"/></svg><svg style="left:11%;height:110px"><use href="#plant"/></svg>' +
    '<svg style="right:4%"><use href="#plant"/></svg><svg style="right:11%;height:110px"><use href="#plant"/></svg>' +
    '<svg class="rk" style="left:18%"><use href="#rock"/></svg><svg class="rk" style="right:18%"><use href="#rock"/></svg></div>'));
}

/** Small pop-up message: type is 'good' (green), 'bad' (red) or '' (blue). */
export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.textContent = msg;
  $('#toast').append(el); setTimeout(() => el.remove(), 3500);
}
/** Live validation: shows each rule under the input with a tick or a cross while the player types. */
export function liveHints(inputSel, listSel, rules, watch = []) {
  const inp = $(inputSel), ul = $(listSel);
  const run = () => {
    const v = inp.value;
    ul.innerHTML = rules.map(r => `<li class="${v ? (r.test(v) ? 'good' : 'bad') : ''}">${r.text}</li>`).join('');
    const ok = rules.every(r => r.test(v));
    inp.classList.toggle('valid', !!v && ok); inp.classList.toggle('invalid', !!v && !ok);
  };
  [inp, ...watch.map(w => $(w))].forEach(el => el.addEventListener('input', run));
  run(); return run;
}
