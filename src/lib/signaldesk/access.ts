import { SIGNALDESK_COLLECTIONS } from "@constant/signaldesk/database";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import type { SignalDeskAccessContext, SignalDeskPermission, SignalDeskRole } from "@type/signaldesk";

const ALL_PERMISSIONS: SignalDeskPermission[] = [
    "signaldesk.view",
    "signaldesk.configure",
    "target.review",
    "contact.reveal",
    "draft.create",
    "draft.approve",
    "message.export",
    "message.send",
    "source.configure",
    "channel.configure",
    "policy.approve",
    "kill-switch.activate",
    "kill-switch.deactivate",
    "audit.view",
];

const ROLE_PERMISSIONS: Record<SignalDeskRole, SignalDeskPermission[]> = {
    "founder-admin": ALL_PERMISSIONS,
    "growth-manager": [
        "signaldesk.view",
        "target.review",
        "draft.create",
        "draft.approve",
        "message.export",
        "source.configure",
        "channel.configure",
        "audit.view",
    ],
    operator: [
        "signaldesk.view",
        "target.review",
        "draft.create",
        "message.export",
    ],
    "compliance-reviewer": [
        "signaldesk.view",
        "policy.approve",
        "kill-switch.activate",
        "audit.view",
    ],
    "readonly-analyst": ["signaldesk.view"],
    "system-worker": [],
};

const VALID_ROLES = new Set<SignalDeskRole>(Object.keys(ROLE_PERMISSIONS) as SignalDeskRole[]);

const getSignalDeskDb = () => {
    if (!isSignalDeskFirebaseConfigured && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const db = signaldeskFirestoreAdmin as any;
    return db && typeof db.collection === "function" ? signaldeskFirestoreAdmin : null;
};

const normalizeEmail = (value: unknown) => {
    const email = String(value || "").trim().toLowerCase();
    return email || undefined;
};

export const getSignalDeskSessionIdentity = (session: any) => {
    const user = session?.user || {};
    const userId = String(session?.uId || user.id || user.uid || "");
    const email = normalizeEmail(user.email || session?.email);
    const name = user.name || session?.name;

    return {
        email,
        name: name ? String(name).trim() : undefined,
        userId,
    };
};

export const hasSignalDeskPermission = (
    access: SignalDeskAccessContext | null,
    permission: SignalDeskPermission,
) => Boolean(access?.active && access.permissions.includes(permission));

export async function getSignalDeskAccessContext(session: any): Promise<SignalDeskAccessContext | null> {
    const identity = getSignalDeskSessionIdentity(session);
    if (!identity.userId && !identity.email) return null;

    const isPlatformAdmin = session?.user?.platformRole === "PLATFORM";
    if (isPlatformAdmin) {
        return {
            active: true,
            email: identity.email,
            firebaseConfigured: isSignalDeskFirebaseConfigured,
            isPlatformAdmin: true,
            name: identity.name,
            permissions: ALL_PERMISSIONS,
            role: "founder-admin",
            userId: identity.userId || identity.email || "platform",
        };
    }

    const db = getSignalDeskDb();
    if (!db) return null;

    const snapshots: any[] = [];
    if (identity.userId) {
        snapshots.push(await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(identity.userId).get());
        const userIdQuery = await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
            .where("userId", "==", identity.userId)
            .limit(1)
            .get();
        snapshots.push(...userIdQuery.docs);
    }
    if (identity.email) {
        const emailQuery = await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
            .where("emailLower", "==", identity.email)
            .limit(1)
            .get();
        snapshots.push(...emailQuery.docs);
    }

    const memberSnap = snapshots.find((snap) => snap?.exists);
    if (!memberSnap?.exists) return null;

    const data = memberSnap.data() || {};
    if (data.active !== true) return null;

    const role = VALID_ROLES.has(data.role) ? data.role as SignalDeskRole : "readonly-analyst";
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    const extraPermissions = Array.isArray(data.permissions)
        ? data.permissions.filter((item: unknown): item is SignalDeskPermission => ALL_PERMISSIONS.includes(item as SignalDeskPermission))
        : [];

    return {
        active: true,
        email: identity.email,
        firebaseConfigured: isSignalDeskFirebaseConfigured,
        isPlatformAdmin: false,
        name: identity.name || data.name,
        permissions: Array.from(new Set([...rolePermissions, ...extraPermissions])),
        role,
        userId: identity.userId || data.userId || memberSnap.id,
    };
}
