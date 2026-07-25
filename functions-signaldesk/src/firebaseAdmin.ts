import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { resolveSignalDeskFunctionsProjectId } from "./projectBoundary";

export { FieldValue, Timestamp } from "firebase-admin/firestore";

const runtimeProjectId = resolveSignalDeskFunctionsProjectId({
  firebaseConfig: process.env.FIREBASE_CONFIG,
  gcloudProject: process.env.GCLOUD_PROJECT,
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
});
const existing = getApps().find((candidate) => candidate.name === "[DEFAULT]");
if (existing && existing.options.projectId !== runtimeProjectId) {
  throw new Error("SIGNALDESK_FUNCTIONS_EXISTING_APP_PROJECT_MISMATCH");
}
const app = existing || initializeApp({ projectId: runtimeProjectId });

export const db = getFirestore(app);
