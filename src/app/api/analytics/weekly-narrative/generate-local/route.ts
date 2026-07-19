export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { getAnswerlatticeCompletedWeeklyWindows } from '@lib/answerlattice/analyticsIntelligenceContracts';
import {
    type AnswerlatticeChatAnalyticsDay,
    parseAnswerlatticeChatAnalyticsDay,
} from '@lib/answerlattice/chatAnalyticsContracts';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { withAuth } from '@/middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const WEEKLY_NARRATIVE_LOCAL_ENDPOINT = '/api/analytics/weekly-narrative/generate-local';
const WEEKLY_NARRATIVE_DAYS = 7;
const WEEKLY_NARRATIVE_TEXT_MAX_LENGTH = 220;

type WeeklyNarrativeAggregate = {
    totalChats: number;
    totalFeedback: number;
    totalMessages: number;
    totalPositiveFeedback: number;
    topQuestion: string;
    topGap: string | null;
};

const aggregateWeeklyNarrativeDays = (
    days: AnswerlatticeChatAnalyticsDay[],
): WeeklyNarrativeAggregate => {
    const questions = new Map<string, { label: string; count: number }>();
    const gaps = new Map<string, { label: string; count: number }>();
    let totalChats = 0;
    let totalFeedback = 0;
    let totalMessages = 0;
    let totalPositiveFeedback = 0;

    days.forEach((day) => {
        totalChats += day.totalChats;
        totalFeedback += day.totalFeedback;
        totalMessages += day.totalMessages;
        totalPositiveFeedback += day.positiveFeedback;
        day.topQuestions.forEach((question) => {
            const key = question.question.toLocaleLowerCase('en-US');
            const current = questions.get(key) || { label: question.question, count: 0 };
            current.count += question.count;
            questions.set(key, current);
        });
        day.knowledgeGaps.forEach((gap) => {
            const key = gap.question.toLocaleLowerCase('en-US');
            const current = gaps.get(key) || { label: gap.question, count: 0 };
            current.count += gap.count;
            gaps.set(key, current);
        });
    });

    const getTopLabel = (
        values: Map<string, { label: string; count: number }>,
    ): string | null => (
        Array.from(values.values())
            .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'en-US'))[0]
            ?.label.slice(0, WEEKLY_NARRATIVE_TEXT_MAX_LENGTH)
        || null
    );

    return {
        totalChats,
        totalFeedback,
        totalMessages,
        totalPositiveFeedback,
        topQuestion: getTopLabel(questions) || 'No recurring question',
        topGap: getTopLabel(gaps),
    };
};

const getWeeklyNarrativeRouteLogContext = (
    session: any,
    metadata: {
        currentDays?: number;
        previousDays?: number;
        weekEnd?: unknown;
        weekStart?: unknown;
    } = {},
) => ({
    endpoint: WEEKLY_NARRATIVE_LOCAL_ENDPOINT,
    ...getBoundedRuntimeStringContext('tenantId', resolveAnswerlatticeSessionScope(session)?.tenantId),
    ...getBoundedRuntimeStringContext('storeId', resolveAnswerlatticeSessionScope(session)?.storeId),
    ...getBoundedRuntimeStringContext('userId', session?.uId),
    ...getBoundedRuntimeStringContext('weekStart', metadata.weekStart),
    ...getBoundedRuntimeStringContext('weekEnd', metadata.weekEnd),
    currentDays: metadata.currentDays,
    previousDays: metadata.previousDays,
});

const hashPayload = (value: unknown): string => (
    createHash('sha256').update(JSON.stringify(value)).digest('hex')
);

async function generateWeeklyNarrativeLocally(request: NextRequest, session: any) {
    let weekStartForLog: string | undefined;
    let weekEndForLog: string | undefined;

    try {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WEEKLY_DIGEST) {
            return NextResponse.json(
                { error: 'Weekly digest is not enabled.' },
                { status: 403, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }

        const scope = resolveAnswerlatticeSessionScope(session);
        if (!scope) {
            return NextResponse.json(
                { error: 'Not onboarded' },
                { status: 400, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }
        const tId = scope.tenantId;
        const sId = scope.storeId;

        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-weekly-narrative',
                'workspace',
                tId,
                sId,
            ),
            limit: 2,
            window: 60,
        });
        if (!rateLimit.allowed) {
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.', retryAfter: waitSeconds },
                {
                    status: 429,
                    headers: {
                        ...ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
                        'Retry-After': String(waitSeconds),
                    },
                },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
        );
        if (permission.response) return permission.response;

        const weeklyWindows = getAnswerlatticeCompletedWeeklyWindows(
            new Date(),
            WEEKLY_NARRATIVE_DAYS,
        );
        if (!weeklyWindows) throw new Error('weekly_narrative_time_invalid');
        const { weekStart, weekEnd, previousWeekStart, previousWeekEnd } = weeklyWindows;
        weekStartForLog = weekStart;
        weekEndForLog = weekEnd;

        const queryRange = (start: string, end: string) => answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.CHAT_ANALYTICS)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('date', '>=', start)
            .where('date', '<=', end)
            .orderBy('date', 'asc')
            .limit(WEEKLY_NARRATIVE_DAYS)
            .get();
        const [snapshot, previousSnapshot] = await Promise.all([
            queryRange(weekStart, weekEnd),
            queryRange(previousWeekStart, previousWeekEnd),
        ]);

        if (snapshot.empty) {
            return NextResponse.json(
                {
                    status: 'no_data',
                    message: 'No completed analytics summary is available for the past week.',
                },
                { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }

        const parseSnapshot = (
            input: FirebaseFirestore.QuerySnapshot,
        ): AnswerlatticeChatAnalyticsDay[] => {
            const parsed = input.docs.map(document => parseAnswerlatticeChatAnalyticsDay({
                id: document.id,
                value: document.data(),
                scope: { tId, sId },
            }));
            if (parsed.some(day => !day)) {
                throw new Error('weekly_narrative_analytics_contract_invalid');
            }
            return parsed.flatMap(day => day ? [day] : []);
        };
        const currentDays = parseSnapshot(snapshot);
        const previousDays = parseSnapshot(previousSnapshot);
        if (
            currentDays.some(day => !day.sourceComplete)
        ) {
            return NextResponse.json(
                { error: 'The weekly analytics summary is still incomplete. Try again after aggregation finishes.' },
                { status: 409, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }

        const current = aggregateWeeklyNarrativeDays(currentDays);
        const previousSourceComplete = previousDays.every(day => day.sourceComplete);
        const comparablePreviousDays = previousSourceComplete ? previousDays : [];
        const previous = aggregateWeeklyNarrativeDays(comparablePreviousDays);
        const volumeChange = previous.totalChats > 0
            ? ((current.totalChats - previous.totalChats) / previous.totalChats) * 100
            : 0;
        const currentFeedbackRate = current.totalFeedback > 0
            ? (current.totalPositiveFeedback / current.totalFeedback) * 100
            : 0;
        const previousFeedbackRate = previous.totalFeedback > 0
            ? (previous.totalPositiveFeedback / previous.totalFeedback) * 100
            : 0;
        const satisfactionChange = previous.totalFeedback > 0
            ? currentFeedbackRate - previousFeedbackRate
            : 0;
        const conversationLabel = current.totalChats === 1 ? 'conversation' : 'conversations';
        const currentWeekComplete = currentDays.length === WEEKLY_NARRATIVE_DAYS;
        const comparisonComplete = currentWeekComplete
            && previousSourceComplete
            && previousDays.length === WEEKLY_NARRATIVE_DAYS;
        const recommendations = current.topGap
            ? [`Review the approved answer for: ${current.topGap}`]
            : ['No repeated answer-gap review is required from the recorded period.'];
        const payload = {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            weekStart,
            weekEnd,
            narrative: current.totalChats > 0
                ? `Answerlattice reviewed ${current.totalChats} ${conversationLabel} for the week ending ${weekEnd}. Recorded positive feedback was ${currentFeedbackRate.toFixed(1)}%, and the most frequent question was "${current.topQuestion}".`
                : `No conversations were recorded for the week ending ${weekEnd}.`,
            highlights: current.totalChats > 0
                ? [
                    `${current.totalChats} ${conversationLabel} reviewed`,
                    `${currentFeedbackRate.toFixed(1)}% positive feedback across recorded outcomes`,
                    current.topGap
                        ? `A repeated answer gap was recorded for: ${current.topGap}`
                        : 'No repeated answer gap was recorded.',
                ]
                : ['No conversation activity was recorded in this period.'],
            recommendations,
            keyMetrics: {
                volumeChange,
                satisfactionChange,
                topCategory: current.topQuestion,
            },
            sourceCompleteness: {
                currentDays: currentDays.length,
                previousDays: comparablePreviousDays.length,
                currentWeekComplete,
                comparisonComplete,
                previousSourceComplete,
            },
            generationMode: 'deterministic',
            promptVersion: 'deterministic-v1',
        };
        const sourceHash = hashPayload(payload);
        const weeklyRef = answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.INSIGHTS)
            .doc(String(tId))
            .collection(DB_COLLECTIONS.STORES)
            .doc(String(sId))
            .collection(DB_COLLECTIONS.AI)
            .doc('weekly');
        const currentInsight = await weeklyRef.get();
        const written = currentInsight.get('sourceHash') !== sourceHash;
        if (written) {
            await weeklyRef.set({
                ...payload,
                tId,
                sId,
                sourceHash,
                generatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        return NextResponse.json(
            {
                success: true,
                message: written ? 'Weekly digest refreshed.' : 'Weekly digest is already current.',
                data: {
                    weekStart,
                    weekEnd,
                    narrativeLength: payload.narrative.length,
                    highlightsCount: payload.highlights.length,
                    written,
                },
            },
            { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    } catch (error: unknown) {
        logRuntimeFailure(
            'weekly_narrative_local_generation_failed',
            error,
            getWeeklyNarrativeRouteLogContext(session, {
                weekEnd: weekEndForLog,
                weekStart: weekStartForLog,
            }),
        );
        return NextResponse.json(
            { error: 'Failed to prepare weekly digest.' },
            { status: 500, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }
}

export const POST = withAuth(generateWeeklyNarrativeLocally);
