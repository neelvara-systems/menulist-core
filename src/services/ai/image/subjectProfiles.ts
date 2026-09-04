import type {
    ImageSubjectProfileConsentInput,
    ImageSubjectProfileSummary,
} from '@type/imageSubjectProfile';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const IMAGE_SUBJECT_PROFILE_RESPONSE_MAX_BYTES = 256 * 1024;

async function readJson(response: Response) {
    const parsedBody = await readJsonResponseWithLimit<unknown>(response, IMAGE_SUBJECT_PROFILE_RESPONSE_MAX_BYTES).catch(() => ({}));
    const body = parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)
        ? parsedBody as Record<string, unknown>
        : {};
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Saved person request failed.');
    return body;
}

export async function renameImageSubjectProfile(input: {
    expectedVersion: number;
    label: string;
    profileId: string;
}): Promise<ImageSubjectProfileSummary> {
    const response = await fetch('/api/image-subject-profiles', {
        body: JSON.stringify({ action: 'rename', ...input }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
    });
    return (await readJson(response)).profile as ImageSubjectProfileSummary;
}

export async function replaceImageSubjectProfileReferences(input: {
    consent: ImageSubjectProfileConsentInput;
    expectedVersion: number;
    label: string;
    profileId: string;
    references: Array<{ dataUrl: string; name?: string }>;
}): Promise<ImageSubjectProfileSummary> {
    const response = await fetch('/api/image-subject-profiles', {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
    });
    return (await readJson(response)).profile as ImageSubjectProfileSummary;
}

export async function listImageSubjectProfiles(includeWithdrawn = false): Promise<ImageSubjectProfileSummary[]> {
    const query = includeWithdrawn ? '?includeWithdrawn=true' : '';
    const response = await fetch(`/api/image-subject-profiles${query}`, { cache: 'no-store' });
    const body = await readJson(response);
    return Array.isArray(body.profiles) ? body.profiles as ImageSubjectProfileSummary[] : [];
}

export async function createImageSubjectProfile(input: {
    consent: ImageSubjectProfileConsentInput;
    label: string;
    references: Array<{ dataUrl: string; name?: string }>;
}): Promise<ImageSubjectProfileSummary> {
    const response = await fetch('/api/image-subject-profiles', {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    return (await readJson(response)).profile as ImageSubjectProfileSummary;
}

export async function withdrawImageSubjectProfile(profileId: string): Promise<ImageSubjectProfileSummary> {
    const response = await fetch('/api/image-subject-profiles', {
        body: JSON.stringify({ action: 'withdraw', profileId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
    });
    return (await readJson(response)).profile as ImageSubjectProfileSummary;
}

export async function deleteImageSubjectProfile(profileId: string): Promise<void> {
    const response = await fetch('/api/image-subject-profiles', {
        body: JSON.stringify({ profileId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
    });
    await readJson(response);
}
