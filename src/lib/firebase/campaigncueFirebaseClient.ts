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
import firebaseConfig from "./config";

const CAMPAIGNCUE_APP_NAME = "campaigncue";

// CampaignCue uses a named browser app even when it shares the MenuList Firebase
// project in local/QA. Purpose-scoped custom-token sessions must never replace or
// sign out the primary MenuList Firebase Auth session.
const campaigncueBrowserConfig = shouldUseSharedCampaignCueFirebase
    ? firebaseConfig
    : campaigncueFirebaseConfig;

const campaigncueApp = isCampaignCueFirebaseConfigured
    ? (getApps().find((app) => app.name === CAMPAIGNCUE_APP_NAME)
        ? getApp(CAMPAIGNCUE_APP_NAME)
        : initializeApp(campaigncueBrowserConfig, CAMPAIGNCUE_APP_NAME))
    : null;

const campaigncueFirebaseClient = campaigncueApp
    ? (campaigncueFirestoreDatabaseId
        ? getFirestore(campaigncueApp, campaigncueFirestoreDatabaseId)
        : getFirestore(campaigncueApp))
    : null;
const campaigncueAuth = campaigncueApp ? getAuth(campaigncueApp) : null;
const campaigncueStorage = campaigncueApp ? getStorage(campaigncueApp) : null;

export {
    campaigncueApp,
    campaigncueAuth,
    campaigncueFirebaseClient,
    campaigncueFirebaseMode,
    campaigncueStorage,
    isCampaignCueFirebaseConfigured,
};
