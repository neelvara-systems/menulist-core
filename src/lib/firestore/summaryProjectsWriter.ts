/**
 * Canonical write helpers for `platformSummary/projects_{storeId}`.
 *
 * T3-N-03: today five files independently use
 *   `setDoc(ref, { [`projects.${id}`]: val }, { merge: true })`
 * which writes FLAT dot-notation keys at the document root instead of a
 * nested `projects.{id}` subfield. Readers tolerate both shapes thanks to
 * `parseSummaryProjects()` — but the duplicated pattern makes it easy for
 * a future writer to introduce a THIRD shape.
 *
 * This module centralizes the write shape so there is exactly one place
 * to change when the flat→nested migration ships. Until migration, these
 * helpers preserve the current flat-dotted format — the point is not to
 * switch formats, it is to stop open-coding the Firestore merge path in
 * five places.
 *
 * Callers that migrate to these helpers automatically get the nested
 * shape for free when we flip the `WRITE_NESTED` flag (post-migration).
 *
 * @see src/lib/firestore/parseSummaryProjects.ts — companion reader
 * @see __docs__/client-menu/public-routing-doctrine.md §18 T3-N-03
 */

import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { isSafeSummaryMapSegment } from './summaryMapParser';

/**
 * Current storage shape for summary-projects writes.
 *
 * FLAT: `{ "projects.${projectId}": {...}, "projects.${projectId}.field": ... }`
 * NESTED: `{ projects: { [projectId]: {...} } }` — post-migration target.
 *
 * Keep as a compile-time constant for now. Flipping requires a migration
 * that rewrites existing docs from flat→nested; changing this flag ahead
 * of that migration produces duplicate keys for the same data.
 */
const WRITE_NESTED = false as const;
function assertSafeSummaryProjectId(projectId: string): void {
    if (
        !projectId
        || projectId !== projectId.trim()
        || projectId.includes('.')
        || !isSafeSummaryMapSegment(projectId)
        || !isValidFirestoreDocumentId(projectId)
    ) {
        throw new Error('[summaryProjectsWriter] invalid projectId');
    }
}

function assertSafeSummaryFieldPath(fieldPath: string): void {
    const segments = fieldPath.split('.');
    if (
        segments.length === 0
        || segments.some((segment) => (
            !segment
            || segment !== segment.trim()
            || !isSafeSummaryMapSegment(segment)
        ))
    ) {
        throw new Error('[summaryProjectsWriter] invalid fieldPath');
    }
}

/**
 * Build a Firestore update payload that writes (or merges) a single
 * project entry into the summary document. Intended as the argument to
 * `setDoc(ref, payload, { merge: true })` or `.update(payload)`.
 *
 * Pass the full project object when replacing; use
 * {@link buildSummaryProjectFieldPayload} for single-field updates.
 */
export function buildSummaryProjectPayload(
    projectId: string,
    projectData: object,
): Record<string, unknown> {
    assertSafeSummaryProjectId(projectId);
    if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
        throw new Error('[summaryProjectsWriter] projectData must be an object');
    }

    if (WRITE_NESTED) {
        return { projects: { [projectId]: projectData } };
    }
    return { [`projects.${projectId}`]: projectData };
}

/**
 * Build a Firestore update payload that deletes a full project entry from the
 * summary document. The caller supplies the Firestore delete sentinel so this
 * helper stays SDK-agnostic and can be tested without importing Firestore.
 */
export function buildSummaryProjectDeletePayload(
    projectId: string,
    deleteValue: unknown,
): Record<string, unknown> {
    assertSafeSummaryProjectId(projectId);

    if (WRITE_NESTED) {
        return { projects: { [projectId]: deleteValue } };
    }
    return { [`projects.${projectId}`]: deleteValue };
}

/**
 * Build a field-level update payload (e.g. flipping a single flag without
 * replacing the whole project object).
 *
 * @example
 *   buildSummaryProjectFieldPayload('abc', 'specialMenuStatus', 'active')
 *   // FLAT:  { "projects.abc.specialMenuStatus": "active" }
 *   // NESTED: { projects: { abc: { specialMenuStatus: "active" } } }
 */
export function buildSummaryProjectFieldPayload(
    projectId: string,
    fieldPath: string,
    value: unknown,
): Record<string, unknown> {
    assertSafeSummaryProjectId(projectId);
    assertSafeSummaryFieldPath(fieldPath);

    if (WRITE_NESTED) {
        // Build a nested object path segment-by-segment.
        const segments = fieldPath.split('.');
        const innerDoc: Record<string, unknown> = {};
        let cursor = innerDoc;
        for (let i = 0; i < segments.length - 1; i++) {
            const next: Record<string, unknown> = {};
            cursor[segments[i]] = next;
            cursor = next;
        }
        cursor[segments[segments.length - 1]] = value;
        return { projects: { [projectId]: innerDoc } };
    }
    return { [`projects.${projectId}.${fieldPath}`]: value };
}

/**
 * Batch multiple full-project writes into one merge payload.
 * Useful when writing several projects in a single round trip.
 */
export function buildSummaryProjectsBatchPayload(
    projects: Record<string, object>,
): Record<string, unknown> {
    if (!projects || typeof projects !== 'object' || Array.isArray(projects)) {
        throw new Error('[summaryProjectsWriter] projects must be an object');
    }

    if (WRITE_NESTED) {
        return { projects: { ...projects } };
    }

    const payload: Record<string, unknown> = {};
    for (const [projectId, data] of Object.entries(projects)) {
        if (!projectId || !data || typeof data !== 'object' || Array.isArray(data)) continue;
        assertSafeSummaryProjectId(projectId);
        payload[`projects.${projectId}`] = data;
    }
    return payload;
}
