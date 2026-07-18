import { createHash, randomUUID } from 'crypto';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const PRODUCT_ID = 'AL';
const SESSION_LIMIT_PER_DAY = 2000;
const CHANGED_SESSION_LIMIT = 500;
const MAX_CHANGED_DATES_PER_RUN = 7;
const INITIAL_LOOKBACK_DAYS = 30;
const STATE_DOC_PREFIX = 'chatAnalyticsState';
const MANUAL_BACKFILL_LEASE_MS = 10 * 60 * 1000;
const MANUAL_BACKFILL_COOLDOWN_MS = 60 * 1000;

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content?: string;
    feedback?: { isGood: boolean; comments?: string };
    generationMetadata?: { isRetry?: boolean };
};

type ChatSession = {
    id: string;
    mode: 'qna' | 'assistant';
    messages: ChatMessage[];
    createdOn: Timestamp;
    modifiedOn: Timestamp;
};

export type ChatAnalyticsAggregationResult = {
    changedSessionsScanned: number;
    datesProcessed: number;
    summariesWritten: number;
    summariesSkipped: number;
    partialDates: number;
    continuationPending: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPositiveScopeId = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

const normalizeBoundedIdentifier = (value: unknown): string | null => {
    if (typeof value !== 'string' || !value || value.length > 180) return null;
    if (value.trim() !== value || value === '.' || value === '..' || value.includes('/')) return null;
    return /[\u0000-\u001f\u007f]/.test(value) ? null : value;
};

const toTimestamp = (value: unknown): Timestamp | null => {
    if (value instanceof Timestamp) return value;
    if (
        isRecord(value)
        && typeof value.seconds === 'number'
        && Number.isSafeInteger(value.seconds)
        && value.seconds >= -62135596800
        && value.seconds <= 253402300799
        && (value.nanoseconds === undefined || (
            typeof value.nanoseconds === 'number'
            && Number.isSafeInteger(value.nanoseconds)
            && value.nanoseconds >= 0
            && value.nanoseconds <= 999999999
        ))
    ) {
        const seconds = Number(value.seconds);
        const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
        return new Timestamp(seconds, nanoseconds);
    }
    return null;
};

const cleanText = (value: unknown, max: number): string => (
    typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
        : ''
);

const parseMessage = (value: unknown): ChatMessage | null => {
    if (!isRecord(value)) return null;
    const id = normalizeBoundedIdentifier(value.id);
    if (!id) return null;
    if (value.role !== 'user' && value.role !== 'assistant') return null;
    const feedback = isRecord(value.feedback) && typeof value.feedback.isGood === 'boolean'
        ? { isGood: value.feedback.isGood, comments: cleanText(value.feedback.comments, 1000) }
        : undefined;
    return {
        id,
        role: value.role,
        ...(cleanText(value.content, 4000) ? { content: cleanText(value.content, 4000) } : {}),
        ...(feedback ? { feedback } : {}),
        ...(isRecord(value.generationMetadata)
            ? { generationMetadata: { isRetry: value.generationMetadata.isRetry === true } }
            : {}),
    };
};

const parseSession = (id: string, value: unknown, tId: number, sId: number): ChatSession | null => {
    if (!isRecord(value)) return null;
    const createdOn = toTimestamp(value.createdOn);
    const modifiedOn = toTimestamp(value.modifiedOn);
    if (
        value.pId !== PRODUCT_ID
        || !isPositiveScopeId(value.tId)
        || !isPositiveScopeId(value.sId)
        || value.tId !== tId
        || value.sId !== sId
        || (value.mode !== 'qna' && value.mode !== 'assistant')
        || !createdOn
        || !modifiedOn
        || !Array.isArray(value.messages)
        || value.messages.length === 0
        || value.messages.length > 50
    ) return null;
    const messages = value.messages.map(parseMessage);
    if (messages.some((message) => !message)) return null;
    return {
        id,
        mode: value.mode,
        messages: messages as ChatMessage[],
        createdOn,
        modifiedOn,
    };
};

const utcDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const utcDayBounds = (dateKey: string): { start: Timestamp; end: Timestamp } => ({
    start: Timestamp.fromDate(new Date(`${dateKey}T00:00:00.000Z`)),
    end: Timestamp.fromDate(new Date(`${dateKey}T23:59:59.999Z`)),
});

const yesterdayDateKey = (): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    return utcDateKey(date);
};

const initialCursor = (): Timestamp => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - INITIAL_LOOKBACK_DAYS);
    return Timestamp.fromDate(date);
};

const getStateDocId = (tId: number, sId: number) => `${STATE_DOC_PREFIX}_${tId}_${sId}`;
const getDayDocId = (tId: number, sId: number, dateKey: string) => `${tId}_${sId}_${dateKey}`;

export const acquireChatAnalyticsBackfillLease = async (
    tId: number,
    sId: number,
    now = Timestamp.now(),
): Promise<string | null> => {
    if (!isPositiveScopeId(tId) || !isPositiveScopeId(sId)) {
        throw new Error('answerlattice_chat_backfill_scope_invalid');
    }
    const stateRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getStateDocId(tId, sId));
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(stateRef);
        const state = snapshot.data();
        if (snapshot.exists && (
            !state
            || state.pId !== PRODUCT_ID
            || state.tId !== tId
            || state.sId !== sId
        )) {
            throw new Error('answerlattice_chat_analytics_state_scope_invalid');
        }
        const leaseExpiresAt = toTimestamp(snapshot.get('manualBackfillLeaseExpiresAt'));
        const lastStartedAt = toTimestamp(snapshot.get('manualBackfillLastStartedAt'));
        if (
            (leaseExpiresAt && leaseExpiresAt.toMillis() > now.toMillis())
            || (lastStartedAt && now.toMillis() - lastStartedAt.toMillis() < MANUAL_BACKFILL_COOLDOWN_MS)
        ) {
            return null;
        }
        const leaseId = randomUUID();
        transaction.set(stateRef, {
            pId: PRODUCT_ID,
            tId,
            sId,
            manualBackfillLeaseId: leaseId,
            manualBackfillLastStartedAt: now,
            manualBackfillLeaseExpiresAt: Timestamp.fromMillis(now.toMillis() + MANUAL_BACKFILL_LEASE_MS),
            modifiedOn: now,
            ...(snapshot.exists ? {} : { createdOn: now }),
        }, { merge: true });
        return leaseId;
    });
};

export const releaseChatAnalyticsBackfillLease = async (
    tId: number,
    sId: number,
    leaseId: string,
): Promise<void> => {
    const stateRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getStateDocId(tId, sId));
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(stateRef);
        if (!snapshot.exists || snapshot.get('manualBackfillLeaseId') !== leaseId) return;
        transaction.set(stateRef, {
            manualBackfillLeaseId: FieldValue.delete(),
            manualBackfillLeaseExpiresAt: FieldValue.delete(),
            modifiedOn: Timestamp.now(),
        }, { merge: true });
    });
};

const aggregateDay = async (tId: number, sId: number, dateKey: string) => {
    const bounds = utcDayBounds(dateKey);
    const snapshot = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS)
        .where('pId', '==', PRODUCT_ID)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('createdOn', '>=', bounds.start)
        .where('createdOn', '<=', bounds.end)
        .orderBy('createdOn', 'asc')
        .limit(SESSION_LIMIT_PER_DAY + 1)
        .get();
    const sourceComplete = snapshot.size <= SESSION_LIMIT_PER_DAY;
    const sessions = snapshot.docs
        .slice(0, SESSION_LIMIT_PER_DAY)
        .flatMap((document) => {
            const parsed = parseSession(document.id, document.data(), tId, sId);
            return parsed ? [parsed] : [];
        });

    let qnaChats = 0;
    let assistantChats = 0;
    let totalMessages = 0;
    let positiveFeedback = 0;
    let negativeFeedback = 0;
    let totalRegenerations = 0;
    const questionCounts = new Map<string, number>();
    const gapCounts = new Map<string, { question: string; count: number; examples: string[] }>();

    sessions.forEach((session) => {
        if (session.mode === 'qna') qnaChats += 1;
        else assistantChats += 1;
        session.messages.forEach((message, index) => {
            totalMessages += 1;
            if (message.role === 'user' && message.content) {
                const normalized = message.content.toLowerCase();
                questionCounts.set(normalized, (questionCounts.get(normalized) || 0) + 1);
            }
            if (message.feedback) {
                if (message.feedback.isGood) positiveFeedback += 1;
                else {
                    negativeFeedback += 1;
                    const userMessage = session.messages[index - 1];
                    if (userMessage?.role === 'user' && userMessage.content) {
                        const key = userMessage.content.toLowerCase();
                        const existing = gapCounts.get(key) || {
                            question: userMessage.content,
                            count: 0,
                            examples: [],
                        };
                        existing.count += 1;
                        if (
                            message.feedback.comments
                            && existing.examples.length < 3
                            && !existing.examples.includes(message.feedback.comments)
                        ) existing.examples.push(message.feedback.comments);
                        gapCounts.set(key, existing);
                    }
                }
            }
            if (message.generationMetadata?.isRetry) totalRegenerations += 1;
        });
    });

    const payload = {
        pId: PRODUCT_ID,
        tId,
        sId,
        date: dateKey,
        totalChats: sessions.length,
        qnaChats,
        assistantChats,
        totalMessages,
        positiveFeedback,
        negativeFeedback,
        totalFeedback: positiveFeedback + negativeFeedback,
        totalRegenerations,
        topQuestions: Array.from(questionCounts.entries())
            .map(([question, count]) => ({ question, count }))
            .sort((left, right) => right.count - left.count)
            .slice(0, 10),
        knowledgeGaps: Array.from(gapCounts.values())
            .sort((left, right) => right.count - left.count)
            .slice(0, 20),
        sourceComplete,
        sourceSessionCount: sessions.length,
        sourceLimit: SESSION_LIMIT_PER_DAY,
    };
    const sourceHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const summaryRef = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(getDayDocId(tId, sId, dateKey));
    const existing = await summaryRef.get();
    if (existing.exists && existing.get('sourceHash') === sourceHash) {
        return { written: false, partial: !sourceComplete, totalChats: sessions.length };
    }
    if (sessions.length === 0 && !existing.exists) {
        return { written: false, partial: false, totalChats: 0 };
    }
    await summaryRef.set({
        ...payload,
        sourceHash,
        createdOn: existing.exists
            ? existing.get('createdOn') || FieldValue.serverTimestamp()
            : FieldValue.serverTimestamp(),
        modifiedOn: FieldValue.serverTimestamp(),
    });
    return { written: true, partial: !sourceComplete, totalChats: sessions.length };
};

export type ChatAnalyticsBackfillResult = Readonly<{
    tId: number;
    sId: number;
    days: number;
    results: ReadonlyArray<Readonly<{
        date: string;
        chats: number;
        status: 'success' | 'skipped';
        partial: boolean;
    }>>;
}>;

export const backfillChatAnalyticsDays = async (
    tId: number,
    sId: number,
    days: number,
    now = new Date(),
): Promise<ChatAnalyticsBackfillResult> => {
    if (!isPositiveScopeId(tId) || !isPositiveScopeId(sId) || !Number.isSafeInteger(days) || days < 1 || days > 90 || !Number.isFinite(now.getTime())) {
        throw new Error('answerlattice_chat_backfill_scope_invalid');
    }
    const results: Array<{ date: string; chats: number; status: 'success' | 'skipped'; partial: boolean }> = [];
    for (let offset = 1; offset <= days; offset += 1) {
        const date = new Date(now);
        date.setUTCDate(date.getUTCDate() - offset);
        const dateKey = utcDateKey(date);
        const aggregate = await aggregateDay(tId, sId, dateKey);
        results.push({
            date: dateKey,
            chats: aggregate.totalChats,
            status: aggregate.written ? 'success' : 'skipped',
            partial: aggregate.partial,
        });
    }
    return { tId, sId, days, results };
};

export const syncChatAnalyticsNightly = async (
    tId: number,
    sId: number,
): Promise<ChatAnalyticsAggregationResult> => {
    if (!isPositiveScopeId(tId) || !isPositiveScopeId(sId)) {
        throw new Error('answerlattice_chat_analytics_scope_invalid');
    }
    const stateRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getStateDocId(tId, sId));
    const stateSnapshot = await stateRef.get();
    const state = stateSnapshot.data();
    if (
        stateSnapshot.exists
        && (
            !state
            || state.pId !== PRODUCT_ID
            || !isPositiveScopeId(state.tId)
            || !isPositiveScopeId(state.sId)
            || state.tId !== tId
            || state.sId !== sId
        )
    ) throw new Error('answerlattice_chat_analytics_state_scope_invalid');
    const cursor = toTimestamp(stateSnapshot.get('cursorModifiedOn')) || initialCursor();
    const rawCursorDocumentId = stateSnapshot.get('cursorDocumentId');
    const cursorDocumentId = rawCursorDocumentId == null
        ? ''
        : normalizeBoundedIdentifier(rawCursorDocumentId);
    if (cursorDocumentId === null) {
        throw new Error('answerlattice_chat_analytics_state_cursor_invalid');
    }
    let changedQuery = db.collection(DB_COLLECTIONS.CHAT_SESSIONS)
        .where('pId', '==', PRODUCT_ID)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .orderBy('modifiedOn', 'asc')
        .orderBy(FieldPath.documentId(), 'asc');
    if (cursorDocumentId) {
        changedQuery = changedQuery
            .where('modifiedOn', '>=', cursor)
            .startAfter(cursor, cursorDocumentId);
    } else {
        changedQuery = changedQuery.where('modifiedOn', '>', cursor);
    }
    const changedSnapshot = await changedQuery.limit(CHANGED_SESSION_LIMIT + 1).get();

    const dates = new Set<string>([yesterdayDateKey()]);
    let processedThrough = cursor;
    let processedThroughDocumentId = cursorDocumentId;
    let continuationPending = changedSnapshot.size > CHANGED_SESSION_LIMIT;
    let changedSessionsScanned = 0;
    for (const document of changedSnapshot.docs.slice(0, CHANGED_SESSION_LIMIT)) {
        const documentModifiedOn = toTimestamp(document.get('modifiedOn'));
        const session = parseSession(document.id, document.data(), tId, sId);
        if (!session) {
            if (documentModifiedOn) {
                processedThrough = documentModifiedOn;
                processedThroughDocumentId = document.id;
            }
            continue;
        }
        const dateKey = utcDateKey(session.createdOn.toDate());
        if (!dates.has(dateKey) && dates.size >= MAX_CHANGED_DATES_PER_RUN) {
            continuationPending = true;
            break;
        }
        dates.add(dateKey);
        if (documentModifiedOn) {
            processedThrough = documentModifiedOn;
            processedThroughDocumentId = document.id;
        }
        changedSessionsScanned += 1;
    }

    let summariesWritten = 0;
    let summariesSkipped = 0;
    let partialDates = 0;
    for (const dateKey of Array.from(dates)) {
        const result = await aggregateDay(tId, sId, dateKey);
        if (result.written) summariesWritten += 1;
        else summariesSkipped += 1;
        if (result.partial) partialDates += 1;
    }

    const previousContinuation = stateSnapshot.get('continuationPending') === true;
    const cursorChanged = processedThrough.toMillis() !== cursor.toMillis()
        || processedThroughDocumentId !== cursorDocumentId;
    if (!stateSnapshot.exists || cursorChanged || previousContinuation !== continuationPending) {
        const now = Timestamp.now();
        await stateRef.set({
            pId: PRODUCT_ID,
            tId,
            sId,
            cursorModifiedOn: processedThrough,
            cursorDocumentId: processedThroughDocumentId,
            continuationPending,
            lastSuccessfulAt: now,
            datesProcessed: Array.from(dates).slice(0, MAX_CHANGED_DATES_PER_RUN),
            modifiedOn: now,
            ...(stateSnapshot.exists ? {} : { createdOn: now }),
        }, { merge: true });
    }

    return {
        changedSessionsScanned,
        datesProcessed: dates.size,
        summariesWritten,
        summariesSkipped,
        partialDates,
        continuationPending,
    };
};
