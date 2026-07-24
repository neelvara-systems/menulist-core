export const SIGNALDESK_FUNCTIONS_QA_PROJECT_ID = "menulist-signaldesk-qa";
export const SIGNALDESK_FUNCTIONS_PRODUCTION_PROJECT_ID = "menulist-signaldesk";
export const SIGNALDESK_FUNCTIONS_EMULATOR_PROJECT_PREFIX = "demo-signaldesk";

export interface SignalDeskFunctionsProjectInput {
  firebaseConfig?: string;
  gcloudProject?: string;
  googleCloudProject?: string;
}

const normalizeProjectId = (value?: string): string | null => {
  const normalized = value?.trim() || "";
  return normalized || null;
};

const projectIdFromFirebaseConfig = (value?: string): string | null => {
  if (!value?.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_INVALID");
  }

  const rawProjectId = (parsed as Record<string, unknown>).projectId;
  if (rawProjectId === undefined || rawProjectId === null || rawProjectId === "") {
    throw new Error("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_PROJECT_MISSING");
  }
  if (typeof rawProjectId !== "string") {
    throw new Error("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_PROJECT_INVALID");
  }
  const projectId = normalizeProjectId(rawProjectId);
  if (!projectId) throw new Error("SIGNALDESK_FUNCTIONS_FIREBASE_CONFIG_PROJECT_MISSING");
  return projectId;
};

export const isAllowedSignalDeskFunctionsProjectId = (projectId: string): boolean => (
  projectId === SIGNALDESK_FUNCTIONS_QA_PROJECT_ID
  || projectId === SIGNALDESK_FUNCTIONS_PRODUCTION_PROJECT_ID
  || projectId === SIGNALDESK_FUNCTIONS_EMULATOR_PROJECT_PREFIX
  || (
    projectId.startsWith(`${SIGNALDESK_FUNCTIONS_EMULATOR_PROJECT_PREFIX}-`)
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      projectId.slice(SIGNALDESK_FUNCTIONS_EMULATOR_PROJECT_PREFIX.length + 1),
    )
  )
);

export const resolveSignalDeskFunctionsProjectId = (
  input: SignalDeskFunctionsProjectInput,
): string => {
  const projectIds = [
    projectIdFromFirebaseConfig(input.firebaseConfig),
    normalizeProjectId(input.gcloudProject),
    normalizeProjectId(input.googleCloudProject),
  ].filter((value): value is string => Boolean(value));

  const uniqueProjectIds = [...new Set(projectIds)];
  if (!uniqueProjectIds.length) throw new Error("SIGNALDESK_FUNCTIONS_PROJECT_ID_MISSING");
  if (uniqueProjectIds.length !== 1) throw new Error("SIGNALDESK_FUNCTIONS_PROJECT_ID_CONFLICT");

  const [projectId] = uniqueProjectIds;
  if (!isAllowedSignalDeskFunctionsProjectId(projectId)) {
    throw new Error("SIGNALDESK_FUNCTIONS_PROJECT_ID_NOT_ALLOWED");
  }
  return projectId;
};
