#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { admin, firestoreAdmin as db } from '../../functions/src/firebaseAdmin';
import { transitionScheduledSpecialMenu } from '../../functions/src/schedulers/specialMenuLifecycle';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-special-menu-lifecycle';
const T_ID = '1';
const S_ID = '101';
const MENU_A = '1-scheduled-a-101';
const MENU_B = '1-scheduled-b-101';
const MENU_C = '1-scheduled-c-101';
const STARTS_AT = '2026-07-13T09:00:00.000Z';
const ENDS_AT = '2026-07-13T11:00:00.000Z';
const NOW = new Date('2026-07-13T10:00:00.000Z');
const AFTER_END = new Date('2026-07-13T12:00:00.000Z');

const metadata = (
    projectId: string,
    status: 'scheduled' | 'active' | 'expired' | 'cancelled' = 'scheduled',
    endsAt = ENDS_AT,
) => ({
    projectId,
    tId: Number(T_ID),
    sId: Number(S_ID),
    active: true,
    deleted: false,
    _specialMenu: {
        baseProjectId: '1-base-101',
        mode: 'replace',
        startsAt: STARTS_AT,
        endsAt,
        status,
        displayName: { en: `Menu ${projectId}` },
    },
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const storeRef = db.collection('stores').doc(S_ID);
    const summaryRef = db.collection('platformSummary').doc(`projects_${S_ID}`);
    const projectRef = (projectId: string) => db.collection('projects')
        .doc(T_ID).collection(S_ID).doc(projectId);

    try {
        await Promise.all([
            storeRef.set({ storeId: Number(S_ID), tenantId: Number(T_ID) }),
            projectRef(MENU_A).set(metadata(MENU_A)),
            projectRef(MENU_B).set(metadata(MENU_B)),
            projectRef(MENU_C).set(metadata(MENU_C)),
            summaryRef.set({
                [`projects.${MENU_A}`]: { isSpecialMenu: true, specialMenuStatus: 'scheduled' },
                [`projects.${MENU_B}`]: { isSpecialMenu: true, specialMenuStatus: 'scheduled' },
                [`projects.${MENU_C}`]: { isSpecialMenu: true, specialMenuStatus: 'scheduled' },
            }),
        ]);

        const activation = await transitionScheduledSpecialMenu({
            action: 'activate',
            db,
            enableTempStatus: true,
            now: NOW,
            projectId: MENU_A,
            sId: S_ID,
            tId: T_ID,
        });
        assert.equal(activation.outcome, 'activated');
        assert.equal((await projectRef(MENU_A).get()).data()?._specialMenu?.status, 'active');
        let storeData = (await storeRef.get()).data() || {};
        let summaryData = (await summaryRef.get()).data() || {};
        assert.equal(storeData.activeSpecialMenuId, MENU_A);
        assert.equal(storeData.tempStatus?.sourceProjectId, MENU_A);
        assert.equal(summaryData[`projects.${MENU_A}.specialMenuStatus`], 'active');

        await summaryRef.set({
            [`projects.${MENU_A}.specialMenuStatus`]: 'scheduled',
        }, { merge: true });
        const repaired = await transitionScheduledSpecialMenu({
            action: 'activate',
            db,
            enableTempStatus: true,
            now: NOW,
            projectId: MENU_A,
            sId: S_ID,
            tId: T_ID,
        });
        assert.equal(repaired.outcome, 'repaired');
        assert.equal(
            (await summaryRef.get()).data()?.[`projects.${MENU_A}.specialMenuStatus`],
            'active',
        );

        await Promise.all([
            projectRef(MENU_A).set(metadata(MENU_A)),
            projectRef(MENU_B).set(metadata(MENU_B)),
            storeRef.set({
                activeSpecialMenuId: admin.firestore.FieldValue.delete(),
                tempStatus: admin.firestore.FieldValue.delete(),
            }, { merge: true }),
        ]);
        const concurrent = await Promise.all([
            transitionScheduledSpecialMenu({
                action: 'activate', db, enableTempStatus: true, now: NOW,
                projectId: MENU_A, sId: S_ID, tId: T_ID,
            }),
            transitionScheduledSpecialMenu({
                action: 'activate', db, enableTempStatus: true, now: NOW,
                projectId: MENU_B, sId: S_ID, tId: T_ID,
            }),
        ]);
        assert.equal(concurrent.filter((result) => result.outcome === 'activated').length, 1);
        assert.equal(concurrent.filter((result) => result.outcome === 'blocked').length, 1);
        storeData = (await storeRef.get()).data() || {};
        const activeProjectId = String(storeData.activeSpecialMenuId);
        assert.ok(activeProjectId === MENU_A || activeProjectId === MENU_B);
        assert.equal(
            [await projectRef(MENU_A).get(), await projectRef(MENU_B).get()]
                .filter((snapshot) => snapshot.data()?._specialMenu?.status === 'active').length,
            1,
        );

        await projectRef(MENU_C).set(metadata(MENU_C, 'active'));
        await storeRef.set({
            activeSpecialMenuId: activeProjectId,
            tempStatus: {
                type: 'special_menu',
                message: 'Current menu',
                expiresAt: ENDS_AT,
                createdAt: NOW.toISOString(),
                sourceProjectId: activeProjectId,
            },
        }, { merge: true });
        const staleExpiry = await transitionScheduledSpecialMenu({
            action: 'expire',
            db,
            enableTempStatus: true,
            now: AFTER_END,
            projectId: MENU_C,
            sId: S_ID,
            tId: T_ID,
        });
        assert.equal(staleExpiry.outcome, 'expired');
        storeData = (await storeRef.get()).data() || {};
        assert.equal(storeData.activeSpecialMenuId, activeProjectId);
        assert.equal(storeData.tempStatus?.sourceProjectId, activeProjectId);
        assert.equal((await projectRef(MENU_C).get()).data()?._specialMenu?.status, 'expired');

        await projectRef(MENU_C).set(metadata(MENU_C, 'scheduled'));
        const missedWindow = await transitionScheduledSpecialMenu({
            action: 'expire',
            db,
            enableTempStatus: true,
            now: AFTER_END,
            projectId: MENU_C,
            sId: S_ID,
            tId: T_ID,
        });
        assert.equal(missedWindow.outcome, 'expired');
        assert.equal((await projectRef(MENU_C).get()).data()?._specialMenu?.status, 'expired');

        await projectRef(MENU_C).set({
            ...metadata(MENU_C),
            projectId: MENU_B,
        });
        await assert.rejects(
            transitionScheduledSpecialMenu({
                action: 'activate',
                db,
                enableTempStatus: true,
                now: NOW,
                projectId: MENU_C,
                sId: S_ID,
                tId: T_ID,
            }),
            /special_menu_scheduler_project_contract_invalid/,
        );
        assert.equal((await projectRef(MENU_C).get()).data()?._specialMenu?.status, 'scheduled');

        summaryData = (await summaryRef.get()).data() || {};
        assert.equal(summaryData[`projects.${MENU_C}.specialMenuStatus`], 'expired');
        process.stdout.write('Special menu lifecycle Admin emulator tests passed.\n');
    } finally {
        await admin.app().delete();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
