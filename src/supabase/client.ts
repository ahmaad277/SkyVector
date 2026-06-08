import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

/** Prefer valid env vars; fall back to baked-in project defaults. */
function resolveSupabaseConfig() {
  const envUrl = normalizeSupabaseUrl(readEnv('VITE_SUPABASE_URL'));
  const envKey = readEnv('VITE_SUPABASE_ANON_KEY');

  const url =
    envUrl && isValidSupabaseUrl(envUrl) ? envUrl : DEFAULT_SUPABASE_URL;
  const anonKey =
    envKey && isValidAnonKey(envKey) ? envKey : DEFAULT_SUPABASE_ANON_KEY;

  const usingDefaults =
    url === DEFAULT_SUPABASE_URL || anonKey === DEFAULT_SUPABASE_ANON_KEY;

  if (envUrl && !isValidSupabaseUrl(envUrl)) {
    console.warn('[SkyVector] Ignoring invalid VITE_SUPABASE_URL, using project default.');
  }
  if (envKey && !isValidAnonKey(envKey)) {
    console.warn('[SkyVector] Ignoring invalid VITE_SUPABASE_ANON_KEY, using project default.');
  }

  return { url, anonKey, usingDefaults };
}

const resolved = resolveSupabaseConfig();

export const SUPABASE_URL = resolved.url;
export const SUPABASE_ANON_KEY = resolved.anonKey;
export const isSupabaseReady = isValidSupabaseUrl(SUPABASE_URL) && isValidAnonKey(SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Lightweight connectivity check (rooms table is public read). */
export async function pingSupabase(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseReady) {
    return { ok: false, error: 'Supabase client not configured' };
  }
  try {
    const { error } = await supabase.from('rooms').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: extractErrorMessage(err) };
  }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return 'Network error';
}

export function getSupabaseConfigMessage(): string | null {
  if (isSupabaseReady) return null;
  return 'Supabase configuration is invalid.';
}
