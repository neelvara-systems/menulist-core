#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-storage-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const RULES_FILE = process.env.ANSWERLATTICE_STORAGE_RULES_FILE === 'storage.rules'
    ? 'storage.rules'
    : 'storage-answerlattice.rules';
const FIRESTORE_RULES_FILE = RULES_FILE === 'storage.rules'
    ? 'firestore.rules'
    : 'firestore-answerlattice.rules';
const sourceMetadata = {
    contentType: 'text/plain',
    customMetadata: {
        retentionPolicy: 'delete_on_job_delete',
        sourceUse: 'knowledge_generation_only',
        uploadedVia: 'answerlattice_kb_generation',
    },
};

async function run(): Promise<void> {
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        firestore: { rules: fs.readFileSync(path.join(ROOT, FIRESTORE_RULES_FILE), 'utf8') },
        projectId: PROJECT_ID,
        storage: { rules: fs.readFileSync(path.join(ROOT, RULES_FILE), 'utf8') },
    });

    try {
        await testEnv.clearFirestore();
        await testEnv.clearStorage();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores', '101'), {
                active: true,
                authDisabled: false,
                deleted: false,
                pId: 'AL',
                productId: 'AL',
                sId: 101,
                storeId: 101,
                tId: 1,
                tenantId: 1,
            });
        });
        const owner = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', storeId: '101', tenantId: '1', uId: 'owner-1',
        }).storage();
        const supportOnly = testEnv.authenticatedContext('support-1', {
            canManageSupport: true, role: 'STAFF', storeId: '101', tenantId: '1', uId: 'support-1',
        }).storage();
        const noSupport = testEnv.authenticatedContext('viewer-1', {
            role: 'VIEWER', storeId: '101', tenantId: '1', uId: 'viewer-1',
        }).storage();
        const platformSupport = testEnv.authenticatedContext('platform-support-1', {
            platformRole: 'PLATFORM_SUPPORT', role: 'PLATFORM_SUPPORT', uId: 'platform-support-1',
        }).storage();
        const otherTenant = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', storeId: '202', tenantId: '2', uId: 'owner-2',
        }).storage();
        const platform = testEnv.authenticatedContext('platform-1', {
            platformRole: 'PLATFORM', role: 'PLATFORM', uId: 'platform-1',
        }).storage();
        const publicStorage = testEnv.unauthenticatedContext().storage();
        const sourcePath = 'ingestion_source_files/1/101/source.txt';
        const compiledPublicPath = 'answerlattice-context/public/pb_storage_rules_test/v1/widget-bootstrap.json';

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await uploadBytes(
                ref(context.storage(), compiledPublicPath),
                new TextEncoder().encode('{"schemaVersion":1}'),
                {
                    cacheControl: 'public, max-age=0, must-revalidate',
                    contentType: 'application/json',
                },
            );
        });
        await assertFails(getBytes(ref(publicStorage, compiledPublicPath)));
        await assertFails(getBytes(ref(owner, compiledPublicPath)));
        await assertFails(getBytes(ref(platform, compiledPublicPath)));

        await assertSucceeds(uploadBytes(ref(owner, sourcePath), new TextEncoder().encode('source'), sourceMetadata));
        await assertSucceeds(getBytes(ref(owner, sourcePath)));
        await assertFails(getBytes(ref(otherTenant, sourcePath)));
        await assertFails(uploadBytes(
            ref(supportOnly, 'ingestion_source_files/1/101/support.txt'),
            new TextEncoder().encode('source'),
            sourceMetadata,
        ));
        await assertFails(uploadBytes(
            ref(owner, 'ingestion_source_files/1/101/no-retention.txt'),
            new TextEncoder().encode('source'),
            { contentType: 'text/plain' },
        ));
        await assertFails(uploadBytes(
            ref(owner, 'ingestion_source_files/1/101/invalid.bin'),
            new Uint8Array([1, 2, 3]),
            { ...sourceMetadata, contentType: 'application/octet-stream' },
        ));
        await assertFails(uploadBytes(
            ref(publicStorage, 'ingestion_source_files/1/101/public.txt'),
            new TextEncoder().encode('source'),
            sourceMetadata,
        ));
        await assertSucceeds(deleteObject(ref(owner, sourcePath)));

        const ticketDocumentPath = 'supportTickets/documents/1/101/ticket.txt';
        const ticketMessagePath = 'supportTickets/messages/1/101/reply.txt';
        await assertSucceeds(uploadBytes(
            ref(owner, ticketDocumentPath),
            new TextEncoder().encode('ticket document'),
            { contentType: 'text/plain' },
        ));
        await assertSucceeds(getBytes(ref(supportOnly, ticketDocumentPath)));
        await assertSucceeds(getBytes(ref(platform, ticketDocumentPath)));
        await assertSucceeds(getBytes(ref(platformSupport, ticketDocumentPath)));
        await assertFails(getBytes(ref(noSupport, ticketDocumentPath)));
        await assertFails(getBytes(ref(otherTenant, ticketDocumentPath)));
        await assertSucceeds(uploadBytes(
            ref(platform, ticketMessagePath),
            new TextEncoder().encode('support reply'),
            { contentType: 'text/plain' },
        ));
        const platformSupportMessagePath = 'supportTickets/messages/1/101/support-reply.txt';
        await assertSucceeds(uploadBytes(
            ref(platformSupport, platformSupportMessagePath),
            new TextEncoder().encode('support reply'),
            { contentType: 'text/plain' },
        ));
        await assertSucceeds(deleteObject(ref(platform, ticketDocumentPath)));
        await assertSucceeds(deleteObject(ref(platform, ticketMessagePath)));
        await assertSucceeds(deleteObject(ref(platformSupport, platformSupportMessagePath)));

        const chatImagePath = 'chatSessions/chatimages/1/101/chat.png';
        await assertSucceeds(uploadBytes(
            ref(supportOnly, chatImagePath),
            new Uint8Array([1, 2, 3]),
            { contentType: 'image/png' },
        ));
        await assertSucceeds(getBytes(ref(platform, chatImagePath)));
        await assertSucceeds(getBytes(ref(platformSupport, chatImagePath)));
        await assertFails(getBytes(ref(noSupport, chatImagePath)));
        await assertFails(getBytes(ref(otherTenant, chatImagePath)));
        await assertSucceeds(deleteObject(ref(platformSupport, chatImagePath)));

        await assertSucceeds(uploadBytes(
            ref(owner, 'changelog/files/1/101/release.txt'),
            new TextEncoder().encode('release'),
            { contentType: 'text/plain' },
        ));
        await assertFails(uploadBytes(
            ref(supportOnly, 'changelog/files/1/101/support-release.txt'),
            new TextEncoder().encode('release'),
            { contentType: 'text/plain' },
        ));

        const closedWorkspacePath = 'supportTickets/documents/1/101/closed.txt';
        await assertSucceeds(uploadBytes(
            ref(owner, closedWorkspacePath),
            new TextEncoder().encode('closed workspace'),
            { contentType: 'text/plain' },
        ));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores', '101'), {
                active: false,
                authDisabled: true,
                deleted: true,
            }, { merge: true });
        });
        await assertFails(getBytes(ref(owner, closedWorkspacePath)));
        await assertFails(getBytes(ref(platform, closedWorkspacePath)));
        await assertFails(getBytes(ref(platformSupport, closedWorkspacePath)));
        await assertFails(uploadBytes(
            ref(owner, 'ingestion_source_files/1/101/closed-source.txt'),
            new TextEncoder().encode('source'),
            sourceMetadata,
        ));
        await assertFails(deleteObject(ref(owner, closedWorkspacePath)));
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'stores', '101'), {
                active: deleteField(),
                authDisabled: false,
                deleted: false,
            }, { merge: true });
        });
        await assertFails(getBytes(ref(owner, closedWorkspacePath)));
        await assertFails(getBytes(ref(platform, closedWorkspacePath)));
        await assertFails(getBytes(ref(platformSupport, closedWorkspacePath)));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Answerlattice Storage rules tests passed.\n');
}

void run();
