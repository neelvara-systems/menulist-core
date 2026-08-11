import {
    getDeploymentStage,
    getExpectedFirebaseProjectId,
} from "@constant/deploymentTargets";
import {
    CAMPAIGNCUE_FIREBASE_MODE_ALIASES,
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

const configuredCampaignCueProjectId = process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_PROJECT_ID?.trim()
    || process.env.CAMPAIGNCUE_FIREBASE_PROJECT_ID?.trim();
const isCampaignCueProjectIdValid = configuredCampaignCueProjectId === undefined
    || isExpectedCampaignCueProjectId(configuredCampaignCueProjectId, expectedCampaignCueProjectId);

const campaigncueFirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_API_KEY?.trim(),
    authDomain: process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: isCampaignCueProjectIdValid ? expectedCampaignCueProjectId : undefined,
    storageBucket: process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_APP_ID?.trim(),
};

const campaigncueFirestoreDatabaseId =
    process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIRESTORE_DATABASE_ID?.trim() ||
    process.env.CAMPAIGNCUE_FIRESTORE_DATABASE_ID?.trim() ||
    undefined;

const campaigncueFirebaseModeOverride = normalizeCampaignCueFirebaseMode(
    process.env.NEXT_PUBLIC_CAMPAIGNCUE_FIREBASE_MODE?.trim()
        || process.env.CAMPAIGNCUE_FIREBASE_MODE?.trim(),
);

const defaultFirebaseProjectId = firebaseConfig.projectId;
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
