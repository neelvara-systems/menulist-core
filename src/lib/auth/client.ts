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
                        console.error('NextAuth signOut error:', error);
                        rej(error);
                    });
            })
            .catch((error) => {
                console.error('Firebase signOut error:', error);
                rej(error);
            });
    });
};
