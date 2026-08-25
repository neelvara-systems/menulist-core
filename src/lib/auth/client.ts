/**
 * Client-Safe Auth Functions
 * 
 * This file contains ONLY client-side auth functions that can be safely
 * imported into client components without triggering Firebase Admin imports.
 * 
 * DO NOT import anything from './security' or './index' that uses firebaseAdmin!
 */

import { NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { signOutFirebaseAuth } from "@lib/firebase/firebaseClient";
import { signOut } from "next-auth/react";
import { getBoundedAuthStringContext, logAuthFailure } from "./authDiagnostics";
import { clearAuthenticatedBrowserState } from "./clientSessionCleanup";

let intentionalSignOutCallback: string | null = null;

const normalizeIntentionalSignOutCallback = (callbackUrl: string): string => (
    callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl
        : NAVIGARIONS_ROUTINGS.SIGNIN
);

export const clearIntentionalSignOutCallback = (): void => {
    intentionalSignOutCallback = null;
};

export const consumeIntentionalSignOutCallback = (): string | null => {
    const callbackUrl = intentionalSignOutCallback;
    intentionalSignOutCallback = null;
    return callbackUrl;
};

/**
 * Sign out the current user (client-side only)
 * Safe to import in client components
 */
export const signOutSession = async (
    callbackUrl: string = NAVIGARIONS_ROUTINGS.SIGNIN,
    options: { redirectOnIntentionalSignOut?: boolean } = {},
): Promise<true> => {
    const shouldRedirectIntentionalSignOut = options.redirectOnIntentionalSignOut !== false;
    if (shouldRedirectIntentionalSignOut) {
        intentionalSignOutCallback = normalizeIntentionalSignOutCallback(callbackUrl);
    }

    const firebaseResult = await signOutFirebaseAuth()
        .then((): null => null)
        .catch((error: unknown) => {
            logAuthFailure('firebase_signout_failed', error, {
                ...getBoundedAuthStringContext('callbackUrl', callbackUrl),
            });
            return error;
        });

    const nextAuthResult = await signOut({
        redirect: false,
        callbackUrl,
    })
        .then((): null => null)
        .catch((error: unknown) => {
            logAuthFailure('nextauth_signout_failed', error, {
                ...getBoundedAuthStringContext('callbackUrl', callbackUrl),
            });
            return error;
        });

    if (!nextAuthResult) {
        clearAuthenticatedBrowserState();
    }

    if (nextAuthResult) {
        if (shouldRedirectIntentionalSignOut) clearIntentionalSignOutCallback();
        throw nextAuthResult;
    }
    if (firebaseResult) throw firebaseResult;
    return true;
};
