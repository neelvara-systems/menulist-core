'use client';

import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    AnswerlatticeOntologyActionResultSchema,
    AnswerlatticeOntologyActionSchema,
    type AnswerlatticeOntologyAction,
    type AnswerlatticeOntologyActionResult,
} from './ontologyContracts';

const ONTOLOGY_RESPONSE_MAX_BYTES = 128 * 1024;
const MAX_PENDING_ONTOLOGY_REQUESTS = 200;
const pendingRequests = new Map<string, { fingerprint: string; requestId: string }>();

type OntologyActionWithoutRequestId = AnswerlatticeOntologyAction extends infer Action
    ? Action extends AnswerlatticeOntologyAction
        ? Omit<Action, 'requestId'>
        : never
    : never;

const getRequestId = (retryKey: string, fingerprint: string) => {
    const pending = pendingRequests.get(retryKey);
    if (pending?.fingerprint === fingerprint) return pending.requestId;
    if (pendingRequests.size >= MAX_PENDING_ONTOLOGY_REQUESTS) {
        const oldest = pendingRequests.keys().next().value;
        if (oldest) pendingRequests.delete(oldest);
    }
    const requestId = createRuntimeId('ontology');
    pendingRequests.set(retryKey, { fingerprint, requestId });
    return requestId;
};

export const runAnswerlatticeOntologyAction = async (
    action: OntologyActionWithoutRequestId,
    retryKey: string,
): Promise<AnswerlatticeOntologyActionResult> => {
    const fingerprint = JSON.stringify(action);
    const requestId = getRequestId(retryKey, fingerprint);
    const parsedAction = AnswerlatticeOntologyActionSchema.safeParse({ ...action, requestId });
    if (!parsedAction.success) throw new Error('Invalid product-structure action');
    const response = await fetch('/api/answerlattice/ontology', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedAction.data),
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, ONTOLOGY_RESPONSE_MAX_BYTES).catch(() => null);
    if (!response.ok) throw new Error('Product-structure action failed');
    const parsed = AnswerlatticeOntologyActionResultSchema.safeParse(payload);
    if (!parsed.success) throw new Error('Product-structure action returned an invalid response');
    pendingRequests.delete(retryKey);
    return parsed.data;
};
