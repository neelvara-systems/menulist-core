import * as admin from "firebase-admin";

const existing = admin.apps.find((app) => app?.name === "[DEFAULT]");
const app = existing || admin.initializeApp();

export const db = admin.firestore(app);
export { admin };
