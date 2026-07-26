import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-todo-rules';
const ROOT = path.resolve(__dirname, '..', '..');

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const environment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });
    try {
        const ownerDb = environment.authenticatedContext('owner-1', {
            tenantId: '1',
            storeId: '10',
            storeIds: ['10'],
            role: 'OWNER',
            uId: 'owner-1',
        }).firestore();
        const foreignDb = environment.authenticatedContext('owner-2', {
            tenantId: '2',
            storeId: '20',
            storeIds: ['20'],
            role: 'OWNER',
            uId: 'owner-2',
        }).firestore();
        const todoRef = doc(ownerDb, 'todos', '1', '10', 'todo-1');
        const configRef = doc(ownerDb, 'todosMetadata', 'data', '1', '10');

        await assertSucceeds(setDoc(todoRef, { title: 'Call supplier', tId: 1, sId: 10 }));
        await assertSucceeds(getDoc(todoRef));
        await assertSucceeds(setDoc(configRef, {
            statuses: [{ id: 'open', name: 'Open', color: '#ffffff' }],
            tags: [],
        }));

        await assertFails(getDoc(doc(foreignDb, 'todos', '1', '10', 'todo-1')));
        await assertFails(setDoc(doc(foreignDb, 'todos', '1', '10', 'todo-2'), { title: 'Foreign' }));
        await assertFails(setDoc(
            doc(foreignDb, 'todosMetadata', 'data', '1', '10'),
            { tags: [] },
            { merge: true },
        ));

        process.stdout.write('Todo Firestore rules tests passed.\n');
    } finally {
        await environment.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
