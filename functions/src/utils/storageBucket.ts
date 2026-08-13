function getFirebaseConfigStorageBucket(): string {
    const firebaseConfig = process.env.FIREBASE_CONFIG;
    if (!firebaseConfig) return "";

    try {
        const parsed = JSON.parse(firebaseConfig) as { storageBucket?: unknown };
        return typeof parsed.storageBucket === "string" ? parsed.storageBucket.trim() : "";
    } catch {
        return "";
    }
}

function getProjectStorageBucketFallback(): string {
    const projectId = process.env.FIREBASE_PROJECT_ID
        || process.env.GCLOUD_PROJECT
        || process.env.GCP_PROJECT
        || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    return projectId ? `${projectId}.appspot.com` : "";
}

export function getAllowedStorageBucket(): string {
    return process.env.FIREBASE_STORAGE_BUCKET
        || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        || getFirebaseConfigStorageBucket()
        || getProjectStorageBucketFallback();
}
