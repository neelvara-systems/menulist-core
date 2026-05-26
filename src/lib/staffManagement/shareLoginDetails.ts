import countryData from "@atoms/phoneNumberInput/countryData";

export type StaffLoginDetailsShareInput = {
    countryCode?: string;
    dialCode?: string;
    phoneNumber?: string;
    productName?: string;
    staffLoginId: string;
    temporaryPasscode: string;
    signInUrl?: string;
};

export const getStaffSignInUrl = () => (
    typeof window === 'undefined'
        ? '/signin'
        : `${window.location.origin}/signin`
);

export const buildStaffLoginDetailsText = ({
    productName = 'MenuList',
    signInUrl = getStaffSignInUrl(),
    staffLoginId,
    temporaryPasscode,
}: StaffLoginDetailsShareInput) => [
    `${productName} staff login details`,
    `Staff ID: ${staffLoginId}`,
    `Passcode: ${temporaryPasscode}`,
    `Sign in: ${signInUrl}`,
].join('\n');

export const buildWhatsAppShareUrl = (details: StaffLoginDetailsShareInput) => {
    const phoneParam = buildWhatsAppPhoneParam(details);
    const baseUrl = phoneParam ? `https://wa.me/${phoneParam}` : 'https://wa.me/';

    return `${baseUrl}?text=${encodeURIComponent(buildStaffLoginDetailsText(details))}`;
};

export const buildWhatsAppWebShareUrl = buildWhatsAppShareUrl;

export const isNativeStaffShareAvailable = () => (
    typeof navigator !== 'undefined'
    && typeof (navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> }).share === 'function'
);

export async function shareStaffLoginDetails(details: StaffLoginDetailsShareInput) {
    if (!isNativeStaffShareAvailable()) return 'unavailable';

    try {
        await (navigator as Navigator & { share: (data: { title?: string; text?: string }) => Promise<void> }).share({
            text: buildStaffLoginDetailsText(details),
            title: `${details.productName || 'MenuList'} staff login details`,
        });
        return 'shared';
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        return 'failed';
    }
}

const normalizeDigits = (value?: string) => String(value || '').replace(/\D/g, '');

const getDialDigits = (countryCode?: string, dialCode?: string) => {
    const directDialDigits = normalizeDigits(dialCode);
    if (directDialDigits) return directDialDigits;

    const country = String(countryCode || '').trim().toUpperCase();
    if (!country) return '';

    return normalizeDigits(countryData.find((item) => item.code === country)?.dialCode);
};

export function buildWhatsAppPhoneParam({
    countryCode,
    dialCode,
    phoneNumber,
}: Pick<StaffLoginDetailsShareInput, 'countryCode' | 'dialCode' | 'phoneNumber'>) {
    const phoneDigits = normalizeDigits(phoneNumber);
    if (!phoneDigits) return '';

    const dialDigits = getDialDigits(countryCode, dialCode);
    if (dialDigits && !phoneDigits.startsWith(dialDigits)) {
        return `${dialDigits}${phoneDigits.replace(/^0+/, '')}`;
    }

    return phoneDigits;
}

export async function copyTextToClipboard(text: string) {
    if (!text) return false;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall back to the textarea path below.
        }
    }

    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        return document.execCommand('copy');
    } finally {
        document.body.removeChild(textarea);
    }
}

export function openWhatsAppWebShare(details: StaffLoginDetailsShareInput) {
    if (typeof window === 'undefined') return false;

    const popup = window.open(buildWhatsAppShareUrl(details), '_blank', 'noopener,noreferrer');
    if (popup) popup.opener = null;
    return Boolean(popup);
}
