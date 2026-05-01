/**
 * Operational Infrastructure Functions
 * ═══════════════════════════════════════════════════════════════
 * 
 * Admin tools, health monitoring, budget alerts, and incident response.
 * These are callable/HTTP functions available in all environments.
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_OPTIONS } from '../config/secrets';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { updateStoreHealth, verifyPublish } from '../monitoring/publishVerification';
import { activateSafeMode } from '../monitoring/safeMode';
import { sendTelegramAlert } from '../monitoring/telegramAlert';

// ═══════════════════════════════════════════════════════════════
// MENU HEALTH MONITOR
// @see __docs__/menu-health-monitor/menu-health-monitor_impl.md
// ═══════════════════════════════════════════════════════════════

/**
 * Callable function to verify a published menu is accessible.
 * Called from the frontend after publish completes.
 */
export const verifyMenuPublish = onCall(
    FUNCTION_OPTIONS.callableLight,
    async (request) => {
        const logger = functions.logger;
        const { storeId, tenantId, publicMenuUrl } = request.data;

        if (!storeId || !tenantId || !publicMenuUrl) {
            throw new HttpsError('invalid-argument', 'Missing required fields: storeId, tenantId, publicMenuUrl');
        }

        logger.info('[verifyMenuPublish] Verifying', { storeId, publicMenuUrl });

        try {
            const result = await verifyPublish(publicMenuUrl);
            await updateStoreHealth(storeId, tenantId, result);

            // Lifecycle message: Store Published (fire-and-forget)
            if (result.status === 'OK') {
                try {
                    const { sendLifecycleMessage } = await import('../messaging/messagingEngine');
                    sendLifecycleMessage({
                        storeId, tenantId,
                        eventType: 'STORE_PUBLISHED',
                        referenceId: `store-published-${storeId}`,
                        metadata: { publicUrl: publicMenuUrl, dashboardUrl: 'https://menulist.ai' },
                    }).catch(() => { /* non-blocking */ });
                } catch { /* non-blocking */ }
            }

            return {
                status: result.status,
                checks: result.checks,
                responseTimeMs: result.responseTimeMs,
                failureReason: result.failureReason,
            };
        } catch (error: any) {
            logger.error('[verifyMenuPublish] Failed', { storeId, error: error.message });
            throw new HttpsError('internal', 'Verification failed: ' + error.message);
        }
    },
);

// ═══════════════════════════════════════════════════════════════
// GCP BUDGET ALERT WEBHOOK
// @see __docs__/cost-self-protection/cost-self-protection_impl.md
// ═══════════════════════════════════════════════════════════════

/**
 * HTTP endpoint for GCP Budget Alert notifications.
 * Google Cloud Budget → Pub/Sub → this function.
 * Auto-activates SAFE_MODE when budget threshold exceeded.
 */
export const gcpBudgetAlertWebhook = onRequest(
    { region: 'us-central1', timeoutSeconds: 10, memory: '128MiB' as const },
    async (req, res) => {
        const logger = functions.logger;

        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }

        try {
            const pubsubMessage = req.body?.message?.data;
            let budgetData: any = {};

            if (pubsubMessage) {
                const decoded = Buffer.from(pubsubMessage, 'base64').toString('utf-8');
                budgetData = JSON.parse(decoded);
            }

            const costAmount = budgetData.costAmount || 0;
            const budgetAmount = budgetData.budgetAmount || 0;
            const threshold = budgetData.alertThresholdExceeded || 0;

            logger.warn('[BudgetAlert] Received', { costAmount, budgetAmount, threshold });

            await activateSafeMode(
                `GCP budget alert: ₹${costAmount} spent (threshold: ${threshold * 100}% of ₹${budgetAmount})`,
                'budget_alert',
            );

            await sendTelegramAlert({
                severity: 'critical',
                title: 'GCP Budget Alert — SAFE_MODE Auto-Activated',
                message: `Cost: ₹${costAmount} | Budget: ₹${budgetAmount} | Threshold: ${threshold * 100}%\n\nSAFE_MODE has been automatically activated. AI generation, bulk operations, and expensive queries are blocked.\n\nTo deactivate: /ops dashboard → Deactivate SAFE_MODE`,
                metadata: { costAmount, budgetAmount, threshold },
            });

            res.status(200).json({ received: true, safeModeActivated: true });
        } catch (error: any) {
            logger.error('[BudgetAlert] Error processing webhook:', error);
            res.status(200).json({ received: true, error: error.message });
        }
    },
);

// ═══════════════════════════════════════════════════════════════
// FORCE REPUBLISH — Admin Incident Response Tool
// @see __docs__/incident-response/README.md
// ═══════════════════════════════════════════════════════════════

/**
 * Callable function to force republish a store's active project.
 * Superadmin only. Used during incident recovery.
 */
export const forceRepublish = onCall(
    { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB' as const },
    async (request) => {
        const logger = functions.logger;
        const { storeId, tenantId } = request.data;

        if (!storeId || !tenantId) {
            throw new HttpsError('invalid-argument', 'Missing required fields: storeId, tenantId');
        }

        logger.warn('[forceRepublish] Admin force republish', { storeId, tenantId });

        try {
            // Find active project for the store
            const projectsSnapshot = await db
                .collection(DB_COLLECTIONS.PROJECTS)
                .doc(tenantId)
                .collection(storeId)
                .where('deleted', '==', false)
                .limit(1)
                .get();

            if (projectsSnapshot.empty) {
                throw new HttpsError('not-found', 'No active project found for this store');
            }

            const projectDoc = projectsSnapshot.docs[0];
            const projectId = projectDoc.id;

            // Touch the project doc to trigger republish (update timestamp)
            await projectDoc.ref.update({
                forceRepublishAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            // Verify after republish
            const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(storeId).get();
            const storeData = storeDoc.data();
            const slug = storeData?.slug || storeData?.subdomain;

            if (slug) {
                const publicMenuUrl = `https://${slug}.menulist.ai`;
                const result = await verifyPublish(publicMenuUrl);
                await updateStoreHealth(storeId, tenantId, result);

                return { success: true, projectId, verification: result.status };
            }

            return { success: true, projectId, verification: 'skipped' };
        } catch (error: any) {
            logger.error('[forceRepublish] Failed', { storeId, error: error.message });
            throw new HttpsError('internal', 'Force republish failed: ' + error.message);
        }
    },
);

// ═══════════════════════════════════════════════════════════════
// STORES SUMMARY BACKFILL — One-time utility
// ═══════════════════════════════════════════════════════════════

const BUSINESS_TYPE_TO_CATEGORY: Record<string, string> = {
    'Restaurant': 'food', 'Cafe': 'food', 'Cake Shop': 'food', 'Bakery': 'food',
    'Coffee Shop': 'food', 'Specialty Coffee Shop': 'food', 'Ice Cream Shop': 'food',
    'Spa': 'service', 'Salon': 'service', 'Pet Grooming Service': 'service',
    'Pet Grooming Salon': 'service', 'Pet Grooming Studio': 'service',
    'Cleaning Services Company': 'service', 'Car Wash & Detailing Service': 'service',
    'Landscaping Service': 'service', 'Landscaping Company': 'service',
    'Fashion Boutique': 'retail', 'Jewelry Store': 'retail', 'Bookstore': 'retail',
    'Electronics Store': 'retail', 'Furniture Store': 'retail', 'Luxury Watch Dealer': 'retail',
    'Craft Supply Store': 'retail', 'Music Store': 'retail', 'Shoe Store': 'retail',
    'Aquarium Store': 'retail', 'Florist Shop': 'retail', 'Handmade Crafts': 'retail',
    'Etsy Shop': 'retail', 'Fitness Equipment Seller': 'retail',
    'Real Estate Agent': 'professional', 'Real Estate Agency': 'professional',
    'Law Firm': 'professional', 'Financial Advisor': 'professional',
    'Wedding Planner': 'professional', 'Event Planning Company': 'professional',
    'Interior Designer': 'professional', 'Life Coach': 'professional',
    'Personal Development': 'professional', 'Travel Agency': 'professional',
    'Home Renovation Contractor': 'professional',
    'Photography Studio': 'creative', 'Photography Tour Operator': 'creative',
    'Tattoo Studio': 'creative', 'Art Gallery': 'creative', 'Music School': 'creative',
    'Makeup Studio': 'creative', 'Handmade Jewelry Brand': 'creative',
    'Furniture Maker': 'creative', 'Florist': 'creative', 'Event Decorator': 'creative',
    'Tailoring Shop': 'creative',
    'Dental Clinic': 'health', 'Yoga Studio': 'health', 'Fitness Bootcamp': 'health',
    'Gym': 'health', 'Fitness Center': 'health', 'Personal Trainer': 'health',
    'Spa Resort': 'health', 'Martial Arts Academy': 'health', 'Veterinary Clinic': 'health',
    'Car Dealership': 'specialty', 'Auto Repair Shop': 'specialty',
    '3D Printing Studio': 'specialty', 'Drone Services Company': 'specialty',
    'Boutique Hotel': 'specialty', "Children's Daycare": 'specialty',
    'Daycare Center': 'specialty', 'Coworking Space': 'specialty', 'Bike Rental Shop': 'specialty',
};

export const backfillStoresSummary = onCall({
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
}, async (request) => {
    const logger = functions.logger;

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to run backfill.');
    }

    logger.info('[backfillStoresSummary] Started by user:', request.auth.uid);

    try {
        const storesSnapshot = await db.collection(DB_COLLECTIONS.STORES).get();
        const summary: Record<string, any> = {};

        for (const doc of storesSnapshot.docs) {
            const data = doc.data();
            const businessType = data.businessType || 'unknown';
            const businessCategory = data.businessCategory || BUSINESS_TYPE_TO_CATEGORY[businessType] || 'specialty';

            summary[doc.id] = {
                tId: data.tenantId || data.tId,
                businessType,
                businessCategory,
                active: data.active ?? true,
                name: data.name || '',
                activePlanType: data.activePlanType || null,
            };
        }

        const { FieldValue } = require('firebase-admin/firestore');
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
            lastUpdated: FieldValue.serverTimestamp(),
            stores: summary,
        });

        logger.info(`[backfillStoresSummary] Completed. Synced ${storesSnapshot.size} stores.`);

        return {
            status: 'success',
            storesCount: storesSnapshot.size,
            message: `Successfully backfilled ${storesSnapshot.size} stores to storesSummary`,
        };
    } catch (error: any) {
        logger.error('[backfillStoresSummary] Failed:', error.message);
        throw new HttpsError('internal', 'Backfill failed: ' + error.message);
    }
});
