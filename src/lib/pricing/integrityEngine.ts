/**
 * Pricing Integrity Engine
 * ═══════════════════════════════════════════════════════════════
 *
 * Core orchestrator for price changes across surfaces.
 * Part of Pricing Integrity System (Feature #1).
 *
 * Responsibilities:
 * 1. Update price in projectsData
 * 2. Update integrity state in projectsMetadata
 * 3. Log change to MOL (audit trail)
 * 4. Mark PDF as stale / trigger regeneration queue
 * 5. Bump screen version for cache invalidation
 *
 * NOTE: Web/QR and Staff Prompt already work via live Firestore reads.
 * This engine handles PDF staleness and Screen version bumping.
 */

import { replaceUndefined } from "@lib/apiHelper";
import { firebaseClient as db } from "@lib/firebase/firebaseClient";
import type { PricingIntegrityState } from "@template/main-app/projects/types/project.types";
import {
    Timestamp,
    doc,
    getDoc,
    runTransaction,
    updateDoc,
} from "firebase/firestore";
import { logPriceChange } from "./molLogger";
import { enqueuePDFRegen, isBackgroundPDFRegenEnabled } from "./pdfQueue";
import {
    getBoundedPricingStringContext,
    logPricingDiagnostic,
    logPricingFailure,
} from "./pricingDiagnostics";

/**
 * Parameters for running pricing integrity
 */
export interface IntegrityParams {
    projectId: string;
    itemId: string;
    attributeId?: string;
    newPrice?: string | null;
    actorUserId: string;
    tId: number;
    sId: number;
    changeType: "PRICE_CHANGED" | "ATTRIBUTE_PRICE_CHANGED" | "TIME_SLOT_CHANGED";
}

/**
 * Default integrity state for new projects
 */
export function getDefaultIntegrityState(): PricingIntegrityState {
    return {
        lastPriceChangeOn: null,
        lastPriceChangeBy: null,
        pdf: {
            status: "FRESH",
            lastGeneratedOn: null,
            lastGenerationJobId: null,
            lastFailureReason: null,
            version: 0,
            url: null,
        },
        screens: {
            lastBustedOn: null,
            version: 0,
        },
    };
}

/**
 * Run pricing integrity after a price change
 *
 * This function:
 * 1. Updates the price in projectsData
 * 2. Marks PDF as STALE
 * 3. Bumps screen version
 * 4. Logs the change to MOL
 * 5. Queues PDF regeneration (if feature flag enabled)
 *
 * @param params - Integrity parameters
 */
export async function runPricingIntegrity(
    params: IntegrityParams,
): Promise<void> {
    const {
        projectId,
        itemId,
        attributeId,
        newPrice,
        actorUserId,
        tId,
        sId,
        changeType,
    } = params;

    const metadataPath = `projectsMetadata/${tId}/${sId}`;
    const dataPath = `projectsData/${tId}/${sId}`;

    const metadataRef = doc(db, metadataPath, projectId);
    const dataRef = doc(db, dataPath, projectId);

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Get current state
            const metadataDoc = await transaction.get(metadataRef);
            const dataDoc = await transaction.get(dataRef);

            if (!metadataDoc.exists() || !dataDoc.exists()) {
                throw new Error("Project not found");
            }

            const metadata = metadataDoc.data();
            const data = dataDoc.data();
            const currentIntegrity: PricingIntegrityState =
                metadata?.pricingIntegrity || getDefaultIntegrityState();

            // 2. Get old price for audit
            const items = data?.extractedData?.data?.items || [];
            const item = items.find((i: any) => i.id === itemId);

            if (!item) {
                throw new Error(`Item ${itemId} not found`);
            }

            const oldPrice = attributeId
                ? item.attributes?.find((a: any) => a.id === attributeId)?.price
                : item.price;

            // 3. Update price in projectsData
            const itemIndex = items.findIndex((i: any) => i.id === itemId);

            if (attributeId) {
                // Update attribute price
                const attrIndex = item.attributes?.findIndex(
                    (a: any) => a.id === attributeId,
                );
                if (attrIndex === undefined || attrIndex === -1) {
                    throw new Error(`Attribute ${attributeId} not found`);
                }
                transaction.update(dataRef, {
                    [`extractedData.data.items.${itemIndex}.attributes.${attrIndex}.price`]:
                        newPrice,
                });
            } else {
                // Update item price
                transaction.update(dataRef, {
                    [`extractedData.data.items.${itemIndex}.price`]: newPrice,
                });
            }

            // 4. Update integrity state
            const newVersion = currentIntegrity.pdf.version + 1;
            const updatedIntegrity: PricingIntegrityState = replaceUndefined({
                lastPriceChangeOn: Timestamp.now(),
                lastPriceChangeBy: actorUserId,
                pdf: {
                    ...currentIntegrity.pdf,
                    status: "STALE",
                    version: newVersion,
                },
                screens: {
                    lastBustedOn: Timestamp.now(),
                    version: currentIntegrity.screens.version + 1,
                },
            });

            transaction.update(metadataRef, {
                pricingIntegrity: updatedIntegrity,
                modifiedOn: Timestamp.now(),
                modifiedBy: actorUserId,
            });

            // 5. Log MOL event (fire-and-forget, outside transaction)
            logPriceChange({
                projectId,
                itemId,
                attributeId,
                oldPrice,
                newPrice,
                actorUserId,
                version: newVersion,
                tId,
                sId,
            });

            // 6. Enqueue PDF regeneration if feature flag enabled
            if (isBackgroundPDFRegenEnabled()) {
                enqueuePDFRegen({
                    projectId,
                    tId,
                    sId,
                    requestedBy: actorUserId,
                    targetVersion: newVersion,
                });
            }
        });

        logPricingDiagnostic("pricing_integrity_price_update_succeeded", {
            changeType,
            attributePriceChange: Boolean(attributeId),
            ...getBoundedPricingStringContext("projectId", projectId),
            ...getBoundedPricingStringContext("itemId", itemId),
            ...getBoundedPricingStringContext("attributeId", attributeId),
            ...getBoundedPricingStringContext("userId", actorUserId),
            ...getBoundedPricingStringContext("tenantId", tId),
            ...getBoundedPricingStringContext("storeId", sId),
        });
    } catch (error) {
        logPricingFailure("pricing_integrity_price_update_failed", error, {
            changeType,
            attributePriceChange: Boolean(attributeId),
            ...getBoundedPricingStringContext("projectId", projectId),
            ...getBoundedPricingStringContext("itemId", itemId),
            ...getBoundedPricingStringContext("attributeId", attributeId),
            ...getBoundedPricingStringContext("userId", actorUserId),
            ...getBoundedPricingStringContext("tenantId", tId),
            ...getBoundedPricingStringContext("storeId", sId),
        });
        throw error;
    }
}

/**
 * Mark PDF as fresh after successful generation
 */
export async function markPDFFresh(params: {
    projectId: string;
    tId: number;
    sId: number;
    url: string;
    version: number;
}): Promise<void> {
    const { projectId, tId, sId, url, version } = params;
    const metadataPath = `projectsMetadata/${tId}/${sId}`;
    const metadataRef = doc(db, metadataPath, projectId);

    await updateDoc(
        metadataRef,
        replaceUndefined({
            "pricingIntegrity.pdf.status": "FRESH",
            "pricingIntegrity.pdf.lastGeneratedOn": Timestamp.now(),
            "pricingIntegrity.pdf.url": url,
            "pricingIntegrity.pdf.lastFailureReason": null,
        }),
    );

    logPricingDiagnostic("pricing_integrity_pdf_marked_fresh", {
        version,
        ...getBoundedPricingStringContext("projectId", projectId),
        ...getBoundedPricingStringContext("tenantId", tId),
        ...getBoundedPricingStringContext("storeId", sId),
    });
}

/**
 * Mark PDF as failed after generation failure
 */
export async function markPDFFailed(params: {
    projectId: string;
    tId: number;
    sId: number;
    error: string;
}): Promise<void> {
    const { projectId, tId, sId, error } = params;
    const metadataPath = `projectsMetadata/${tId}/${sId}`;
    const metadataRef = doc(db, metadataPath, projectId);

    await updateDoc(
        metadataRef,
        replaceUndefined({
            "pricingIntegrity.pdf.status": "FAILED",
            "pricingIntegrity.pdf.lastFailureReason": error,
        }),
    );

    logPricingDiagnostic("pricing_integrity_pdf_marked_failed", {
        ...getBoundedPricingStringContext("projectId", projectId),
        ...getBoundedPricingStringContext("tenantId", tId),
        ...getBoundedPricingStringContext("storeId", sId),
        ...getBoundedPricingStringContext("failureReason", error),
    });
}

/**
 * Get current integrity state for a project
 */
export async function getIntegrityState(params: {
    projectId: string;
    tId: number;
    sId: number;
}): Promise<PricingIntegrityState | null> {
    const { projectId, tId, sId } = params;
    const metadataPath = `projectsMetadata/${tId}/${sId}`;
    const metadataRef = doc(db, metadataPath, projectId);

    const docSnap = await getDoc(metadataRef);
    if (!docSnap.exists()) {
        return null;
    }

    return docSnap.data()?.pricingIntegrity || getDefaultIntegrityState();
}
