/* progress.js - saves player progress, highest score and runs per user. THEME: virtual identity.
   Supabase mode: tables player_progress + game_runs (protected by Row Level Security).
   Local mode: localStorage, keyed by the user id. Other files never know which mode is used.
*/
import { sb, useSupabase } from './supabase.js';

const blank = () => ({ current_level: 1, highest_level: 0, highest_score: 0, games_played: 0 });
const lkey = u => 'fd_progress_' + u.id;
const lread = u => JSON.parse(localStorage.getItem(lkey(u)) || 'null') || { p: blank(), runs: [] };
const top10 = r => [...r].sort((a, b) => b.score - a.score).slice(0, 10);

export async function loadProgress(u) {
  if (!useSupabase) { const s = lread(u); return { p: s.p, runs: top10(s.runs) }; }
  let { data: p } = await sb.from('player_progress').select('*').eq('user_id', u.id).maybeSingle();
  if (!p) { p = { ...blank(), user_id: u.id }; await sb.from('player_progress').insert(p); }
  const { data: runs } = await sb.from('game_runs').select('*').eq('user_id', u.id).order('score', { ascending: false }).limit(10);
  return { p, runs: runs || [] };
}

async function writeProgress(u, p) {
  if (useSupabase) {
    const { error } = await sb.from('player_progress').upsert({ ...p, user_id: u.id, updated_at: new Date().toISOString() });
    if (error) throw error;
  } else { const s = lread(u); s.p = p; localStorage.setItem(lkey(u), JSON.stringify(s)); }
}

// Called when a level is finished: remember where "Play" should continue
export async function saveLevelDone(u, doneLevel, nextLevel) {
  const { p } = await loadProgress(u);
  p.current_level = nextLevel;
  p.highest_level = Math.max(p.highest_level, doneLevel);
  await writeProgress(u, p);
}

// Called when a run ends (Level 20 finished or Quit to Login)
export async function saveRun(u, { level, score }) {
  const { p } = await loadProgress(u);
  p.games_played += 1;
  p.highest_score = Math.max(p.highest_score, score);
  if (useSupabase) {
    const { error } = await sb.from('game_runs').insert({ user_id: u.id, level_reached: level, score });
    if (error) throw error;
  } else {
    const s = lread(u);
    s.runs.push({ id: Date.now(), played_at: new Date().toISOString(), level_reached: level, score });
    localStorage.setItem(lkey(u), JSON.stringify(s));
  }
  await writeProgress(u, p);
}
