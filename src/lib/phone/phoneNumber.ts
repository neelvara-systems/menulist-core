import countryData from '@atoms/phoneNumberInput/countryData';

export type PhoneNumberStorageInput = {
    countryCode?: string | null;
    dialCode?: string | null;
    phone?: string | null;
    phoneNumber?: string | null;
};

export type NormalizedPhoneNumber = {
    countryCode: string;
    dialCode: string;
    phoneNumber: string;
    phone: string;
    phoneUsername: string;
    internationalDigits: string;
    displayNumber: string;
};

export const DEFAULT_PHONE_COUNTRY_CODE = 'IN';

export const normalizePhoneDigits = (value?: string | number | null) => String(value || '').replace(/[^0-9]/g, '');

const getPhoneInputValue = ({ phone, phoneNumber }: PhoneNumberStorageInput) => {
    const local = String(phoneNumber ?? '').trim();
    if (local) return local;
    return String(phone ?? '').trim();
};

export const getPhoneCountryInfo = (countryCode?: string | null) => {
    const code = String(countryCode || '').trim().toUpperCase();
    return countryData.find((country) => country.code === code)
        || countryData.find((country) => country.code === DEFAULT_PHONE_COUNTRY_CODE)
        || countryData[0];
};

export const getUniquePhoneCountries = () => {
    const seen = new Set<string>();
    return countryData.filter((country) => {
        const code = String(country.code || '').trim().toUpperCase();
        if (!code || seen.has(code)) return false;
        seen.add(code);
        return true;
    });
};

export const getPhoneCountryInfoByDialCode = (dialCode?: string | null) => {
    const dialDigits = normalizePhoneDigits(dialCode);
    if (!dialDigits) return null;
    return countryData.find((country) => normalizePhoneDigits(country.dialCode) === dialDigits) || null;
};

export const getDialCodeForCountry = (countryCode?: string | null, fallbackDialCode?: string | null) => {
    const code = String(countryCode || '').trim().toUpperCase();
    const country = code ? countryData.find((entry) => entry.code === code) : null;
    if (country?.dialCode) return country.dialCode;

    const fallbackDialDigits = normalizePhoneDigits(fallbackDialCode);
    if (fallbackDialDigits) return `+${fallbackDialDigits}`;
    return getPhoneCountryInfo(DEFAULT_PHONE_COUNTRY_CODE)?.dialCode || '+91';
};

export const inferPhoneCountryFromInternationalNumber = (value?: string | null) => {
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
};

export const buildInternationalPhoneDigits = ({
    countryCode,
    dialCode,
    phone,
    phoneNumber,
}: PhoneNumberStorageInput) => {
    const raw = getPhoneInputValue({ phone, phoneNumber });
    const digits = normalizePhoneDigits(raw);
    if (!digits) return '';
    if (raw.startsWith('+')) return digits;
    if (digits.startsWith('00') && digits.length > 12) return digits.slice(2);

    const dialDigits = normalizePhoneDigits(getDialCodeForCountry(countryCode, dialCode));
    if (!dialDigits || digits.startsWith(dialDigits)) return digits;
    return `${dialDigits}${digits.replace(/^0+/, '')}`;
};

export const getLocalPhoneNumber = ({
    countryCode,
    dialCode,
    phone,
    phoneNumber,
}: PhoneNumberStorageInput) => {
    const raw = getPhoneInputValue({ phone, phoneNumber });
    if (!raw) return '';

    const digits = normalizePhoneDigits(raw);
    if (!digits) return '';

    const explicitInternational = raw.startsWith('+') || (digits.startsWith('00') && digits.length > 12);
    const normalizedDigits = raw.startsWith('00') ? digits.slice(2) : digits;
    const dialDigits = normalizePhoneDigits(getDialCodeForCountry(countryCode, dialCode));

    if (explicitInternational && dialDigits && normalizedDigits.startsWith(dialDigits)) {
        return normalizedDigits.slice(dialDigits.length).replace(/^0+/, '');
    }

    return raw;
};

export const normalizePhoneNumberForStorage = (input: PhoneNumberStorageInput): NormalizedPhoneNumber => {
    const rawPhone = getPhoneInputValue(input);
    const inferredCountry = inferPhoneCountryFromInternationalNumber(rawPhone);
    const explicitInternational = rawPhone.startsWith('+') || rawPhone.startsWith('00');
    const countryFromDialCode = getPhoneCountryInfoByDialCode(input.dialCode);
    const countryCode = String(
        explicitInternational && inferredCountry
            ? inferredCountry.code
            : input.countryCode || inferredCountry?.code || countryFromDialCode?.code || DEFAULT_PHONE_COUNTRY_CODE,
    ).trim().toUpperCase();
    const dialCode = getDialCodeForCountry(
        countryCode,
        explicitInternational && inferredCountry ? inferredCountry.dialCode : input.dialCode || inferredCountry?.dialCode,
    );
    const phoneNumber = getLocalPhoneNumber({ ...input, countryCode, dialCode });
    const internationalDigits = buildInternationalPhoneDigits({ countryCode, dialCode, phoneNumber });
    const phone = internationalDigits ? `+${internationalDigits}` : '';

    return {
        countryCode,
        dialCode,
        displayNumber: phoneNumber ? `${dialCode} ${phoneNumber}`.trim() : '',
        internationalDigits,
        phone,
        phoneNumber,
        phoneUsername: internationalDigits,
    };
};

export const buildWhatsAppPhoneParam = (input: PhoneNumberStorageInput) => (
    normalizePhoneNumberForStorage(input).internationalDigits
);

export const buildTelHref = (input: PhoneNumberStorageInput) => {
    const phone = normalizePhoneNumberForStorage(input).phone;
    return phone ? `tel:${phone}` : null;
};
