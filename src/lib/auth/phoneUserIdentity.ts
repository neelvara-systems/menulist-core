import crypto from 'crypto';

const getPhoneIdentitySecret = (): string => {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('PHONE_USER_IDENTITY_NOT_CONFIGURED');
    return secret;
};

export const getPhoneUserDocumentId = (normalizedPhone: string): string | null => {
    const phone = normalizedPhone.trim();
    if (!phone) return null;
    const digest = crypto
        .createHmac('sha256', getPhoneIdentitySecret())
        .update(`user:${phone}`)
        .digest('hex');
    return `phone_${digest.slice(0, 24)}`;
};
