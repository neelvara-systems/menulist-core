import { createHash } from 'crypto';
import type { AnswerlatticeAnswerTestMode } from '@lib/answerlattice/answerTestContracts';

type AnswerlatticeAnswerTestRunIdentity = {
    kind: 'answer_test' | 'release_check';
    mode: AnswerlatticeAnswerTestMode;
    suiteRevision: number;
    caseIds: string[];
    releaseId?: string;
};

const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
        .join(',')}}`;
};

export const getAnswerlatticeAnswerTestRunRequestFingerprint = (
    identity: AnswerlatticeAnswerTestRunIdentity,
): string => createHash('sha256').update(stableStringify({
    caseIds: identity.caseIds,
    kind: identity.kind,
    mode: identity.mode,
    releaseId: identity.releaseId || null,
    suiteRevision: identity.suiteRevision,
})).digest('hex');

