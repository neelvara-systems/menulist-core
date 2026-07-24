import * as admin from "firebase-admin";
import { resolveSignalDeskFunctionsProjectId } from "./projectBoundary";

const runtimeProjectId = resolveSignalDeskFunctionsProjectId({
  firebaseConfig: process.env.FIREBASE_CONFIG,
  gcloudProject: process.env.GCLOUD_PROJECT,
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
});
const existing = admin.apps.find((app) => app?.name === "[DEFAULT]");
if (existing && existing.options.projectId !== runtimeProjectId) {
  throw new Error("SIGNALDESK_FUNCTIONS_EXISTING_APP_PROJECT_MISMATCH");
}
const app = existing || admin.initializeApp({ projectId: runtimeProjectId });

export const db = admin.firestore(app);
export { admin };
