import { DB_COLLECTIONS } from "@constant/database";
import { NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { addPlatformUser, getUserByEmail } from "@database/users";
import { firebaseAuth, firebaseClient, signOutFirebaseAuth } from "@lib/firebase/firebaseClient";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { DANGEROUS_KEYS, removeKeys } from "@lib/security/sanitizeObject";
import { containsSensitiveData, secureError, secureLog } from '@lib/security/secureLogger';
import { getEmailValidationError, validateEmail } from '@lib/validation/emailDomainValidator';
import { UserDataType } from "@type/platform/user";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { signOut } from "next-auth/react";
import { sanitizeSession } from '../../middleware/auth';
import { checkAccountLock, getLockoutMessage, logFailedLogin, logSuccessfulLogin } from "./security";

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
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        credits: number;
    }
}


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
                let dbUser: any = await getUserByEmail(email);
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
                        dbUser = await addPlatformUser(newUser);
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

            if (email) {
                let dbUser: any = await getUserByEmail(email);
                dbUser = await applyInheritedBlockState(dbUser);
                logFetchedUserForDebug('jwt', dbUser);

                // ✅ SECURITY FIX: Filter both user (from OAuth) and dbUser (from database)
                // OAuth user can contain dangerous keys like __proto__
                const safeDbUser = getDatabaseUserForSession(dbUser);

                // ✅ PERFORMANCE: Do NOT merge the full `user` object into the JWT.
                // For Credentials provider, `user` can be the full Firestore user record which bloats the JWT cookie.
                // Keep only the minimal whitelisted dbUser payload.
                token.dbUser = safeDbUser;
            }

            //when update profile triggers then refetch database user
            // https://next-auth.js.org/getting-started/client#updating-the-session
            if (trigger === "update") {
                let updatedUser: any = await getUserByEmail(email);
                updatedUser = await applyInheritedBlockState(updatedUser);
                logFetchedUserForDebug('jwt-update', updatedUser);
                token.dbUser = getDatabaseUserForSession(updatedUser)
            }

            const timestamp = new Date().toISOString();
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
                        const sanitized = sanitizeSession(session);
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
                    blocked: dbUser.blocked,
                    blockDetails: dbUser.blockDetails,
                    tenantId: dbUser.tenantId,
                    storeId: dbUser.storeId,
                    platformRole: dbUser.platformRole,
                    role: sessionStoreRole || '',
                    stores: dbUser.stores
                };
                session.platformRole = dbUser.platformRole || "USER";
                session.pId = "ML";
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
                // ✅ SECURITY FIX: Normalize email to lowercase immediately
                const email = ((credentials as any).email || '').toLowerCase().trim();
                const password = (credentials as any).password;

                // ✅ EMAIL VALIDATION: Block disposable emails and invalid domains
                const emailValidation = validateEmail(email);
                if (!emailValidation.valid) {
                    const errorMessage = getEmailValidationError(email);

                    // Log failed attempt
                    await logFailedLogin(email, `invalid_email: ${emailValidation.reason}`, 'credentials');

                    throw new Error(errorMessage);
                }

                // Step 1: Check for account lockout
                const lockStatus = await checkAccountLock(email);
                if (lockStatus.isLocked) {
                    const lockoutMessage = getLockoutMessage(lockStatus);
                    throw new Error(lockoutMessage);
                }

                // Step 2: Get user from database
                let dbUser: any = await getUserByEmail(email);
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
                        throw new Error("Invalid email or password");
                    }
                } else {
                    // ❌ Failed: Log failed attempt (invalid account)
                    await logFailedLogin(email, 'invalid_account', 'credentials');

                    // Security: Use same generic error to prevent user enumeration
                    throw new Error("Invalid email or password")
                }
            }
        })
    ]
}

export const signOutSession = (callbackUrl: string = `/${NAVIGARIONS_ROUTINGS.SIGNIN}`) => {
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
        const snapshot = await getDoc(doc(firebaseClient, collectionName, String(id)));
        return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
        secureError('[Auth] Failed to fetch entity block context', error as Error, {
            collectionName,
            id: String(id),
        });
        return null;
    }
};

const applyInheritedBlockState = async (dbUser: any): Promise<any> => {
    if (!dbUser || isPlatformEntityBlocked(dbUser)) return dbUser;

    const tenant = await getEntityBlockSnapshot(DB_COLLECTIONS.TENANTS, dbUser.tenantId);
    if (isPlatformEntityBlocked(tenant)) {
        return {
            ...dbUser,
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
    if (isPlatformEntityBlocked(store)) {
        return {
            ...dbUser,
            blocked: true,
            blockDetails: {
                ...store.blockDetails,
                blocked: true,
                entityType: 'store',
                entityId: dbUser.storeId,
            },
        };
    }

    return dbUser;
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

    // ✅ PERFORMANCE: Keep JWT cookie small
    // NextAuth JWT is stored in a cookie (header). If it gets too big, the app will fail with HTTP 431.
    // Only persist the minimal set of fields required for authorization and UI.
    return {
        id: sanitized.id,
        email: sanitized.email,
        name: sanitized.name,
        image: sanitized.image,
        isVerified: sanitized.isVerified,
        active: sanitized.active,
        blocked: sanitized.blocked,
        blockDetails: sanitized.blockDetails,
        tenantId: sanitized.tenantId,
        storeId: sanitized.storeId,
        platformRole: sanitized.platformRole,
        role: sanitized.role,
        // Keep only what we actually use for role derivation
        stores: Array.isArray(sanitized.stores)
            ? sanitized.stores.map((s: any) => ({
                storeId: s?.storeId,
                role: s?.role,     // Single role per store (e.g., 'owner', 'manager', 'staff')
            }))
            : [],
    };
}

const getDebugUserSnapshot = (dbUser: any) => {
    if (!dbUser) return null;

    return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        isVerified: dbUser.isVerified,
        active: dbUser.active,
        blocked: dbUser.blocked,
        blockDetails: dbUser.blockDetails,
        deleted: dbUser.deleted,
        tenantId: dbUser.tenantId,
        storeId: dbUser.storeId,
        platformRole: dbUser.platformRole,
        role: dbUser.role,
        storeIds: dbUser.storeIds,
        stores: Array.isArray(dbUser.stores)
            ? dbUser.stores.map((store: any) => ({
                storeId: store?.storeId,
                name: store?.name,
                role: store?.role,
            }))
            : dbUser.stores,
    };
};

const logFetchedUserForDebug = (source: string, dbUser: any) => {
    if (process.env.NODE_ENV === 'production') return;

    console.info('[MenuList auth fetched user]', {
        source,
        user: getDebugUserSnapshot(dbUser),
    });
};
