import countryData from '../sharedData/countryData';

export type PhoneNumberInput = {
  countryCode?: string | null;
  dialCode?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
};

const DEFAULT_PHONE_COUNTRY_CODE = 'IN';
const MIN_INTERNATIONAL_PHONE_DIGITS = 7;
const MAX_INTERNATIONAL_PHONE_DIGITS = 15;

function admitInternationalPhoneDigits(digits: string): boolean {
  return digits.length >= MIN_INTERNATIONAL_PHONE_DIGITS
    && digits.length <= MAX_INTERNATIONAL_PHONE_DIGITS
    && !/^0+$/.test(digits);
}

function getPhoneScalarText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function normalizePhoneDigits(value?: string | number | null): string {
  return getPhoneScalarText(value).replace(/[^0-9]/g, '');
}

function getPhoneCountryInfo(countryCode?: string | null) {
  const code = getPhoneScalarText(countryCode).trim().toUpperCase();
  return countryData.find((country) => country.code === code)
    || countryData.find((country) => country.code === DEFAULT_PHONE_COUNTRY_CODE)
    || countryData[0];
}

function getPhoneCountryInfoByDialCode(dialCode?: string | null) {
  const dialDigits = normalizePhoneDigits(dialCode);
  if (!dialDigits) return null;
  return countryData.find((country) => normalizePhoneDigits(country.dialCode) === dialDigits) || null;
}

function getDialCodeForCountry(countryCode?: string | null, fallbackDialCode?: string | null): string {
  const code = getPhoneScalarText(countryCode).trim().toUpperCase();
  const country = code ? countryData.find((entry) => entry.code === code) : null;
  if (country?.dialCode) return country.dialCode;

  const fallbackDialDigits = normalizePhoneDigits(fallbackDialCode);
  if (fallbackDialDigits) return `+${fallbackDialDigits}`;
  return getPhoneCountryInfo(DEFAULT_PHONE_COUNTRY_CODE)?.dialCode || '+91';
}

function inferPhoneCountryFromInternationalNumber(value?: string | null) {
  const raw = getPhoneScalarText(value).trim();
  if (!raw.startsWith('+') && !raw.startsWith('00')) return null;

  const digits = raw.startsWith('00')
    ? normalizePhoneDigits(raw).slice(2)
    : normalizePhoneDigits(raw);
  if (!digits) return null;

  return [...countryData]
    .sort((left, right) => normalizePhoneDigits(right.dialCode).length - normalizePhoneDigits(left.dialCode).length)
    .find((country) => {
      const dialDigits = normalizePhoneDigits(country.dialCode);
      return dialDigits && digits.startsWith(dialDigits);
    }) || null;
}

function looksLikeUnprefixedInternationalNumber(digits: string, dialDigits: string): boolean {
  return Boolean(dialDigits)
    && digits.startsWith(dialDigits)
    && digits.length > 10
    && digits.length <= 15;
}

export function buildWhatsAppPhoneParam(params: PhoneNumberInput): string {
  const raw = getPhoneScalarText(params.phoneNumber || params.phone).trim();
  const digits = normalizePhoneDigits(raw);
  if (!digits) return '';
  if (raw.startsWith('+')) return admitInternationalPhoneDigits(digits) ? digits : '';
  if (digits.startsWith('00') && digits.length > 12) {
    const withoutPrefix = digits.slice(2);
    return admitInternationalPhoneDigits(withoutPrefix) ? withoutPrefix : '';
  }

  const inferredCountry = inferPhoneCountryFromInternationalNumber(raw);
  const explicitInternational = raw.startsWith('+') || raw.startsWith('00');
  const countryFromDialCode = getPhoneCountryInfoByDialCode(params.dialCode);
  const countryCode = getPhoneScalarText(
    explicitInternational && inferredCountry
      ? inferredCountry.code
      : params.countryCode || inferredCountry?.code || countryFromDialCode?.code || DEFAULT_PHONE_COUNTRY_CODE,
  ).trim().toUpperCase();
  const dialDigits = normalizePhoneDigits(getDialCodeForCountry(
    countryCode,
    explicitInternational && inferredCountry ? inferredCountry.dialCode : params.dialCode || inferredCountry?.dialCode,
  ));
  if (!dialDigits) return admitInternationalPhoneDigits(digits) ? digits : '';
  const internationalDigits = looksLikeUnprefixedInternationalNumber(digits, dialDigits)
    ? digits
    : `${dialDigits}${digits.replace(/^0+/, '')}`;
  return admitInternationalPhoneDigits(internationalDigits) ? internationalDigits : '';
}
