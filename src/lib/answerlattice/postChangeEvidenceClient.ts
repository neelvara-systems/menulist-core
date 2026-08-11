import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    ANSWERLATTICE_POST_CHANGE_REQUEST_TIMEOUT_MS,
    ANSWERLATTICE_POST_CHANGE_RESPONSE_MAX_BYTES,
    AnswerlatticePostChangeCandidateListResponseSchema,
    AnswerlatticePostChangeReviewResponseSchema,
    type AnswerlatticePostChangeCandidateListResponse,
    type AnswerlatticePostChangeReviewResponse,
    type AnswerlatticePostChangeType,
} from './postChangeEvidence';

const POST_CHANGE_EVIDENCE_ENDPOINT = '/api/answerlattice/post-change-evidence';
const POST_CHANGE_EVIDENCE_FAILED = 'Could not load support evidence for this change.';

const fetchPostChangeEvidence = async (searchParams: URLSearchParams): Promise<unknown> => {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
        () => controller.abort(),
        ANSWERLATTICE_POST_CHANGE_REQUEST_TIMEOUT_MS,
    );
    try {
        const response = await fetch(`${POST_CHANGE_EVIDENCE_ENDPOINT}?${searchParams.toString()}`, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'same-origin',
            redirect: 'manual',
            signal: controller.signal,
        });
        const payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_POST_CHANGE_RESPONSE_MAX_BYTES,
        );
        if (!response.ok) throw new Error(POST_CHANGE_EVIDENCE_FAILED);
        return payload;
    } catch {
        throw new Error(POST_CHANGE_EVIDENCE_FAILED);
    } finally {
        globalThis.clearTimeout(timeout);
    }
};

export async function listAnswerlatticePostChangeCandidates(): Promise<AnswerlatticePostChangeCandidateListResponse> {
    const payload = await fetchPostChangeEvidence(new URLSearchParams({ mode: 'list' }));
    const parsed = AnswerlatticePostChangeCandidateListResponseSchema.safeParse(payload);
    if (!parsed.success) throw new Error(POST_CHANGE_EVIDENCE_FAILED);
    return parsed.data;
}

export async function reviewAnswerlatticePostChangeEvidence(
    changeType: AnswerlatticePostChangeType,
    changeId: string,
): Promise<AnswerlatticePostChangeReviewResponse> {
    const payload = await fetchPostChangeEvidence(new URLSearchParams({
        mode: 'review',
        changeType,
        changeId,
    }));
    const parsed = AnswerlatticePostChangeReviewResponseSchema.safeParse(payload);
    if (!parsed.success
        || parsed.data.change.changeType !== changeType
        || parsed.data.change.changeId !== changeId) {
        throw new Error(POST_CHANGE_EVIDENCE_FAILED);
    }
    return parsed.data;
}
