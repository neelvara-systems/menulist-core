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

/**
 * Sign out the current user (client-side only)
 * Safe to import in client components
 */
export const signOutSession = (callbackUrl: string = NAVIGARIONS_ROUTINGS.SIGNIN) => {
    return new Promise((res, rej) => {
        signOutFirebaseAuth()
            .then(() => {
                signOut({
                    redirect: false,
                    callbackUrl: callbackUrl
                })
                    .then(() => {
                        res(true);
                    })
                    .catch((error) => {
                        logAuthFailure('nextauth_signout_failed', error, {
                            ...getBoundedAuthStringContext('callbackUrl', callbackUrl),
                        });
                        rej(error);
                    });
            })
            .catch((error) => {
                logAuthFailure('firebase_signout_failed', error, {
                    ...getBoundedAuthStringContext('callbackUrl', callbackUrl),
                });
                rej(error);
            });
    });
};
