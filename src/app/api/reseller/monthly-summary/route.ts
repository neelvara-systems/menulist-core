export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { admin } from "@lib/firebase/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { applyResellerReadRateLimit } from "../readRateLimit";

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

const toMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

async function getVisibleProfileDocs(
    db: admin.firestore.Firestore,
    isPlatform: boolean,
    resellerId: string,
    email?: string | null,
) {
    if (isPlatform) {
        const snapshot = await db.collection(DB_COLLECTIONS.RESELLER_PROFILES).limit(50).get();
        return snapshot.docs;
    }

    const directDocPromise = db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(resellerId).get();
    const normalizedEmail = email?.toLowerCase()?.trim();
    const emailSnapshotPromise = normalizedEmail
        ? db.collection(DB_COLLECTIONS.RESELLER_PROFILES)
            .where("email", "==", normalizedEmail)
            .limit(1)
            .get()
        : Promise.resolve(null);

    const [directDoc, emailSnapshot] = await Promise.all([directDocPromise, emailSnapshotPromise]);
    const docs = new Map<string, admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot>();
    if (directDoc.exists) docs.set(directDoc.id, directDoc);
    emailSnapshot?.docs?.forEach((doc) => docs.set(doc.id, doc));
    return Array.from(docs.values());
}

export const GET = withAuth(async (request: NextRequest, session) => {
    let reportMonth = getCurrentIndiaMonth();
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitResponse = await applyResellerReadRateLimit(session, "monthly-summary");
        if (rateLimitResponse) return rateLimitResponse;

        const isPlatform = session.user.platformRole === "PLATFORM" || session.platformRole === "PLATFORM";
        const sessionResellerId = session.user.id;
        const parsedMonth = parseMonth(request.nextUrl.searchParams.get("month"));
        if (!parsedMonth) {
            return NextResponse.json({ error: "Invalid month filter." }, { status: 400 });
        }

        const { month, start, end } = parsedMonth;
        reportMonth = month;
        const db = admin.firestore();
        let transactionQuery = db.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS)
            .where("createdOn", ">=", admin.firestore.Timestamp.fromDate(start))
            .where("createdOn", "<", admin.firestore.Timestamp.fromDate(end));

        if (!isPlatform) {
            transactionQuery = transactionQuery.where("resellerId", "==", sessionResellerId);
        }

        const [profileDocs, transactionSnapshot] = await Promise.all([
            getVisibleProfileDocs(db, isPlatform, sessionResellerId, session.user.email),
            transactionQuery
                .orderBy("createdOn", "desc")
                .limit(MONTHLY_TRANSACTION_LIMIT)
                .get(),
        ]);

        const profilesById = new Map<string, any>();
        profileDocs.forEach((doc) => {
            const data = doc.data();
            profilesById.set(doc.id, { id: doc.id, ...data });
            if (typeof data.authUserId === "string") profilesById.set(data.authUserId, { id: doc.id, ...data });
        });

        const rows = new Map<string, ResellerMonthlyRow & { storeIds: Set<number> }>();

        transactionSnapshot.docs.forEach((doc) => {
            const transaction = doc.data();
            const resellerId = String(transaction.resellerProfileId || transaction.resellerId || "unknown");
            const profile = profilesById.get(resellerId) || profilesById.get(String(transaction.resellerId || ""));
            const amount = Number(transaction.amountExpected || 0);
            const status = String(transaction.status || "");
            const paymentMode = String(transaction.paymentMode || "");
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

            existing.transactionCount += 1;
            existing.totalExpectedPaise += amount;
            if (typeof transaction.storeId === "number") existing.storeIds.add(transaction.storeId);

            if (paymentMode === "offline" && status === "active") {
                existing.offlineCollectedPaise += amount;
                existing.recognizedRevenuePaise += amount;
            }
            if (paymentMode === "online" && status === "active") {
                existing.onlineActivePaise += amount;
                existing.recognizedRevenuePaise += amount;
            }
            if (paymentMode === "online" && status === "pending_payment") {
                existing.onlinePendingPaise += amount;
            }

            rows.set(resellerId, existing);
        });

        const resellers = Array.from(rows.values())
            .map(({ storeIds, ...row }) => ({ ...row, clientCount: storeIds.size }))
            .sort((a, b) => b.recognizedRevenuePaise - a.recognizedRevenuePaise || b.totalExpectedPaise - a.totalExpectedPaise);

        const totals = resellers.reduce((sum, row) => ({
            clientCount: sum.clientCount + row.clientCount,
            offlineCollectedPaise: sum.offlineCollectedPaise + row.offlineCollectedPaise,
            onlineActivePaise: sum.onlineActivePaise + row.onlineActivePaise,
            onlinePendingPaise: sum.onlinePendingPaise + row.onlinePendingPaise,
            recognizedRevenuePaise: sum.recognizedRevenuePaise + row.recognizedRevenuePaise,
            totalExpectedPaise: sum.totalExpectedPaise + row.totalExpectedPaise,
            transactionCount: sum.transactionCount + row.transactionCount,
        }), {
            clientCount: 0,
            offlineCollectedPaise: 0,
            onlineActivePaise: 0,
            onlinePendingPaise: 0,
            recognizedRevenuePaise: 0,
            totalExpectedPaise: 0,
            transactionCount: 0,
        });

        return NextResponse.json({
            generatedAt: new Date().toISOString(),
            isPartial: transactionSnapshot.size >= MONTHLY_TRANSACTION_LIMIT,
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
        return NextResponse.json({ error: "Failed to fetch reseller monthly summary." }, { status: 500 });
    }
}, { requiredPlatformRole: "RESELLER" });
