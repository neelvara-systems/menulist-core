import { DB_COLLECTIONS } from "@constant/database";
import { NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { DEFAULT_PRODUCT_ID, PRODUCT_IDS, type ProductId } from "@constant/product";
import { getDisplayEmail } from "@lib/auth/loginIdentifiers";
import { firebaseAuth, signOutFirebaseAuth } from "@lib/firebase/firebaseClient";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { DANGEROUS_KEYS, removeKeys } from "@lib/security/sanitizeObject";
import { containsSensitiveData, secureError, secureLog } from '@lib/security/secureLogger';
import { getEmailValidationError, validateEmail } from '@lib/validation/emailDomainValidator';
import { UserDataType } from "@type/platform/user";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { signOut } from "next-auth/react";
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
    console.warn('⚠️ Google OAuth credentials not configured - Google login will be disabled');
}

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: UserDataType & DefaultSession["user"]
        authIssuedAt?: number;
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

const sanitizeAuthSessionForLog = (session: any): any => ({
    user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
    },
    pId: session.pId,
    tId: session.tId,
    sId: session.sId,
    uId: session.uId,
    role: session.role,
    platformRole: session.platformRole,
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
                    secureLog('[Auth] Email validation failed', {
                        email,
                        reason: emailValidation.reason,
                        provider: account?.provider
                    });

                    // Log failed attempt
                    await logFailedLogin(email, `invalid_email: ${emailValidation.reason}`, 'google').catch(err =>
                        secureError('[Auth] Failed to log invalid email', err as Error, { email })
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
                        secureLog('[Auth] New OAuth user created', { email });

                        // Log successful signup
                        await logSuccessfulLogin(email, 'google').catch(err =>
                            secureError('[Auth] Failed to log new user signup', err as Error, { email })
                        );
                    } catch (error) {
                        secureError('[Auth] Failed to create new user', error as Error, { email });
                        await logFailedLogin(email, 'user_creation_failed', 'google').catch(err =>
                            secureError('[Auth] Failed to log user creation failure', err as Error, { email })
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
                        secureError('[Auth] Failed to log OAuth success', err as Error, { email })
                    );
                }
                return user;
            } else {
                // ✅ SECURITY FIX: Log failed OAuth attempt
                if (account?.provider === 'google') {
                    await logFailedLogin(email, 'account_not_verified_or_inactive', 'google').catch(err =>
                        secureError('[Auth] Failed to log OAuth failure', err as Error, { email })
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
                const storeRole = Array.isArray(dbUser.stores)
                    ? dbUser.stores.find((store: any) => store.storeId === dbUser.storeId)?.role
                    : undefined;
                const sessionStoreRole = storeRole || (dbUser as any).role;

                // ✅ SECURITY FIX: Validate and sanitize dbUser to prevent prototype pollution
                // Only assign known safe properties, reject dangerous keys
                // Use Object.hasOwn() to check only own properties, not inherited ones from prototype chain
                const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
                for (const key of dangerousKeys) {
                    // Check for OWN properties only, not inherited from prototype
                    if (Object.hasOwn(dbUser, key)) {
                        // ✅ SECURITY: Only log if safe (no sensitive data)
                        const sanitized = sanitizeAuthSessionForLog(session);
                        if (!containsSensitiveData(sanitized) && key !== "__proto__") {
                            secureLog('[Auth] Blocked dangerous key in dbUser', {
                                key,
                                email: dbUser.email,
                                session: sanitized
                            });
                        }
                        return session; // Return without modifying session
                    }
                }

                // Safely assign only expected properties
                session.user = {
                    ...session.user,
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.name,
                    image: (dbUser as any).image, // Optional from OAuth
                    isVerified: dbUser.isVerified,
                    active: dbUser.active,
                    authDisabled: (dbUser as any).authDisabled,
                    authIssuedAt: typeof token?.sessionIssuedAt === 'number' ? token.sessionIssuedAt : token?.iat,
                    blocked: dbUser.blocked,
                    blockDetails: dbUser.blockDetails,
                    deleted: (dbUser as any).deleted,
                    tenantId: dbUser.tenantId,
                    storeId: dbUser.storeId,
                    pId: (dbUser as any).pId || DEFAULT_PRODUCT_ID,
                    productId: (dbUser as any).productId || (dbUser as any).pId || DEFAULT_PRODUCT_ID,
                    productAccounts: serializeAuthSessionValue((dbUser as any).productAccounts),
                    platformRole: dbUser.platformRole,
                    role: sessionStoreRole || '',
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
            // console.log("session inside session", session)
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
                secureError('[Auth] Signout error', error as Error);
                rej(error)  // Pass error for proper handling
            })
    })
}

const getEntityBlockSnapshot = async (collectionName: string, id?: string | number | null) => {
    if (id == null || id === '') return null;

    try {
        return await getAuthEntitySnapshot(collectionName, id);
    } catch (error) {
        secureError('[Auth] Failed to fetch entity block context', error as Error, {
            collectionName,
            id: String(id),
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
    const legacyCanonicaProductAccount = sanitized[`productAccounts.${PRODUCT_IDS.CANONICA}`];
    const productAccounts = sanitized.productAccounts && typeof sanitized.productAccounts === 'object'
        ? sanitized.productAccounts
        : undefined;
    const normalizedProductAccounts = legacyCanonicaProductAccount && typeof legacyCanonicaProductAccount === 'object'
        ? {
            ...(productAccounts || {}),
            [PRODUCT_IDS.CANONICA]: {
                ...(productAccounts?.[PRODUCT_IDS.CANONICA] || {}),
                ...legacyCanonicaProductAccount,
            },
        }
        : productAccounts;
    const safeProductAccounts = serializeAuthSessionValue(normalizedProductAccounts);

    // ✅ PERFORMANCE: Keep JWT cookie small
    // NextAuth JWT is stored in a cookie (header). If it gets too big, the app will fail with HTTP 431.
    // Only persist the minimal set of fields required for authorization and UI.
    return {
        id: sanitized.id,
        displayEmail: getDisplayEmail(sanitized.displayEmail || sanitized.email),
        email: sanitized.email,
        name: sanitized.name,
        image: sanitized.image,
        isVerified: sanitized.isVerified,
        active: sanitized.active,
        authDisabled: sanitized.authDisabled,
        blocked: sanitized.blocked,
        blockDetails: sanitized.blockDetails,
        deleted: sanitized.deleted,
        tenantId: sanitized.tenantId,
        storeId: sanitized.storeId,
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
        phone: sanitized.phone,
        phoneNumber: sanitized.phoneNumber,
        phoneUsername: sanitized.phoneUsername,
        phoneLoginEnabled: sanitized.phoneLoginEnabled,
        sessionRevokedAt: serializeAuthTimestamp(sanitized.sessionRevokedAt),
        // Keep only what we actually use for role derivation
        stores: Array.isArray(sanitized.stores)
            ? sanitized.stores.map((s: any) => ({
                storeId: s?.storeId,
                role: s?.role,     // Single role per store (e.g., 'owner', 'manager', 'staff')
            }))
            : [],
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

const getDebugUserSnapshot = (dbUser: any) => {
    if (!dbUser) return null;

    return {
        id: dbUser.id,
        email: maskDebugEmail(dbUser.email),
        name: dbUser.name ? '[present]' : undefined,
        image: dbUser.image ? '[present]' : undefined,
        isVerified: dbUser.isVerified,
        active: dbUser.active,
        blocked: dbUser.blocked,
        blockDetails: dbUser.blockDetails,
        deleted: dbUser.deleted,
        pId: dbUser.pId,
        productId: dbUser.productId,
        tenantId: dbUser.tenantId,
        storeId: dbUser.storeId,
        platformRole: dbUser.platformRole,
        role: dbUser.role,
        storeIds: dbUser.storeIds,
        stores: Array.isArray(dbUser.stores)
            ? dbUser.stores.map((store: any) => ({
                storeId: store?.storeId,
                role: store?.role,
            }))
            : dbUser.stores,
    };
};

const maskDebugEmail = (email: unknown) => {
    if (typeof email !== 'string') return email;
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
};

const logFetchedUserForDebug = (source: string, dbUser: any) => {
    if (process.env.NODE_ENV === 'production') return;

    console.info('[MenuList auth fetched user]', {
        source,
        user: getDebugUserSnapshot(dbUser),
    });
};
