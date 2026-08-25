#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { deleteApp, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, getIdTokenResult, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const QA_PROJECT_ID = 'menulist-qa';
const QA_WEB_APP_ID = '1:113909530649:web:c5b19ac268c2387c302a88';

function readArg(name: string): string | null {
    const prefix = `--${name}=`;
    return process.argv.slice(2).find(argument => argument.startsWith(prefix))?.slice(prefix.length) || null;
}

function requirePositiveInteger(name: string): number {
    const raw = readArg(name);
    const value = Number(raw);
    if (!raw || !Number.isSafeInteger(value) || value <= 0 || String(value) !== raw) {
        throw new Error(`Pass --${name}=<positive-safe-integer>.`);
    }
    return value;
}

async function main(): Promise<void> {
    if (readArg('confirm-project') !== QA_PROJECT_ID) {
        throw new Error(`Pass --confirm-project=${QA_PROJECT_ID}.`);
    }
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        throw new Error('Hosted MenuList QA client test refuses emulator hosts.');
    }
    const credentialPath = readArg('credential-file');
    if (!credentialPath?.startsWith('/tmp/') || !credentialPath.endsWith('.json')) {
        throw new Error('Pass --credential-file=/tmp/<fixture-credentials>.json.');
    }
    const tenantId = requirePositiveInteger('tenant-id');
    const storeId = requirePositiveInteger('store-id');
    const credentials = JSON.parse(await readFile(credentialPath, 'utf8')) as {
        email?: unknown;
        password?: unknown;
    };
    assert.equal(typeof credentials.email, 'string');
    assert.equal(typeof credentials.password, 'string');

    const rawConfig = execFileSync('firebase', [
        'apps:sdkconfig',
        'WEB',
        QA_WEB_APP_ID,
        '--project',
        QA_PROJECT_ID,
        '--json',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const configResult = JSON.parse(rawConfig) as { result?: { sdkConfig?: FirebaseOptions } };
    const config = configResult.result?.sdkConfig;
    assert.equal(config?.projectId, QA_PROJECT_ID);
    assert.equal(config?.appId, QA_WEB_APP_ID);

    const app = initializeApp(config, `menulist-hosted-qa-client-${Date.now()}`);
    const auth = getAuth(app);
    try {
        const signedIn = await signInWithEmailAndPassword(
            auth,
            credentials.email as string,
            credentials.password as string,
        );
        const token = await getIdTokenResult(signedIn.user, true);
        assert.equal(token.claims.platformRole, 'OWNER');
        assert.equal(token.claims.tenantId, String(tenantId));
        assert.equal(token.claims.storeId, String(storeId));
        const db = getFirestore(app);
        const [tenant, store] = await Promise.all([
            getDoc(doc(db, 'tenants', String(tenantId))),
            getDoc(doc(db, 'stores', String(storeId))),
        ]);
        assert.equal(tenant.exists(), true);
        assert.equal(store.exists(), true);
        assert.equal(tenant.data()?.tenantId, tenantId);
        assert.equal(tenant.data()?.deleted, false);
        assert.ok(
            Array.isArray(tenant.data()?.storesList)
            && tenant.data()!.storesList.some((entry: Record<string, unknown>) => (
                entry.storeId === storeId && typeof entry.storeKey === 'string'
            )),
        );
        assert.equal(store.data()?.tenantId, tenantId);
        assert.equal(store.data()?.storeId, storeId);
        assert.equal(store.data()?.deleted, false);
        assert.equal(store.data()?.phoneNumber, '');
        assert.equal(store.data()?.logo, '');
        assert.equal(store.data()?.city, '');
        assert.equal(store.data()?.state, '');
        assert.equal(store.data()?.currencyCode, 'INR');
        assert.equal(store.data()?.currencySymbol, '₹');
        assert.equal(store.data()?.contactPersonName, '');
        assert.equal(store.data()?.contactPersonNumber, '');
        process.stdout.write(JSON.stringify({
            claims: 'verified',
            projectId: QA_PROJECT_ID,
            scope: { storeId, tenantId },
            status: 'client-read-verified',
        }, null, 2) + '\n');
    } finally {
        await signOut(auth).catch(() => undefined);
        await deleteApp(app);
    }
}

main().catch(error => {
    const code = typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : null;
    process.stderr.write(`${code || (error instanceof Error ? error.message : 'Hosted QA client test failed.')}\n`);
    process.exitCode = 1;
});
