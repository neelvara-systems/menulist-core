import assert from "node:assert/strict";
import { DB_COLLECTIONS } from "../../src/constants/database";
import {
    createResellerProfileServer,
    getResellerProfileServer,
    getResellerProfileAdmissionConflict,
    updateResellerProfileServer,
} from "../../src/database/reseller/server";
import { admin, firestoreAdmin } from "../../src/lib/firebase/firebaseAdmin";
import { getAuthUserByLoginIdentifier } from "../../src/lib/auth/serverUserContext";
import {
    isResellerSelfProfile,
    projectResellerSelfProfile,
} from "../../src/lib/reseller/resellerSelfProfile";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("FIRESTORE_EMULATOR_HOST is required");
}

const prefix = `reseller-profile-admission-${Date.now()}`;
const profiles = firestoreAdmin.collection(DB_COLLECTIONS.RESELLER_PROFILES);
const users = firestoreAdmin.collection(DB_COLLECTIONS.USERS);

const profile = (params: {
    email: string;
    profileId: string;
    username: string;
}) => ({
    active: true,
    createdOn: admin.firestore.Timestamp.now(),
    email: params.email,
    id: params.profileId,
    modifiedOn: admin.firestore.Timestamp.now(),
    name: params.profileId,
    username: params.username,
});

async function create(params: {
    email: string;
    maxProfiles: number;
    profileId: string;
    username: string;
}): Promise<void> {
    await createResellerProfileServer({
        ...params,
        profile: profile(params),
        user: {
            email: params.email,
            resellerProfileId: params.profileId,
            username: params.username,
        },
        userId: params.profileId,
    });
}

async function deleteTestProfiles(): Promise<void> {
    const snapshot = await profiles
        .where("auditTestPrefix", "==", prefix)
        .get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
}

async function run(): Promise<void> {
    const projected = projectResellerSelfProfile("safe-profile", {
        active: true,
        activatedAt: { toDate: () => new Date("2026-07-25T00:00:00.000Z") },
        authUserId: "private-auth-id",
        createdBy: "private-founder",
        currentActiveOfflineStores: 2,
        email: "reseller@example.com",
        maxOfflineActivations: 20,
        modifiedOn: { toDate: () => "not-a-date" },
        name: "Reseller",
        notes: "founder-only note",
        password: "legacy-secret",
        phone: "9876543210",
        totalRevenueCollectedPaise: Number.POSITIVE_INFINITY,
        unexpectedPrivateField: "private",
        username: "reseller_rahul",
    });
    assert.equal(projected.activatedAt, "2026-07-25T00:00:00.000Z");
    assert.equal(projected.modifiedOn, null);
    assert.equal(projected.totalRevenueCollectedPaise, 0);
    assert.equal("notes" in projected, false);
    assert.equal("password" in projected, false);
    assert.equal("authUserId" in projected, false);
    assert.equal("unexpectedPrivateField" in projected, false);
    assert.equal(isResellerSelfProfile(projected), true);
    assert.equal(isResellerSelfProfile({ ...projected, notes: "private" }), false);

    const legacyProfileA = `${prefix}-legacy-a`;
    const legacyProfileB = `${prefix}-legacy-b`;
    const legacyEmail = `${prefix}-legacy@example.com`;
    await Promise.all([
        profiles.doc(legacyProfileA).set({
            active: true,
            authUserId: `${prefix}-actor-a`,
            email: legacyEmail,
            id: legacyProfileA,
        }),
        profiles.doc(legacyProfileB).set({
            active: true,
            authUserId: `${prefix}-actor-b`,
            email: legacyEmail,
            id: legacyProfileB,
        }),
        ...Array.from({ length: 3 }, (_, index) => profiles.doc(`${prefix}-legacy-decoy-${index}`).set({
            active: true,
            authUserId: `${prefix}-decoy-actor-${index}`,
            email: legacyEmail,
            id: `${prefix}-legacy-decoy-${index}`,
        })),
    ]);
    assert.equal(
        (await getResellerProfileServer(`${prefix}-actor-b`, legacyEmail, legacyProfileB))?.id,
        legacyProfileB,
    );
    assert.equal(await getResellerProfileServer(`${prefix}-unknown`, legacyEmail), null);
    assert.equal(
        (await getResellerProfileServer(`${prefix}-actor-b`, legacyEmail))?.id,
        legacyProfileB,
        'same-email legacy rows must not starve the exact authenticated reseller lookup',
    );
    await profiles.doc(legacyProfileB).set({ deleted: true }, { merge: true });
    assert.equal(
        await getResellerProfileServer(`${prefix}-actor-b`, legacyEmail, legacyProfileB),
        null,
    );
    const deletedDirectProfile = `${prefix}-deleted-direct`;
    await profiles.doc(deletedDirectProfile).set({
        active: true,
        auditTestPrefix: prefix,
        deleted: true,
        email: `${prefix}-deleted@example.com`,
    });
    assert.equal(
        await getResellerProfileServer(
            deletedDirectProfile,
            `${prefix}-deleted@example.com`,
            deletedDirectProfile,
        ),
        null,
    );
    await Promise.all([
        profiles.doc(legacyProfileA).delete(),
        profiles.doc(legacyProfileB).delete(),
        profiles.doc(deletedDirectProfile).delete(),
        ...Array.from({ length: 3 }, (_, index) => (
            profiles.doc(`${prefix}-legacy-decoy-${index}`).delete()
        )),
    ]);

    const loginProfileId = `${prefix}-login`;
    await create({
        email: `${prefix}-login@example.com`,
        maxProfiles: 50,
        profileId: loginProfileId,
        username: "reseller_rahul",
    });
    assert.equal((await getAuthUserByLoginIdentifier(" RESELLER_RAHUL "))?.id, loginProfileId);
    await Promise.all([
        profiles.doc(loginProfileId).delete(),
        users.doc(loginProfileId).delete(),
    ]);

    const duplicateUsername = `${prefix}-duplicate`;
    const duplicateResults = await Promise.allSettled(
        Array.from({ length: 8 }, (_, index) => create({
            email: `${prefix}-duplicate-${index}@example.com`,
            maxProfiles: 50,
            profileId: `${prefix}-duplicate-${index}`,
            username: duplicateUsername,
        })),
    );
    assert.equal(duplicateResults.filter((result) => result.status === "fulfilled").length, 1);
    duplicateResults
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .forEach((result) => {
            assert.equal(getResellerProfileAdmissionConflict(result.reason), "username");
        });
    assert.equal((await users.where("username", "==", duplicateUsername).get()).size, 1);

    await Promise.all(
        (await profiles.where("username", "==", duplicateUsername).get()).docs.map((doc) => doc.ref.delete()),
    );

    const capResults = await Promise.allSettled(
        Array.from({ length: 8 }, (_, index) => create({
            email: `${prefix}-cap-${index}@example.com`,
            maxProfiles: 3,
            profileId: `${prefix}-cap-${index}`,
            username: `${prefix}-cap-${index}`,
        })),
    );
    assert.equal(capResults.filter((result) => result.status === "fulfilled").length, 3);
    capResults
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .forEach((result) => {
            assert.equal(getResellerProfileAdmissionConflict(result.reason), "total-cap");
        });

    const capDocs = await Promise.all(
        Array.from({ length: 8 }, (_, index) => profiles.doc(`${prefix}-cap-${index}`).get()),
    );
    const capUserDocs = await Promise.all(
        Array.from({ length: 8 }, (_, index) => users.doc(`${prefix}-cap-${index}`).get()),
    );
    assert.equal(capDocs.filter((snapshot) => snapshot.exists).length, 3);
    assert.equal(capUserDocs.filter((snapshot) => snapshot.exists).length, 3);

    await Promise.all(capDocs.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.ref.delete()));

    const updateIds = [`${prefix}-update-a`, `${prefix}-update-b`];
    await Promise.all(updateIds.map((profileId, index) => create({
        email: `${profileId}@example.com`,
        maxProfiles: 50,
        profileId,
        username: `${profileId}-original`,
    })));
    const sharedUsername = `${prefix}-update-shared`;
    const updateResults = await Promise.allSettled(updateIds.map((profileId) => (
        updateResellerProfileServer({
            email: `${profileId}@example.com`,
            profileId,
            updates: {
                auditTestPrefix: prefix,
                username: sharedUsername,
            },
            user: {
                resellerProfileId: profileId,
                username: sharedUsername,
            },
            userId: profileId,
            username: sharedUsername,
        })
    )));
    assert.equal(updateResults.filter((result) => result.status === "fulfilled").length, 1);
    const rejectedUpdate = updateResults.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    assert.equal(getResellerProfileAdmissionConflict(rejectedUpdate?.reason), "username");
    const updatedProfiles = await Promise.all(updateIds.map((profileId) => profiles.doc(profileId).get()));
    const updatedUsers = await Promise.all(updateIds.map((profileId) => users.doc(profileId).get()));
    assert.equal(
        updatedProfiles.filter((snapshot) => snapshot.data()?.username === sharedUsername).length,
        1,
    );
    updatedProfiles.forEach((snapshot, index) => {
        assert.equal(updatedUsers[index].data()?.username, snapshot.data()?.username);
    });

    await Promise.all(updateIds.map((profileId) => profiles.doc(profileId).delete()));
}

run()
    .then(async () => {
        console.log("Reseller profile admission emulator tests passed.");
        await firestoreAdmin.terminate();
    })
    .catch(async (error) => {
        console.error(error);
        await deleteTestProfiles().catch(() => undefined);
        await firestoreAdmin.terminate().catch(() => undefined);
        process.exitCode = 1;
    });
