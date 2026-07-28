#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-public-api-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_RULES_FILE === 'firestore.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';

const storeData = (storeId: number, overrides: Record<string, unknown> = {}) => ({
    active: true,
    deleted: false,
    id: storeId,
    pId: 'AL',
    productId: 'AL',
    sId: storeId,
    storeId,
    tId: 1,
    tenantId: 1,
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores', '101'), storeData(101, {
                publicApi: {
                    apiKeyHash: 'a'.repeat(64),
                    createdAt: '2026-07-19T00:00:00.000Z',
                    keyPrefix: 'al_aaaa',
                    productId: 'AL',
                    purpose: 'answerlattice_public_api',
                    scopes: ['public:read'],
                },
                answerlatticeWidgetApi: {
                    activeKeyHash: 'b'.repeat(64),
                    schemaVersion: 'answerlattice.widgetKeys.v1',
                },
                widgetAllowedOrigins: ['https://app.example.com'],
                widgetConfig: {
                    headerTitle: 'Help',
                },
                widgetConfigSchemaVersion: 'answerlattice.widget.v1',
                widgetConfigVersion: 1,
                widgetRuntimeStatus: {
                    seenCount: 1,
                },
            }));
            await setDoc(doc(context.firestore(), 'stores', '102'), storeData(102));
        });

        const ownerDb = testEnv.authenticatedContext('owner-1', {
            canManageIntegrations: true,
            pId: 'AL',
            role: 'OWNER',
            storeId: '101',
            storeIds: ['101', '102', '103'],
            tenantId: '1',
            uId: 'owner-1',
        }).firestore();
        const platformDb = testEnv.authenticatedContext('platform-1', {
            pId: 'AL',
            platformRole: 'PLATFORM',
            role: 'PLATFORM',
            uId: 'platform-1',
        }).firestore();

        for (const clientDb of [ownerDb, platformDb]) {
            await assertFails(updateDoc(doc(clientDb, 'stores', '101'), {
                'publicApi.apiKeyHash': 'c'.repeat(64),
            }));
            await assertFails(updateDoc(doc(clientDb, 'stores', '101'), {
                publicApi: deleteField(),
            }));
            await assertFails(updateDoc(doc(clientDb, 'stores', '101'), {
                'answerlatticeWidgetApi.activeKeyHash': 'd'.repeat(64),
            }));
            await assertFails(updateDoc(doc(clientDb, 'stores', '101'), {
                widgetAllowedOrigins: [],
            }));
            await assertFails(updateDoc(doc(clientDb, 'stores', '101'), {
                'widgetConfig.headerTitle': 'Bypassed API',
            }));
            await assertFails(updateDoc(doc(clientDb, 'stores', '101'), {
                widgetConfigVersion: 2,
            }));
            await assertFails(updateDoc(doc(clientDb, 'stores', '101'), {
                'widgetRuntimeStatus.seenCount': 999,
            }));
            await assertFails(setDoc(
                doc(clientDb, 'answerlattice_auditLogs', `reserved-${clientDb === ownerDb ? 'owner' : 'platform'}`),
                {
                    action: 'public_api_key_rotated',
                    entityId: '101',
                    entityType: 'public_api_credential',
                    newState: { active: true },
                    pId: 'AL',
                    performedBy: 'spoofed-client',
                    previousState: null,
                    sId: 101,
                    tId: 1,
                },
            ));
        }

        await assertFails(updateDoc(doc(ownerDb, 'stores', '102'), {
            publicApi: {
                apiKeyHash: 'e'.repeat(64),
                createdAt: '2026-07-19T00:00:00.000Z',
                keyPrefix: 'al_eeee',
                productId: 'AL',
                purpose: 'answerlattice_public_api',
                scopes: ['public:read'],
            },
        }));
        await assertFails(setDoc(doc(ownerDb, 'stores', '103'), storeData(103, {
            publicApi: {
                apiKeyHash: 'f'.repeat(64),
                createdAt: '2026-07-19T00:00:00.000Z',
                keyPrefix: 'al_ffff',
                productId: 'AL',
                purpose: 'answerlattice_public_api',
                scopes: ['public:read'],
            },
        })));
        await assertFails(setDoc(doc(ownerDb, 'stores', '104'), storeData(104, {
            widgetAllowedOrigins: [],
            widgetConfig: { headerTitle: 'Bypassed API' },
            widgetConfigVersion: 1,
        })));

        await assertFails(updateDoc(doc(ownerDb, 'stores', '101'), {
            productName: 'Updated product',
        }));

        process.stdout.write(`Answerlattice Public API ${RULES_FILE} rules tests passed.\n`);
    } finally {
        await testEnv.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
