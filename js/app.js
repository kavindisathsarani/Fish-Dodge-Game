/* app.js - wires everything together: screen navigation, button clicks, forms, game events.
   THEME: event-driven programming. One click listener (event delegation) reads data-action
   attributes; the game and mini-game report back through events.js.
 */
import * as game from './game.js';
import * as fishCount from './fish-count.js';
import * as auth from './auth.js';
import { loadProgress, saveLevelDone, saveRun } from './progress.js';
import { on } from './events.js';
import { TOTAL_LEVELS } from './levels.js';
import { FISH_POINTS } from './scoring.js';
import { usernameRules, passwordRules, matchRule } from './validation.js';
import { $, show, setText, hearts, toast, liveHints, renderHud, renderMenu, renderLeaderboard, decorate } from './ui.js';
import './input.js';

let user = null, banked = 0, nextLevel = 1, howtoFrom = 'menu', runSaved = false;
const gameActive = () => $('#game').classList.contains('active');
const overlay = (id, on_) => $(id).classList.toggle('on', on_);

// ---------- navigation helpers ----------
async function goMenu() { const { p } = await loadProgress(user); renderMenu(user, p); show('menu'); }
async function goLeaderboard() { const { p, runs } = await loadProgress(user); renderLeaderboard(p, runs); show('leaderboard'); }
function startGame(level) {
  overlay('#pause-overlay', false); overlay('#ol-overlay', false);
  show('game'); game.startLevel(level, banked, 0);
}
async function endRun(level) { // save this run (score + level reached) once
  const st = game.getState();
  const total = banked + (st.running ? st.levelScore : 0);
  if (runSaved || total <= 0) return;
  runSaved = true;
  try { await saveRun(user, { level, score: total }); } catch (e) { console.error(e); toast('Could not save your run', 'bad'); }
}
async function logoutNow() { game.stop(); await auth.logout(); user = null; show('login'); toast('You have been logged out'); }

// ---------- button clicks ----------
const actions = {
  goRegister: () => show('register'),
  goLogin: () => show('login'),
  menu: () => goMenu(),
  leaderboard: () => goLeaderboard(),
  account: () => { setText('#a-user', user.username); $('#pw-form').reset(); $('#a-del').value = ''; setText('#a-err', ''); setText('#a-del-err', ''); pwHints.forEach(f => f()); show('account'); },
  howto: () => { howtoFrom = 'menu'; show('howto'); },
  howtoPause: () => { howtoFrom = 'game'; show('howto'); },
  howtoBack: () => (howtoFrom === 'game' ? show('game') : goMenu()),
  logout: () => logoutNow(),
  play: async () => { const { p } = await loadProgress(user); banked = 0; runSaved = false; startGame(p.current_level || 1); },
  pause: () => { if (!$('#ol-overlay').classList.contains('on')) togglePause(); },
  resume: () => { overlay('#pause-overlay', false); game.resume(); },
  restart: () => startGame(game.getState().level),
  toMenu: async () => { await endRun(game.getState().level); game.stop(); overlay('#pause-overlay', false); overlay('#ol-overlay', false); await goMenu(); toast('Back at the main menu'); },
  quit: async () => { await endRun(game.getState().level); await logoutNow(); },
  countfish: () => { overlay('#ol-overlay', false); fishCount.resetAttempts(); fishCount.setScore(game.getState().total); show('fishcount'); fishCount.startChallenge(); },
  tryAgain: () => { fishCount.setScore(game.getState().total); show('fishcount'); fishCount.startChallenge(); },
  restartAfterCorrect: () => { // failed level restarts from the BEGINNING, with 3 lives and the +50 bonus
    overlay('#pause-overlay', false); overlay('#ol-overlay', false);
    show('game'); game.startLevel(game.getState().level, banked, FISH_POINTS);
  },
  nextLevel: () => startGame(nextLevel),
  playAgain: () => actions.play(),
  deleteAccount: async () => {
    setText('#a-del-err', '');
    if ($('#a-del').value.trim() !== 'DELETE') return setText('#a-del-err', 'Type DELETE (capital letters) to confirm');
    try {
      game.stop(); await auth.deleteAccount(); user = null; $('#a-del').value = '';
      setText('#l-ok', 'Your account has been deleted.'); show('login'); toast('Account deleted', 'good');
    } catch (err) { setText('#a-del-err', err.message); }
  },
};
document.addEventListener('click', e => { const a = e.target.closest('[data-action]'); if (a) actions[a.dataset.action]?.(); });

function togglePause() {
  if ($('#pause-overlay').classList.contains('on')) return actions.resume();
  game.pause(); overlay('#pause-overlay', true);
}

// ---------- live validation while typing ----------
const regHints = [
  liveHints('#r-user', '#r-user-h', usernameRules),
  liveHints('#r-pass', '#r-pass-h', passwordRules),
  liveHints('#r-pass2', '#r-pass2-h', matchRule(() => $('#r-pass').value), ['#r-pass']),
];
const pwHints = [
  liveHints('#a-new', '#a-new-h', passwordRules),
  liveHints('#a-new2', '#a-new2-h', matchRule(() => $('#a-new').value), ['#a-new']),
];

// ---------- forms ----------
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault(); setText('#l-err', ''); setText('#l-ok', '');
  try {
    user = await auth.login($('#l-user').value.trim(), $('#l-pass').value);
    $('#l-pass').value = ''; await goMenu(); toast(`Welcome back, ${user.username}!`, 'good');
  } catch (err) { setText('#l-err', err.message); }
});
$('#register-form').addEventListener('submit', async e => {
  e.preventDefault(); setText('#r-err', '');
  try {
    const name = $('#r-user').value.trim();
    await auth.register(name, $('#r-pass').value, $('#r-pass2').value);
    $('#register-form').reset(); regHints.forEach(f => f());
    $('#l-user').value = name; $('#l-pass').value = '';
    setText('#l-ok', 'Account created! Please log in with your new username and password.');
    show('login'); toast('Account created successfully', 'good');
  } catch (err) { setText('#r-err', err.message); }
});
$('#pw-form').addEventListener('submit', async e => {
  e.preventDefault(); setText('#a-err', '');
  try {
    await auth.changePassword($('#a-cur').value, $('#a-new').value, $('#a-new2').value);
    $('#pw-form').reset(); pwHints.forEach(f => f()); toast('Password updated', 'good');
  } catch (err) { setText('#a-err', err.message); }
});

// ---------- events coming from the game and mini-game ----------
on('hud', renderHud);
on('pause-key', () => { if (gameActive() && !$('#ol-overlay').classList.contains('on')) togglePause(); });
on('out-of-lives', () => { hearts('#ol-hearts', 0); overlay('#ol-overlay', true); });
on('level-complete', async ({ level, levelScore }) => {
  banked += levelScore;
  try { await saveLevelDone(user, level, level >= TOTAL_LEVELS ? 1 : level + 1); } catch (e) { console.error(e); }
  if (level >= TOTAL_LEVELS) {
    if (!runSaved && banked > 0) { runSaved = true; try { await saveRun(user, { level: TOTAL_LEVELS, score: banked }); } catch (e) { console.error(e); } }
    setText('#gc-score', '⭐ ' + banked.toLocaleString()); show('gamecomplete');
  } else {
    nextLevel = level + 1;
    setText('#lc-level', `${level}/${TOTAL_LEVELS}`); setText('#lc-score', '⭐ +' + levelScore); show('levelcomplete');
  }
});
on('fc-correct', () => { hearts('#co-hearts', 3); show('correct'); });
on('fc-wrong', () => { hearts('#in-hearts', 0); show('incorrect'); });
on('fc-timeout', () => { hearts('#to-hearts', 0); show('timeout'); });

// ---------- start ----------
decorate(); game.init($('#canvas'));
auth.restoreSession().then(u => { user = u; return u ? goMenu() : show('login'); }).catch(() => show('login'));
