import crypto from 'crypto';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_PRODUCT_ID } from '@constant/product';
import {
    MENULIST_PLATFORM_STORE_ID,
    MENULIST_PLATFORM_TENANT_ID,
} from '@constant/user';
import { getGeneratedEmail } from '@constant/urls';
import { normalizeLoginDigits } from '@lib/auth/loginIdentifiers';
import {
    getBoundedAuthStringContext,
    logAuthFailure,
} from '@lib/auth/authDiagnostics';
import {
    AuthUserIdentityConflictError,
    getAuthUserByEmail,
    getAuthUserByLoginIdentifier,
} from '@lib/auth/serverUserContext';
import type { AuthBootstrapStoreMapping } from '@lib/auth/serverUserContext';
import { getPhoneUserDocumentId } from '@lib/auth/phoneUserIdentity';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { sendOwnerNotificationWhatsApp } from '@lib/owner-notifications/channels/whatsapp';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';
import {
    normalizePhoneDigits,
    normalizePhoneNumberForStorage,
    type PhoneNumberStorageInput,
} from '@lib/phone/phoneNumber';
import { removeDangerousKeys } from '@lib/security/sanitizeObject';
import { secureLog } from '@lib/security/secureLogger';

const OTP_TTL_MS = 5 * 60 * 1000;
const LOGIN_TOKEN_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_LEASE_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;
const GRAPH_TEMPLATE_LANGUAGE = 'en';
const PHONE_OTP_CHALLENGE_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
const PHONE_OTP_LOGIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PHONE_OTP_HASH_PATTERN = /^[a-f0-9]{64}$/;
const PHONE_OTP_REQUEST_HASH_PATTERN = /^[a-f0-9]{32}$/;
const PHONE_OTP_OPERATION_ID_PATTERN = /^[a-f0-9]{32}$/;
const PHONE_OTP_PURPOSES = new Set<PhoneOtpPurpose>(['dashboard_login', 'create_menu', 'login']);

export type PhoneOtpPurpose = 'dashboard_login' | 'create_menu' | 'login';

export class PhoneOtpError extends Error {
    constructor(
        public readonly code: 'disabled' | 'invalid_phone' | 'send_failed' | 'invalid_code' | 'expired' | 'too_many_attempts' | 'invalid_token' | 'user_not_found',
        message: string,
    ) {
        super(message);
        this.name = 'PhoneOtpError';
        Object.setPrototypeOf(this, PhoneOtpError.prototype);
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

const timestampToMillis = (value: unknown): number | null => {
    if (!(value instanceof admin.firestore.Timestamp)) return null;
    const milliseconds = value.toMillis();
    return Number.isSafeInteger(milliseconds) && milliseconds > 0 ? milliseconds : null;
};

type PhoneOtpChallengeData = {
    attempts: number;
    countryCode: string;
    dialCode: string;
    expiresAtMs: number;
    otpHash: string;
    phoneE164: string;
    phoneUsername: string;
    status: 'expired' | 'pending' | 'too_many_attempts' | 'verifying';
    verificationOperationId: string | null;
    verificationReservedUntilMs: number | null;
};

type PhoneOtpLoginTokenData = {
    email: string;
    expiresAtMs: number;
    userId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const readBoundedString = (value: unknown, maxLength: number): string | null => (
    typeof value === 'string' && value.length > 0 && value.length <= maxLength
        ? value
        : null
);

const parsePhoneOtpChallengeData = (value: unknown): PhoneOtpChallengeData | null => {
    if (!isRecord(value)) return null;
    if (
        value.status !== 'expired'
        && value.status !== 'pending'
        && value.status !== 'too_many_attempts'
        && value.status !== 'verifying'
    ) {
        return null;
    }
    if (!Number.isSafeInteger(value.attempts) || (value.attempts as number) < 0 || (value.attempts as number) > MAX_ATTEMPTS) {
        return null;
    }

    const expiresAtMs = timestampToMillis(value.expiresAt);
    const phoneE164 = readBoundedString(value.phoneE164, 32);
    const phoneUsername = readBoundedString(value.phoneUsername, 24);
    const countryCode = typeof value.countryCode === 'string' && value.countryCode.length <= 8
        ? value.countryCode
        : '';
    const dialCode = typeof value.dialCode === 'string' && value.dialCode.length <= 12
        ? value.dialCode
        : '';
    const otpHash = typeof value.otpHash === 'string' && PHONE_OTP_HASH_PATTERN.test(value.otpHash)
        ? value.otpHash
        : null;
    if (!expiresAtMs || !phoneE164 || !phoneUsername || !otpHash) return null;

    if (value.status !== 'verifying') {
        return {
            attempts: value.attempts as number,
            countryCode,
            dialCode,
            expiresAtMs,
            otpHash,
            phoneE164,
            phoneUsername,
            status: value.status,
            verificationOperationId: null,
            verificationReservedUntilMs: null,
        };
    }

    const verificationOperationId = typeof value.verificationOperationId === 'string'
        && PHONE_OTP_OPERATION_ID_PATTERN.test(value.verificationOperationId)
        ? value.verificationOperationId
        : null;
    const verificationReservedUntilMs = timestampToMillis(value.verificationReservedUntil);
    if (!verificationOperationId || !verificationReservedUntilMs) return null;

    return {
        attempts: value.attempts as number,
        countryCode,
        dialCode,
        expiresAtMs,
        otpHash,
        phoneE164,
        phoneUsername,
        status: value.status,
        verificationOperationId,
        verificationReservedUntilMs,
    };
};

const parsePhoneOtpLoginTokenData = (value: unknown): PhoneOtpLoginTokenData | null => {
    if (!isRecord(value) || value.status !== 'active' || value.consumedAt != null) return null;
    const expiresAtMs = timestampToMillis(value.expiresAt);
    const userId = normalizePhoneOtpUserDocumentId(value.userId);
    const email = typeof value.email === 'string' ? value.email.toLowerCase().trim() : '';
    if (
        !expiresAtMs
        || !userId
        || !email
        || email.length > 320
        || email !== value.email
    ) {
        return null;
    }
    return { email, expiresAtMs, userId };
};

const normalizeOptionalRequestHash = (value: unknown): string | null => (
    typeof value === 'string' && PHONE_OTP_REQUEST_HASH_PATTERN.test(value) ? value : null
);

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
    const matches = new Map<string, Record<string, unknown>>();

    for (const candidate of localPhoneCandidates) {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.USERS)
            .where('phoneNumber', '==', candidate)
            .limit(5)
            .get();

        snapshot.docs
            .filter((doc) => matchesStoredPhoneCountry(doc.data(), phone))
            .forEach((doc) => matches.set(doc.id, { ...removeDangerousKeys(doc.data()), id: doc.id }));
    }

    if (matches.size > 1) throw new AuthUserIdentityConflictError();
    return matches.values().next().value || null;
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
    const rawChallengeId = typeof value === 'string' ? value : '';
    const challengeId = rawChallengeId.trim();
    if (challengeId !== rawChallengeId) return null;
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

export const normalizePhoneOtpLoginToken = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const token = value.trim();
    return token === value && PHONE_OTP_LOGIN_TOKEN_PATTERN.test(token) ? token : null;
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
    challengeId: string;
    code: string;
    phone: NormalizedPhoneOtpNumber;
}) => {
    const templateName = menulistServerEnv.whatsappOtpTemplateName;
    const templateLanguage = menulistServerEnv.whatsappOtpTemplateLanguage || GRAPH_TEMPLATE_LANGUAGE;
    const allowTextFallback = menulistServerEnv.whatsappOtpAllowTextFallback === 'true';
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
        messageClass: 'authentication',
        workflow: 'phone_otp',
        localDeliveryReference: params.challengeId,
        ownerDocumentId: params.challengeId,
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
    if (!PHONE_OTP_PURPOSES.has(params.purpose)) {
        throw new PhoneOtpError('invalid_phone', 'Enter a valid phone number.');
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
        requestIpHash: normalizeOptionalRequestHash(params.requestIpHash),
        userAgentHash: normalizeOptionalRequestHash(params.userAgentHash),
        delivery: {
            channel: 'whatsapp',
            status: 'queued',
            queuedAt: now,
        },
    });

    const delivery = await sendPhoneOtpMessage({ challengeId, code, phone });
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
        const existingEmail = typeof dbUser.email === 'string'
            ? dbUser.email.toLowerCase().trim()
            : '';
        if (!existingEmail) {
            const generatedEmailUser = await getAuthUserByEmail(generatedEmail);
            if (generatedEmailUser?.id && generatedEmailUser.id !== existingUserId) {
                throw new AuthUserIdentityConflictError();
            }
        }
        const loginEmail = existingEmail || generatedEmail;

        await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(existingUserId).set({
            email: loginEmail,
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
            email: loginEmail,
            phone: dbUser.phone || phone.e164,
            phoneNumber: dbUser.phoneNumber || phone.phoneNumber || phone.e164,
            phoneUsername: phone.phoneUsername,
            countryCode: dbUser.countryCode || phone.countryCode || null,
            dialCode: dbUser.dialCode || phone.dialCode || null,
            phoneLoginEnabled: true,
        };
    }

    const userId = getPhoneUserDocumentId(phone.e164);
    if (!userId) {
        throw new PhoneOtpError('invalid_phone', 'Enter a valid phone number.');
    }
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

    const userData: {
        [key: string]: unknown;
        storeId: number | null;
        stores: AuthBootstrapStoreMapping[];
        tenantId: number | null;
    } = {
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
        tId: MENULIST_PLATFORM_TENANT_ID,
        sId: MENULIST_PLATFORM_STORE_ID,
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
    const verificationOperationId = crypto.randomBytes(16).toString('hex');
    const challengeDecision = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(challengeRef);
        if (!snapshot.exists) {
            return { outcome: 'invalid_code' as const };
        }

        const data = parsePhoneOtpChallengeData(snapshot.data());
        if (!data) {
            return { outcome: 'invalid_code' as const };
        }
        const nowMs = Date.now();
        const now = admin.firestore.Timestamp.fromMillis(nowMs);
        if (data.expiresAtMs <= nowMs) {
            transaction.update(challengeRef, {
                status: 'expired',
                updatedAt: now,
                verificationOperationId: admin.firestore.FieldValue.delete(),
                verificationReservedUntil: admin.firestore.FieldValue.delete(),
            });
            return { outcome: 'expired' as const };
        }

        const attempts = data.attempts;
        if (attempts >= MAX_ATTEMPTS) {
            transaction.update(challengeRef, {
                status: 'too_many_attempts',
                updatedAt: now,
                verificationOperationId: admin.firestore.FieldValue.delete(),
                verificationReservedUntil: admin.firestore.FieldValue.delete(),
            });
            return { outcome: 'too_many_attempts' as const };
        }

        const isRecoveringExpiredReservation = data.status === 'verifying'
            && data.verificationReservedUntilMs !== null
            && data.verificationReservedUntilMs <= nowMs;
        if (data.status !== 'pending' && !isRecoveringExpiredReservation) {
            return { outcome: 'invalid_code' as const };
        }

        const actualHash = hashOtp({
            challengeId,
            code,
            phoneE164: data.phoneE164,
        });
        if (!timingSafeHashCompare(actualHash, data.otpHash)) {
            const nextAttempts = attempts + 1;
            const tooManyAttempts = nextAttempts >= MAX_ATTEMPTS;
            transaction.update(challengeRef, {
                attempts: nextAttempts,
                lastAttemptAt: now,
                status: tooManyAttempts ? 'too_many_attempts' : 'pending',
                updatedAt: now,
                verificationOperationId: admin.firestore.FieldValue.delete(),
                verificationReservedUntil: admin.firestore.FieldValue.delete(),
            });
            return { outcome: tooManyAttempts ? 'too_many_attempts' as const : 'invalid_code' as const };
        }

        transaction.update(challengeRef, {
            attempts,
            status: 'verifying',
            updatedAt: now,
            verificationOperationId,
            verificationReservedUntil: admin.firestore.Timestamp.fromMillis(nowMs + VERIFICATION_LEASE_MS),
        });

        return {
            outcome: 'reserved' as const,
            countryCode: data.countryCode,
            dialCode: data.dialCode,
            phoneE164: data.phoneE164,
            phoneUsername: data.phoneUsername,
        };
    });

    if (challengeDecision.outcome === 'expired') {
        throw new PhoneOtpError('expired', 'Verification code expired.');
    }
    if (challengeDecision.outcome === 'too_many_attempts') {
        throw new PhoneOtpError('too_many_attempts', 'Too many attempts.');
    }
    if (challengeDecision.outcome !== 'reserved') {
        throw new PhoneOtpError('invalid_code', 'Invalid verification code.');
    }

    const phone = normalizePhoneForOtp({
        countryCode: challengeDecision.countryCode,
        dialCode: challengeDecision.dialCode,
        phone: challengeDecision.phoneE164 || challengeDecision.phoneUsername,
    });
    try {
        const dbUser = await ensurePhoneOtpUser(phone);
        const dbUserId = normalizePhoneOtpUserDocumentId(dbUser?.id);
        const normalizedEmail = typeof dbUser?.email === 'string' ? dbUser.email.toLowerCase().trim() : '';
        if (!normalizedEmail || !dbUserId) {
            throw new PhoneOtpError('user_not_found', 'User not found.');
        }

        const loginToken = generateLoginToken();
        const loginTokenHash = hashLoginToken(loginToken);
        const loginTokenRef = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_LOGIN_TOKENS).doc(loginTokenHash);
        const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(dbUserId);
        const nowMs = Date.now();
        const finalDecision = await firestoreAdmin.runTransaction(async (transaction) => {
            const [challengeSnapshot, userSnapshot] = await Promise.all([
                transaction.get(challengeRef),
                transaction.get(userRef),
            ]);
            const challengeData = parsePhoneOtpChallengeData(challengeSnapshot.data());
            const userData = userSnapshot.data() || {};
            if (
                !challengeSnapshot.exists
                || !challengeData
                || challengeData.status !== 'verifying'
                || challengeData.verificationOperationId !== verificationOperationId
                || !userSnapshot.exists
                || String(userData.email || '').toLowerCase().trim() !== normalizedEmail
            ) {
                return { outcome: 'invalid_code' as const };
            }

            if (challengeData.expiresAtMs <= nowMs) {
                transaction.update(challengeRef, {
                    status: 'expired',
                    updatedAt: admin.firestore.Timestamp.fromMillis(nowMs),
                    verificationOperationId: admin.firestore.FieldValue.delete(),
                    verificationReservedUntil: admin.firestore.FieldValue.delete(),
                });
                return { outcome: 'expired' as const };
            }

            const loginTokenExpiresAt = admin.firestore.Timestamp.fromMillis(nowMs + LOGIN_TOKEN_TTL_MS);
            transaction.create(loginTokenRef, {
                id: loginTokenHash,
                status: 'active',
                challengeId,
                userId: dbUserId,
                email: normalizedEmail,
                phoneHash: hmac(`phone:${phone.e164}`),
                phoneLast4: phone.digits.slice(-4),
                createdAt: admin.firestore.Timestamp.fromMillis(nowMs),
                expiresAt: loginTokenExpiresAt,
            });
            transaction.update(challengeRef, {
                status: 'verified',
                verifiedAt: admin.firestore.Timestamp.fromMillis(nowMs),
                loginTokenHash,
                loginTokenExpiresAt,
                updatedAt: admin.firestore.Timestamp.fromMillis(nowMs),
                verificationOperationId: admin.firestore.FieldValue.delete(),
                verificationReservedUntil: admin.firestore.FieldValue.delete(),
            });
            return { outcome: 'verified' as const };
        });

        if (finalDecision.outcome === 'expired') {
            throw new PhoneOtpError('expired', 'Verification code expired.');
        }
        if (finalDecision.outcome !== 'verified') {
            throw new PhoneOtpError('invalid_code', 'Invalid verification code.');
        }

        return {
            loginToken,
            expiresInSeconds: Math.floor(LOGIN_TOKEN_TTL_MS / 1000),
            phoneMasked: phone.masked,
        };
    } catch (error) {
        try {
            await firestoreAdmin.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(challengeRef);
                const data = parsePhoneOtpChallengeData(snapshot.data());
                if (!snapshot.exists || !data || data.status !== 'verifying' || data.verificationOperationId !== verificationOperationId) {
                    return;
                }
                const nowMs = Date.now();
                transaction.update(challengeRef, {
                    status: data.expiresAtMs <= nowMs ? 'expired' : 'pending',
                    updatedAt: admin.firestore.Timestamp.fromMillis(nowMs),
                    verificationOperationId: admin.firestore.FieldValue.delete(),
                    verificationReservedUntil: admin.firestore.FieldValue.delete(),
                });
            });
        } catch (releaseError) {
            logAuthFailure(
                'phone_otp_verification_reservation_release_failed',
                releaseError,
                getBoundedAuthStringContext('challengeId', challengeId),
            );
        }
        throw error;
    }
}

export async function consumePhoneOtpLoginToken(params: {
    token: string;
}) {
    if (!FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH) {
        throw new PhoneOtpError('disabled', 'Phone OTP auth is disabled.');
    }

    const token = normalizePhoneOtpLoginToken(params.token);
    if (!token) {
        throw new PhoneOtpError('invalid_token', 'Invalid phone login token.');
    }

    const tokenRef = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_LOGIN_TOKENS).doc(hashLoginToken(token));
    const tokenDecision = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(tokenRef);
        if (!snapshot.exists) {
            return { outcome: 'invalid_token' as const, userId: '' };
        }

        const rawData = snapshot.data();
        const data = parsePhoneOtpLoginTokenData(rawData);
        if (!data) {
            const malformedUserId = isRecord(rawData) && typeof rawData.userId === 'string' ? rawData.userId : '';
            return { outcome: 'invalid_token' as const, userId: malformedUserId };
        }

        if (data.expiresAtMs <= Date.now()) {
            transaction.update(tokenRef, {
                status: 'expired',
                updatedAt: admin.firestore.Timestamp.now(),
            });
            return { outcome: 'expired' as const, userId: data.userId };
        }

        const tokenUserId = data.userId;
        const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(tokenUserId);
        const userSnapshot = await transaction.get(userRef);
        const dbUser = userSnapshot.data() || {};
        if (
            !userSnapshot.exists
            || String(dbUser.email || '').toLowerCase().trim() !== data.email
        ) {
            return { outcome: 'user_not_found' as const, userId: tokenUserId };
        }

        transaction.update(tokenRef, {
            status: 'consumed',
            consumedAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        });

        return {
            outcome: 'consumed' as const,
            user: {
                ...removeDangerousKeys(dbUser),
                id: tokenUserId,
            },
            userId: tokenUserId,
        };
    });

    if (tokenDecision.outcome === 'expired') {
        throw new PhoneOtpError('expired', 'Phone login token expired.');
    }
    if (tokenDecision.outcome === 'user_not_found') {
        logAuthFailure(
            'phone_otp_user_not_found',
            new Error('phone_otp_user_not_found'),
            getBoundedAuthStringContext('userId', tokenDecision.userId),
        );
        throw new PhoneOtpError('user_not_found', 'User not found.');
    }
    if (tokenDecision.outcome !== 'consumed') {
        throw new PhoneOtpError('invalid_token', 'Invalid phone login token.');
    }

    return tokenDecision.user;
}

export const hashRequestValueForPhoneOtp = (value: string) => (
    hmac(`request:${value}`).slice(0, 32)
);
