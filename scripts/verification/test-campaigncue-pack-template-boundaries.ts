import assert from "node:assert/strict";

import { CAMPAIGNCUE_PRODUCT_CODE } from "../../src/constants/campaigncue/product";
import {
    CAMPAIGNCUE_OUTPUT_PICKER_GROUPS,
    CAMPAIGNCUE_OUTPUT_PICKER_ITEMS,
    CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS,
    campaignCueOutputIntentSupportsOwnerGoal,
    campaignCueOutputItemMatchesTemplate,
    getCampaignCueOutputPickerItem,
} from "../../src/constants/campaigncue/outputPicker";
import {
    hydrateCampaignCuePackTemplateEditorDocument,
    prepareCampaignCuePackTemplateEditorDocument,
} from "../../src/lib/campaigncue/pack-templates/editorDocumentBoundary";
import {
    assertCampaignCuePackTemplatePayloadIdentity,
    assertCampaignCuePlatformPayloadHash,
    assertCampaignCuePackTemplateSummaryScope,
    assertCampaignCuePlatformTemplateCatalogScope,
    assertCampaignCueWorkspaceTemplateIndexScope,
} from "../../src/lib/campaigncue/pack-templates/templateScopeBoundary";
import { campaignCueWorkspacePackTemplateSaveSchema } from "../../src/lib/validation/campaigncuePackTemplateSchemas";
import { CampaignCueCreateCampaignSchema } from "../../src/lib/validation/campaigncueSchemas";
import {
    getUnresolvedCampaignCueOutputIntentRequirements,
    getUnresolvedCampaignCuePackTemplateFactSlots,
} from "../../src/lib/campaigncue/pack-templates/factSlotReadiness";
import {
    buildCampaignCuePackTemplateOverflowDocId,
    isCampaignCuePackTemplateCatalogIdForCategory,
} from "../../src/lib/campaigncue/pack-templates/category";
import type { CreativeEditorDocument } from "../../src/modules/creative-editor/types";
import { CREATIVE_EDITOR_SCHEMA_VERSION } from "../../src/modules/creative-editor/types";
import type {
    CampaignCuePackTemplatePayload,
    CampaignCuePackTemplateSummary,
} from "../../src/types/campaigncuePackTemplates";

const workspaceId = "cc_1_101";
const documentValue: CreativeEditorDocument = {
    canvas: { backgroundColor: "#ffffff", height: 1080, width: 1080 },
    elements: [
        {
            color: "#111111",
            fontSize: 48,
            height: 100,
            id: "headline",
            name: "Headline",
            sourceRefs: [{ label: "old-output", sourceRef: "old-output" }],
            text: "Old Cafe",
            type: "text",
            width: 600,
            x: 40,
            y: 40,
        },
        {
            color: "#222222",
            fontSize: 28,
            height: 100,
            id: "custom-copy",
            name: "Offer",
            text: "50% off today",
            type: "text",
            width: 600,
            x: 40,
            y: 180,
        },
        {
            height: 160,
            id: "destination-qr",
            name: "Destination",
            type: "qr",
            value: "https://old.example/offer",
            width: 160,
            x: 40,
            y: 320,
        },
        {
            height: 120,
            id: "old-logo",
            name: "Old logo",
            src: "https://storage.example/old-logo.png?token=secret",
            type: "image",
            width: 120,
            x: 800,
            y: 40,
        },
    ],
    id: "old-campaign-document",
    metadata: {
        brand: {
            logoUrl: "https://storage.example/old-logo.png?token=secret",
            name: "Old Cafe",
            primaryColor: "#123456",
        },
        campaignId: "old-campaign",
        outputId: "old-output",
        sourceRefs: [{ label: "old-source", sourceRef: "old-source" }],
        textPlaceholders: [
            { id: "business-name", label: "Business name", value: "Old Cafe" },
            { id: "destination", label: "Destination", value: "https://old.example/offer" },
        ],
    },
    productContext: { productId: CAMPAIGNCUE_PRODUCT_CODE, sourceSurface: "campaign-output", workspaceId },
    schemaVersion: CREATIVE_EDITOR_SCHEMA_VERSION,
    title: "Old campaign",
};

const prepared = prepareCampaignCuePackTemplateEditorDocument({
    document: documentValue,
    templateId: "lunch-pack",
    workspaceId,
});
assert.ok(prepared);
const durableJson = JSON.stringify(prepared);
assert.equal(durableJson.includes("Old Cafe"), false, "saved layout must not retain old business text");
assert.equal(durableJson.includes("50% off today"), false, "saved layout must not retain unbound offer text");
assert.equal(durableJson.includes("https://"), false, "saved layout must not persist remote URLs");
assert.equal(prepared.elements.some((element) => element.type === "image"), false, "remote image layers are not durable template truth");
assert.equal(prepared.metadata?.campaignId, undefined);
assert.equal(prepared.metadata?.outputId, undefined);
assert.equal(prepared.elements[0]?.type === "text" ? prepared.elements[0].text : "", "{{campaigncue:business-name}}");

const hydrated = hydrateCampaignCuePackTemplateEditorDocument({
    businessFacts: {
        contacts: { bookingUrl: "https://current.example/book", phone: "+91 99999 11111" },
        locality: "Pune",
        name: "Current Cafe",
    },
    document: prepared,
    template: { description: "Promote the current offer safely.", title: "Lunch campaign" },
    workspaceId,
});
assert.equal(hydrated.elements[0]?.type === "text" ? hydrated.elements[0].text : "", "Current Cafe");
assert.equal(hydrated.elements[1]?.type === "text" ? hydrated.elements[1].text : "", "Edit this text");
assert.equal(hydrated.elements[2]?.type === "qr" ? hydrated.elements[2].value : "", "https://current.example/book");
assert.equal(JSON.stringify(hydrated.elements).includes("Promote the current offer safely."), false);
assert.equal(JSON.stringify(hydrated.elements).includes("Lunch campaign"), false);
assert.throws(() => prepareCampaignCuePackTemplateEditorDocument({
    document: documentValue,
    templateId: "lunch-pack",
    workspaceId: "cc_2_202",
}), /another CampaignCue workspace/);

const platformSummary = (overrides: Partial<CampaignCuePackTemplateSummary> = {}): CampaignCuePackTemplateSummary => ({
    businessCategory: "food",
    channels: ["whatsapp"],
    createdAt: 1,
    description: "Lunch pack",
    eventTags: [],
    optionalFactTypes: [],
    outputTypes: ["whatsapp_message"],
    ownerGoals: ["sell_product"],
    payloadPath: "campaigncue/templates/platform/food/lunch-pack/pack-template-0123456789abcdef.json",
    priority: 1,
    qualityTier: "platform_curated",
    recipeIds: ["lunch"],
    requiredFactTypes: ["price"],
    schemaVersion: 1,
    searchTokens: ["lunch"],
    status: "active",
    styleTags: [],
    supportedBusinessTypes: ["Restaurant"],
    templateId: "lunch-pack",
    templateKind: "campaign_pack",
    templateType: "platform",
    title: "Lunch pack",
    trustChecks: ["price_confirmed"],
    updatedAt: 1,
    ...overrides,
});

const summary = platformSummary();
assertCampaignCuePackTemplateSummaryScope(summary);
assertCampaignCuePlatformPayloadHash(
    summary,
    "0123456789abcdef000000000000000000000000000000000000000000000000",
);
assert.throws(() => assertCampaignCuePlatformPayloadHash(
    summary,
    "1123456789abcdef000000000000000000000000000000000000000000000000",
), /content hash does not match/);
assert.throws(() => assertCampaignCuePackTemplateSummaryScope(platformSummary({
    payloadPath: "campaigncue/templates/platform/food/lunch-pack/pack-template.json",
})), /not content-addressed/);
assertCampaignCuePlatformTemplateCatalogScope({
    businessCategory: "food",
    catalogId: "food",
    catalogStatus: "active",
    data: [summary],
    overflowDocIds: ["food_2"],
    schemaVersion: 1,
    updatedAt: 1,
    updatedBy: "seed",
}, "food");
assert.equal(buildCampaignCuePackTemplateOverflowDocId("food", 1), "food");
assert.equal(buildCampaignCuePackTemplateOverflowDocId("food", 2), "food_2");
assert.equal(isCampaignCuePackTemplateCatalogIdForCategory("food_2", "food"), true);
assert.equal(isCampaignCuePackTemplateCatalogIdForCategory("retail_2", "food"), false);
assertCampaignCuePlatformTemplateCatalogScope({
    businessCategory: "food",
    catalogId: "food_2",
    catalogStatus: "active",
    data: [summary],
    schemaVersion: 1,
    updatedAt: 1,
    updatedBy: "seed",
}, "food", "food_2");
assert.throws(() => assertCampaignCuePlatformTemplateCatalogScope({
    businessCategory: "food",
    catalogId: "food_2",
    catalogStatus: "active",
    data: [summary],
    overflowDocIds: ["food_3"],
    schemaVersion: 1,
    updatedAt: 1,
    updatedBy: "seed",
}, "food", "food_2"), /Only the base/);
assert.throws(() => assertCampaignCuePlatformTemplateCatalogScope({
    businessCategory: "food",
    catalogId: "food",
    catalogStatus: "active",
    data: [summary],
    overflowDocIds: ["retail_2"],
    schemaVersion: 1,
    updatedAt: 1,
    updatedBy: "seed",
}, "food"), /overflow catalog identity/);
assert.throws(() => assertCampaignCuePlatformTemplateCatalogScope({
    businessCategory: "food",
    catalogId: "food",
    catalogStatus: "active",
    data: [summary, summary],
    schemaVersion: 1,
    updatedAt: 1,
    updatedBy: "seed",
}, "food"), /duplicate template id/);
assert.throws(() => assertCampaignCuePackTemplateSummaryScope(platformSummary({
    payloadPath: "campaigncue/templates/platform/retail/lunch-pack/pack-template.json",
})), /artifact path is invalid/);

const workspaceSummary = platformSummary({
    payloadPath: "campaigncue/templates/workspaces/cc_1_101/lunch-pack/versions/save-1/pack-template.json",
    qualityTier: "workspace_saved",
    templateType: "workspace",
});
assertCampaignCueWorkspaceTemplateIndexScope({
    data: [workspaceSummary],
    id: "default",
    schemaVersion: 1,
    updatedAt: 1,
    workspaceId,
}, workspaceId);
assert.throws(() => assertCampaignCueWorkspaceTemplateIndexScope({
    data: [workspaceSummary],
    id: "default",
    schemaVersion: 1,
    updatedAt: 1,
    workspaceId,
}, "cc_2_202"), /index identity is invalid/);
assert.throws(() => assertCampaignCuePackTemplateSummaryScope({
    ...workspaceSummary,
    payloadPath: "campaigncue/templates/workspaces/cc_1_101/lunch-pack/versions/save-1/arbitrary.json",
}, workspaceId), /artifact path is invalid/);

const payload: CampaignCuePackTemplatePayload = {
    decisionSeed: { ownerGoal: "sell_product", recipeId: "lunch", whyNow: [], whyThis: [] },
    factSlots: [{ ownerQuestion: "What is the price?", protected: true, required: true, type: "price" }],
    outputPackShape: { channels: [], copyBlocks: [], deliveryCards: [], printFormats: [], resultQuestion: "Did it help?" },
    reuseRules: { allowCueLayersSource: true, allowSavedAssetSource: true, staleFactPolicy: "rehydrate_or_block" },
    schemaVersion: 1,
    templateId: "lunch-pack",
    trustChecks: [],
};
assertCampaignCuePackTemplatePayloadIdentity(summary, payload);
assert.equal(campaignCueWorkspacePackTemplateSaveSchema.safeParse({
    businessCategory: "food",
    payload: {
        ...payload,
        decisionSeed: { ...payload.decisionSeed, ownerGoal: "collect_reviews" },
    },
    summary: {
        ...workspaceSummary,
        ownerGoals: ["collect_reviews"],
    },
    workspaceId,
}).success, true, "all CampaignCue owner goals accepted by template producers must be persistable");
assert.equal(campaignCueWorkspacePackTemplateSaveSchema.safeParse({
    businessCategory: "food",
    payload,
    summary: {
        ...workspaceSummary,
        requiredFactTypes: ["menu_item"],
        templateId: "other-template",
    },
    workspaceId,
}).success, false, "workspace template saves must reject summary and payload identity drift before persistence");
assert.throws(() => assertCampaignCuePackTemplatePayloadIdentity(summary, { ...payload, templateId: "other" }), /does not match/);
assert.throws(() => assertCampaignCuePackTemplatePayloadIdentity({
    ...summary,
    requiredFactTypes: ["menu_item"],
}, payload), /fact-slot metadata does not match/);
assert.throws(() => campaignCueWorkspacePackTemplateSaveSchema.parse({
    businessCategory: "food",
    payload: { ...payload, factSlots: [payload.factSlots[0], payload.factSlots[0]] },
    summary: workspaceSummary,
    workspaceId,
}), /Template fact slot types must be unique/);

const factContext = {
    assets: [],
    businessBrain: {
        brandKit: {
            playbook: {
                avoidList: [],
                brandFeel: [],
                inspirationNotes: [],
                productFocus: [],
                visualMotifs: [],
            },
            voice: "friendly" as const,
        },
        businessBrainId: "brain-1",
        businessType: "restaurant" as const,
        catalog: {
            items: [{
                available: true,
                id: "item-1",
                name: "Lunch combo",
                priceLabel: "INR 499",
                sourceRefs: ["menu:item-1"],
            }],
            services: [],
        },
        commercialPolicy: {
            currencyCode: "INR",
            discountApprovalRequired: true,
            discountsAllowed: true,
            doNotPromote: [],
            promotionsAllowed: true,
        },
        contacts: { whatsapp: "+91 99999 11111" },
        id: "brain-1",
        languagePolicy: {
            protectedFactReviewRequired: true as const,
            sourceLocale: "en-IN",
            targetLocales: ["en-IN"],
        },
        locality: "Pune",
        name: "Current Cafe",
        operatingPulse: {
            businessState: "normal" as const,
            capacityStatus: "unknown" as const,
            stockStatus: "available" as const,
        },
        presence: {},
        readiness: { blockers: [], status: "ready" as const, warnings: [] },
        sourceConfidence: 1,
        timezone: "Asia/Kolkata",
        locale: "en-IN",
        workspaceId,
    },
    sourceFacts: [],
    sourceInputs: [],
};
const foodSlots: CampaignCuePackTemplatePayload["factSlots"] = [
    { ownerQuestion: "Item?", protected: true, required: true, type: "menu_item" },
    { ownerQuestion: "Price?", protected: true, required: true, type: "price" },
    { ownerQuestion: "WhatsApp?", protected: true, required: true, type: "whatsapp_number" },
    { ownerQuestion: "Date?", protected: true, required: true, type: "availability_date" },
];
assert.deepEqual(
    getUnresolvedCampaignCuePackTemplateFactSlots(foodSlots, factContext).map((slot) => slot.type),
    ["availability_date"],
);
assert.deepEqual(getUnresolvedCampaignCuePackTemplateFactSlots(foodSlots, {
    ...factContext,
    sourceFacts: [{
        confidence: "manual" as const,
        freshness: "fresh" as const,
        id: "fact-availability",
        label: "Available date",
        risk: "low" as const,
        sourceRef: "manual:availability",
        sourceType: "manual" as const,
        value: "2026-07-14",
    }],
}).map((slot) => slot.type), []);

assert.equal(
    new Set(CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS).size,
    CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS.length,
    "output intent identifiers must be unique",
);
assert.deepEqual(
    CAMPAIGNCUE_OUTPUT_PICKER_ITEMS.map((item) => item.id),
    [...CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS],
    "the schema allowlist and output-intent registry must remain in the same canonical order",
);
const outputGroupIds = new Set(CAMPAIGNCUE_OUTPUT_PICKER_GROUPS.map((group) => group.id));
CAMPAIGNCUE_OUTPUT_PICKER_ITEMS.forEach((item) => {
    assert.equal(outputGroupIds.has(item.groupId), true, `${item.id} must reference a registered group`);
    assert.equal(new Set(item.channels).size, item.channels.length, `${item.id} channels must be unique`);
    assert.equal(new Set(item.outputTypes).size, item.outputTypes.length, `${item.id} output types must be unique`);
    item.requiredFactGroups.forEach((requirement) => {
        assert.ok(requirement.factTypes.length, `${item.id} requirements must contain an accepted fact alternative`);
        assert.equal(new Set(requirement.factTypes).size, requirement.factTypes.length, `${item.id} fact alternatives must be unique`);
    });
});

const whatsappIntent = getCampaignCueOutputPickerItem("whatsapp_sales_pack");
assert.ok(whatsappIntent);
assert.deepEqual(
    getUnresolvedCampaignCueOutputIntentRequirements(whatsappIntent, factContext),
    [],
    "a confirmed item, price and WhatsApp number satisfy the sales-pack any-of requirements",
);
const bookingIntent = getCampaignCueOutputPickerItem("booking_push_pack");
assert.ok(bookingIntent);
assert.equal(campaignCueOutputIntentSupportsOwnerGoal(bookingIntent, "fill_slots"), true);
assert.equal(campaignCueOutputIntentSupportsOwnerGoal(bookingIntent, "sell_product"), false);
assert.deepEqual(
    getUnresolvedCampaignCueOutputIntentRequirements(bookingIntent, factContext).map((requirement) => requirement.ownerQuestion),
    [
        "Confirm the available booking time or capacity before preparing this pack.",
        "Choose the service this booking pack should promote.",
    ],
);
assert.equal(
    campaignCueOutputItemMatchesTemplate(whatsappIntent, platformSummary({ templateKind: "editor_layout" })),
    false,
    "a shared price fact alone cannot make an incompatible editor layout match a sales-pack intent",
);
assert.equal(
    campaignCueOutputItemMatchesTemplate(whatsappIntent, platformSummary()),
    true,
    "a compatible campaign template with a matching output remains selectable",
);
assert.equal(getCampaignCueOutputPickerItem("google_local_update")?.outputTypes.includes("google_offer"), false);
assert.equal(CampaignCueCreateCampaignSchema.safeParse({
    channels: ["whatsapp"],
    idempotencyKey: "create_intent_123",
    outputIntentId: "whatsapp_sales_pack",
    sourceTemplateId: "lunch-pack",
}).success, true);
assert.equal(CampaignCueCreateCampaignSchema.safeParse({
    channels: ["whatsapp"],
    outputIntentId: "whatsapp_sales_pack",
    sourceTemplateId: "lunch-pack",
}).success, false, "campaign creation requires a durable retry identity");
assert.equal(CampaignCueCreateCampaignSchema.safeParse({
    outputIntentId: "unknown_intent",
}).success, false, "unknown output intent identifiers must fail at the API boundary");
assert.equal(CampaignCueCreateCampaignSchema.safeParse({
    outputIntentId: "whatsapp_sales_pack",
    unsafeField: true,
}).success, false, "campaign creation rejects unknown mass-assignment fields");
assert.equal(CampaignCueCreateCampaignSchema.safeParse({
    outputIntentId: "whatsapp_sales_pack",
    reuseCampaignId: "campaign_123",
}).success, false, "reuse and output-intent requests cannot be combined");
assert.throws(() => campaignCueWorkspacePackTemplateSaveSchema.parse({
    businessCategory: "food",
    payload,
    previewDataUrl: "data:text/html;base64,PHNjcmlwdD4=",
    summary: {
        ...workspaceSummary,
        payloadPath: undefined,
    },
    workspaceId,
}), /Preview must be a PNG, JPEG, or WebP data URL/);

console.log("CampaignCue pack template boundary tests passed.");
