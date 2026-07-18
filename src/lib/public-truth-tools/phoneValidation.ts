const PHONE_INPUT_PATTERN = /^(?:\+\s*|00\s*)?\(?[0-9][0-9\s().-]*[0-9]$/;
const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePhoneDigits(value: string): string {
  const trimmed = value.trim();
  if (!PHONE_INPUT_PATTERN.test(trimmed)) return '';

  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('00') && digits.length > 2 ? digits.slice(2) : digits;
}

export function isLikelyPhoneNumber(
  value: string,
  options: { requireCountryCode?: boolean } = {},
): boolean {
  const trimmed = value.trim();
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 8 || digits.length > 15) return false;
  if (!options.requireCountryCode) return true;

  return !digits.startsWith('0')
    && (trimmed.startsWith('+') || trimmed.startsWith('00') || digits.length > 10);
}

export function isValidTelDestination(value: string): boolean {
  if (!/^tel:/i.test(value)) return false;
  return isLikelyPhoneNumber(value.slice(value.indexOf(':') + 1));
}

export function isValidMailtoDestination(value: string): boolean {
  if (!/^mailto:/i.test(value)) return false;

  try {
    const address = decodeURIComponent(value.slice(value.indexOf(':') + 1).split('?')[0] || '').trim();
    return address.length <= 180 && SIMPLE_EMAIL_PATTERN.test(address);
  } catch {
    return false;
  }
}

export function getWhatsAppSchemePhoneDigits(value: string): string {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'whatsapp:'
      || url.hostname.toLowerCase() !== 'send'
      || url.username
      || url.password
      || url.port
    ) {
      return '';
    }

    const rawPhone = url.searchParams.get('phone') || '';
    return isLikelyPhoneNumber(rawPhone, { requireCountryCode: true })
      ? normalizePhoneDigits(rawPhone)
      : '';
  } catch {
    return '';
  }
}
