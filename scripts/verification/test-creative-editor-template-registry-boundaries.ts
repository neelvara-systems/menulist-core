import assert from "node:assert/strict";
import {
    removeCreativeEditorTemplateRecord,
    upsertCreativeEditorTemplateRecord,
} from "../../src/lib/creative-editor/templateRegistryIndexBoundary";
import {
    buildCreativeEditorTemplateFileName,
    isOwnedCreativeEditorTemplateStoragePath,
} from "../../src/lib/creative-editor/templateRegistryStorageBoundary";
import { resolveCreativeEditorTemplateScopeBoundary } from "../../src/lib/creative-editor/templateRegistryScopeBoundary";
import { creativeEditorDocumentSchema } from "../../src/lib/validation/creativeEditorTemplateSchemas";

type RecordShape = {
    assetTypeId?: string;
    documentPath: string;
    id: string;
    productId: string;
    sourceSurface: string;
    sortIndex?: number;
    updatedAtMs: number;
};

const scope = {
    assetTypeId: "poster",
    productId: "menulist",
    sourceSurface: "printable-asset-templates",
    templateId: "tpl_1",
};
const oldRecord: RecordShape = {
    ...scope,
    documentPath: "old",
    id: scope.templateId,
    updatedAtMs: 1,
};
const unrelated: RecordShape = {
    documentPath: "unrelated",
    id: "tpl_2",
    productId: "menulist",
    sourceSurface: "printable-asset-templates",
    updatedAtMs: 2,
};
const replacement: RecordShape = {
    ...oldRecord,
    documentPath: "new",
    updatedAtMs: 3,
};

const upserted = upsertCreativeEditorTemplateRecord({
    limit: 2,
    mode: "user",
    record: replacement,
    records: [oldRecord, unrelated],
    scope,
});
assert.equal(upserted.replaced, oldRecord);
assert.deepEqual(upserted.records, [replacement, unrelated]);
assert.deepEqual(upserted.evicted, []);

const capped = upsertCreativeEditorTemplateRecord({
    limit: 1,
    mode: "user",
    record: replacement,
    records: [oldRecord, unrelated],
    scope,
});
assert.deepEqual(capped.records, [replacement]);
assert.deepEqual(capped.evicted, [unrelated]);

const platformTail: RecordShape = {
    ...replacement,
    sortIndex: 2,
};
const platformFirst: RecordShape = {
    ...unrelated,
    sortIndex: 0,
};
const platformSecond: RecordShape = {
    ...unrelated,
    id: "tpl_3",
    sortIndex: 1,
};
const fullPlatformUpsert = upsertCreativeEditorTemplateRecord({
    limit: 2,
    mode: "platform",
    record: platformTail,
    records: [platformFirst, platformSecond],
    scope,
});
assert.equal(fullPlatformUpsert.records.includes(platformTail), true);
assert.deepEqual(fullPlatformUpsert.evicted, [platformSecond]);
assert.throws(() => upsertCreativeEditorTemplateRecord({
    limit: 0,
    mode: "user",
    record: replacement,
    records: [],
    scope,
}), /positive safe integer/);

const removed = removeCreativeEditorTemplateRecord({ records: [replacement, unrelated], scope });
assert.equal(removed.removed, replacement);
assert.deepEqual(removed.records, [unrelated]);
assert.equal(removeCreativeEditorTemplateRecord({ records: [unrelated], scope }).removed, undefined);

const versionedDocument = buildCreativeEditorTemplateFileName({
    target: "document",
    versionId: "v12345678_abcdef12",
});
const versionedPreview = buildCreativeEditorTemplateFileName({
    extension: "webp",
    target: "preview",
    versionId: "v12345678_abcdef12",
});
assert.equal(versionedDocument, "document-v12345678_abcdef12.json");
assert.equal(versionedPreview, "preview-v12345678_abcdef12.webp");

const userOwnership = {
    sId: "101",
    tId: "1",
    templateId: "tpl_1",
    templateOrigin: "user" as const,
};
assert.equal(isOwnedCreativeEditorTemplateStoragePath(
    `creative-editor/templates/user/1/101/tpl_1/${versionedDocument}`,
    userOwnership,
    "document",
), true);
assert.equal(isOwnedCreativeEditorTemplateStoragePath(
    "creative-editor/templates/user/1/101/tpl_1/document.json",
    userOwnership,
    "document",
), true);
assert.equal(isOwnedCreativeEditorTemplateStoragePath(
    `creative-editor/templates/user/2/101/tpl_1/${versionedDocument}`,
    userOwnership,
    "document",
), false);
assert.equal(isOwnedCreativeEditorTemplateStoragePath(
    `creative-editor/templates/user/1/101/tpl_2/${versionedDocument}`,
    userOwnership,
    "document",
), false);

const platformOwnership = {
    businessCategory: "food",
    templateId: "tpl_1",
    templateOrigin: "platform" as const,
};
assert.equal(isOwnedCreativeEditorTemplateStoragePath(
    `creative-editor/templates/platform/food/tpl_1/${versionedPreview}`,
    platformOwnership,
    "preview",
), true);
assert.equal(isOwnedCreativeEditorTemplateStoragePath(
    `creative-editor/templates/platform/retail/tpl_1/${versionedPreview}`,
    platformOwnership,
    "preview",
), false);
assert.equal(isOwnedCreativeEditorTemplateStoragePath(
    "creative-editor/templates/platform/food/tpl_1/preview-../../secret.webp",
    platformOwnership,
    "preview",
), false);

assert.deepEqual(resolveCreativeEditorTemplateScopeBoundary({
    session: {
        sId: "101",
        tId: "1",
        user: { storeId: 101, tenantId: 1 },
    },
}), { sId: "101", tId: "1" });
assert.equal(resolveCreativeEditorTemplateScopeBoundary({
    session: {
        sId: "101",
        tId: "1",
        user: { storeId: "102", tenantId: "1" },
    },
}), null);
assert.equal(resolveCreativeEditorTemplateScopeBoundary({
    session: {
        sId: "101",
        tId: "1",
    },
    storeDetails: {
        sId: "101",
        storeId: "102",
        tId: "1",
    },
}), null);
assert.deepEqual(resolveCreativeEditorTemplateScopeBoundary({
    session: {
        sId: "101",
        tId: "1",
    },
    storeDetails: {
        sId: "102",
        storeId: 102,
        tId: "1",
        tenantId: 1,
    },
}), { sId: "102", tId: "1" });
assert.equal(resolveCreativeEditorTemplateScopeBoundary({
    storeDetails: {
        sId: "101/../../102",
        tId: "1",
    },
}), null);

const validDocument = {
    canvas: {
        backgroundColor: "#ffffff",
        height: 1080,
        width: 1080,
    },
    elements: [{
        fill: "#111111",
        height: 100,
        id: "element_1",
        name: "Panel",
        type: "rect",
        width: 100,
        x: 0,
        y: 0,
    }],
    id: "document_1",
    productContext: {
        productId: "menulist",
        sourceSurface: "printable-asset-templates",
    },
    schemaVersion: "creative-editor.v1",
    title: "Valid document",
};

assert.equal(creativeEditorDocumentSchema.safeParse(validDocument).success, true);
assert.equal(creativeEditorDocumentSchema.safeParse({
    ...validDocument,
    elements: [{
        height: 100,
        id: "element_1",
        name: "Malformed text",
        type: "text",
        width: 100,
        x: 0,
        y: 0,
    }],
}).success, false, "text elements must include text, color, and font size");
assert.equal(creativeEditorDocumentSchema.safeParse({
    ...validDocument,
    elements: [{
        height: 100,
        id: "element_1",
        name: "Unknown element",
        type: "script",
        width: 100,
        x: 0,
        y: 0,
    }],
}).success, false, "unknown persisted element types must be rejected");

process.stdout.write("Creative Editor template registry boundary tests passed.\n");
