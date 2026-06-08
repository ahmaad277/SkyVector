import { supabase, isSupabaseReady } from './client';

let authSessionPromise: Promise<{ id: string }> | null = null;
let rateLimitedUntil = 0;

function isRateLimitError(message: string): boolean {
  return /rate limit/i.test(message);
}

/** Ensures a Supabase auth session exists and returns auth.uid(). Single shared call site. */
export async function ensureAuthSession(): Promise<{ id: string }> {
  if (!isSupabaseReady) {
    throw new Error('Supabase not configured');
  }

  if (Date.now() < rateLimitedUntil) {
    throw new Error('Too many auth requests. Wait a minute and try again.');
  }

  if (!authSessionPromise) {
    authSessionPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return { id: session.user.id };
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        if (isRateLimitError(error.message)) {
          rateLimitedUntil = Date.now() + 60_000;
        }
        throw new Error(error.message || 'Anonymous sign-in failed');
      }

      const userId = data.session?.user?.id ?? data.user?.id;
      if (!userId) {
        throw new Error('No user id after sign-in');
      }

      return { id: userId };
    })().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      if (!isRateLimitError(message)) {
        authSessionPromise = null;
      }
      throw err;
    });
  }

  return authSessionPromise;
}

/** Returns existing session user id without triggering sign-in. */
export async function getExistingAuthUserId(): Promise<string | null> {
  if (!isSupabaseReady) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
