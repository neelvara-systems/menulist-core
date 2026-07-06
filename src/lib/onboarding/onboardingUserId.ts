import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";

export function normalizeOnboardingUserId(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const raw = value;
    const userId = value.trim();
    return userId === raw && userId.length > 0 && userId.length <= 160 && isValidFirestoreDocumentId(userId)
        ? userId
        : null;
}

export function requireOnboardingUserId(value: unknown): string {
    const userId = normalizeOnboardingUserId(value);
    if (!userId) {
        throw new Error("Invalid onboarding user ID");
    }
    return userId;
}
