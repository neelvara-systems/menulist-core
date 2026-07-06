import crypto from 'crypto';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_PRODUCT_ID } from '@constant/product';
import {
    ECOMSAI_PLATFORM_STORE_ID,
    ECOMSAI_PLATFORM_TENANT_ID,
} from '@constant/user';
import { getGeneratedEmail } from '@constant/urls';
import { normalizeLoginDigits } from '@lib/auth/loginIdentifiers';
import {
    getBoundedAuthStringContext,
    logAuthFailure,
} from '@lib/auth/authDiagnostics';
import {
    getAuthUserByEmail,
    getAuthUserByLoginIdentifier,
} from '@lib/auth/serverUserContext';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { sendOwnerNotificationWhatsApp } from '@lib/owner-notifications/channels/whatsapp';
import {
    normalizePhoneDigits,
    normalizePhoneNumberForStorage,
    type PhoneNumberStorageInput,
} from '@lib/phone/phoneNumber';
import { removeDangerousKeys } from '@lib/security/sanitizeObject';
import { secureLog } from '@lib/security/secureLogger';

const OTP_TTL_MS = 5 * 60 * 1000;
const LOGIN_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;
const GRAPH_TEMPLATE_LANGUAGE = 'en';
const PHONE_OTP_CHALLENGE_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

export type PhoneOtpPurpose = 'dashboard_login' | 'create_menu' | 'login';

export class PhoneOtpError extends Error {
    constructor(
        public readonly code: 'disabled' | 'invalid_phone' | 'send_failed' | 'invalid_code' | 'expired' | 'too_many_attempts' | 'invalid_token' | 'user_not_found',
        message: string,
    ) {
        super(message);
        this.name = 'PhoneOtpError';
    }
}

export type NormalizedPhoneOtpNumber = {
    countryCode: string;
    digits: string;
    dialCode: string;
    e164: string;
    masked: string;
    phoneNumber: string;
    phoneUsername: string;
};

export type PhoneOtpNumberInput = PhoneNumberStorageInput & {
    countryCode?: string;
    dialCode?: string;
    phone: string;
};

const getOtpSecret = () => {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new PhoneOtpError('disabled', 'Phone OTP auth is not configured.');
    }
    return secret;
};

const hmac = (value: string) => (
    crypto.createHmac('sha256', getOtpSecret()).update(value).digest('hex')
);

const timingSafeHashCompare = (left: string, right: string) => {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const timestampToMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value._seconds === 'number') {
        return (value._seconds * 1000) + Math.floor((value._nanoseconds || 0) / 1_000_000);
    }
    return 0;
};

const getLocalPhoneCandidates = (phone: NormalizedPhoneOtpNumber) => {
    const dialDigits = normalizePhoneDigits(phone.dialCode);
    if (!dialDigits || !phone.digits.startsWith(dialDigits)) return [];

    const localDigits = phone.digits.slice(dialDigits.length).replace(/^0+/, '');
    return Array.from(new Set([
        localDigits,
        localDigits ? `0${localDigits}` : '',
    ].filter(Boolean)));
};

const matchesStoredPhoneCountry = (data: any, phone: NormalizedPhoneOtpNumber) => {
    const storedDialDigits = normalizePhoneDigits(data?.dialCode);
    const phoneDialDigits = normalizePhoneDigits(phone.dialCode);
    if (storedDialDigits && phoneDialDigits && storedDialDigits === phoneDialDigits) return true;

    const storedCountry = String(data?.countryCode || '').trim().toUpperCase();
    return Boolean(storedCountry && phone.countryCode && storedCountry === phone.countryCode);
};

const getAuthUserByLocalPhoneAndCountry = async (phone: NormalizedPhoneOtpNumber) => {
    const localPhoneCandidates = getLocalPhoneCandidates(phone);
    if (!localPhoneCandidates.length || (!phone.dialCode && !phone.countryCode)) return null;

    for (const candidate of localPhoneCandidates) {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.USERS)
            .where('phoneNumber', '==', candidate)
            .limit(5)
            .get();

        const match = snapshot.docs.find((doc) => matchesStoredPhoneCountry(doc.data(), phone));
        if (match) {
            return { ...removeDangerousKeys(match.data()), id: match.id };
        }
    }

    return null;
};

export const normalizePhoneForOtp = (input: string | PhoneOtpNumberInput): NormalizedPhoneOtpNumber => {
    const normalized = normalizePhoneNumberForStorage(typeof input === 'string' ? { phone: input } : input);
    const digits = normalized.internationalDigits;

    if (digits.length < 10 || digits.length > 15) {
        throw new PhoneOtpError('invalid_phone', 'Enter a valid phone number.');
    }

    if (normalized.phoneUsername.length < 10) {
        throw new PhoneOtpError('invalid_phone', 'Enter a valid phone number.');
    }

    return {
        countryCode: normalized.countryCode,
        digits,
        dialCode: normalized.dialCode,
        e164: normalized.phone,
        masked: `**** ${digits.slice(-4)}`,
        phoneNumber: normalized.phoneNumber,
        phoneUsername: normalized.phoneUsername,
    };
};

export const hashPhoneForOtpRateLimit = (phone: string | PhoneOtpNumberInput) => {
    const normalized = normalizePhoneForOtp(phone);
    return hmac(`phone-rate:${normalized.e164}`).slice(0, 32);
};

export const normalizePhoneOtpChallengeId = (value: unknown): string | null => {
    const challengeId = typeof value === 'string' ? value.trim() : '';
    if (!PHONE_OTP_CHALLENGE_ID_PATTERN.test(challengeId)) return null;
    return isValidFirestoreDocumentId(challengeId) ? challengeId : null;
};

export const normalizePhoneOtpUserDocumentId = (value: unknown): string | null => {
    const raw = typeof value === 'string' ? value : '';
    const userId = raw.trim();
    return userId === raw && userId.length > 0 && userId.length <= 160 && isValidFirestoreDocumentId(userId)
        ? userId
        : null;
};

const hashOtp = (params: { challengeId: string; code: string; phoneE164: string }) => (
    hmac(`otp:${params.challengeId}:${params.phoneE164}:${params.code}`)
);

const hashLoginToken = (token: string) => (
    hmac(`login-token:${token}`)
);

const generateOtpCode = () => {
    const configuredDevCode = process.env.NODE_ENV !== 'production'
        ? process.env.PHONE_OTP_DEV_CODE
        : undefined;
    if (configuredDevCode && /^\d{6}$/.test(configuredDevCode)) {
        return configuredDevCode;
    }

    return crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();
};

const generateLoginToken = () => crypto.randomBytes(32).toString('base64url');

const sendPhoneOtpMessage = async (params: {
    code: string;
    phone: NormalizedPhoneOtpNumber;
}) => {
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
    const templateLanguage = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || GRAPH_TEMPLATE_LANGUAGE;
    const allowTextFallback = process.env.WHATSAPP_OTP_ALLOW_TEXT_FALLBACK === 'true';
    const allowDevSkipSend = process.env.NODE_ENV !== 'production'
        && process.env.PHONE_OTP_DEV_SKIP_SEND === 'true';

    if (allowDevSkipSend) {
        return {
            ok: true,
            skippedReason: 'dev_skip_send',
        };
    }

    const text = `MenuList verification code: ${params.code}. This code expires in 5 minutes.`;
    return sendOwnerNotificationWhatsApp({
        to: params.phone.digits,
        text,
        sessionActive: allowTextFallback,
        templateName,
        templateLanguage,
        templateParameters: [params.code],
    });
};

export async function createPhoneOtpChallenge(params: {
    countryCode?: string;
    dialCode?: string;
    phone: string;
    purpose: PhoneOtpPurpose;
    requestIpHash?: string;
    userAgentHash?: string;
}) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH) {
        throw new PhoneOtpError('disabled', 'Phone OTP auth is disabled.');
    }

    const phone = normalizePhoneForOtp({
        countryCode: params.countryCode,
        dialCode: params.dialCode,
        phone: params.phone,
    });
    const code = generateOtpCode();
    const nowMs = Date.now();
    const now = admin.firestore.Timestamp.fromMillis(nowMs);
    const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs + OTP_TTL_MS);
    const challengeRef = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_CHALLENGES).doc();
    const challengeId = challengeRef.id;

    await challengeRef.set({
        id: challengeId,
        status: 'pending',
        purpose: params.purpose,
        phoneE164: phone.e164,
        phoneHash: hmac(`phone:${phone.e164}`),
        phoneLast4: phone.digits.slice(-4),
        phoneUsername: phone.phoneUsername,
        countryCode: phone.countryCode || null,
        dialCode: phone.dialCode || null,
        otpHash: hashOtp({ challengeId, code, phoneE164: phone.e164 }),
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        createdAt: now,
        expiresAt,
        requestIpHash: params.requestIpHash || null,
        userAgentHash: params.userAgentHash || null,
        delivery: {
            channel: 'whatsapp',
            status: 'queued',
            queuedAt: now,
        },
    });

    const delivery = await sendPhoneOtpMessage({ code, phone });
    if (!delivery.ok) {
        await challengeRef.set({
            status: 'delivery_failed',
            delivery: {
                channel: 'whatsapp',
                status: 'failed',
                failedAt: admin.firestore.Timestamp.now(),
                skippedReason: delivery.skippedReason || null,
            },
            updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });

        secureLog('[Phone OTP] WhatsApp delivery failed', {
            challengeId,
            skippedReason: delivery.skippedReason || null,
        });
        throw new PhoneOtpError('send_failed', 'Could not send verification code.');
    }

    await challengeRef.set({
        delivery: {
            channel: 'whatsapp',
            status: delivery.skippedReason ? 'skipped' : 'sent',
            sentAt: admin.firestore.Timestamp.now(),
            providerMessageId: delivery.providerMessageId || null,
            skippedReason: delivery.skippedReason || null,
        },
        updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });

    return {
        challengeId,
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
        phoneMasked: phone.masked,
        resendAfterSeconds: 60,
        debugCode: process.env.NODE_ENV !== 'production' && process.env.PHONE_OTP_DEBUG_RESPONSE === 'true'
            ? code
            : undefined,
    };
}

async function ensurePhoneOtpUser(phone: NormalizedPhoneOtpNumber): Promise<any> {
    const generatedEmail = getGeneratedEmail(phone.e164).toLowerCase().trim();
    let dbUser: any = await getAuthUserByLoginIdentifier(phone.phoneUsername);

    if (!dbUser) {
        dbUser = await getAuthUserByLocalPhoneAndCountry(phone);
    }

    if (!dbUser) {
        dbUser = await getAuthUserByEmail(generatedEmail);
    }

    const now = admin.firestore.Timestamp.now();

    if (dbUser?.id) {
        const existingUserId = normalizePhoneOtpUserDocumentId(dbUser.id);
        if (!existingUserId) {
            throw new PhoneOtpError('user_not_found', 'User not found.');
        }

        await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(existingUserId).set({
            phone: dbUser.phone || phone.e164,
            phoneNumber: dbUser.phoneNumber || phone.phoneNumber || phone.e164,
            phoneUsername: phone.phoneUsername,
            countryCode: dbUser.countryCode || phone.countryCode || null,
            dialCode: dbUser.dialCode || phone.dialCode || null,
            phoneLoginEnabled: true,
            phoneVerifiedAt: dbUser.phoneVerifiedAt || now,
            lastPhoneOtpLoginAt: now,
            modifiedOn: now,
        }, { merge: true });
        return {
            ...dbUser,
            id: existingUserId,
            phone: dbUser.phone || phone.e164,
            phoneNumber: dbUser.phoneNumber || phone.phoneNumber || phone.e164,
            phoneUsername: phone.phoneUsername,
            countryCode: dbUser.countryCode || phone.countryCode || null,
            dialCode: dbUser.dialCode || phone.dialCode || null,
            phoneLoginEnabled: true,
        };
    }

    const userId = `phone_${hmac(`user:${phone.e164}`).slice(0, 24)}`;
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    const existingDeterministicUser = await userRef.get();
    if (existingDeterministicUser.exists) {
        const data = existingDeterministicUser.data() || {};
        await userRef.set({
            phone: data.phone || phone.e164,
            phoneNumber: data.phoneNumber || phone.phoneNumber || phone.e164,
            phoneUsername: phone.phoneUsername,
            countryCode: data.countryCode || phone.countryCode || null,
            dialCode: data.dialCode || phone.dialCode || null,
            phoneLoginEnabled: true,
            phoneVerifiedAt: data.phoneVerifiedAt || now,
            lastPhoneOtpLoginAt: now,
            modifiedOn: now,
        }, { merge: true });
        return {
            ...data,
            id: userId,
            phone: data.phone || phone.e164,
            phoneNumber: data.phoneNumber || phone.phoneNumber || phone.e164,
            phoneUsername: phone.phoneUsername,
            countryCode: data.countryCode || phone.countryCode || null,
            dialCode: data.dialCode || phone.dialCode || null,
            phoneLoginEnabled: true,
        };
    }

    const userData = {
        id: userId,
        email: generatedEmail,
        displayEmail: '',
        name: `Owner ${phone.masked}`,
        image: '',
        isVerified: true,
        active: true,
        authDisabled: false,
        tenantId: null,
        storeId: null,
        platformRole: 'OWNER',
        role: 'owner',
        stores: [],
        pId: DEFAULT_PRODUCT_ID,
        productId: DEFAULT_PRODUCT_ID,
        tId: ECOMSAI_PLATFORM_TENANT_ID,
        sId: ECOMSAI_PLATFORM_STORE_ID,
        uId: userId,
        phone: phone.e164,
        phoneNumber: phone.phoneNumber || phone.e164,
        phoneUsername: phone.phoneUsername,
        countryCode: phone.countryCode || null,
        dialCode: phone.dialCode || null,
        phoneLoginEnabled: true,
        phoneVerifiedAt: now,
        lastPhoneOtpLoginAt: now,
        createdVia: 'phone-otp-auth',
        createdBy: 'phone-otp-auth',
        createdOn: now,
        modifiedBy: 'phone-otp-auth',
        modifiedOn: now,
    };

    try {
        await userRef.create(userData);
    } catch (error: any) {
        if (error?.code !== 6 && error?.code !== 'already-exists') {
            throw error;
        }

        const existingAfterRace = await userRef.get();
        const data = existingAfterRace.data() || {};
        await userRef.set({
            phone: data.phone || phone.e164,
            phoneNumber: data.phoneNumber || phone.phoneNumber || phone.e164,
            phoneUsername: phone.phoneUsername,
            countryCode: data.countryCode || phone.countryCode || null,
            dialCode: data.dialCode || phone.dialCode || null,
            phoneLoginEnabled: true,
            phoneVerifiedAt: data.phoneVerifiedAt || now,
            lastPhoneOtpLoginAt: now,
            modifiedOn: now,
        }, { merge: true });
        return {
            ...data,
            id: userId,
            phone: data.phone || phone.e164,
            phoneNumber: data.phoneNumber || phone.phoneNumber || phone.e164,
            phoneUsername: phone.phoneUsername,
            countryCode: data.countryCode || phone.countryCode || null,
            dialCode: data.dialCode || phone.dialCode || null,
            phoneLoginEnabled: true,
        };
    }
    secureLog('[Phone OTP] Created phone-auth owner profile', {
        userId,
        phoneLast4: phone.digits.slice(-4),
    });

    return userData;
}

export async function verifyPhoneOtpChallenge(params: {
    challengeId: string;
    code: string;
}) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH) {
        throw new PhoneOtpError('disabled', 'Phone OTP auth is disabled.');
    }

    const code = normalizeLoginDigits(params.code);
    if (!/^\d{6}$/.test(code)) {
        throw new PhoneOtpError('invalid_code', 'Invalid verification code.');
    }

    const challengeId = normalizePhoneOtpChallengeId(params.challengeId);
    if (!challengeId) {
        throw new PhoneOtpError('invalid_code', 'Invalid verification code.');
    }

    const challengeRef = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_CHALLENGES).doc(challengeId);
    const challenge = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(challengeRef);
        if (!snapshot.exists) {
            throw new PhoneOtpError('invalid_code', 'Invalid verification code.');
        }

        const data = snapshot.data() || {};
        if (data.status !== 'pending') {
            throw new PhoneOtpError('invalid_code', 'Invalid verification code.');
        }

        const expiresAtMs = timestampToMillis(data.expiresAt);
        if (!expiresAtMs || expiresAtMs <= Date.now()) {
            transaction.update(challengeRef, {
                status: 'expired',
                updatedAt: admin.firestore.Timestamp.now(),
            });
            throw new PhoneOtpError('expired', 'Verification code expired.');
        }

        const attempts = Number(data.attempts || 0);
        if (attempts >= MAX_ATTEMPTS) {
            transaction.update(challengeRef, {
                status: 'too_many_attempts',
                updatedAt: admin.firestore.Timestamp.now(),
            });
            throw new PhoneOtpError('too_many_attempts', 'Too many attempts.');
        }

        const actualHash = hashOtp({
            challengeId,
            code,
            phoneE164: String(data.phoneE164 || ''),
        });
        const expectedHash = String(data.otpHash || '');
        if (!expectedHash || !timingSafeHashCompare(actualHash, expectedHash)) {
            transaction.update(challengeRef, {
                attempts: attempts + 1,
                lastAttemptAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
            throw new PhoneOtpError('invalid_code', 'Invalid verification code.');
        }

        transaction.update(challengeRef, {
            attempts: attempts + 1,
            status: 'verified',
            verifiedAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        });

        return {
            countryCode: String(data.countryCode || ''),
            dialCode: String(data.dialCode || ''),
            phoneE164: String(data.phoneE164 || ''),
            phoneUsername: String(data.phoneUsername || ''),
        };
    });

    const phone = normalizePhoneForOtp({
        countryCode: challenge.countryCode,
        dialCode: challenge.dialCode,
        phone: challenge.phoneE164 || challenge.phoneUsername,
    });
    const dbUser = await ensurePhoneOtpUser(phone);
    const dbUserId = normalizePhoneOtpUserDocumentId(dbUser?.id);
    if (!dbUser?.email || !dbUserId) {
        throw new PhoneOtpError('user_not_found', 'User not found.');
    }

    const loginToken = generateLoginToken();
    const loginTokenHash = hashLoginToken(loginToken);
    const nowMs = Date.now();
    await firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_LOGIN_TOKENS).doc(loginTokenHash).set({
        id: loginTokenHash,
        status: 'active',
        challengeId,
        userId: dbUserId,
        email: String(dbUser.email).toLowerCase().trim(),
        phoneHash: hmac(`phone:${phone.e164}`),
        phoneLast4: phone.digits.slice(-4),
        createdAt: admin.firestore.Timestamp.fromMillis(nowMs),
        expiresAt: admin.firestore.Timestamp.fromMillis(nowMs + LOGIN_TOKEN_TTL_MS),
    });

    await challengeRef.set({
        loginTokenHash,
        loginTokenExpiresAt: admin.firestore.Timestamp.fromMillis(nowMs + LOGIN_TOKEN_TTL_MS),
        updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });

    return {
        loginToken,
        expiresInSeconds: Math.floor(LOGIN_TOKEN_TTL_MS / 1000),
        phoneMasked: phone.masked,
    };
}

export async function consumePhoneOtpLoginToken(params: {
    token: string;
}) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH) {
        throw new PhoneOtpError('disabled', 'Phone OTP auth is disabled.');
    }

    const token = String(params.token || '').trim();
    if (token.length < 32) {
        throw new PhoneOtpError('invalid_token', 'Invalid phone login token.');
    }

    const tokenRef = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_LOGIN_TOKENS).doc(hashLoginToken(token));
    const tokenData = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(tokenRef);
        if (!snapshot.exists) {
            throw new PhoneOtpError('invalid_token', 'Invalid phone login token.');
        }

        const data = snapshot.data() || {};
        if (data.status !== 'active' || data.consumedAt) {
            throw new PhoneOtpError('invalid_token', 'Invalid phone login token.');
        }

        const expiresAtMs = timestampToMillis(data.expiresAt);
        if (!expiresAtMs || expiresAtMs <= Date.now()) {
            transaction.update(tokenRef, {
                status: 'expired',
                updatedAt: admin.firestore.Timestamp.now(),
            });
            throw new PhoneOtpError('expired', 'Phone login token expired.');
        }

        transaction.update(tokenRef, {
            status: 'consumed',
            consumedAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        });

        return {
            email: String(data.email || '').toLowerCase().trim(),
            userId: String(data.userId || ''),
        };
    });

    const dbUser = await getAuthUserByEmail(tokenData.email);
    const tokenUserId = normalizePhoneOtpUserDocumentId(tokenData.userId);
    const dbUserId = normalizePhoneOtpUserDocumentId(dbUser?.id);
    if (!dbUser || !tokenUserId || !dbUserId || dbUserId !== tokenUserId) {
        logAuthFailure(
            'phone_otp_user_not_found',
            new Error('phone_otp_user_not_found'),
            getBoundedAuthStringContext('userId', tokenData.userId),
        );
        throw new PhoneOtpError('user_not_found', 'User not found.');
    }

    return {
        ...dbUser,
        id: dbUserId,
    };
}

export const hashRequestValueForPhoneOtp = (value: string) => (
    hmac(`request:${value}`).slice(0, 32)
);
