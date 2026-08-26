#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { DB_COLLECTIONS } from "../../src/constants/database";
import {
    GROWTHOS_KIT_BECAME_STALE,
    GROWTHOS_SOURCE_FACTS_CHANGED,
    buildGrowthOSKitId,
    buildGrowthOSSummaryDocId,
    readGrowthOSProjectDataServer,
    readGrowthOSSummaryServer,
    recordGrowthOSExportServer,
    writeGrowthOSKitAndSummaryServer,
    writeGrowthOSRefreshedSummaryServer,
} from "../../src/database/growthos/server";
import { readPublicTruthMonitorProjectDataServer } from "../../src/database/publicTruthMonitor/server";
import { firestoreAdmin } from "../../src/lib/firebase/firebaseAdmin";
import { rankGrowthOSActions } from "../../src/lib/growthos/actionRanking";
import { buildGrowthOSKit } from "../../src/lib/growthos/kitBuilder";
import {
    buildGrowthOSSourceFacts,
    hashGrowthOSSourceFacts,
} from "../../src/lib/growthos/sourceFacts";
import type {
    GrowthOSKit,
    GrowthOSSummaryDocument,
} from "../../src/types/growthos";

const tenantId = "growthos-transaction-tenant";
const storeId = "growthos-transaction-store";
const projectId = "growthos-transaction-project";
const actorId = "growthos-transaction-owner";
const generationOperationId = "00000000-0000-4000-8000-000000000101";
const exportOperationId = "00000000-0000-4000-8000-000000000102";
const fixtureNow = new Date();
const fixtureDate = fixtureNow.toISOString().split("T")[0];

const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId);
const projectRef = firestoreAdmin
    .collection(`${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`)
    .doc(projectId);
const summaryRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(buildGrowthOSSummaryDocId(storeId));

const initialStore = {
    currencySymbol: "₹",
    name: "Transaction Cafe",
    storeId,
    subdomain: "transaction-cafe",
    tenantId,
};

const initialProject = {
    files: [{
        extractedData: {
            data: {
                items: [{
                    available: true,
                    category: "Bowls",
                    id: "item-1",
                    isBestSeller: true,
                    name: { en: "Paneer Bowl" },
                    price: 180,
                }],
            },
        },
    }],
    name: { en: "Main Menu" },
    projectId,
    sId: storeId,
    tId: tenantId,
};

function buildPersistableKit(operationId: string): {
    kit: GrowthOSKit;
    summary: GrowthOSSummaryDocument;
} {
    const facts = buildGrowthOSSourceFacts({
        projectData: initialProject,
        projectId,
        sId: storeId,
        storeData: initialStore,
        tId: tenantId,
    });
    const action = rankGrowthOSActions(facts)[0];
    assert.ok(action, "fixture must produce a GrowthOS action");
    const kit = buildGrowthOSKit({
        action,
        facts,
        kitId: buildGrowthOSKitId(tenantId, storeId, operationId),
        operationId,
        now: fixtureNow,
    });
    return {
        kit,
        summary: {
            date: fixtureDate,
            eligible: true,
            latestKit: {
                actionType: kit.actionType,
                createdAt: kit.createdAt,
                expiresAt: kit.expiresAt,
                id: kit.id,
                isStale: false,
                itemName: kit.itemName,
                outputs: kit.outputs,
                sourceFactsHash: kit.sourceFactsHash,
                status: kit.status,
                title: kit.title,
            },
            primaryAction: action,
            readiness: action.readiness,
            sId: storeId,
            secondaryActions: [],
            sourceFactsHash: hashGrowthOSSourceFacts(facts),
            tId: tenantId,
        },
    };
}

async function assertRejectsWith(
    promise: Promise<unknown>,
    expectedMessage: string,
): Promise<void> {
    await assert.rejects(promise, (error: unknown) => (
        error instanceof Error && error.message === expectedMessage
    ));
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error("FIRESTORE_EMULATOR_HOST is required");
    }

    await Promise.all([
        storeRef.set(initialStore),
        projectRef.set(initialProject),
    ]);
    const conflictingLegacyProjectRef = firestoreAdmin
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc('growthos-conflicting-legacy-project');
    await conflictingLegacyProjectRef.set({
        projectId: conflictingLegacyProjectRef.id,
        sId: storeId,
        storeId,
        tId: tenantId,
        tenantId: 'another-tenant',
    });
    assert.equal(
        await readGrowthOSProjectDataServer({
            projectId: conflictingLegacyProjectRef.id,
            sId: storeId,
            tId: tenantId,
        }),
        null,
        'GrowthOS must reject a legacy project with conflicting tenant aliases',
    );
    assert.equal(
        await readPublicTruthMonitorProjectDataServer({
            projectId: conflictingLegacyProjectRef.id,
            sId: storeId,
            tId: tenantId,
        }),
        null,
        'Public Truth Monitor must reject a legacy project with conflicting tenant aliases',
    );

    const generated = buildPersistableKit(generationOperationId);
    assert.equal(generated.kit.sourceFactsSummary.todayHoursLabel, undefined);
    const generationAttempts = await Promise.all([
        writeGrowthOSKitAndSummaryServer(generated.kit, generated.summary),
        writeGrowthOSKitAndSummaryServer(generated.kit, generated.summary),
    ]);
    assert.equal(
        generationAttempts.filter((result) => result.replayed).length,
        1,
        "one concurrent generation must create and one must replay",
    );
    const kitsCollection = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${tenantId}/${storeId}`);
    assert.equal((await kitsCollection.get()).size, 1, "one operation may persist only one kit");
    assert.equal(
        (await kitsCollection.doc(generated.kit.id).get()).data()?.sourceFactsSummary?.todayHoursLabel,
        undefined,
        "missing hours must remain omitted instead of becoming an unreadable null",
    );

    const output = generated.kit.outputs[0];
    assert.ok(output, "fixture must produce an exportable output");
    const exportParams = {
        actorId,
        destination: output.destination,
        isStale: false,
        kit: generated.kit,
        method: "copy" as const,
        operationId: exportOperationId,
        outputId: output.id,
    };
    const exportAttempts = await Promise.all([
        recordGrowthOSExportServer(exportParams),
        recordGrowthOSExportServer(exportParams),
    ]);
    assert.equal(exportAttempts[0].exportId, exportAttempts[1].exportId);
    assert.equal(exportAttempts[0].status, "copied");
    const exportsCollection = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_EXPORTS}/${tenantId}/${storeId}`);
    assert.equal((await exportsCollection.get()).size, 1, "one operation may persist only one export");
    assert.equal((await kitsCollection.doc(generated.kit.id).get()).data()?.status, "copied");
    assert.equal((await summaryRef.get()).data()?.latestKit?.status, "copied");

    const markedUsed = await recordGrowthOSExportServer({
        ...exportParams,
        method: "mark_used",
        operationId: "00000000-0000-4000-8000-000000000105",
    });
    assert.equal(markedUsed.status, "used");
    const copiedAfterUse = await recordGrowthOSExportServer({
        ...exportParams,
        operationId: "00000000-0000-4000-8000-000000000106",
    });
    assert.equal(copiedAfterUse.status, "used", "later exports must not erase the completed staff action");
    assert.equal((await kitsCollection.doc(generated.kit.id).get()).data()?.status, "used");
    assert.equal((await summaryRef.get()).data()?.latestKit?.status, "used");

    await projectRef.set({
        ...initialProject,
        files: [{
            extractedData: {
                data: {
                    items: [{
                        ...initialProject.files[0].extractedData.data.items[0],
                        price: 220,
                    }],
                },
            },
        }],
    });

    const staleGeneration = buildPersistableKit("00000000-0000-4000-8000-000000000103");
    await assertRejectsWith(
        writeGrowthOSKitAndSummaryServer(staleGeneration.kit, staleGeneration.summary),
        GROWTHOS_SOURCE_FACTS_CHANGED,
    );
    await assertRejectsWith(
        recordGrowthOSExportServer({
            ...exportParams,
            operationId: "00000000-0000-4000-8000-000000000104",
        }),
        GROWTHOS_KIT_BECAME_STALE,
    );

    const changedProject = (await projectRef.get()).data();
    assert.ok(changedProject);
    const currentFacts = buildGrowthOSSourceFacts({
        projectData: changedProject,
        projectId,
        sId: storeId,
        storeData: initialStore,
        tId: tenantId,
    });
    const refreshed = await writeGrowthOSRefreshedSummaryServer(storeId, {
        ...generated.summary,
        sourceFactsHash: hashGrowthOSSourceFacts(currentFacts),
    }, projectId);
    assert.equal(refreshed.latestKit?.id, generated.kit.id, "refresh must preserve the transaction-current kit");
    assert.equal(refreshed.latestKit?.isStale, true, "refresh must mark an old-source kit stale");

    await summaryRef.set({
        ...refreshed,
        tId: "another-tenant",
    });
    assert.equal(
        await readGrowthOSSummaryServer({ storeId, tenantId }),
        null,
        "a mismatched persisted summary must not cross the server tenant boundary",
    );

    await Promise.all([
        storeRef.delete(),
        projectRef.delete(),
        conflictingLegacyProjectRef.delete(),
        ...((await kitsCollection.get()).docs.map((doc) => doc.ref.delete())),
        ...((await exportsCollection.get()).docs.map((doc) => doc.ref.delete())),
        summaryRef.delete(),
    ]);
    process.stdout.write("GrowthOS transaction emulator tests passed.\n");
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
