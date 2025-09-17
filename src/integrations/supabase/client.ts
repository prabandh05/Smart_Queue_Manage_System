import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Values come from Vite env. Define in .env or .env.local with VITE_ prefix.
// We support both ANON_KEY and PUBLISHABLE_KEY for convenience.
const ENV_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const ENV_PROJECT = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || '';
const ENV_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
const ENV_PUBLISHABLE = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '';

const SUPABASE_URL = ENV_URL || (ENV_PROJECT ? `https://${ENV_PROJECT}.supabase.co` : '');
const SUPABASE_PUBLISHABLE_KEY = ENV_ANON || ENV_PUBLISHABLE;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Surface a clear error during development
  // eslint-disable-next-line no-console
  console.error(
    'Supabase env missing. Please set VITE_SUPABASE_URL (or VITE_SUPABASE_PROJECT_ID) and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in your .env/.env.local'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});