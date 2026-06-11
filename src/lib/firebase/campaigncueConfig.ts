import {
    getDeploymentStage,
    getExpectedFirebaseProjectId,
} from "@constant/deploymentTargets";
import {
    CAMPAIGNCUE_FIREBASE_ENV,
    CAMPAIGNCUE_FIREBASE_MODE_ALIASES,
    CAMPAIGNCUE_FIREBASE_MODE_ENV_KEYS,
    CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS,
    CAMPAIGNCUE_FIRESTORE_DATABASE_ID_ENV_KEYS,
    type CampaignCueFirebaseMode,
} from "@constant/campaigncue/firebase";
import firebaseConfig from "./config";

const normalizeCampaignCueFirebaseMode = (value?: string): CampaignCueFirebaseMode | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if ((CAMPAIGNCUE_FIREBASE_MODE_ALIASES.shared as readonly string[]).includes(normalized)) return "shared";
    if ((CAMPAIGNCUE_FIREBASE_MODE_ALIASES.separate as readonly string[]).includes(normalized)) return "separate";
    return null;
};

const expectedCampaignCueProjectId = getExpectedFirebaseProjectId("campaigncue", getDeploymentStage());

const campaigncueFirebaseConfig = {
    apiKey: process.env[CAMPAIGNCUE_FIREBASE_ENV.API_KEY],
    authDomain: process.env[CAMPAIGNCUE_FIREBASE_ENV.AUTH_DOMAIN],
    projectId: process.env[CAMPAIGNCUE_FIREBASE_ENV.PUBLIC_PROJECT_ID] || expectedCampaignCueProjectId,
    storageBucket: process.env[CAMPAIGNCUE_FIREBASE_ENV.PUBLIC_STORAGE_BUCKET],
    messagingSenderId: process.env[CAMPAIGNCUE_FIREBASE_ENV.MESSAGING_SENDER_ID],
    appId: process.env[CAMPAIGNCUE_FIREBASE_ENV.APP_ID],
};

const campaigncueFirestoreDatabaseId =
    CAMPAIGNCUE_FIRESTORE_DATABASE_ID_ENV_KEYS.map((key) => process.env[key]).find(Boolean) ||
    undefined;

const campaigncueFirebaseModeOverride = normalizeCampaignCueFirebaseMode(
    CAMPAIGNCUE_FIREBASE_MODE_ENV_KEYS.map((key) => process.env[key]).find(Boolean),
);

const defaultFirebaseProjectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID;
const campaigncueFirebaseProjectId =
    campaigncueFirebaseConfig.projectId ||
    CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS.map((key) => process.env[key]).find(Boolean) ||
    expectedCampaignCueProjectId;

const isSameFirebaseProject = Boolean(
    defaultFirebaseProjectId &&
    campaigncueFirebaseProjectId &&
    defaultFirebaseProjectId === campaigncueFirebaseProjectId,
);

const hasDefaultFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const hasCampaignCueFirebaseConfig = Boolean(
    campaigncueFirebaseConfig.apiKey &&
    campaigncueFirebaseConfig.projectId &&
    campaigncueFirebaseConfig.appId,
);

const campaigncueFirebaseMode: CampaignCueFirebaseMode =
    campaigncueFirebaseModeOverride ||
    (isSameFirebaseProject ? "shared" : "separate");

const shouldUseSharedCampaignCueFirebase = campaigncueFirebaseMode === "shared";
const isCampaignCueFirebaseConfigured = shouldUseSharedCampaignCueFirebase
    ? hasDefaultFirebaseConfig
    : hasCampaignCueFirebaseConfig;

export {
    campaigncueFirebaseMode,
    campaigncueFirebaseProjectId,
    campaigncueFirestoreDatabaseId,
    expectedCampaignCueProjectId,
    hasCampaignCueFirebaseConfig,
    isCampaignCueFirebaseConfigured,
    shouldUseSharedCampaignCueFirebase,
};

export default campaigncueFirebaseConfig;
