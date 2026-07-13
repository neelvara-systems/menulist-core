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
    AuthUserIdentityConflictError,
    getAuthUserByEmail,
    getAuthUserByLoginIdentifier,
} from '@lib/auth/serverUserContext';
import { getPhoneUserDocumentId } from '@lib/auth/phoneUserIdentity';
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
const VERIFICATION_LEASE_MS = 60 * 1000;
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
    const verificationOperationId = crypto.randomBytes(16).toString('hex');
    const challengeDecision = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(challengeRef);
        if (!snapshot.exists) {
            return { outcome: 'invalid_code' as const };
        }

        const data = snapshot.data() || {};
        const nowMs = Date.now();
        const now = admin.firestore.Timestamp.fromMillis(nowMs);
        const expiresAtMs = timestampToMillis(data.expiresAt);
        if (!expiresAtMs || expiresAtMs <= nowMs) {
            transaction.update(challengeRef, {
                status: 'expired',
                updatedAt: now,
                verificationOperationId: admin.firestore.FieldValue.delete(),
                verificationReservedUntil: admin.firestore.FieldValue.delete(),
            });
            return { outcome: 'expired' as const };
        }

        const attempts = Number(data.attempts || 0);
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
            && timestampToMillis(data.verificationReservedUntil) <= nowMs;
        if (data.status !== 'pending' && !isRecoveringExpiredReservation) {
            return { outcome: 'invalid_code' as const };
        }

        const actualHash = hashOtp({
            challengeId,
            code,
            phoneE164: String(data.phoneE164 || ''),
        });
        const expectedHash = String(data.otpHash || '');
        if (!expectedHash || !timingSafeHashCompare(actualHash, expectedHash)) {
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
            countryCode: String(data.countryCode || ''),
            dialCode: String(data.dialCode || ''),
            phoneE164: String(data.phoneE164 || ''),
            phoneUsername: String(data.phoneUsername || ''),
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
            const challengeData = challengeSnapshot.data() || {};
            const userData = userSnapshot.data() || {};
            if (
                !challengeSnapshot.exists
                || challengeData.status !== 'verifying'
                || challengeData.verificationOperationId !== verificationOperationId
                || !userSnapshot.exists
                || String(userData.email || '').toLowerCase().trim() !== normalizedEmail
            ) {
                return { outcome: 'invalid_code' as const };
            }

            const challengeExpiresAtMs = timestampToMillis(challengeData.expiresAt);
            if (!challengeExpiresAtMs || challengeExpiresAtMs <= nowMs) {
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
                const data = snapshot.data() || {};
                if (!snapshot.exists || data.status !== 'verifying' || data.verificationOperationId !== verificationOperationId) {
                    return;
                }
                const nowMs = Date.now();
                transaction.update(challengeRef, {
                    status: timestampToMillis(data.expiresAt) <= nowMs ? 'expired' : 'pending',
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

    const token = String(params.token || '').trim();
    if (token.length < 32) {
        throw new PhoneOtpError('invalid_token', 'Invalid phone login token.');
    }

    const tokenRef = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_LOGIN_TOKENS).doc(hashLoginToken(token));
    const tokenDecision = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(tokenRef);
        if (!snapshot.exists) {
            return { outcome: 'invalid_token' as const, userId: '' };
        }

        const data = snapshot.data() || {};
        if (data.status !== 'active' || data.consumedAt) {
            return { outcome: 'invalid_token' as const, userId: String(data.userId || '') };
        }

        const expiresAtMs = timestampToMillis(data.expiresAt);
        if (!expiresAtMs || expiresAtMs <= Date.now()) {
            transaction.update(tokenRef, {
                status: 'expired',
                updatedAt: admin.firestore.Timestamp.now(),
            });
            return { outcome: 'expired' as const, userId: String(data.userId || '') };
        }

        const tokenUserId = normalizePhoneOtpUserDocumentId(data.userId);
        if (!tokenUserId) {
            return { outcome: 'user_not_found' as const, userId: String(data.userId || '') };
        }
        const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(tokenUserId);
        const userSnapshot = await transaction.get(userRef);
        const dbUser = userSnapshot.data() || {};
        if (
            !userSnapshot.exists
            || String(dbUser.email || '').toLowerCase().trim() !== String(data.email || '').toLowerCase().trim()
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
