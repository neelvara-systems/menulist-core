/** CampaignCue browser Firebase runtime for private, workspace-scoped media uploads. */
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import campaigncueFirebaseConfig, {
    campaigncueFirebaseMode,
    campaigncueFirestoreDatabaseId,
    isCampaignCueFirebaseConfigured,
    shouldUseSharedCampaignCueFirebase,
} from "./campaigncueConfig";
import { firebaseApp, firebaseAuth, firebaseClient, firebaseStorage } from "./firebaseClient";

const CAMPAIGNCUE_APP_NAME = "campaigncue";

const campaigncueApp = isCampaignCueFirebaseConfigured
    ? (shouldUseSharedCampaignCueFirebase
        ? firebaseApp
        : (getApps().find((app) => app.name === CAMPAIGNCUE_APP_NAME)
            ? getApp(CAMPAIGNCUE_APP_NAME)
            : initializeApp(campaigncueFirebaseConfig, CAMPAIGNCUE_APP_NAME)))
    : null;

const campaigncueFirebaseClient = campaigncueApp
    ? (shouldUseSharedCampaignCueFirebase && !campaigncueFirestoreDatabaseId
        ? firebaseClient
        : campaigncueFirestoreDatabaseId
            ? getFirestore(campaigncueApp, campaigncueFirestoreDatabaseId)
            : getFirestore(campaigncueApp))
    : null;
const campaigncueAuth = campaigncueApp
    ? (shouldUseSharedCampaignCueFirebase ? firebaseAuth : getAuth(campaigncueApp))
    : null;
const campaigncueStorage = campaigncueApp
    ? (shouldUseSharedCampaignCueFirebase ? firebaseStorage : getStorage(campaigncueApp))
    : null;

export {
    campaigncueApp,
    campaigncueAuth,
    campaigncueFirebaseClient,
    campaigncueFirebaseMode,
    campaigncueStorage,
    isCampaignCueFirebaseConfigured,
};
