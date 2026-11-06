/* supabase.js - creates the Supabase client ONLY if config.js has a URL and key.
   THEME: interoperability / virtual identity (Supabase Auth + database).
*/
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const useSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export let sb = null;

if (useSupabase) {
  // Supabase JS library loaded from a CDN (third-party code; @2 = latest v2, which supports the new publishable keys)
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
