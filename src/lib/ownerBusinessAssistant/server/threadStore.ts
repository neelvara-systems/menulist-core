import { Timestamp } from 'firebase-admin/firestore';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import type { OwnerBusinessAssistantAnswer } from '../types';
import type { OwnerBusinessAssistantAnswerRequest } from '../schemas';

const THREAD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES_PER_THREAD = 20;

const trimForStorage = (value: string, maxLength: number) => (
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
);

type StoredOwnerBusinessAssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedQuestionId?: string | null;
  projectId?: string | null;
  answerId?: string;
  answerStatus?: string;
  sourceFactIds?: string[];
  createdAt: Timestamp;
};

const trimThreadMessages = (
  messages: StoredOwnerBusinessAssistantMessage[],
): StoredOwnerBusinessAssistantMessage[] => {
  if (messages.length <= MAX_MESSAGES_PER_THREAD) return messages;
  const firstExchange = messages.slice(0, 2);
  const recent = messages.slice(-(MAX_MESSAGES_PER_THREAD - firstExchange.length));
  return [...firstExchange, ...recent];
};

export async function persistOwnerBusinessAssistantExchange(params: {
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  request: OwnerBusinessAssistantAnswerRequest;
  answer: OwnerBusinessAssistantAnswer;
}): Promise<string | undefined> {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS || !params.request.threadId) {
    return undefined;
  }

  const threadId = params.request.threadId;
  const tId = String(params.tId);
  const sId = String(params.sId);
  const userId = params.userId ? String(params.userId) : null;
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + THREAD_RETENTION_MS);
  const threadRef = firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_THREADS).doc(threadId);

  let persistedThreadId: string | undefined;

  await firestoreAdmin.runTransaction(async (transaction) => {
    const threadSnap = await transaction.get(threadRef);
    const existing = threadSnap.exists ? threadSnap.data() : null;

    if (existing && (String(existing.tId) !== tId || String(existing.sId) !== sId)) {
      return;
    }

    const existingMessages = Array.isArray(existing?.messages)
      ? existing.messages.filter((message: any) => message && typeof message === 'object')
      : [];
    const nextMessages = trimThreadMessages([
      ...existingMessages,
      {
        id: `${threadId}_${now.toMillis()}_${params.answer.answerId.slice(0, 8)}_user`,
        role: 'user',
        content: trimForStorage(params.request.question, 800),
        suggestedQuestionId: params.request.suggestedQuestionId || null,
        projectId: params.request.projectId || null,
        createdAt: now,
      },
      {
        id: `${threadId}_${now.toMillis()}_${params.answer.answerId.slice(0, 8)}_assistant`,
        role: 'assistant',
        content: trimForStorage(params.answer.text, 1600),
        answerId: params.answer.answerId,
        answerStatus: params.answer.status,
        sourceFactIds: params.answer.sourceFactIds.slice(0, 20),
        createdAt: Timestamp.fromMillis(now.toMillis() + 1),
      },
    ] as StoredOwnerBusinessAssistantMessage[]);

    transaction.set(threadRef, {
      tId,
      sId,
      userId,
      status: 'active',
      messages: nextMessages,
      messageCount: nextMessages.length,
      firstQuestion: existing?.firstQuestion || trimForStorage(params.request.question, 240),
      lastAnswerStatus: params.answer.status,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
      expiresAt,
    }, { merge: true });

    persistedThreadId = threadId;
  });

  return persistedThreadId;
}
