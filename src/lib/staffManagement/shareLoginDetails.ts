import { buildWhatsAppPhoneParam as buildCanonicalWhatsAppPhoneParam } from "@lib/phone/phoneNumber";

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

export function buildWhatsAppPhoneParam({
    countryCode,
    dialCode,
    phoneNumber,
}: Pick<StaffLoginDetailsShareInput, 'countryCode' | 'dialCode' | 'phoneNumber'>) {
    return buildCanonicalWhatsAppPhoneParam({ countryCode, dialCode, phoneNumber });
}

export const hasStaffLoginClipboardWrite = () => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard?.writeText)
);

export const hasStaffLoginCopyFallback = () => (
    typeof document !== 'undefined'
    && Boolean(document.body)
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
);

export async function copyTextToClipboard(text: string) {
    if (!text) return false;

    if (hasStaffLoginClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall back to the textarea path below.
        }
    }

    const doc = typeof document === 'undefined' ? null : document;
    if (!hasStaffLoginCopyFallback() || !doc?.body) return false;

    const textarea = doc.createElement('textarea');

    try {
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        doc.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copied = doc.execCommand('copy');
        return copied;
    } catch {
        return false;
    } finally {
        textarea.remove();
    }
}

export function openWhatsAppWebShare(details: StaffLoginDetailsShareInput) {
    if (typeof window === 'undefined') return false;

    const popup = window.open(buildWhatsAppShareUrl(details), '_blank', 'noopener,noreferrer');
    if (popup) popup.opener = null;
    return Boolean(popup);
}
