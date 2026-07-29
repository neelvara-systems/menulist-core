import {
    getDeploymentStage,
    getExpectedFirebaseProjectId,
} from "@constant/deploymentTargets";
import {
    CAMPAIGNCUE_FIREBASE_ENV,
    CAMPAIGNCUE_FIREBASE_MODE_ALIASES,
    CAMPAIGNCUE_FIREBASE_MODE_ENV_KEYS,
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
const readNonEmptyEnv = (key: string): string | undefined => {
    const value = process.env[key]?.trim();
    return value || undefined;
};

export function isExpectedCampaignCueProjectId(value: unknown, expectedProjectId: string): boolean {
    return typeof value === "string"
        && value.trim() === value
        && value === expectedProjectId;
}

export function resolveCampaignCueFirebaseMode(params: {
    defaultProjectId?: string;
    nodeEnv?: string;
    override?: string;
    productProjectId: string;
}): CampaignCueFirebaseMode {
    if (params.nodeEnv === "production") return "separate";
    const override = normalizeCampaignCueFirebaseMode(params.override);
    if (override) return override;
    return params.defaultProjectId === params.productProjectId ? "shared" : "separate";
}

const configuredCampaignCueProjectId = readNonEmptyEnv(CAMPAIGNCUE_FIREBASE_ENV.PUBLIC_PROJECT_ID)
    || readNonEmptyEnv(CAMPAIGNCUE_FIREBASE_ENV.PROJECT_ID);
const isCampaignCueProjectIdValid = configuredCampaignCueProjectId === undefined
    || isExpectedCampaignCueProjectId(configuredCampaignCueProjectId, expectedCampaignCueProjectId);

const campaigncueFirebaseConfig = {
    apiKey: readNonEmptyEnv(CAMPAIGNCUE_FIREBASE_ENV.API_KEY),
    authDomain: readNonEmptyEnv(CAMPAIGNCUE_FIREBASE_ENV.AUTH_DOMAIN),
    projectId: isCampaignCueProjectIdValid ? expectedCampaignCueProjectId : undefined,
    storageBucket: readNonEmptyEnv(CAMPAIGNCUE_FIREBASE_ENV.PUBLIC_STORAGE_BUCKET),
    messagingSenderId: readNonEmptyEnv(CAMPAIGNCUE_FIREBASE_ENV.MESSAGING_SENDER_ID),
    appId: readNonEmptyEnv(CAMPAIGNCUE_FIREBASE_ENV.APP_ID),
};

const campaigncueFirestoreDatabaseId =
    CAMPAIGNCUE_FIRESTORE_DATABASE_ID_ENV_KEYS.map(readNonEmptyEnv).find(Boolean) ||
    undefined;

const campaigncueFirebaseModeOverride = normalizeCampaignCueFirebaseMode(
    CAMPAIGNCUE_FIREBASE_MODE_ENV_KEYS.map(readNonEmptyEnv).find(Boolean),
);

const defaultFirebaseProjectId = firebaseConfig.projectId || readNonEmptyEnv("FIREBASE_PROJECT_ID");
const campaigncueFirebaseProjectId = expectedCampaignCueProjectId;

const hasDefaultFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const hasCampaignCueFirebaseConfig = Boolean(
    campaigncueFirebaseConfig.apiKey &&
    campaigncueFirebaseConfig.projectId &&
    campaigncueFirebaseConfig.appId &&
    isCampaignCueProjectIdValid,
);

const campaigncueFirebaseMode = resolveCampaignCueFirebaseMode({
    defaultProjectId: defaultFirebaseProjectId,
    nodeEnv: process.env.NODE_ENV,
    override: campaigncueFirebaseModeOverride || undefined,
    productProjectId: campaigncueFirebaseProjectId,
});

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
