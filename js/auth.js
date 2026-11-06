/* auth.js - register / login / logout and the session cookie. THEME: virtual identity.
   Supabase mode: Supabase Auth (email = username@fishdodge.app, password hashed by Supabase).
   Local mode (no Supabase keys yet): salted SHA-256 hash stored in localStorage.
   Both modes also keep the username in a cookie so the player is recognised on reload.
 */
import { sb, useSupabase } from './supabase.js';
import { usernameRules, passwordRules, firstError } from './validation.js';

let user = null; // { id, username }
export const currentUser = () => user;

// ---- cookie ----
const setCookie = (v, days) => { document.cookie = `fd_user=${encodeURIComponent(v)};max-age=${days * 86400};path=/;SameSite=Lax`; };
const getCookie = () => { const m = document.cookie.match(/fd_user=([^;]+)/); return m ? decodeURIComponent(m[1]) : null; };

// ---- helpers ----
const emailOf = n => `${n.toLowerCase()}@fishdodge.app`;
const localUsers = () => JSON.parse(localStorage.getItem('fd_users') || '{}');
async function hash(pw, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pw));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function check(username, pw) {
  const u = firstError(usernameRules, username); if (u) throw new Error('Username must have: ' + u.toLowerCase());
  const p = firstError(passwordRules, pw); if (p) throw new Error('Password must have: ' + p.toLowerCase());
}

export async function restoreSession() {
  if (useSupabase) {
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    const { data: p } = await sb.from('profiles').select('username').eq('id', data.session.user.id).maybeSingle();
    user = { id: data.session.user.id, username: p?.username || 'Player' };
  } else {
    const name = getCookie(), rec = name && localUsers()[name.toLowerCase()];
    if (!rec) return null;
    user = { id: name.toLowerCase(), username: rec.username };
  }
  setCookie(user.username, 7);
  return user;
}

export async function register(username, pw, pw2) {
  check(username, pw);
  if (pw !== pw2) throw new Error('Passwords do not match');
  if (useSupabase) {
    const { data, error } = await sb.auth.signUp({ email: emailOf(username), password: pw });
    if (error) throw new Error(/registered/i.test(error.message) ? 'That username is taken' : error.message);
    if (!data.session) throw new Error('In Supabase, turn OFF "Confirm email" (Authentication > Providers > Email)');
    const { error: e2 } = await sb.from('profiles').insert({ id: data.user.id, username });
    if (e2) throw new Error(/duplicate/i.test(e2.message) ? 'That username is taken' : e2.message);
    user = { id: data.user.id, username };
  } else {
    const key = username.toLowerCase(), all = localUsers();
    if (all[key]) throw new Error('That username is taken');
    const salt = crypto.randomUUID();
    all[key] = { username, salt, hash: await hash(pw, salt) };
    localStorage.setItem('fd_users', JSON.stringify(all));
    user = { id: key, username };
  }
  await logout(); // the player logs in themselves on the Login screen
  return username;
}

export async function login(username, pw) {
  if (useSupabase) {
    const { data, error } = await sb.auth.signInWithPassword({ email: emailOf(username), password: pw });
    if (error) throw new Error('Wrong username or password');
    const { data: p } = await sb.from('profiles').select('username').eq('id', data.user.id).maybeSingle();
    user = { id: data.user.id, username: p?.username || username };
  } else {
    const rec = localUsers()[username.toLowerCase()];
    if (!rec || rec.hash !== await hash(pw, rec.salt)) throw new Error('Wrong username or password');
    user = { id: username.toLowerCase(), username: rec.username };
  }
  setCookie(user.username, 7);
  return user;
}

export async function logout() {
  if (useSupabase) await sb.auth.signOut();
  setCookie('', 0);
  user = null;
}

/** Change the password of the logged-in player (the current password is checked first). */
export async function changePassword(current, next, next2) {
  if (!user) throw new Error('You are not logged in');
  const e = firstError(passwordRules, next); if (e) throw new Error('New password must have: ' + e.toLowerCase());
  if (next !== next2) throw new Error('The new passwords do not match');
  if (useSupabase) {
    const { error: e1 } = await sb.auth.signInWithPassword({ email: emailOf(user.username), password: current });
    if (e1) throw new Error('Your current password is wrong');
    const { error } = await sb.auth.updateUser({ password: next });
    if (error) throw new Error(error.message);
  } else {
    const all = localUsers(), rec = all[user.id];
    if (!rec || rec.hash !== await hash(current, rec.salt)) throw new Error('Your current password is wrong');
    rec.salt = crypto.randomUUID(); rec.hash = await hash(next, rec.salt);
    localStorage.setItem('fd_users', JSON.stringify(all));
  }
}

/** Permanently delete the logged-in player's account and all their data. */
export async function deleteAccount() {
  if (!user) throw new Error('You are not logged in');
  if (useSupabase) {
    const { error } = await sb.rpc('delete_my_account'); // SQL function from supabase/delete_account.sql
    if (error) throw new Error('Delete is not set up yet: run supabase/delete_account.sql in the Supabase SQL Editor');
    await sb.auth.signOut();
  } else {
    const all = localUsers(); delete all[user.id];
    localStorage.setItem('fd_users', JSON.stringify(all)); localStorage.removeItem('fd_progress_' + user.id);
  }
  setCookie('', 0); user = null;
}
