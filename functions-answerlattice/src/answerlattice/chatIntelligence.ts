import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const PRODUCT_ID = 'AL';
const INSIGHT_SCHEMA_VERSION = 2;
const SOURCE_DAYS = 14;
const CURRENT_DAYS = 7;
const MAX_TEXT_LENGTH = 1_000;

type ChatAnalyticsDay = {
    date: string;
    sourceComplete: true;
    totalChats: number;
    totalMessages: number;
    positiveFeedback: number;
    negativeFeedback: number;
    totalFeedback: number;
    topQuestions: Array<{ question: string; count: number }>;
    knowledgeGaps: Array<{ question: string; count: number; examples: string[] }>;
};

export type AnswerlatticeChatIntelligenceResult = {
    daysRead: number;
    feedbackWritten: boolean;
    weeklyWritten: boolean;
};

export async function invalidateAnswerlatticeChatIntelligence(
    tId: number,
    sId: number,
): Promise<void> {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error('answerlattice_chat_intelligence_scope_invalid');
    }
    const insightCollection = db.collection(DB_COLLECTIONS.INSIGHTS)
        .doc(String(tId))
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(sId))
        .collection(DB_COLLECTIONS.AI);
    const batch = db.batch();
    batch.delete(insightCollection.doc('feedback'));
    batch.delete(insightCollection.doc('weekly'));
    await batch.commit();
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const cleanText = (value: unknown, maxLength = MAX_TEXT_LENGTH): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized ? normalized.slice(0, maxLength) : null;
};

const nonNegativeInteger = (value: unknown): number | null => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 1_000_000
        ? value
        : null
);

const normalizeDateKey = (value: unknown): string | null => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
        ? value
        : null;
};

const shiftDateKey = (dateKey: string, days: number): string => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

const parseCountedText = (value: unknown): { question: string; count: number } | null => {
    if (!isRecord(value)) return null;
    const question = cleanText(value.question, 500);
    const count = nonNegativeInteger(value.count);
    return question && count !== null && count > 0 ? { question, count } : null;
};

const parseKnowledgeGap = (
    value: unknown,
): { question: string; count: number; examples: string[] } | null => {
    const counted = parseCountedText(value);
    if (!counted || !isRecord(value)) return null;
    const examples = Array.isArray(value.examples)
        ? value.examples.slice(0, 3).flatMap((entry) => {
            const normalized = cleanText(entry);
            return normalized ? [normalized] : [];
        })
        : [];
    return { ...counted, examples };
};

const parseChatAnalyticsDay = (
    id: string,
    value: unknown,
    tId: number,
    sId: number,
): ChatAnalyticsDay | null => {
    if (!isRecord(value) || value.pId !== PRODUCT_ID || value.tId !== tId || value.sId !== sId) return null;
    const date = normalizeDateKey(value.date);
    const numericKeys = [
        'totalChats',
        'totalMessages',
        'positiveFeedback',
        'negativeFeedback',
        'totalFeedback',
    ] as const;
    const numeric = Object.fromEntries(numericKeys.map((key) => [key, nonNegativeInteger(value[key])]));
    if (
        !date
        || id !== `${tId}_${sId}_${date}`
        || value.sourceComplete !== true
        || Object.values(numeric).some((entry) => entry === null)
        || numeric.positiveFeedback! + numeric.negativeFeedback! !== numeric.totalFeedback
        || numeric.totalFeedback! > numeric.totalMessages!
        || !Array.isArray(value.topQuestions)
        || value.topQuestions.length > 10
        || !Array.isArray(value.knowledgeGaps)
        || value.knowledgeGaps.length > 20
    ) return null;

    const topQuestions = value.topQuestions.map(parseCountedText);
    const knowledgeGaps = value.knowledgeGaps.map(parseKnowledgeGap);
    if (topQuestions.some((entry) => !entry) || knowledgeGaps.some((entry) => !entry)) return null;

    return {
        date,
        sourceComplete: true,
        totalChats: numeric.totalChats!,
        totalMessages: numeric.totalMessages!,
        positiveFeedback: numeric.positiveFeedback!,
        negativeFeedback: numeric.negativeFeedback!,
        totalFeedback: numeric.totalFeedback!,
        topQuestions: topQuestions as ChatAnalyticsDay['topQuestions'],
        knowledgeGaps: knowledgeGaps as ChatAnalyticsDay['knowledgeGaps'],
    };
};

const aggregateDays = (days: ChatAnalyticsDay[]) => {
    const questions = new Map<string, { question: string; count: number }>();
    const gaps = new Map<string, { question: string; count: number; examples: string[] }>();
    let totalChats = 0;
    let totalMessages = 0;
    let positiveFeedback = 0;
    let negativeFeedback = 0;
    let totalFeedback = 0;

    days.forEach((day) => {
        totalChats += day.totalChats;
        totalMessages += day.totalMessages;
        positiveFeedback += day.positiveFeedback;
        negativeFeedback += day.negativeFeedback;
        totalFeedback += day.totalFeedback;
        day.topQuestions.forEach((question) => {
            const key = question.question.toLocaleLowerCase('en-US');
            const existing = questions.get(key) || { question: question.question, count: 0 };
            existing.count += question.count;
            questions.set(key, existing);
        });
        day.knowledgeGaps.forEach((gap) => {
            const key = gap.question.toLocaleLowerCase('en-US');
            const existing = gaps.get(key) || { question: gap.question, count: 0, examples: [] };
            existing.count += gap.count;
            gap.examples.forEach((example) => {
                if (existing.examples.length < 3 && !existing.examples.includes(example)) {
                    existing.examples.push(example);
                }
            });
            gaps.set(key, existing);
        });
    });

    return {
        totalChats,
        totalMessages,
        positiveFeedback,
        negativeFeedback,
        totalFeedback,
        positiveFeedbackShare: totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : null,
        topQuestions: Array.from(questions.values())
            .sort((a, b) => b.count - a.count || a.question.localeCompare(b.question, 'en-US'))
            .slice(0, 10),
        knowledgeGaps: Array.from(gaps.values())
            .sort((a, b) => b.count - a.count || a.question.localeCompare(b.question, 'en-US'))
            .slice(0, 20),
    };
};

const hashPayload = (value: unknown): string => (
    createHash('sha256').update(JSON.stringify(value)).digest('hex')
);

const getRangeDays = (
    days: ChatAnalyticsDay[],
    start: string,
    end: string,
): ChatAnalyticsDay[] => (
    days
        .filter((day) => day.date >= start && day.date <= end)
        .sort((left, right) => left.date.localeCompare(right.date))
);

const hasCompleteSevenDayRange = (
    days: ChatAnalyticsDay[],
    start: string,
): boolean => (
    days.length === CURRENT_DAYS
    && days.every((day, index) => day.date === shiftDateKey(start, index))
);

const buildWeeklyPayload = (days: ChatAnalyticsDay[], weekStart: string, weekEnd: string) => {
    const previousStart = shiftDateKey(weekStart, -CURRENT_DAYS);
    const previousEnd = shiftDateKey(weekEnd, -CURRENT_DAYS);
    const currentDays = getRangeDays(days, weekStart, weekEnd);
    const previousDays = getRangeDays(days, previousStart, previousEnd);
    const current = aggregateDays(currentDays);
    const previous = aggregateDays(previousDays);
    const currentWeekComplete = hasCompleteSevenDayRange(currentDays, weekStart);
    const comparisonComplete = currentWeekComplete
        && hasCompleteSevenDayRange(previousDays, previousStart);
    const volumeChangePercent = previous.totalChats > 0
        ? ((current.totalChats - previous.totalChats) / previous.totalChats) * 100
        : null;
    const positiveFeedbackSharePointChange = (
        current.positiveFeedbackShare !== null
        && previous.positiveFeedbackShare !== null
    )
        ? current.positiveFeedbackShare - previous.positiveFeedbackShare
        : null;
    const topCategory = (current.topQuestions[0]?.question || 'No recurring question').slice(0, 120);
    const conversationLabel = current.totalChats === 1 ? 'conversation' : 'conversations';
    const recordedFeedbackClause = current.positiveFeedbackShare === null
        ? 'No feedback outcomes were recorded'
        : `Recorded positive feedback was ${current.positiveFeedbackShare.toFixed(1)}%`;
    const narrative = current.totalChats > 0
        ? `Answerlattice reviewed ${current.totalChats} ${conversationLabel} for the week ending ${weekEnd}. ${recordedFeedbackClause}, and the most frequent question was "${topCategory}".`
        : `No conversations were recorded for the week ending ${weekEnd}.`;
    const highlights = current.totalChats > 0
        ? [
            `${current.totalChats} ${conversationLabel} reviewed`,
            current.positiveFeedbackShare === null
                ? 'No feedback outcomes were recorded'
                : `${current.positiveFeedbackShare.toFixed(1)}% positive feedback across recorded outcomes`,
            `${current.knowledgeGaps.length} recurring answer gaps identified`,
        ]
        : ['No conversation activity was recorded in this period.'];
    const recommendations = current.knowledgeGaps.length > 0
        ? current.knowledgeGaps.slice(0, 3).map((gap) => `Review the answer for: ${gap.question}`)
        : ['No answer-gap review is required from this period.'];

    const payload = {
        pId: PRODUCT_ID,
        schemaVersion: INSIGHT_SCHEMA_VERSION,
        weekStart,
        weekEnd,
        narrative,
        highlights,
        recommendations,
        keyMetrics: { volumeChangePercent, positiveFeedbackSharePointChange, topCategory },
        sourceCompleteness: {
            currentDays: currentDays.length,
            previousDays: previousDays.length,
            currentWeekComplete,
            comparisonComplete,
        },
        generationMode: 'deterministic',
        promptVersion: 'deterministic-v1',
    };
    return { payload, sourceHash: hashPayload(payload) };
};

const buildFeedbackPayload = (days: ChatAnalyticsDay[], date: string) => {
    const current = aggregateDays(days.filter((day) => day.date >= shiftDateKey(date, -(CURRENT_DAYS - 1)) && day.date <= date));
    const themes = current.knowledgeGaps.slice(0, 10).map((gap) => ({
        theme: gap.question,
        count: gap.count,
        severity: gap.count >= 10 ? 'high' : gap.count >= 5 ? 'medium' : 'low',
        examples: gap.examples,
        suggestedActions: [`Review and improve the canonical answer for: ${gap.question}`],
    }));
    const summary = themes.length > 0
        ? `${themes.length} recurring answer gap${themes.length === 1 ? '' : 's'} appeared in the last ${CURRENT_DAYS} UTC days.`
        : `No recurring answer gaps were recorded in the last ${CURRENT_DAYS} UTC days.`;
    const payload = {
        pId: PRODUCT_ID,
        schemaVersion: INSIGHT_SCHEMA_VERSION,
        date,
        themes,
        summary,
        topIssues: themes.slice(0, 5).map((theme) => theme.theme),
        recommendations: themes.slice(0, 5).flatMap((theme) => theme.suggestedActions),
        generationMode: 'deterministic',
        promptVersion: 'deterministic-v1',
    };
    return { payload, sourceHash: hashPayload(payload) };
};

export async function syncAnswerlatticeChatIntelligence(
    tId: number,
    sId: number,
    options: { generateWeekly?: boolean; now?: Date } = {},
): Promise<AnswerlatticeChatIntelligenceResult> {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error('answerlattice_chat_intelligence_scope_invalid');
    }
    const now = options.now || new Date();
    if (!Number.isFinite(now.getTime())) throw new Error('answerlattice_chat_intelligence_time_invalid');

    const endDate = new Date(now);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
    const endDateKey = endDate.toISOString().slice(0, 10);
    const startDateKey = shiftDateKey(endDateKey, -(SOURCE_DAYS - 1));
    const snapshot = await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS)
        .where('pId', '==', PRODUCT_ID)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('date', '>=', startDateKey)
        .where('date', '<=', endDateKey)
        .orderBy('date', 'desc')
        .limit(SOURCE_DAYS)
        .get();
    const days = snapshot.docs.flatMap((document) => {
        const parsed = parseChatAnalyticsDay(document.id, document.data(), tId, sId);
        return parsed ? [parsed] : [];
    });
    if (days.length !== snapshot.size) throw new Error('answerlattice_chat_intelligence_source_invalid');

    const feedback = buildFeedbackPayload(days, endDateKey);
    const weekly = options.generateWeekly
        ? buildWeeklyPayload(days, shiftDateKey(endDateKey, -(CURRENT_DAYS - 1)), endDateKey)
        : null;
    const insightCollection = db.collection(DB_COLLECTIONS.INSIGHTS)
        .doc(String(tId))
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(sId))
        .collection(DB_COLLECTIONS.AI);
    const feedbackRef = insightCollection.doc('feedback');
    const weeklyRef = insightCollection.doc('weekly');
    const snapshots = await db.getAll(feedbackRef, ...(weekly ? [weeklyRef] : []));
    const feedbackWritten = snapshots[0].get('sourceHash') !== feedback.sourceHash;
    const weeklyWritten = Boolean(weekly && snapshots[1]?.get('sourceHash') !== weekly.sourceHash);
    const writes: Promise<FirebaseFirestore.WriteResult>[] = [];
    if (feedbackWritten) {
        writes.push(feedbackRef.set({
            ...feedback.payload,
            tId,
            sId,
            sourceHash: feedback.sourceHash,
            generatedAt: FieldValue.serverTimestamp(),
        }));
    }
    if (weekly && weeklyWritten) {
        writes.push(weeklyRef.set({
            ...weekly.payload,
            tId,
            sId,
            sourceHash: weekly.sourceHash,
            generatedAt: FieldValue.serverTimestamp(),
        }));
    }
    await Promise.all(writes);

    return { daysRead: days.length, feedbackWritten, weeklyWritten };
}
