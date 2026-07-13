import { DB_COLLECTIONS } from "@constant/database";
import { NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { DEFAULT_PRODUCT_ID, PRODUCT_IDS, type ProductId } from "@constant/product";
import { getDisplayEmail } from "@lib/auth/loginIdentifiers";
import { firebaseAuth, signOutFirebaseAuth } from "@lib/firebase/firebaseClient";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { DANGEROUS_KEYS, removeKeys } from "@lib/security/sanitizeObject";
import { getEmailValidationError, validateEmail } from '@lib/validation/emailDomainValidator';
import { UserDataType } from "@type/platform/user";
import type LoginUserType from "@type/loginUser";
import type { AuthSessionUserType } from "@type/loginUser";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { signOut } from "next-auth/react";
import { getAuthSessionLogContext, getBoundedAuthStringContext, logAuthDiagnostic, logAuthFailure } from "./authDiagnostics";
import { consumePhoneOtpLoginToken, PhoneOtpError } from "./phoneOtp";
import { normalizeAuthSessionStoreScope } from "./sessionUserBoundary";
import { checkAccountLock, getLockoutMessage, logFailedLogin, logSuccessfulLogin } from "./security";
import {
    addAuthPlatformUser,
    getAuthEntitySnapshot,
    getAuthUserByEmail,
    getAuthUserByLoginIdentifier,
    normalizePhoneUsername,
} from "./serverUserContext";

// Validate required environment variables at startup
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is not set in environment variables');
}
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    logAuthDiagnostic('google_oauth_credentials_missing', {
        googleClientIdPresent: Boolean(process.env.GOOGLE_CLIENT_ID),
        googleClientSecretPresent: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    });
}

declare module "next-auth" {
    interface Session extends LoginUserType {
        user: AuthSessionUserType & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        credits: number;
        sessionIssuedAt?: number;
    }
}

const AUTH_SESSION_USER_CONTEXT_CACHE_TTL_MS = 15 * 1000;
const AUTH_SESSION_USER_CONTEXT_CACHE_MAX = 500;
const authSessionUserContextCache = new Map<string, { expiresAt: number; user: any }>();

const getAuthEmailLogContext = (email: unknown) => getBoundedAuthStringContext('email', email);

const getAuthProviderLogValue = (provider: unknown): string | undefined => {
    if (typeof provider !== 'string' || provider.trim().length === 0) return undefined;
    return provider.trim().slice(0, 32);
};

const sanitizeAuthSessionForLog = (session: any): any => ({
    user: {
        ...getBoundedAuthStringContext('sessionUserId', session.user?.id),
        ...getBoundedAuthStringContext('sessionEmail', session.user?.email),
        namePresent: Boolean(session.user?.name),
    },
    ...getBoundedAuthStringContext('productId', session.pId),
    ...getBoundedAuthStringContext('tenantId', session.tId),
    ...getBoundedAuthStringContext('storeId', session.sId),
    ...getBoundedAuthStringContext('userId', session.uId),
    ...getBoundedAuthStringContext('role', session.role),
    ...getBoundedAuthStringContext('platformRole', session.platformRole),
});


//refer https://www.youtube.com/watch?v=bkUmN9TH_hQ
export const authOptions: NextAuthOptions = {
    session: {

        // Choose how you want to save the user session.
        // The default is `"jwt"`, an encrypted JWT (JWE) stored in the session cookie.
        // If you use an `adapter` however, we default it to `"database"` instead.
        // You can still force a JWT session by explicitly defining `"jwt"`.
        // When using `"database"`, the session cookie will only contain a `sessionToken` value,
        // which is used to look up the session in the database.
        strategy: "jwt",

        // Seconds - How long until an idle session expires and is no longer valid.
        maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 days for better security)

        // This line sets the maximum age of a session to 7 days in seconds.
        // Here's the breakdown:
        // 7 (days) * 24 (hours in a day) * 60 (minutes in an hour) * 60 (seconds in a minute)
        // = 604,800 seconds
        // After this time period, if the user hasn't interacted with the session,
        // it will expire and the user will need to log in again.
        // 
        // Security Note (ASSESSMENT-05):
        // - Reduced from 30 days to 7 days to minimize risk of session hijacking
        // - Balances security with user convenience
        // - Follows OWASP recommendation for web applications

        // Seconds - Throttle how frequently to write to database to extend a session.
        // Use it to limit write operations. Set to 0 to always update the database.
        // Note: This option is ignored if using JSON Web Tokens
        //
        // This option controls how often the session is updated in the database.
        // It's measured in seconds and is set to 24 hours (86,400 seconds) by default.
        // 
        // Purpose:
        // 1. Performance: Reduces database writes by only updating after the specified time.
        // 2. Resource Management: Helps manage server load and database connections.
        //
        // Usage:
        // - Set to 0 to update the database on every request (not recommended for high traffic).
        // - Increase the value to reduce database writes, but may slightly delay session updates.
        // 
        // Note: This setting has no effect when using JWT (JSON Web Tokens) for sessions,
        // as JWTs are stateless and don't require database updates.

        // updateAge: 24 * 60 * 60, // 24 hours

        // The session token is usually either a random UUID or string, however if you
        // need a more customized session token string, you can define your own generate function.
        // generateSessionToken: () => {
        //     const timestamp = new Date().toISOString();
        //     return randomUUID?.() ?? randomBytes(32).toString("hex")
        // }

    },
    secret: process.env.NEXTAUTH_SECRET as string,
    callbacks: {
        signIn: async ({ user, profile, account }: any) => {
            const email = user?.email?.toLowerCase()?.trim();

            // ✅ EMAIL VALIDATION: Block disposable emails and invalid domains
            if (email) {
                const emailValidation = validateEmail(email);
                if (!emailValidation.valid) {
                    logAuthDiagnostic('oauth_email_validation_failed', {
                        ...getAuthEmailLogContext(email),
                        reason: emailValidation.reason,
                        provider: getAuthProviderLogValue(account?.provider),
                    });

                    // Log failed attempt
                    await logFailedLogin(email, `invalid_email: ${emailValidation.reason}`, 'google').catch(err =>
                        logAuthFailure('oauth_invalid_email_login_log_failed', err, {
                            ...getAuthEmailLogContext(email),
                            reason: emailValidation.reason,
                            provider: 'google',
                        })
                    );

                    return '/unauthorized?error=' + encodeURIComponent(emailValidation.reason || 'Invalid email address');
                }
            }

            if (user && !('isVerified' in user)) {
                let dbUser: any = await getAuthUserByEmail(email);
                logFetchedUserForDebug('signIn', dbUser);

                // ✅ SECURITY FIX: Allow new OAuth users to login
                // They'll complete onboarding via payment flow
                if (!dbUser) {
                    // Create minimal user record for OAuth users
                    const newUser = {
                        email: email,
                        name: user.name || email.split('@')[0],
                        image: user.image || '',
                        isVerified: true,  // OAuth users are pre-verified by Google
                        active: true,
                        tenantId: null,    // Will be set during onboarding
                        storeId: null,
                        platformRole: 'OWNER',
                        stores: []
                    };

                    try {
                        dbUser = await addAuthPlatformUser(newUser);
                        logAuthDiagnostic('oauth_user_created', {
                            ...getAuthEmailLogContext(email),
                            provider: 'google',
                        });

                        // Log successful signup
                        await logSuccessfulLogin(email, 'google').catch(err =>
                            logAuthFailure('oauth_new_user_signup_log_failed', err, {
                                ...getAuthEmailLogContext(email),
                                provider: 'google',
                            })
                        );
                    } catch (error) {
                        logAuthFailure('oauth_user_create_failed', error, {
                            ...getAuthEmailLogContext(email),
                            provider: 'google',
                        });
                        await logFailedLogin(email, 'user_creation_failed', 'google').catch(err =>
                            logAuthFailure('oauth_user_creation_failure_log_failed', err, {
                                ...getAuthEmailLogContext(email),
                                provider: 'google',
                            })
                        );
                        return '/unauthorized';
                    }
                }

                dbUser = await applyInheritedBlockState(dbUser);
                user = { ...user, ...dbUser }
            }

            if (Boolean(user?.isVerified) && Boolean(user?.active) && !isPlatformEntityBlocked(user)) {
                // ✅ SECURITY FIX: Log successful OAuth login
                if (account?.provider === 'google') {
                    await logSuccessfulLogin(email, 'google').catch(err =>
                        logAuthFailure('oauth_success_log_failed', err, {
                            ...getAuthEmailLogContext(email),
                            provider: 'google',
                        })
                    );
                }
                return user;
            } else {
                // ✅ SECURITY FIX: Log failed OAuth attempt
                if (account?.provider === 'google') {
                    await logFailedLogin(email, 'account_not_verified_or_inactive', 'google').catch(err =>
                        logAuthFailure('oauth_failure_log_failed', err, {
                            ...getAuthEmailLogContext(email),
                            provider: 'google',
                        })
                    );
                }
                return '/unauthorized'
            }
        },
        jwt: async ({ token, user, trigger, session }: any) => {

            const email = token?.email || user?.email;
            if (!email) return null;
            if (user && typeof token.sessionIssuedAt !== 'number') {
                token.sessionIssuedAt = Math.floor(Date.now() / 1000);
            } else if (typeof token.sessionIssuedAt !== 'number' && typeof token.iat === 'number') {
                token.sessionIssuedAt = token.iat;
            }

            const forceRefresh = trigger === "update";
            const safeDbUser = await getAuthSessionUserContext(email, forceRefresh);
            logFetchedUserForDebug(forceRefresh ? 'jwt-update' : 'jwt', safeDbUser);

            // ✅ SECURITY FIX: Filter both user (from OAuth) and dbUser (from database)
            // OAuth user can contain dangerous keys like __proto__
            // ✅ PERFORMANCE: Do NOT merge the full `user` object into the JWT.
            // For Credentials provider, `user` can be the full Firestore user record which bloats the JWT cookie.
            // Keep only the minimal whitelisted dbUser payload.
            token.dbUser = safeDbUser;

            return token;
        },
        session: async ({ session, token }: any) => {
            const timestamp = new Date().toISOString();
            if (Boolean(token?.email) && Boolean(token?.dbUser)) {
                const dbUser: UserDataType = token?.dbUser;
                const sessionStoreMapping = Array.isArray(dbUser.stores)
                    ? dbUser.stores.find((store: any) => store.storeId === dbUser.storeId)
                    : undefined;
                const sessionStoreRole = sessionStoreMapping
                    ? sessionStoreMapping.role
                    : (dbUser as any).role;

                // ✅ SECURITY FIX: Validate and sanitize dbUser to prevent prototype pollution
                // Only assign known safe properties, reject dangerous keys
                // Use Object.hasOwn() to check only own properties, not inherited ones from prototype chain
                const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
                for (const key of dangerousKeys) {
                    // Check for OWN properties only, not inherited from prototype
                    if (Object.hasOwn(dbUser, key)) {
                        const sanitized = sanitizeAuthSessionForLog(session);
                        if (key !== "__proto__") {
                            logAuthDiagnostic('auth_session_dangerous_db_user_key_blocked', {
                                key,
                                ...getAuthEmailLogContext(dbUser.email),
                                ...getAuthSessionLogContext(session),
                                sessionContextKeyCount: Object.keys(sanitized).length,
                            });
                        }
                        return session; // Return without modifying session
                    }
                }

                // Safely assign only expected properties
                session.user = {
                    ...session.user,
                    id: dbUser.id,
                    displayEmail: (dbUser as any).displayEmail,
                    email: dbUser.email,
                    name: dbUser.name,
                    image: (dbUser as any).image, // Optional from OAuth
                    profileImage: (dbUser as any).profileImage,
                    isVerified: dbUser.isVerified,
                    active: dbUser.active,
                    authDisabled: (dbUser as any).authDisabled,
                    authIssuedAt: typeof token?.sessionIssuedAt === 'number' ? token.sessionIssuedAt : token?.iat,
                    blocked: dbUser.blocked,
                    blockDetails: dbUser.blockDetails,
                    deleted: (dbUser as any).deleted,
                    tenantId: dbUser.tenantId,
                    storeId: dbUser.storeId,
                    storeIds: Array.isArray((dbUser as any).storeIds) ? (dbUser as any).storeIds : [],
                    pId: (dbUser as any).pId || DEFAULT_PRODUCT_ID,
                    productId: (dbUser as any).productId || (dbUser as any).pId || DEFAULT_PRODUCT_ID,
                    productAccounts: serializeAuthSessionValue((dbUser as any).productAccounts),
                    platformRole: dbUser.platformRole,
                    role: sessionStoreRole || '',
                    countryCode: (dbUser as any).countryCode,
                    dialCode: (dbUser as any).dialCode,
                    phone: (dbUser as any).phone,
                    phoneNumber: (dbUser as any).phoneNumber,
                    phoneUsername: (dbUser as any).phoneUsername,
                    phoneLoginEnabled: (dbUser as any).phoneLoginEnabled,
                    staffAuthMode: (dbUser as any).staffAuthMode,
                    staffLoginId: (dbUser as any).staffLoginId,
                    loginUsername: (dbUser as any).loginUsername,
                    sessionRevokedAt: serializeAuthTimestamp((dbUser as any).sessionRevokedAt),
                    stores: dbUser.stores
                };
                session.authIssuedAt = typeof token?.sessionIssuedAt === 'number' ? token.sessionIssuedAt : token?.iat;
                session.platformRole = dbUser.platformRole || "USER";
                session.pId = (dbUser as any).pId || DEFAULT_PRODUCT_ID;
                session.tId = dbUser.tenantId;
                session.sId = dbUser.storeId;
                session.uId = dbUser.id;
                session.role = sessionStoreRole || '';
            }
            return session;
        }
    },
    pages: {
        signIn: '/signin'
    },
    // Configure one or more authentication providers
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        }),
        //https://medium.com/ascentic-technology/authentication-with-next-js-13-and-next-auth-9c69d55d6bfd

        CredentialsProvider({
            name: 'Credentials',
            credentials: {},
            async authorize(credentials): Promise<any> {
                const phoneOtpLoginToken = String((credentials as any)?.phoneOtpLoginToken || '').trim();
                if (phoneOtpLoginToken) {
                    try {
                        let dbUser: any = await consumePhoneOtpLoginToken({ token: phoneOtpLoginToken });
                        dbUser = await applyInheritedBlockState(dbUser);
                        logFetchedUserForDebug('phone-otp', dbUser);

                        if (Boolean(dbUser?.isVerified) && Boolean(dbUser?.active) && !isPlatformEntityBlocked(dbUser)) {
                            await logSuccessfulLogin(dbUser.email, 'phone_otp');
                            return {
                                ...getDatabaseUserForSession(dbUser),
                                loginSource: 'phone_otp',
                            };
                        }

                        await logFailedLogin(dbUser?.email || 'phone_otp', 'invalid_account', 'phone_otp');
                        throw new Error('Invalid phone verification code');
                    } catch (error) {
                        if (error instanceof PhoneOtpError) {
                            await logFailedLogin('phone_otp', error.code, 'phone_otp');
                        }
                        throw new Error('Invalid phone verification code');
                    }
                }

                // ✅ SECURITY FIX: Normalize login identifier immediately.
                // This may be an email or a reseller-created phone username.
                const loginIdentifier = ((credentials as any).email || '').toLowerCase().trim();
                const password = (credentials as any).password;
                const isEmailIdentifier = loginIdentifier.includes('@');
                let email = loginIdentifier;
                let dbUser: any = null;

                // ✅ EMAIL VALIDATION: Block disposable emails and invalid domains
                if (isEmailIdentifier) {
                    const emailValidation = validateEmail(email);
                    if (!emailValidation.valid) {
                        const errorMessage = getEmailValidationError(email);

                        // Log failed attempt
                        await logFailedLogin(email, `invalid_email: ${emailValidation.reason}`, 'credentials');

                        throw new Error(errorMessage);
                    }
                } else {
                    const phoneUsername = normalizePhoneUsername(loginIdentifier);
                    if (phoneUsername.length < 10) {
                        await logFailedLogin(loginIdentifier, 'invalid_username', 'credentials');
                        throw new Error("Invalid email/phone or password");
                    }
                    dbUser = await getAuthUserByLoginIdentifier(phoneUsername);
                    email = typeof dbUser?.email === 'string' ? dbUser.email.toLowerCase().trim() : '';
                    const resolvedEmailValidation = validateEmail(email);
                    if (!resolvedEmailValidation.valid) {
                        await logFailedLogin(phoneUsername, 'username_not_found', 'credentials');
                        throw new Error("Invalid email/phone or password");
                    }
                }

                // Step 1: Check for account lockout
                const lockStatus = await checkAccountLock(email);
                if (lockStatus.isLocked) {
                    const lockoutMessage = getLockoutMessage(lockStatus);
                    throw new Error(lockoutMessage);
                }

                // Step 2: Get user from database
                if (!dbUser) {
                    dbUser = await getAuthUserByEmail(email);
                }
                dbUser = await applyInheritedBlockState(dbUser);
                logFetchedUserForDebug('credentials', dbUser);

                if (Boolean(dbUser?.isVerified) && Boolean(dbUser?.active) && !isPlatformEntityBlocked(dbUser)) {
                    // Step 3: Verify password by attempting Firebase Auth signin
                    try {
                        await signInWithEmailAndPassword(firebaseAuth, email, password);

                        // ✅ Success: Log successful login
                        await logSuccessfulLogin(email, 'credentials');

                        // Password is correct - return MINIMAL user data.
                        // Returning the full dbUser inflates the NextAuth JWT cookie and triggers chunking + HTTP 431.
                        // Note: Client will establish Firebase Auth session separately.
                        return {
                            ...getDatabaseUserForSession(dbUser),
                            loginSource: "signInWithEmailAndPassword"
                        };
                    } catch (error) {
                        // ❌ Failed: Log failed attempt
                        await logFailedLogin(email, 'invalid_password', 'credentials');

                        // Security: Use same generic error to prevent user enumeration
                        throw new Error("Invalid email/phone or password");
                    }
                } else {
                    // ❌ Failed: Log failed attempt (invalid account)
                    await logFailedLogin(email, 'invalid_account', 'credentials');

                    // Security: Use same generic error to prevent user enumeration
                    throw new Error("Invalid email/phone or password")
                }
            }
        })
    ]
}

export const signOutSession = (callbackUrl: string = NAVIGARIONS_ROUTINGS.SIGNIN) => {
    return new Promise((res, rej) => {
        signOutFirebaseAuth()
            .then(() => {
                signOut({ redirect: true, callbackUrl })
                res(true)
            }).catch((error) => {
                logAuthFailure('auth_signout_failed', error);
                rej(error)  // Pass error for proper handling
            })
    })
}

const getEntityBlockSnapshot = async (collectionName: string, id?: string | number | null) => {
    if (id == null || id === '') return null;

    try {
        return await getAuthEntitySnapshot(collectionName, id);
    } catch (error) {
        logAuthFailure('auth_entity_block_context_fetch_failed', error, {
            collectionName,
            ...getBoundedAuthStringContext('entityId', id),
        });
        return null;
    }
};

const normalizeAuthProductId = (value: unknown): ProductId | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toUpperCase();
    return Object.values(PRODUCT_IDS).includes(normalized as ProductId)
        ? normalized as ProductId
        : undefined;
};

const applyInheritedBlockState = async (dbUser: any): Promise<any> => {
    if (!dbUser || isPlatformEntityBlocked(dbUser)) return dbUser;

    const tenant = await getEntityBlockSnapshot(DB_COLLECTIONS.TENANTS, dbUser.tenantId);
    const tenantProductId = normalizeAuthProductId((tenant as any)?.pId)
        || normalizeAuthProductId((tenant as any)?.productId);
    if (isPlatformEntityBlocked(tenant)) {
        return {
            ...dbUser,
            pId: normalizeAuthProductId(dbUser.pId) || tenantProductId || DEFAULT_PRODUCT_ID,
            productId: normalizeAuthProductId(dbUser.productId) || tenantProductId || DEFAULT_PRODUCT_ID,
            blocked: true,
            blockDetails: {
                ...tenant.blockDetails,
                blocked: true,
                entityType: 'tenant',
                entityId: dbUser.tenantId,
            },
        };
    }

    const store = await getEntityBlockSnapshot(DB_COLLECTIONS.STORES, dbUser.storeId);
    const storeProductId = normalizeAuthProductId((store as any)?.pId)
        || normalizeAuthProductId((store as any)?.productId);
    const resolvedProductId = normalizeAuthProductId(dbUser.pId)
        || normalizeAuthProductId(dbUser.productId)
        || storeProductId
        || tenantProductId
        || DEFAULT_PRODUCT_ID;

    if (isPlatformEntityBlocked(store)) {
        return {
            ...dbUser,
            pId: resolvedProductId,
            productId: resolvedProductId,
            blocked: true,
            blockDetails: {
                ...store.blockDetails,
                blocked: true,
                entityType: 'store',
                entityId: dbUser.storeId,
            },
        };
    }

    return {
        ...dbUser,
        pId: resolvedProductId,
        productId: resolvedProductId,
    };
};

const getDatabaseUserForSession = (dbUser: any): any => {
    // ✅ SECURITY FIX: Create new object instead of mutating
    // Prevents side effects if dbUser is cached elsewhere
    if (!dbUser) return {};

    // List of OAuth keys to exclude (in addition to dangerous keys)
    const OAUTH_KEYS = [
        'scope',
        'providerAccountId',
        'type',
        'provider',
        'token_type',
        'id_token',
        'access_token'
    ];

    // Combine OAuth keys with dangerous prototype pollution keys
    const excludeKeys = [...OAUTH_KEYS, ...DANGEROUS_KEYS];

    // Remove both OAuth and dangerous keys using utility function
    const sanitized = removeKeys(dbUser, excludeKeys) as any;
    const legacyAnswerlatticeProductAccount = sanitized[`productAccounts.${PRODUCT_IDS.ANSWERLATTICE}`];
    const productAccounts = sanitized.productAccounts && typeof sanitized.productAccounts === 'object'
        ? sanitized.productAccounts
        : undefined;
    const normalizedProductAccounts = legacyAnswerlatticeProductAccount && typeof legacyAnswerlatticeProductAccount === 'object'
        ? {
            ...(productAccounts || {}),
            [PRODUCT_IDS.ANSWERLATTICE]: {
                ...(productAccounts?.[PRODUCT_IDS.ANSWERLATTICE] || {}),
                ...legacyAnswerlatticeProductAccount,
            },
        }
        : productAccounts;
    const safeProductAccounts = serializeAuthSessionValue(normalizedProductAccounts);
    const sessionStoreScope = normalizeAuthSessionStoreScope(sanitized);

    // ✅ PERFORMANCE: Keep JWT cookie small
    // NextAuth JWT is stored in a cookie (header). If it gets too big, the app will fail with HTTP 431.
    // Only persist the minimal set of fields required for authorization and UI.
    return {
        id: sanitized.id,
        displayEmail: getDisplayEmail(sanitized.displayEmail || sanitized.email),
        email: sanitized.email,
        name: sanitized.name,
        image: sanitized.image,
        profileImage: sanitized.profileImage,
        isVerified: sanitized.isVerified,
        active: sanitized.active,
        authDisabled: sanitized.authDisabled,
        blocked: sanitized.blocked,
        blockDetails: sanitized.blockDetails,
        deleted: sanitized.deleted,
        tenantId: sessionStoreScope.tenantId,
        storeId: sessionStoreScope.storeId,
        storeIds: sessionStoreScope.storeIds,
        pId: normalizeAuthProductId(sanitized.pId)
            || normalizeAuthProductId(sanitized.productId)
            || DEFAULT_PRODUCT_ID,
        productId: normalizeAuthProductId(sanitized.productId)
            || normalizeAuthProductId(sanitized.pId)
            || DEFAULT_PRODUCT_ID,
        productAccounts: safeProductAccounts,
        platformRole: sanitized.platformRole,
        role: sanitized.role,
        staffAuthMode: sanitized.staffAuthMode,
        staffLoginId: sanitized.staffLoginId,
        loginUsername: sanitized.loginUsername,
        countryCode: sanitized.countryCode,
        dialCode: sanitized.dialCode,
        phone: sanitized.phone,
        phoneNumber: sanitized.phoneNumber,
        phoneUsername: sanitized.phoneUsername,
        phoneLoginEnabled: sanitized.phoneLoginEnabled,
        sessionRevokedAt: serializeAuthTimestamp(sanitized.sessionRevokedAt),
        // Keep only what we actually use for role derivation
        stores: sessionStoreScope.stores,
    };
}

const serializeAuthTimestamp = (value: any): string | number | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value._seconds === 'number') {
        return new Date((value._seconds * 1000) + Math.floor((value._nanoseconds || 0) / 1_000_000)).toISOString();
    }
    return undefined;
};

const serializeAuthSessionValue = (value: any): any => {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    const timestampValue = serializeAuthTimestamp(value);
    if (timestampValue !== undefined) return timestampValue;

    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
        return value
            .map(serializeAuthSessionValue)
            .filter((item) => item !== undefined);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return undefined;

    return Object.entries(value).reduce((acc, [key, item]) => {
        if ((DANGEROUS_KEYS as readonly string[]).includes(key)) return acc;
        const serialized = serializeAuthSessionValue(item);
        if (serialized !== undefined) {
            acc[key] = serialized;
        }
        return acc;
    }, {} as Record<string, any>);
};

const cloneAuthSessionUserContext = (user: any): any => ({
    ...user,
    blockDetails: user?.blockDetails ? { ...user.blockDetails } : user?.blockDetails,
    productAccounts: serializeAuthSessionValue(user?.productAccounts),
    stores: Array.isArray(user?.stores)
        ? user.stores.map((store: any) => ({ ...store }))
        : [],
});

const pruneAuthSessionUserContextCache = (now: number) => {
    if (authSessionUserContextCache.size <= AUTH_SESSION_USER_CONTEXT_CACHE_MAX) return;

    Array.from(authSessionUserContextCache.entries()).forEach(([cacheKey, entry]) => {
        if (entry.expiresAt <= now) {
            authSessionUserContextCache.delete(cacheKey);
        }
    });

    while (authSessionUserContextCache.size > AUTH_SESSION_USER_CONTEXT_CACHE_MAX) {
        const oldestKey = Array.from(authSessionUserContextCache.keys())[0];
        if (!oldestKey) break;
        authSessionUserContextCache.delete(oldestKey);
    }
};

const getAuthSessionUserContext = async (email: string, forceRefresh = false): Promise<any> => {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const now = Date.now();
    const cached = authSessionUserContextCache.get(normalizedEmail);

    const cachedUserNeedsOnboardingRefresh = !cached?.user?.tenantId || !cached?.user?.storeId;
    if (!forceRefresh && cached && cached.expiresAt > now && !cachedUserNeedsOnboardingRefresh) {
        return cloneAuthSessionUserContext(cached.user);
    }

    let dbUser: any = await getAuthUserByEmail(normalizedEmail);
    dbUser = await applyInheritedBlockState(dbUser);
    const sessionUser = getDatabaseUserForSession(dbUser);

    authSessionUserContextCache.set(normalizedEmail, {
        expiresAt: now + AUTH_SESSION_USER_CONTEXT_CACHE_TTL_MS,
        user: cloneAuthSessionUserContext(sessionUser),
    });
    pruneAuthSessionUserContextCache(now);

    return sessionUser;
};

const logFetchedUserForDebug = (source: string, dbUser: any) => {
    logAuthDiagnostic('auth_user_context_fetched', {
        source,
        userPresent: Boolean(dbUser),
        namePresent: Boolean(dbUser?.name),
        imagePresent: Boolean(dbUser?.image),
        isVerified: Boolean(dbUser?.isVerified),
        active: Boolean(dbUser?.active),
        blocked: Boolean(dbUser?.blocked),
        deleted: Boolean(dbUser?.deleted),
        storesCount: Array.isArray(dbUser?.stores) ? dbUser.stores.length : 0,
        storeIdsCount: Array.isArray(dbUser?.storeIds) ? dbUser.storeIds.length : 0,
        ...getBoundedAuthStringContext('fetchedUserId', dbUser?.id),
        ...getBoundedAuthStringContext('fetchedUserEmail', dbUser?.email),
        ...getBoundedAuthStringContext('fetchedProductId', dbUser?.pId ?? dbUser?.productId),
        ...getBoundedAuthStringContext('fetchedTenantId', dbUser?.tenantId),
        ...getBoundedAuthStringContext('fetchedStoreId', dbUser?.storeId),
        ...getBoundedAuthStringContext('fetchedRole', dbUser?.role),
        ...getBoundedAuthStringContext('fetchedPlatformRole', dbUser?.platformRole),
    }, { developmentOnly: true });
};
