#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-pricing-plans-rules';
const ROOT = path.resolve(__dirname, '..', '..');

const validPlan = (name: string) => ({
    active: true,
    createdOn: Timestamp.fromMillis(1_700_000_000_000),
    currency: 'INR',
    description: `${name} description`,
    features: ['Published menus'],
    modifiedOn: Timestamp.fromMillis(1_700_000_000_000),
    name,
    periodicity: 'MONTH',
    planType: 'B2C',
    price: 9900,
    razorpayPlanId: 'plan_safe123',
    recommended: false,
    version: 1,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
        },
    });

    try {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, 'pricingPlans', 'public-valid'), validPlan('Public valid'));
            await setDoc(doc(db, 'pricingPlans', 'legacy-private'), {
                ...validPlan('Legacy private'),
                modifiedBy: 'Founder Name',
                tId: 1,
                uId: 'internal-user',
            });
        });

        const publicDb = testEnv.unauthenticatedContext().firestore();
        const platformDb = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();
        const ownerDb = testEnv.authenticatedContext('owner-user', {
            platformRole: 'OWNER',
        }).firestore();

        await assertSucceeds(getDoc(doc(publicDb, 'pricingPlans', 'public-valid')));
        await assertFails(getDoc(doc(publicDb, 'pricingPlans', 'legacy-private')));
        await assertSucceeds(getDoc(doc(platformDb, 'pricingPlans', 'legacy-private')));

        await assertSucceeds(setDoc(doc(platformDb, 'pricingPlans', 'platform-valid'), validPlan('Platform valid')));
        await assertFails(setDoc(doc(ownerDb, 'pricingPlans', 'owner-write'), validPlan('Owner write')));
        await assertFails(setDoc(doc(platformDb, 'pricingPlans', 'platform-private'), {
            ...validPlan('Platform private'),
            uId: 'must-not-be-public',
        }));
        await assertFails(setDoc(doc(platformDb, 'pricingPlans', 'platform-malformed'), {
            ...validPlan('Platform malformed'),
            price: 99.5,
        }));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('Pricing plan Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
