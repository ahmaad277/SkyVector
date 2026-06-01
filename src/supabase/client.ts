import { createClient } from '@supabase/supabase-js';

// These env vars must be set in .env.local
// VITE_SUPABASE_URL=https://xxxx.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJ...
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[SkyVector] Supabase env vars missing. Online features disabled. ' +
    'Create src/.env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY ?? 'placeholder'
);

export const isSupabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
