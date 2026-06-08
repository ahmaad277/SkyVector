import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from './defaults';

function readEnv(name: string): string {
  const raw = import.meta.env[name] as string | undefined;
  if (!raw) return '';
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, '');
}

function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function isValidAnonKey(key: string): boolean {
  return key.startsWith('eyJ') && key.split('.').length === 3;
}

const SUPABASE_URL = normalizeSupabaseUrl(readEnv('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL);
const SUPABASE_ANON_KEY = readEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

export type SupabaseConfigError = 'missing_env' | 'invalid_url' | 'invalid_key';

export const supabaseConfigError: SupabaseConfigError | null =
  !SUPABASE_URL || !SUPABASE_ANON_KEY
    ? 'missing_env'
    : !isValidSupabaseUrl(SUPABASE_URL)
      ? 'invalid_url'
      : !isValidAnonKey(SUPABASE_ANON_KEY)
        ? 'invalid_key'
        : null;

export const isSupabaseReady = supabaseConfigError === null;

if (supabaseConfigError) {
  console.warn(
    '[SkyVector] Supabase config invalid:',
    supabaseConfigError,
    'Set VITE_SUPABASE_URL=https://xxxx.supabase.co and VITE_SUPABASE_ANON_KEY in .env.local or Vercel env vars.'
  );
}

export const supabase = createClient(
  isSupabaseReady ? SUPABASE_URL : 'https://placeholder.supabase.co',
  isSupabaseReady ? SUPABASE_ANON_KEY : 'placeholder'
);

export function getSupabaseConfigMessage(): string | null {
  switch (supabaseConfigError) {
    case 'missing_env':
      return 'Supabase env vars missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).';
    case 'invalid_url':
      return 'Invalid Supabase URL. Use https://YOUR_PROJECT.supabase.co';
    case 'invalid_key':
      return 'Invalid Supabase anon key. Copy the anon public key from Supabase → Settings → API.';
    default:
      return null;
  }
}
