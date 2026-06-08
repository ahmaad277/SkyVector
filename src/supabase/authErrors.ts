import type { SupabaseConfigError } from './client';

/** User-facing auth error text (Arabic). */
export function getAuthErrorMessage(error: string): string {
  const lower = error.toLowerCase();

  if (/rate limit|too many auth|too many login/i.test(lower)) {
    return 'تم تجاوز حد محاولات الدخول. انتظر دقيقة واحدة ثم حدّث الصفحة.';
  }

  if (/signups not allowed/i.test(lower)) {
    return (
      'التسجيل معطّل في مشروع Supabase. من لوحة التحكم: Authentication → Sign In / Providers ' +
      'فعّل «Allow new users to sign up» و «Allow anonymous sign-ins»، ثم احفظ وحدّث الصفحة.'
    );
  }

  if (/anonymous sign/i.test(lower)) {
    return (
      'تسجيل الدخول المجهول غير مفعّل. من Supabase: Authentication → Sign In / Providers → ' +
      'فعّل «Allow anonymous sign-ins».'
    );
  }

  if (/permission denied for table/i.test(lower)) {
    return (
      'صلاحيات جدول قاعدة البيانات ناقصة. نفّذ ملف supabase/migrations/003_grants.sql ' +
      'في Supabase → SQL Editor ثم حدّث الصفحة.'
    );
  }

  if (
    /expected pattern|invalid supabase url|invalid supabase anon|supabase env vars missing|failed to fetch|networkerror/i.test(
      lower
    )
  ) {
    return (
      'تعذّر الاتصال بـ Supabase. في Vercel → Settings → Environment Variables تأكد من: ' +
      'VITE_SUPABASE_URL = https://uopqmvfbvbzyjndltctl.supabase.co ' +
      'و VITE_SUPABASE_ANON_KEY = مفتاح anon من Supabase → Settings → API، ثم أعد النشر (Redeploy).'
    );
  }

  if (/room not found/i.test(lower)) {
    return 'الغرفة غير موجودة. تأكد من كود الغرفة (6 أحرف/أرقام).';
  }

  return error;
}

export function getSupabaseConfigErrorMessage(code: SupabaseConfigError): string {
  switch (code) {
    case 'missing_env':
      return getAuthErrorMessage('Supabase env vars missing');
    case 'invalid_url':
      return getAuthErrorMessage('Invalid Supabase URL');
    case 'invalid_key':
      return getAuthErrorMessage('Invalid Supabase anon key');
  }
}
