/** User-facing auth / online error text (Arabic). */
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

  if (/room not found/i.test(lower)) {
    return 'الغرفة غير موجودة. تأكد من كود الغرفة (6 أحرف/أرقام).';
  }

  if (/load failed|failed to fetch|networkerror|network request failed|expected pattern/i.test(lower)) {
    return (
      `تعذّر الاتصال بالسيرفر (${error}). ` +
      'تأكد من اتصال الإنترنت، جرّب Wi‑Fi بدل بيانات الجوال، أو حدّث الصفحة بدون cache (Safari: مسح History للموقع).'
    );
  }

  return error;
}
