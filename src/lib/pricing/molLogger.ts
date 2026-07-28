/**
 * MOL Logger - Immutable Audit Logging
 * ═══════════════════════════════════════════════════════════════
 *
 * Appends immutable events to Menu Observation Layer.
 * Part of Pricing Integrity System (Feature #1).
 *
 * Collection: menuChangeLog/{tId}/{sId}/{eventId}
 *
 * IMPORTANT: MOL logging should NEVER block operations.
 * Failures are logged but do not interrupt the main flow.
 */

import { DB_COLLECTIONS } from "@constant/database";
import { normalizeMenuChangeLogScope } from "@database/menuChangeLog/menuChangeLogBoundary";
import { replaceUndefined } from "@lib/apiHelper";
import { firebaseClient as db } from "@lib/firebase/firebaseClient";
import type { LogMOLParams } from "@type/mol.types";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
    getBoundedPricingStringContext,
    logPricingDiagnostic,
    logPricingFailure,
} from "./pricingDiagnostics";

/**
 * Log a MOL event (fire-and-forget, non-blocking)
 *
 * @param params - Event parameters
 * @returns Promise that resolves when logged (or silently fails)
 */
export async function logMOLEvent(params: LogMOLParams): Promise<void> {
    const { tId, sId, ...eventData } = params;

    try {
        const scope = normalizeMenuChangeLogScope({ tId, sId });
        if (!scope) throw new TypeError("Invalid MOL tenant/store scope");

        // Build collection path with tenant isolation
        const molCollectionRef = collection(
            db,
            DB_COLLECTIONS.MENU_CHANGE_LOG,
            String(scope.tId),
            String(scope.sId),
        );

        // Generate new document reference
        const eventRef = doc(molCollectionRef);

        // Build event object
        const event = replaceUndefined({
            id: eventRef.id,
            ...eventData,
            // Firestore rules bind the resolved legacy event time to
            // request.time. A browser clock is not ledger authority.
            createdOn: serverTimestamp(),
            tId: scope.tId,
            sId: scope.sId,
        });

        // Write to Firestore
        await setDoc(eventRef, event);

        logPricingDiagnostic("pricing_mol_event_logged", {
            eventType: params.type,
            entityType: params.entityType,
            ...getBoundedPricingStringContext("projectId", params.projectId),
        });
    } catch (error) {
        // MOL logging should NEVER block operations
        // Log the error but don't throw
        logPricingFailure("pricing_mol_event_log_failed", error, {
            eventType: params.type,
            entityType: params.entityType,
            ...getBoundedPricingStringContext("projectId", params.projectId),
        });
    }
}

/**
 * Log a price change event
 */
export function logPriceChange(params: {
    projectId: string;
    itemId: string;
    attributeId?: string;
    oldPrice: string | null | undefined;
    newPrice: string | null | undefined;
    actorUserId: string;
    version: number;
    tId: number;
    sId: number;
}): Promise<void> {
    return logMOLEvent({
        type: params.attributeId ? "ATTRIBUTE_PRICE_CHANGED" : "PRICE_CHANGED",
        projectId: params.projectId,
        actorUserId: params.actorUserId,
        entityType: params.attributeId ? "ATTRIBUTE" : "ITEM",
        entityId: params.attributeId || params.itemId,
        before: { price: params.oldPrice ?? null },
        after: { price: params.newPrice ?? null },
        version: params.version,
        tId: params.tId,
        sId: params.sId,
    });
}

/**
 * Log a PDF generation event
 */
export function logPDFEvent(params: {
    type:
    | "PDF_REGEN_QUEUED"
    | "PDF_REGEN_SUCCESS"
    | "PDF_REGEN_FAILED"
    | "PDF_GENERATED_ON_DEMAND";
    projectId: string;
    actorUserId: string;
    version: number;
    tId: number;
    sId: number;
    url?: string;
    error?: string;
}): Promise<void> {
    return logMOLEvent({
        type: params.type,
        projectId: params.projectId,
        actorUserId: params.actorUserId,
        entityType: "SYSTEM",
        entityId: params.projectId,
        before: null,
        after: params.url
            ? { url: params.url, version: params.version }
            : params.error
                ? { error: params.error, version: params.version }
                : { version: params.version },
        version: params.version,
        tId: params.tId,
        sId: params.sId,
    });
}
