#!/usr/bin/env ts-node

import fs from "node:fs";
import path from "node:path";
import {
    assertFails,
    initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
    collection,
    doc,
    type Firestore,
    getDoc,
    getDocs,
    query,
    setDoc,
    where,
} from "firebase/firestore";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-reseller-rules";
const ROOT = path.resolve(__dirname, "..", "..");
const PROFILE_PATH = "resellerProfiles/reseller-auth-1";
const TRANSACTION_PATH = "resellerTransactions/operation-1";

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error("FIRESTORE_EMULATOR_HOST is required");
    }
    const environment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf8"),
        },
    });
    try {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore() as unknown as Firestore;
            await Promise.all([
                setDoc(doc(db, PROFILE_PATH), {
                    active: true,
                    authUserId: "reseller-auth-1",
                    email: "reseller@example.test",
                }),
                setDoc(doc(db, TRANSACTION_PATH), {
                    amountExpected: 40000,
                    resellerId: "reseller-auth-1",
                }),
            ]);
        });

        const resellerDb = environment.authenticatedContext("reseller-auth-1", {
            platformRole: "RESELLER",
            resellerProfileId: "reseller-auth-1",
            uId: "reseller-auth-1",
        }).firestore() as unknown as Firestore;
        const platformDb = environment.authenticatedContext("platform-auth-1", {
            platformRole: "PLATFORM",
            uId: "platform-auth-1",
        }).firestore() as unknown as Firestore;

        await assertFails(getDoc(doc(resellerDb, PROFILE_PATH)));
        await assertFails(getDoc(doc(resellerDb, TRANSACTION_PATH)));
        await assertFails(getDocs(query(
            collection(resellerDb, "resellerTransactions"),
            where("resellerId", "==", "reseller-auth-1"),
        )));
        await assertFails(setDoc(doc(resellerDb, PROFILE_PATH), { active: false }, { merge: true }));
        await assertFails(getDoc(doc(platformDb, PROFILE_PATH)));
        await assertFails(getDocs(collection(platformDb, "resellerTransactions")));

        process.stdout.write("Reseller Firestore rules tests passed.\n");
    } finally {
        await environment.cleanup();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
