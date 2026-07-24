#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

const ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-answerlattice-ontology-rules';

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, process.env.ANSWERLATTICE_RULES_FILE || 'firestore-answerlattice.rules'), 'utf8') },
    });
    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'answerlattice_entities', 'entity-1'), {
                pId: 'AL', tId: 1, sId: 101, type: 'feature', name: 'Billing', slug: 'billing',
                description: 'Billing feature.', status: 'active', currentVersion: 1_000_000,
            });
            await setDoc(doc(db, 'answerlattice_entities', 'foreign-product-entity'), {
                pId: 'ML', tId: 1, sId: 101, type: 'feature', name: 'Foreign product', slug: 'foreign-product',
                description: 'Must never enter Answerlattice reads.', status: 'active', currentVersion: 1_000_000,
            });
            await setDoc(doc(db, 'answerlattice_entityRelations', 'relation-1'), {
                pId: 'AL', tId: 1, sId: 101, fromEntityId: 'entity-1', toEntityId: 'entity-2', relationType: 'requires',
            });
            await setDoc(doc(db, 'answerlattice_entitySearchIndex', 'index-1'), {
                pId: 'AL', tId: 1, sId: 101, entityId: 'entity-1', canonicalName: 'Billing', synonyms: [], normalizedTokens: ['billing'], weight: 1,
            });
            await setDoc(doc(db, 'answerlattice_entityCandidates', 'candidate-1'), {
                pId: 'AL', tId: 1, sId: 101, name: 'Billing', type: 'feature', confidence: 0.8,
                frequency: { articles: 1, tickets: 0, chat: 0 }, description: 'Billing.', status: 'pending',
            });
        });
        const owner = testEnv.authenticatedContext('owner-1', {
            role: 'OWNER', tenantId: '1', storeId: '101', uId: 'owner-1',
        }).firestore();
        const other = testEnv.authenticatedContext('owner-2', {
            role: 'OWNER', tenantId: '2', storeId: '202', uId: 'owner-2',
        }).firestore();
        await assertSucceeds(getDoc(doc(owner, 'answerlattice_entities', 'entity-1')));
        await assertFails(getDoc(doc(other, 'answerlattice_entities', 'entity-1')));
        const scopedEntityQuery = query(
            collection(owner, 'answerlattice_entities'),
            where('pId', '==', 'AL'),
            where('tId', '==', 1),
            where('sId', '==', 101),
        );
        const scopedEntities = await assertSucceeds(getDocs(scopedEntityQuery));
        if (scopedEntities.size !== 1 || scopedEntities.docs[0]?.id !== 'entity-1') {
            throw new Error('Product-scoped ontology query returned an unexpected result');
        }
        await assertFails(getDocs(query(
            collection(owner, 'answerlattice_entities'),
            where('tId', '==', 1),
            where('sId', '==', 101),
        )));
        await assertFails(setDoc(doc(owner, 'answerlattice_entities', 'entity-2'), { pId: 'AL', tId: 1, sId: 101 }));
        await assertFails(updateDoc(doc(owner, 'answerlattice_entities', 'entity-1'), { type: 'plan' }));
        await assertFails(setDoc(doc(owner, 'answerlattice_entityRelations', 'relation-2'), { pId: 'AL', tId: 1, sId: 101 }));
        await assertFails(updateDoc(doc(owner, 'answerlattice_entitySearchIndex', 'index-1'), { weight: 2 }));
        await assertFails(updateDoc(doc(owner, 'answerlattice_entityCandidates', 'candidate-1'), { status: 'approved' }));
        await assertFails(setDoc(doc(owner, 'answerlattice_entitySlugIndex', 'slug-1'), { pId: 'AL', tId: 1, sId: 101 }));
        await assertFails(setDoc(doc(owner, 'platformSummary', 'ontologyCounters_1_101'), {
            pId: 'AL', tId: 1, sId: 101, entityCount: 0,
        }));
    } finally {
        await testEnv.cleanup();
    }
    process.stdout.write('Answerlattice ontology Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
