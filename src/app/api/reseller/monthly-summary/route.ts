export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { getResellerProfile } from "@database/reseller/server";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { admin } from "@lib/firebase/firebaseAdmin";
import {
    projectResellerMonthlyTransaction,
    type ResellerMonthlySummaryTotals,
} from "@lib/reseller/resellerMonthlySummary";
import { isActiveResellerProfileForSession } from "@lib/reseller/resellerProfileAuthority";
import type { ResellerProfileRecord } from "@type/reseller";
import { NextRequest } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { applyResellerReadRateLimit, resellerPrivateJson } from "../readRateLimit";

const INDIA_TZ = "Asia/Kolkata";
const INDIA_UTC_OFFSET_HOURS = -5;
const INDIA_UTC_OFFSET_MINUTES = -30;
const MONTHLY_TRANSACTION_LIMIT = 2000;
const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{2})$/;
const MIN_REPORT_YEAR = 2020;
const MAX_REPORT_YEAR = 2100;

type ResellerMonthlyRow = {
    resellerEmail: string;
    resellerId: string;
    resellerName: string;
    clientCount: number;
    transactionCount: number;
    offlineCollectedPaise: number;
    onlineActivePaise: number;
    onlinePendingPaise: number;
    recognizedRevenuePaise: number;
    totalExpectedPaise: number;
};

type ResellerMonthlyProfile = {
    authUserId?: string;
    email: string;
    id: string;
    name: string;
};

const boundedString = (value: unknown, maxLength: number): string => (
    typeof value === "string" ? value.trim().slice(0, maxLength) : ""
);

const projectMonthlyProfile = (
    id: string,
    value: unknown,
): ResellerMonthlyProfile | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    const profileId = boundedString(id, 128);
    if (!profileId) return null;
    const authUserId = boundedString(data.authUserId, 128);
    return {
        ...(authUserId ? { authUserId } : {}),
        email: boundedString(data.email, 320),
        id: profileId,
        name: boundedString(data.name, 100),
    };
};

const safeAdd = (left: number, right: number): number | null => {
    const sum = left + right;
    return Number.isSafeInteger(sum) && sum >= 0 ? sum : null;
};

const hasNoNullValues = <T extends Record<string, number | null>>(
    value: T,
): value is { [K in keyof T]: Exclude<T[K], null> } => (
    Object.values(value).every((item) => item !== null)
);

function getCurrentIndiaMonth() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        month: "2-digit",
        timeZone: INDIA_TZ,
        year: "numeric",
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    return `${year}-${month}`;
}

function parseMonth(value: string | null) {
    const requestedMonth = String(value || "").trim();
    const month = requestedMonth || getCurrentIndiaMonth();
    const match = month.match(MONTH_PARAM_PATTERN);
    if (!match) return null;

    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    if (
        !Number.isInteger(year)
        || !Number.isInteger(monthNumber)
        || year < MIN_REPORT_YEAR
        || year > MAX_REPORT_YEAR
        || monthNumber < 1
        || monthNumber > 12
    ) {
        return null;
    }

    const monthIndex = monthNumber - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1, INDIA_UTC_OFFSET_HOURS, INDIA_UTC_OFFSET_MINUTES));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, INDIA_UTC_OFFSET_HOURS, INDIA_UTC_OFFSET_MINUTES));
    return { end, month, start };
}

async function getVisibleProfileDocs(
    db: admin.firestore.Firestore,
    isPlatform: boolean,
    currentProfile: ResellerProfileRecord | null,
): Promise<ResellerMonthlyProfile[]> {
    if (isPlatform) {
        const snapshot = await db.collection(DB_COLLECTIONS.RESELLER_PROFILES).limit(50).get();
        return snapshot.docs.flatMap((doc) => {
            const profile = projectMonthlyProfile(doc.id, doc.data());
            return profile ? [profile] : [];
        });
    }

    if (!currentProfile) return [];
    const profile = projectMonthlyProfile(currentProfile.id, currentProfile);
    return profile ? [profile] : [];
}

export const GET = withAuth(async (request: NextRequest, session) => {
    let reportMonth = getCurrentIndiaMonth();
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return resellerPrivateJson({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitResponse = await applyResellerReadRateLimit(session, "monthly-summary");
        if (rateLimitResponse) return rateLimitResponse;

        const isPlatform = resolveExactSessionPlatformRole(session) === "PLATFORM";
        const sessionResellerId = session.user.id;
        const parsedMonth = parseMonth(request.nextUrl.searchParams.get("month"));
        if (!parsedMonth) {
            return resellerPrivateJson({ error: "Invalid month filter." }, { status: 400 });
        }

        const { month, start, end } = parsedMonth;
        reportMonth = month;
        const db = admin.firestore();
        let currentResellerProfile: ResellerProfileRecord | null = null;
        if (isPlatform) {
            if (!await getCurrentPlatformUser(session)) {
                return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
            }
        } else {
            currentResellerProfile = await getResellerProfile(
                sessionResellerId,
                session.user.email,
                session.user.resellerProfileId,
            );
            if (!isActiveResellerProfileForSession({
                actorId: sessionResellerId,
                profile: currentResellerProfile,
                sessionEmail: session.user.email,
                sessionProfileId: session.user.resellerProfileId,
            })) {
                return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
            }
        }
        let transactionQuery = db.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
            .where("createdOn", ">=", admin.firestore.Timestamp.fromDate(start))
            .where("createdOn", "<", admin.firestore.Timestamp.fromDate(end));

        if (!isPlatform) {
            transactionQuery = transactionQuery.where("resellerId", "==", sessionResellerId);
        }

        const [profileDocs, transactionSnapshot] = await Promise.all([
            getVisibleProfileDocs(db, isPlatform, currentResellerProfile),
            transactionQuery
                .orderBy("createdOn", "desc")
                .limit(MONTHLY_TRANSACTION_LIMIT)
                .get(),
        ]);

        const profilesById = new Map<string, ResellerMonthlyProfile>();
        profileDocs.forEach((profile) => {
            profilesById.set(profile.id, profile);
            if (profile.authUserId) profilesById.set(profile.authUserId, profile);
        });

        const rows = new Map<string, ResellerMonthlyRow & { storeIds: Set<number> }>();
        const totals: ResellerMonthlySummaryTotals = {
            clientCount: 0,
            offlineCollectedPaise: 0,
            onlineActivePaise: 0,
            onlinePendingPaise: 0,
            recognizedRevenuePaise: 0,
            totalExpectedPaise: 0,
            transactionCount: 0,
        };
        let invalidRowCount = 0;

        transactionSnapshot.docs.forEach((doc) => {
            const transaction = projectResellerMonthlyTransaction(doc.data());
            if (!transaction || (!isPlatform && transaction.resellerId !== sessionResellerId)) {
                invalidRowCount += 1;
                return;
            }
            const resellerId = transaction.resellerProfileId || transaction.resellerId;
            const profile = profilesById.get(resellerId) || profilesById.get(transaction.resellerId);
            const existing = rows.get(resellerId) || {
                resellerEmail: transaction.resellerEmail || profile?.email || "",
                resellerId,
                resellerName: profile?.name || transaction.resellerEmail || "Unknown reseller",
                clientCount: 0,
                transactionCount: 0,
                offlineCollectedPaise: 0,
                onlineActivePaise: 0,
                onlinePendingPaise: 0,
                recognizedRevenuePaise: 0,
                totalExpectedPaise: 0,
                storeIds: new Set<number>(),
            };

            const isOfflineActive = transaction.paymentMode === "offline" && transaction.status === "active";
            const isOnlineActive = transaction.paymentMode === "online" && transaction.status === "active";
            const isOnlinePending = transaction.paymentMode === "online" && transaction.status === "pending_payment";
            const isRecognized = isOfflineActive || isOnlineActive;
            const nextValues = {
                rowExpected: safeAdd(existing.totalExpectedPaise, transaction.amountExpected),
                rowOffline: safeAdd(existing.offlineCollectedPaise, isOfflineActive ? transaction.amountExpected : 0),
                rowOnlineActive: safeAdd(existing.onlineActivePaise, isOnlineActive ? transaction.amountExpected : 0),
                rowOnlinePending: safeAdd(existing.onlinePendingPaise, isOnlinePending ? transaction.amountExpected : 0),
                rowRecognized: safeAdd(existing.recognizedRevenuePaise, isRecognized ? transaction.amountExpected : 0),
                rowTransactions: safeAdd(existing.transactionCount, 1),
                totalExpected: safeAdd(totals.totalExpectedPaise, transaction.amountExpected),
                totalOffline: safeAdd(totals.offlineCollectedPaise, isOfflineActive ? transaction.amountExpected : 0),
                totalOnlineActive: safeAdd(totals.onlineActivePaise, isOnlineActive ? transaction.amountExpected : 0),
                totalOnlinePending: safeAdd(totals.onlinePendingPaise, isOnlinePending ? transaction.amountExpected : 0),
                totalRecognized: safeAdd(totals.recognizedRevenuePaise, isRecognized ? transaction.amountExpected : 0),
                totalTransactions: safeAdd(totals.transactionCount, 1),
            };
            if (!hasNoNullValues(nextValues)) {
                invalidRowCount += 1;
                return;
            }

            existing.totalExpectedPaise = nextValues.rowExpected;
            existing.offlineCollectedPaise = nextValues.rowOffline;
            existing.onlineActivePaise = nextValues.rowOnlineActive;
            existing.onlinePendingPaise = nextValues.rowOnlinePending;
            existing.recognizedRevenuePaise = nextValues.rowRecognized;
            existing.transactionCount = nextValues.rowTransactions;
            existing.storeIds.add(transaction.storeId);
            totals.totalExpectedPaise = nextValues.totalExpected;
            totals.offlineCollectedPaise = nextValues.totalOffline;
            totals.onlineActivePaise = nextValues.totalOnlineActive;
            totals.onlinePendingPaise = nextValues.totalOnlinePending;
            totals.recognizedRevenuePaise = nextValues.totalRecognized;
            totals.transactionCount = nextValues.totalTransactions;
            rows.set(resellerId, existing);
        });

        const resellers = Array.from(rows.values())
            .map(({ storeIds, ...row }) => ({ ...row, clientCount: storeIds.size }))
            .sort((a, b) => b.recognizedRevenuePaise - a.recognizedRevenuePaise || b.totalExpectedPaise - a.totalExpectedPaise);

        totals.clientCount = resellers.reduce((sum, row) => sum + row.clientCount, 0);

        return resellerPrivateJson({
            generatedAt: new Date().toISOString(),
            invalidRowCount,
            isPartial: transactionSnapshot.size >= MONTHLY_TRANSACTION_LIMIT || invalidRowCount > 0,
            month: reportMonth,
            period: { end: end.toISOString(), start: start.toISOString(), timeZone: INDIA_TZ },
            resellers,
            totals,
        });
    } catch (error) {
        logResellerApiFailure("reseller_monthly_summary_route_failed", error, {
            month: reportMonth,
            ...getBoundedResellerApiStringContext("userId", session.uId || session.user?.id),
        });
        return resellerPrivateJson({ error: "Failed to fetch reseller monthly summary." }, { status: 500 });
    }
}, { requiredPlatformRole: "RESELLER" });
