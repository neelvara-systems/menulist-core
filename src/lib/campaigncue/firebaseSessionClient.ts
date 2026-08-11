"use client";

import { CAMPAIGNCUE_API_ROUTES } from "@constant/campaigncue/routes";
import {
    campaigncueAuth,
    campaigncueFirebaseClient,
    campaigncueStorage,
    isCampaignCueFirebaseConfigured,
} from "@lib/firebase/campaigncueFirebaseClient";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type { CampaignCueFirebaseSessionAuthorization } from "@lib/validation/campaigncueSchemas";
import { inMemoryPersistence, setPersistence, signInWithCustomToken, signOut } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

const TOKEN_RESPONSE_LIMIT = 64 * 1024;

interface CampaignCueFirebaseSessionClients {
    firestore: Firestore;
    storage: FirebaseStorage;
    userId: string;
}

let activeOperations = 0;
let persistenceConfigured = false;
let sessionAuthorizationKey: string | null = null;
let signInPromise: Promise<void> | null = null;
let signOutPromise: Promise<void> | null = null;
const idleWaiters = new Set<() => void>();

const waitForIdleSession = () => new Promise<void>((resolve) => {
    idleWaiters.add(resolve);
});

const notifyIdleSession = () => {
    if (activeOperations !== 0) return;
    const waiters = Array.from(idleWaiters);
    idleWaiters.clear();
    waiters.forEach((resolve) => resolve());
};

const requireClients = () => {
    if (
        !isCampaignCueFirebaseConfigured
        || !campaigncueAuth
        || !campaigncueFirebaseClient
        || !campaigncueStorage
    ) {
        throw new Error("CampaignCue private Firebase access is not configured for this environment.");
    }
    return {
        auth: campaigncueAuth,
        firestore: campaigncueFirebaseClient,
        storage: campaigncueStorage,
    };
};

const authorizationKey = (
    workspaceId: string,
    authorization: CampaignCueFirebaseSessionAuthorization,
) => `${workspaceId}:${authorization.purpose}:${authorization.purpose === "media_upload"
    ? `${authorization.uploadId}:${authorization.sourceFileName}`
    : "_"}`;

const readToken = async (
    workspaceId: string,
    authorization: CampaignCueFirebaseSessionAuthorization,
) => {
    const query = new URLSearchParams({ purpose: authorization.purpose });
    if (authorization.purpose === "media_upload") {
        query.set("sourceFileName", authorization.sourceFileName);
        query.set("uploadId", authorization.uploadId);
    }
    const response = await fetch(`${CAMPAIGNCUE_API_ROUTES.FIREBASE_TOKEN}?${query.toString()}`, {
        credentials: "include",
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, TOKEN_RESPONSE_LIMIT);
    if (!response.ok || !payload || typeof payload !== "object" || !("data" in payload)) {
        throw new Error("CampaignCue private Firebase authorization is unavailable.");
    }
    const data = (payload as { data: unknown }).data;
    if (
        !data
        || typeof data !== "object"
        || !("token" in data)
        || typeof data.token !== "string"
        || !("workspaceId" in data)
        || data.workspaceId !== workspaceId
        || !("purpose" in data)
        || data.purpose !== authorization.purpose
        || (
            authorization.purpose === "media_upload"
            && (
                !("uploadId" in data)
                || data.uploadId !== authorization.uploadId
                || !("sourceFileName" in data)
                || data.sourceFileName !== authorization.sourceFileName
            )
        )
    ) {
        throw new Error("CampaignCue private Firebase scope changed. Refresh the workspace and try again.");
    }
    return data.token;
};

const startSession = async (
    workspaceId: string,
    authorization: CampaignCueFirebaseSessionAuthorization,
) => {
    const { auth } = requireClients();
    if (!persistenceConfigured) {
        await setPersistence(auth, inMemoryPersistence);
        persistenceConfigured = true;
    }
    if (auth.currentUser) await signOut(auth);
    const token = await readToken(workspaceId, authorization);
    const credential = await signInWithCustomToken(auth, token);
    if (!credential.user.uid) {
        await signOut(auth).catch(() => undefined);
        throw new Error("CampaignCue private Firebase authorization is unavailable.");
    }
    sessionAuthorizationKey = authorizationKey(workspaceId, authorization);
};

const acquireSession = async (
    workspaceId: string,
    authorization: CampaignCueFirebaseSessionAuthorization,
): Promise<CampaignCueFirebaseSessionClients> => {
    const clients = requireClients();
    const requestedAuthorizationKey = authorizationKey(workspaceId, authorization);
    while (true) {
        if (signOutPromise) {
            await signOutPromise;
            continue;
        }
        if (signInPromise) {
            await signInPromise;
            continue;
        }
        if (clients.auth.currentUser && sessionAuthorizationKey === requestedAuthorizationKey) {
            const userId = clients.auth.currentUser.uid;
            if (!userId) throw new Error("CampaignCue private Firebase authorization is unavailable.");
            activeOperations += 1;
            return { firestore: clients.firestore, storage: clients.storage, userId };
        }
        if (activeOperations > 0) {
            await waitForIdleSession();
            continue;
        }

        signInPromise = startSession(workspaceId, authorization);
        try {
            await signInPromise;
        } finally {
            signInPromise = null;
        }
    }
};

const releaseSession = async () => {
    activeOperations = Math.max(0, activeOperations - 1);
    if (activeOperations !== 0 || signOutPromise) return;
    const { auth } = requireClients();
    signOutPromise = signOut(auth)
        .catch(() => undefined)
        .then(() => {
            sessionAuthorizationKey = null;
        })
        .finally(() => {
            signOutPromise = null;
        });
    notifyIdleSession();
    await signOutPromise;
};

export async function withCampaignCueFirebaseSession<T>(
    workspaceId: string,
    authorization: CampaignCueFirebaseSessionAuthorization,
    operation: (clients: CampaignCueFirebaseSessionClients) => Promise<T>,
): Promise<T> {
    const clients = await acquireSession(workspaceId, authorization);
    try {
        return await operation(clients);
    } finally {
        await releaseSession();
    }
}
