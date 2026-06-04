import countryData from '../sharedData/countryData';

export type PhoneNumberInput = {
  countryCode?: string | null;
  dialCode?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
};

const DEFAULT_PHONE_COUNTRY_CODE = 'IN';

export function normalizePhoneDigits(value?: string | number | null): string {
  return String(value || '').replace(/[^0-9]/g, '');
}

function getPhoneCountryInfo(countryCode?: string | null) {
  const code = String(countryCode || '').trim().toUpperCase();
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
  const code = String(countryCode || '').trim().toUpperCase();
  const country = code ? countryData.find((entry) => entry.code === code) : null;
  if (country?.dialCode) return country.dialCode;

  const fallbackDialDigits = normalizePhoneDigits(fallbackDialCode);
  if (fallbackDialDigits) return `+${fallbackDialDigits}`;
  return getPhoneCountryInfo(DEFAULT_PHONE_COUNTRY_CODE)?.dialCode || '+91';
}

function inferPhoneCountryFromInternationalNumber(value?: string | null) {
  const raw = String(value || '').trim();
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

export function buildWhatsAppPhoneParam(params: PhoneNumberInput): string {
  const raw = String(params.phoneNumber || params.phone || '').trim();
  const digits = normalizePhoneDigits(raw);
  if (!digits) return '';
  if (raw.startsWith('+')) return digits;
  if (digits.startsWith('00') && digits.length > 12) return digits.slice(2);

  const inferredCountry = inferPhoneCountryFromInternationalNumber(raw);
  const explicitInternational = raw.startsWith('+') || raw.startsWith('00');
  const countryFromDialCode = getPhoneCountryInfoByDialCode(params.dialCode);
  const countryCode = String(
    explicitInternational && inferredCountry
      ? inferredCountry.code
      : params.countryCode || inferredCountry?.code || countryFromDialCode?.code || DEFAULT_PHONE_COUNTRY_CODE,
  ).trim().toUpperCase();
  const dialDigits = normalizePhoneDigits(getDialCodeForCountry(
    countryCode,
    explicitInternational && inferredCountry ? inferredCountry.dialCode : params.dialCode || inferredCountry?.dialCode,
  ));
  if (!dialDigits || digits.startsWith(dialDigits)) return digits;
  return `${dialDigits}${digits.replace(/^0+/, '')}`;
}
