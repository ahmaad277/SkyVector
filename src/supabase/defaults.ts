/**
 * Public Supabase client config (anon key is safe in frontend — RLS protects data).
 * Override via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local or Vercel.
 */
export const DEFAULT_SUPABASE_URL = 'https://uopqmvfbvbzyjndltctl.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcHFtdmZidmJ6eWpuZGx0Y3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTQ3NDMsImV4cCI6MjA5MjQzMDc0M30.Ye4HYRIpGLZcky0xkN1DrmzNP0L6fNH60opBWE9ehKk';
