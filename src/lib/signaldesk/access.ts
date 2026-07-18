import { SIGNALDESK_COLLECTIONS } from "@constant/signaldesk/database";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
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

const VALID_HUMAN_ROLES: readonly SignalDeskRole[] = [
    "founder-admin",
    "growth-manager",
    "operator",
    "compliance-reviewer",
    "readonly-analyst",
];

const isSignalDeskHumanRole = (value: unknown): value is SignalDeskRole => (
    typeof value === "string" && VALID_HUMAN_ROLES.some((role) => role === value)
);

const isSignalDeskPermission = (value: unknown): value is SignalDeskPermission => (
    typeof value === "string" && ALL_PERMISSIONS.some((permission) => permission === value)
);

type UnknownRecord = Record<string, unknown>;

type SignalDeskMemberSnapshot = {
    data: () => unknown;
    exists: boolean;
    id: string;
    ref: { path: string };
};

const asRecord = (value: unknown): UnknownRecord => (
    value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as UnknownRecord
        : {}
);

const normalizeText = (value: unknown) => (
    typeof value === "string" ? value.trim() : ""
);

const getSignalDeskDb = () => {
    if (!isSignalDeskFirebaseConfigured && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const db: unknown = signaldeskFirestoreAdmin;
    return db && typeof (db as { collection?: unknown }).collection === "function"
        ? signaldeskFirestoreAdmin
        : null;
};

const normalizeEmail = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const email = value.trim().toLowerCase();
    const separator = email.indexOf("@");
    if (
        !email
        || email.length > 254
        || /\s/.test(email)
        || separator <= 0
        || separator !== email.lastIndexOf("@")
        || separator === email.length - 1
    ) {
        return undefined;
    }
    return email;
};

export const getSignalDeskSessionIdentity = (session: unknown) => {
    const sessionRecord = asRecord(session);
    const user = asRecord(sessionRecord.user);
    const userId = normalizeText(sessionRecord.uId || user.id || user.uid);
    const email = normalizeEmail(user.email || sessionRecord.email);
    const name = normalizeText(user.name || sessionRecord.name) || undefined;

    return {
        email,
        name,
        userId,
    };
};

export const hasSignalDeskPermission = (
    access: SignalDeskAccessContext | null,
    permission: SignalDeskPermission,
) => Boolean(access?.active && access.permissions.includes(permission));

const parseMemberPermissions = (value: unknown): SignalDeskPermission[] | null => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) return null;

    const permissions: SignalDeskPermission[] = [];
    for (const item of value) {
        if (!isSignalDeskPermission(item)) return null;
        permissions.push(item);
    }
    return Array.from(new Set(permissions));
};

const isMemberBoundToSession = (
    data: UnknownRecord,
    identity: ReturnType<typeof getSignalDeskSessionIdentity>,
) => {
    const storedEmail = normalizeEmail(data.emailLower);
    const canonicalEmail = normalizeEmail(data.email);
    const rawUserId = data.userId;

    if (
        !storedEmail
        || data.emailLower !== storedEmail
        || data.email !== storedEmail
        || canonicalEmail !== storedEmail
    ) {
        return false;
    }

    if (rawUserId !== null && rawUserId !== undefined) {
        if (
            typeof rawUserId !== "string"
            || !rawUserId
            || rawUserId !== rawUserId.trim()
            || !identity.userId
            || identity.userId !== rawUserId
        ) {
            return false;
        }
        return !identity.email || identity.email === storedEmail;
    }

    return Boolean(identity.email && identity.email === storedEmail);
};

export async function getSignalDeskAccessContext(session: unknown): Promise<SignalDeskAccessContext | null> {
    const identity = getSignalDeskSessionIdentity(session);
    if (!identity.userId && !identity.email) return null;

    const sessionRecord = asRecord(session);
    const user = asRecord(sessionRecord.user);
    const isPlatformAdmin = user.platformRole === "PLATFORM";
    if (isPlatformAdmin) {
        return {
            active: true,
            email: identity.email,
            firebaseConfigured: isSignalDeskFirebaseConfigured,
            isPlatformAdmin: true,
            name: identity.name,
            permissions: [...ALL_PERMISSIONS],
            role: "founder-admin",
            userId: identity.userId || identity.email || "platform",
        };
    }

    const db = getSignalDeskDb();
    if (!db) return null;

    const snapshots: SignalDeskMemberSnapshot[] = [];
    if (identity.userId) {
        const directSnapshot = await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
            .doc(identity.userId)
            .get() as SignalDeskMemberSnapshot;
        snapshots.push(directSnapshot);
        const userIdQuery = await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
            .where("userId", "==", identity.userId)
            .limit(2)
            .get();
        snapshots.push(...userIdQuery.docs as SignalDeskMemberSnapshot[]);
    }
    if (identity.email) {
        const emailQuery = await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
            .where("emailLower", "==", identity.email)
            .limit(2)
            .get();
        snapshots.push(...emailQuery.docs as SignalDeskMemberSnapshot[]);
    }

    const uniqueMembers = new Map<string, SignalDeskMemberSnapshot>();
    for (const snapshot of snapshots) {
        if (snapshot?.exists) uniqueMembers.set(snapshot.ref.path, snapshot);
    }
    if (uniqueMembers.size !== 1) return null;

    const memberSnap = uniqueMembers.values().next().value;
    if (!memberSnap) return null;
    const data = asRecord(memberSnap.data());
    const role = data.role;

    if (
        data.pId !== SIGNALDESK_PRODUCT_CODE
        || data.teamMemberId !== memberSnap.id
        || data.active !== true
        || data.status !== "active"
        || !isSignalDeskHumanRole(role)
        || !isMemberBoundToSession(data, identity)
    ) {
        return null;
    }

    const extraPermissions = parseMemberPermissions(data.permissions);
    if (!extraPermissions) return null;
    const rolePermissions = ROLE_PERMISSIONS[role];

    return {
        active: true,
        email: identity.email,
        firebaseConfigured: isSignalDeskFirebaseConfigured,
        isPlatformAdmin: false,
        name: identity.name || normalizeText(data.name) || undefined,
        permissions: Array.from(new Set([...rolePermissions, ...extraPermissions])),
        role,
        userId: identity.userId || identity.email || memberSnap.id,
    };
}
