#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    deleteDoc,
    doc,
    type Firestore,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import { transitionSpecialMenuLifecycle } from '../../src/database/projects/specialMenuLifecycle';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-special-menu-lifecycle-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const T_ID = '1';
const S_ID = '101';
const MENU_A = '1-special-a-101';
const MENU_B = '1-special-b-101';
const MENU_C = '1-special-c-101';
const MENU_D = '1-special-d-101';
const STARTS_AT = '2026-07-13T09:00:00.000Z';
const ENDS_AT = '2026-07-14T09:00:00.000Z';
const NOW = new Date('2026-07-13T10:00:00.000Z');

const specialMenuProject = (
    projectId: string,
    status: 'scheduled' | 'active' | 'expired' | 'cancelled' = 'scheduled',
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
        endsAt: ENDS_AT,
        status,
        displayName: { en: `Menu ${projectId}` },
    },
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const testEnvironment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
        },
    });

    try {
        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await Promise.all([
                setDoc(doc(db, 'stores', S_ID), {
                    storeId: Number(S_ID),
                    tenantId: Number(T_ID),
                    name: 'Lifecycle Test Store',
                }),
                setDoc(doc(db, 'projects', T_ID, S_ID, MENU_A), specialMenuProject(MENU_A)),
                setDoc(doc(db, 'projects', T_ID, S_ID, MENU_B), specialMenuProject(MENU_B)),
                setDoc(doc(db, 'projects', T_ID, S_ID, MENU_C), specialMenuProject(MENU_C, 'active')),
                setDoc(doc(db, 'projects', T_ID, S_ID, MENU_D), specialMenuProject(MENU_D)),
                setDoc(doc(db, 'platformSummary', `projects_${S_ID}`), {
                    [`projects.${MENU_A}`]: { isSpecialMenu: true, specialMenuStatus: 'scheduled' },
                    [`projects.${MENU_B}`]: { isSpecialMenu: true, specialMenuStatus: 'scheduled' },
                    [`projects.${MENU_C}`]: { isSpecialMenu: true, specialMenuStatus: 'active' },
                    [`projects.${MENU_D}`]: { isSpecialMenu: true, specialMenuStatus: 'scheduled' },
                }),
            ]);
        });

        // rules-unit-testing v4 declares this as the compat Firestore type even
        // though its runtime instance is accepted by the modular v11 API.
        const ownerDb = testEnvironment.authenticatedContext('owner-101', {
            tenantId: T_ID,
            storeId: S_ID,
            storeIds: [S_ID],
            role: 'OWNER',
            uId: 'owner-101',
        }).firestore() as unknown as Firestore;

        await assertSucceeds(transitionSpecialMenuLifecycle({
            action: 'activate',
            db: ownerDb,
            enableTempStatus: true,
            now: NOW,
            projectId: MENU_A,
            sId: S_ID,
            tId: T_ID,
        }));
        let storeData = (await getDoc(doc(ownerDb, 'stores', S_ID))).data() || {};
        let menuAData = (await getDoc(doc(ownerDb, 'projects', T_ID, S_ID, MENU_A))).data() || {};
        let summaryData = (await getDoc(doc(ownerDb, 'platformSummary', `projects_${S_ID}`))).data() || {};
        assert.equal(menuAData._specialMenu?.status, 'active');
        assert.equal(storeData.activeSpecialMenuId, MENU_A);
        assert.equal(storeData.tempStatus?.sourceProjectId, MENU_A);
        assert.equal(summaryData[`projects.${MENU_A}.specialMenuStatus`], 'active');

        await assertSucceeds(transitionSpecialMenuLifecycle({
            action: 'activate',
            db: ownerDb,
            enableTempStatus: true,
            now: NOW,
            projectId: MENU_A,
            sId: S_ID,
            tId: T_ID,
        }));

        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await Promise.all([
                setDoc(doc(db, 'projects', T_ID, S_ID, MENU_A), specialMenuProject(MENU_A)),
                setDoc(doc(db, 'projects', T_ID, S_ID, MENU_B), specialMenuProject(MENU_B)),
                setDoc(doc(db, 'stores', S_ID), {
                    storeId: Number(S_ID),
                    tenantId: Number(T_ID),
                    activeSpecialMenuId: null,
                    tempStatus: null,
                }),
            ]);
        });

        const concurrentResults = await Promise.allSettled([
            transitionSpecialMenuLifecycle({
                action: 'activate',
                db: ownerDb,
                enableTempStatus: true,
                now: NOW,
                projectId: MENU_A,
                sId: S_ID,
                tId: T_ID,
            }),
            transitionSpecialMenuLifecycle({
                action: 'activate',
                db: ownerDb,
                enableTempStatus: true,
                now: NOW,
                projectId: MENU_B,
                sId: S_ID,
                tId: T_ID,
            }),
        ]);
        assert.equal(concurrentResults.filter((result) => result.status === 'fulfilled').length, 1);
        assert.equal(concurrentResults.filter((result) => result.status === 'rejected').length, 1);
        storeData = (await getDoc(doc(ownerDb, 'stores', S_ID))).data() || {};
        const concurrentMenuA = (await getDoc(doc(ownerDb, 'projects', T_ID, S_ID, MENU_A))).data() || {};
        const concurrentMenuB = (await getDoc(doc(ownerDb, 'projects', T_ID, S_ID, MENU_B))).data() || {};
        assert.ok(storeData.activeSpecialMenuId === MENU_A || storeData.activeSpecialMenuId === MENU_B);
        assert.equal(
            [concurrentMenuA, concurrentMenuB].filter((project) => project._specialMenu?.status === 'active').length,
            1,
        );

        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'projects', T_ID, S_ID, MENU_C), specialMenuProject(MENU_C, 'active'));
            await setDoc(doc(db, 'stores', S_ID), {
                storeId: Number(S_ID),
                tenantId: Number(T_ID),
                activeSpecialMenuId: MENU_B,
                tempStatus: {
                    type: 'special_menu',
                    message: 'Menu B',
                    expiresAt: ENDS_AT,
                    createdAt: NOW.toISOString(),
                    sourceProjectId: MENU_B,
                },
            });
        });
        await assert.rejects(
            transitionSpecialMenuLifecycle({
                action: 'deactivate',
                db: ownerDb,
                enableTempStatus: true,
                now: NOW,
                projectId: MENU_C,
                sId: S_ID,
                tId: T_ID,
            }),
            /special_menu_active_pointer_conflict/,
        );
        storeData = (await getDoc(doc(ownerDb, 'stores', S_ID))).data() || {};
        assert.equal(storeData.activeSpecialMenuId, MENU_B);
        assert.equal(storeData.tempStatus?.sourceProjectId, MENU_B);

        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            await deleteDoc(doc(context.firestore(), 'stores', S_ID));
        });
        await assertSucceeds(transitionSpecialMenuLifecycle({
            action: 'cancel',
            db: ownerDb,
            enableTempStatus: true,
            now: NOW,
            projectId: MENU_D,
            sId: S_ID,
            tId: T_ID,
        }));
        assert.equal(
            (await getDoc(doc(ownerDb, 'projects', T_ID, S_ID, MENU_D))).data()?._specialMenu?.status,
            'cancelled',
        );

        await assert.rejects(
            transitionSpecialMenuLifecycle({
                action: 'cancel',
                db: ownerDb,
                enableTempStatus: true,
                now: NOW,
                projectId: '2-cross-201',
                sId: S_ID,
                tId: T_ID,
            }),
            /special_menu_scope_invalid/,
        );

        await testEnvironment.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'projects', T_ID, S_ID, MENU_D), {
                ...specialMenuProject(MENU_D),
                _specialMenu: {
                    ...specialMenuProject(MENU_D)._specialMenu,
                    endsAt: 'not-a-date',
                },
            });
        });
        await assert.rejects(
            transitionSpecialMenuLifecycle({
                action: 'cancel',
                db: ownerDb,
                enableTempStatus: true,
                now: NOW,
                projectId: MENU_D,
                sId: S_ID,
                tId: T_ID,
            }),
            /special_menu_metadata_invalid/,
        );
        assert.equal(
            (await getDoc(doc(ownerDb, 'projects', T_ID, S_ID, MENU_D))).data()?._specialMenu?.status,
            'scheduled',
        );

        process.stdout.write('Special menu lifecycle Firestore rules tests passed.\n');
    } finally {
        await testEnvironment.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
