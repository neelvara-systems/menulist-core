#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-campaigncue-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const workspaceId = (tId: string, sId: string) => `cc_${tId}_${sId}`;

const workspaceDoc = (
    tId: string,
    sId: string,
    extraMembers: Record<string, { locationIds?: string[]; role: string }> = {},
) => ({
    createdAt: NOW,
    defaultLocale: 'en-IN',
    defaultTimezone: 'Asia/Kolkata',
    id: workspaceId(tId, sId),
    members: {
        [`owner-${tId}-${sId}`]: {
            joinedAt: NOW,
            role: 'owner',
        },
        ...extraMembers,
    },
    ownerEmail: `owner-${tId}-${sId}@example.test`,
    ownerName: `Owner ${tId}/${sId}`,
    primaryColor: '#ec4899',
    productId: 'CC',
    sId,
    status: 'active',
    tId,
    updatedAt: NOW,
    workspaceId: workspaceId(tId, sId),
});

const sourceInputDoc = (id: string, workspace: string) => ({
    createdAt: NOW,
    facts: [],
    id,
    sourceType: 'owner_note',
    status: 'ready',
    title: 'Lunch update',
    updatedAt: NOW,
    value: 'Lunch offer is available this week.',
    workspaceId: workspace,
});

const campaignDoc = (id: string, workspace: string) => ({
    brief: 'Campaign brief',
    channels: ['whatsapp'],
    createdAt: NOW,
    id,
    outputs: [],
    status: 'generated',
    title: 'Lunch campaign',
    updatedAt: NOW,
    workspaceId: workspace,
});

const videoProjectDoc = (id: string, workspace: string) => ({
    id,
    workspaceId: workspace,
    campaignId: 'campaign-1',
    outputId: 'output-video-1',
    status: 'draft',
    version: 1,
    updatedAt: NOW,
});

const platformCatalog = (catalogId: string) => ({
    businessCategory: 'food',
    catalogId,
    catalogStatus: 'active',
    data: [],
    schemaVersion: 1,
    updatedAt: 1_700_000_000_000,
    updatedBy: 'platform-test',
});

const workspaceIndex = (workspace: string) => ({
    data: [],
    id: 'default',
    schemaVersion: 1,
    updatedAt: 1_700_000_000_000,
    workspaceId: workspace,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore-campaigncue.rules'), 'utf8'),
        },
    });

    const ownerWorkspaceId = workspaceId('1', '101');
    const otherWorkspaceId = workspaceId('2', '202');
    const disabledWorkspaceId = workspaceId('3', '303');

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'campaigncueWorkspaces', ownerWorkspaceId), workspaceDoc('1', '101', {
                'agency-1-101': { role: 'agency_member' },
                'billing-1-101': { role: 'billing_admin' },
                'local-1-101': { locationIds: ['location-1'], role: 'local_manager' },
                'marketer-1-101': { role: 'marketer' },
                'reviewer-1-101': { role: 'reviewer' },
            }));
            await setDoc(doc(db, 'campaigncueWorkspaces', otherWorkspaceId), workspaceDoc('2', '202'));
            await setDoc(doc(db, 'campaigncueWorkspaces', disabledWorkspaceId), {
                ...workspaceDoc('3', '303'),
                status: 'disabled',
            });
            await setDoc(doc(db, 'campaigncueWorkspaces', 'cc_null_null'), {
                ...workspaceDoc('null', 'null'),
                sId: null,
                tId: null,
                workspaceId: 'cc_null_null',
            });
            await setDoc(
                doc(db, 'campaigncueWorkspaces', ownerWorkspaceId, 'sourceInputs', 'source-1'),
                sourceInputDoc('source-1', ownerWorkspaceId),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', otherWorkspaceId, 'sourceInputs', 'source-2'),
                sourceInputDoc('source-2', otherWorkspaceId),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', disabledWorkspaceId, 'sourceInputs', 'source-disabled'),
                sourceInputDoc('source-disabled', disabledWorkspaceId),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', 'cc_null_null', 'sourceInputs', 'source-null'),
                sourceInputDoc('source-null', 'cc_null_null'),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', ownerWorkspaceId, 'campaigns', 'campaign-1'),
                campaignDoc('campaign-1', ownerWorkspaceId),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'video-1'),
                videoProjectDoc('video-1', ownerWorkspaceId),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', otherWorkspaceId, 'videoProjects', 'video-2'),
                videoProjectDoc('video-2', otherWorkspaceId),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', disabledWorkspaceId, 'videoProjects', 'video-disabled'),
                videoProjectDoc('video-disabled', disabledWorkspaceId),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', ownerWorkspaceId, 'cueLayerCostRecords', 'cost-1'),
                { createdAt: NOW, id: 'cost-1', workspaceId: ownerWorkspaceId },
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', ownerWorkspaceId, 'idempotencyKeys', 'key-1'),
                { action: 'create_campaign', createdAt: NOW, id: 'key-1', status: 'completed' },
            );
            await setDoc(
                doc(db, 'campaigncuePlatformPackTemplates', 'food'),
                platformCatalog('food'),
            );
            await setDoc(
                doc(db, 'campaigncuePlatformPackTemplates', 'not_allowed'),
                platformCatalog('not_allowed'),
            );
            await setDoc(
                doc(db, 'campaigncuePublicOffers', '0123456789abcdefabcd'),
                { status: 'published', title: 'Private server record' },
            );
        });

        const ownerClaims = {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'owner-1-101',
        };
        const ownerDb = testEnv.authenticatedContext('owner-1-101', ownerClaims).firestore();
        const ownerTemplateReadDb = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'template_read',
        }).firestore();
        const ownerTemplateWriteDb = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'workspace_template_write',
        }).firestore();
        const otherDb = testEnv.authenticatedContext('owner-2-202', {
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2-202',
        }).firestore();
        const otherTemplateWriteDb = testEnv.authenticatedContext('owner-2-202', {
            firebasePurpose: 'workspace_template_write',
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2-202',
        }).firestore();
        const marketerClaims = {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'marketer-1-101',
        };
        const marketerDb = testEnv.authenticatedContext('marketer-1-101', marketerClaims).firestore();
        const marketerTemplateReadDb = testEnv.authenticatedContext('marketer-1-101', {
            ...marketerClaims,
            firebasePurpose: 'template_read',
        }).firestore();
        const marketerTemplateWriteDb = testEnv.authenticatedContext('marketer-1-101', {
            ...marketerClaims,
            firebasePurpose: 'workspace_template_write',
        }).firestore();
        const reviewerDb = testEnv.authenticatedContext('reviewer-1-101', {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'reviewer-1-101',
        }).firestore();
        const reviewerTemplateReadDb = testEnv.authenticatedContext('reviewer-1-101', {
            firebasePurpose: 'template_read',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'reviewer-1-101',
        }).firestore();
        const reviewerTemplateWriteDb = testEnv.authenticatedContext('reviewer-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'reviewer-1-101',
        }).firestore();
        const localManagerDb = testEnv.authenticatedContext('local-1-101', {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'local-1-101',
        }).firestore();
        const localManagerTemplateReadDb = testEnv.authenticatedContext('local-1-101', {
            firebasePurpose: 'template_read',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'local-1-101',
        }).firestore();
        const localManagerTemplateWriteDb = testEnv.authenticatedContext('local-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'local-1-101',
        }).firestore();
        const billingDb = testEnv.authenticatedContext('billing-1-101', {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1-101',
        }).firestore();
        const billingTemplateReadDb = testEnv.authenticatedContext('billing-1-101', {
            firebasePurpose: 'template_read',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1-101',
        }).firestore();
        const billingTemplateWriteDb = testEnv.authenticatedContext('billing-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1-101',
        }).firestore();
        const sameScopeNonmemberDb = testEnv.authenticatedContext('former-member-1-101', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'former-member-1-101',
        }).firestore();
        const sameScopeNonmemberTemplateWriteDb = testEnv.authenticatedContext('former-member-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'former-member-1-101',
        }).firestore();
        const disabledOwnerDb = testEnv.authenticatedContext('owner-3-303', {
            role: 'OWNER',
            storeId: '303',
            tenantId: '3',
            uId: 'owner-3-303',
        }).firestore();
        const disabledOwnerTemplateWriteDb = testEnv.authenticatedContext('owner-3-303', {
            firebasePurpose: 'workspace_template_write',
            role: 'OWNER',
            storeId: '303',
            tenantId: '3',
            uId: 'owner-3-303',
        }).firestore();
        const missingClaimsDb = testEnv.authenticatedContext('missing-scope', {
            role: 'OWNER',
            uId: 'missing-scope',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
            uId: 'platform-user',
        }).firestore();
        const publicDb = testEnv.unauthenticatedContext().firestore();

        await assertFails(getDoc(doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId)));
        await assertFails(getDoc(doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'sourceInputs', 'source-1')));
        await assertFails(getDoc(doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'campaigns', 'campaign-1')));
        await assertFails(getDoc(doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'video-1')));
        await assertFails(getDoc(doc(marketerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'campaigns', 'campaign-1')));
        await assertFails(getDoc(doc(reviewerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'campaigns', 'campaign-1')));
        await assertFails(getDoc(doc(localManagerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'campaigns', 'campaign-1')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId)));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'analyticsSummaries', 'dashboard')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'usageLedger', 'usage-1')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'sourceInputs', 'source-1')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'campaigns', 'campaign-1')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'assets', 'asset-1')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'video-1')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'providerConnections', 'provider-1')));
        await assertFails(getDoc(doc(billingDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'cueLayerDesigns', 'design-1')));
        await assertFails(getDoc(doc(ownerDb, 'campaigncueWorkspaces', otherWorkspaceId)));
        await assertFails(getDoc(doc(otherDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'video-1')));
        await assertFails(getDoc(doc(sameScopeNonmemberDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'video-1')));
        await assertFails(getDoc(doc(disabledOwnerDb, 'campaigncueWorkspaces', disabledWorkspaceId, 'videoProjects', 'video-disabled')));
        await assertFails(getDoc(doc(publicDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'video-1')));
        await assertFails(getDoc(doc(otherDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'sourceInputs', 'source-1')));
        await assertFails(getDoc(doc(sameScopeNonmemberDb, 'campaigncueWorkspaces', ownerWorkspaceId)));
        await assertFails(getDoc(doc(sameScopeNonmemberDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'sourceInputs', 'source-1')));
        await assertFails(getDoc(doc(disabledOwnerDb, 'campaigncueWorkspaces', disabledWorkspaceId)));
        await assertFails(getDoc(doc(disabledOwnerDb, 'campaigncueWorkspaces', disabledWorkspaceId, 'sourceInputs', 'source-disabled')));
        await assertFails(getDoc(doc(publicDb, 'campaigncueWorkspaces', ownerWorkspaceId)));
        await assertSucceeds(getDoc(doc(platformDb, 'campaigncueWorkspaces', ownerWorkspaceId)));
        await assertSucceeds(getDoc(doc(platformDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'campaigns', 'campaign-1')));
        await assertFails(getDoc(doc(publicDb, 'campaigncuePublicOffers', '0123456789abcdefabcd')));
        await assertFails(getDoc(doc(ownerDb, 'campaigncuePublicOffers', '0123456789abcdefabcd')));
        await assertFails(getDoc(doc(platformDb, 'campaigncuePublicOffers', '0123456789abcdefabcd')));
        await assertFails(setDoc(
            doc(ownerDb, 'campaigncuePublicOffers', 'ffffffffffffffffffff'),
            { status: 'published', title: 'Forged offer' },
        ));

        await assertFails(getDoc(doc(missingClaimsDb, 'campaigncueWorkspaces', 'cc_null_null')));
        await assertFails(getDoc(doc(missingClaimsDb, 'campaigncueWorkspaces', 'cc_null_null', 'sourceInputs', 'source-null')));

        await assertFails(setDoc(
            doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'sourceInputs', 'forged-source'),
            sourceInputDoc('forged-source', ownerWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(platformDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'sourceInputs', 'platform-source'),
            sourceInputDoc('platform-source', ownerWorkspaceId),
        ));
        await assertFails(getDoc(doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'idempotencyKeys', 'key-1')));
        await assertFails(setDoc(
            doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'forged-video'),
            videoProjectDoc('forged-video', ownerWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(platformDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'videoProjects', 'platform-video'),
            videoProjectDoc('platform-video', ownerWorkspaceId),
        ));

        await assertSucceeds(getDoc(doc(platformDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'cueLayerCostRecords', 'cost-1')));
        await assertFails(getDoc(doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'cueLayerCostRecords', 'cost-1')));

        await assertFails(getDoc(doc(ownerDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertSucceeds(getDoc(doc(ownerTemplateReadDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertSucceeds(getDoc(doc(marketerTemplateReadDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertFails(getDoc(doc(ownerTemplateWriteDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertFails(getDoc(doc(reviewerTemplateReadDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertFails(getDoc(doc(localManagerTemplateReadDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertFails(getDoc(doc(billingTemplateReadDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertFails(getDoc(doc(sameScopeNonmemberDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertFails(getDoc(doc(disabledOwnerDb, 'campaigncuePlatformPackTemplates', 'food')));
        await assertFails(getDoc(doc(ownerTemplateReadDb, 'campaigncuePlatformPackTemplates', 'not_allowed')));
        await assertFails(setDoc(doc(ownerTemplateWriteDb, 'campaigncuePlatformPackTemplates', 'food_2'), platformCatalog('food_2')));
        await assertSucceeds(setDoc(doc(platformDb, 'campaigncuePlatformPackTemplates', 'food_2'), platformCatalog('food_2')));
        await assertFails(setDoc(doc(platformDb, 'campaigncuePlatformPackTemplates', 'retail_2'), platformCatalog('retail_2')));
        await assertFails(setDoc(doc(platformDb, 'campaigncuePlatformPackTemplates', 'food_2'), {
            ...platformCatalog('food_2'),
            overflowDocIds: ['food_3'],
        }));
        await assertFails(setDoc(doc(platformDb, 'campaigncuePlatformPackTemplates', 'not_allowed'), platformCatalog('not_allowed')));
        await assertFails(setDoc(doc(platformDb, 'campaigncuePlatformPackTemplates', 'food_3'), {
            ...platformCatalog('food_3'),
            data: Array.from({ length: 81 }, (_, index) => ({ id: `item-${index}` })),
        }));

        await assertSucceeds(setDoc(
            doc(ownerTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(ownerWorkspaceId),
        ));
        await assertSucceeds(setDoc(
            doc(marketerTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(ownerWorkspaceId),
        ));
        await assertSucceeds(getDoc(
            doc(ownerTemplateReadDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
        ));
        await assertSucceeds(getDoc(
            doc(ownerTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
        ));
        await assertFails(getDoc(
            doc(ownerDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
        ));
        await assertFails(setDoc(
            doc(reviewerTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(ownerWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(localManagerTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(ownerWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(billingTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(ownerWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(ownerTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'other'),
            { ...workspaceIndex(ownerWorkspaceId), id: 'other' },
        ));
        await assertFails(setDoc(
            doc(ownerTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(otherWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(otherTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(ownerWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(sameScopeNonmemberTemplateWriteDb, 'campaigncueWorkspaces', ownerWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(ownerWorkspaceId),
        ));
        await assertFails(setDoc(
            doc(disabledOwnerTemplateWriteDb, 'campaigncueWorkspaces', disabledWorkspaceId, 'packTemplateIndexes', 'default'),
            workspaceIndex(disabledWorkspaceId),
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('CampaignCue Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
