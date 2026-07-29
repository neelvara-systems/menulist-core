const MAX_PLATFORM_NOTIFICATION_EMAIL_LENGTH = 254;
const PLATFORM_NOTIFICATION_EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function normalizePlatformNotificationEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (
    !email
    || email.length > MAX_PLATFORM_NOTIFICATION_EMAIL_LENGTH
    || /[\u0000-\u001f\u007f]/.test(email)
    || !PLATFORM_NOTIFICATION_EMAIL_PATTERN.test(email)
  ) {
    return null;
  }
  return email;
}
