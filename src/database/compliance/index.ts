/**
 * Compliance Pages — Data Access Layer (Overrides-Only Model)
 *
 * Stores ONLY custom overrides. System content is always generated
 * at render time from store data (pure template, zero drift).
 *
 * Collection: compliancePages (doc ID = storeId)
 * Doc only exists if owner has pasted custom content.
 *
 * @see __docs__/compliance-pages/compliance-pages_impl.md §2
 */

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { deleteField, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.COMPLIANCE_PAGES;

export interface ComplianceOverrideDoc {
    sId: number;
    tId: number;
    privacyOverride?: string;
    termsOverride?: string;
    refundOverride?: string;
    modifiedOn: Timestamp;
}

/**
 * Get compliance overrides for a store.
 * Returns null if no overrides exist.
 */
export async function getComplianceOverrides(sId: number): Promise<ComplianceOverrideDoc | null> {
    const docRef = doc(firebaseClient, COLLECTION, String(sId));
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as ComplianceOverrideDoc;
}

/**
 * Save a custom override for a compliance page type.
 */
export async function saveComplianceOverride(
    sId: number,
    tId: number,
    type: 'privacy' | 'terms' | 'refund',
    content: string,
): Promise<void> {
    const docRef = doc(firebaseClient, COLLECTION, String(sId));
    const now = Timestamp.now();
    const fieldMap: Record<string, string> = { privacy: 'privacyOverride', terms: 'termsOverride', refund: 'refundOverride' };
    const field = fieldMap[type];

    await setDoc(docRef, {
        sId,
        tId,
        [field]: content,
        modifiedOn: now,
    }, { merge: true });
}

/**
 * Remove a custom override (reset to system-generated).
 * Deletes the override field from the doc. If no overrides remain,
 * the doc becomes effectively empty (harmless).
 */
export async function deleteComplianceOverride(
    sId: number,
    type: 'privacy' | 'terms' | 'refund',
): Promise<void> {
    const docRef = doc(firebaseClient, COLLECTION, String(sId));
    const fieldMap: Record<string, string> = { privacy: 'privacyOverride', terms: 'termsOverride', refund: 'refundOverride' };
    const field = fieldMap[type];

    await setDoc(docRef, {
        [field]: deleteField(),
        modifiedOn: Timestamp.now(),
    }, { merge: true });
}
