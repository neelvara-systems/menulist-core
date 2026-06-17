import { Timestamp } from 'firebase-admin/firestore';
import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from '@constant/AI/unitCosts';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import type { OwnerBusinessAssistantAnswerRequest } from '../schemas';
import type { OwnerBusinessAssistantAnswer } from '../types';
import { classifyOwnerBusinessAssistantIntent } from './intentClassifier';

const ANSWER_EVENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

const trimForStorage = (value: string | undefined, maxLength: number) => {
  const normalized = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
};

export async function logOwnerBusinessAssistantAnswerEvent(params: {
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  request: OwnerBusinessAssistantAnswerRequest;
  answer: OwnerBusinessAssistantAnswer;
}) {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING) return;

  const action = AI_ACTIONS_TYPES.OWNER_BUSINESS_ASSISTANT_ANSWER;
  const providerUsed = Boolean((params.answer as { providerUsed?: boolean }).providerUsed);
  const unitsConsumed = providerUsed ? getUnitCost(action) : 0;
  const now = Timestamp.now();

  await firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS).doc(params.answer.answerId).set({
    id: params.answer.answerId,
    answerId: params.answer.answerId,
    threadId: params.answer.threadId || params.request.threadId || null,
    tId: String(params.tId),
    sId: String(params.sId),
    userId: params.userId ? String(params.userId) : null,
    projectId: params.request.projectId || params.request.clientContext?.selectedProjectId || null,
    suggestedQuestionId: params.request.suggestedQuestionId || null,
    intent: classifyOwnerBusinessAssistantIntent(params.request.question),
    question: trimForStorage(params.request.question, 800),
    answerText: trimForStorage(params.answer.text, 1600),
    status: params.answer.status,
    confidence: params.answer.confidence,
    freshnessLabel: params.answer.freshnessLabel,
    cacheSource: params.answer.cache?.source || null,
    cacheKey: params.answer.cache?.cacheKey || null,
    packetProfile: params.answer.metrics?.packetProfile || null,
    packetAgeMinutes: params.answer.metrics?.packetAgeMinutes ?? null,
    packetValidUntil: params.answer.metrics?.packetValidUntil || null,
    route: params.answer.metrics?.route || '/api/owner-business-assistant/answer',
    firestoreReadCount: params.answer.metrics?.firestoreReadCount ?? null,
    firestoreWriteCount: params.answer.metrics?.firestoreWriteCount ?? null,
    answerEventWritten: true,
    threadWritten: params.answer.metrics?.threadWritten === true,
    unsupportedReason: trimForStorage(params.answer.metrics?.unsupportedReason, 300) || null,
    domainCoverage: (params.answer.metrics?.domainCoverage || []).slice(0, 20),
    sourceFactCount: params.answer.sourceFactIds.length,
    sourceFactIds: params.answer.sourceFactIds.slice(0, 20),
    artifactCount: params.answer.artifacts?.length || 0,
    followUpQuestionCount: params.answer.suggestedQuestions?.length || 0,
    followUpQuestionIds: (params.answer.suggestedQuestions || []).map((question) => question.id).slice(0, 3),
    providerUsed,
    aiAction: action,
    unitsConsumed,
    realCostPaise: providerUsed ? getRealCostPaise(action) : 0,
    ownerChargePaise: providerUsed ? getOurChargePaise(action) : 0,
    billingMode: unitsConsumed > 0 ? 'billable' : 'free',
    createdAt: now,
    expiresAt: Timestamp.fromMillis(Date.now() + ANSWER_EVENT_RETENTION_MS),
    source: 'owner_business_assistant',
  }, { merge: true });
}
