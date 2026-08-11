#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    CAMPAIGNCUE_READ_ONLY_RESULT_CONNECTOR_POSTURE,
    campaignCueCanRecordResultEvidence,
} from "../../src/constants/campaigncue/resultEvidence";
import {
    buildCampaignCueReadOnlyResultEvidence,
    buildCampaignCueResultEvidenceFingerprint,
} from "../../src/lib/campaigncue/resultEvidence";
import { getStoreLocalDateKey } from "../../src/lib/hours/hoursBoundary";
import { CampaignCueCampaignActionSchema } from "../../src/lib/validation/campaigncueSchemas";
import type { CampaignCueResultEvidenceInput } from "../../src/types/campaigncue";

const ROOT = path.resolve(__dirname, "..", "..");
let checks = 0;
const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    checks += 1;
};
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const evidenceInput: CampaignCueResultEvidenceInput = {
    provider: "google_business_profile",
    scope: "location_window",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-07",
    metrics: {
        impressions: 1200,
        websiteClicks: 18,
        callClicks: 0,
    },
    note: " Copied from the visible report. ",
};

const fingerprint = buildCampaignCueResultEvidenceFingerprint(evidenceInput);
check(/^[a-f0-9]{24}$/.test(fingerprint), "evidence fingerprint is compact and deterministic");
check(fingerprint === buildCampaignCueResultEvidenceFingerprint({ ...evidenceInput, note: "Another note" }), "owner notes do not change source identity");
check(fingerprint !== buildCampaignCueResultEvidenceFingerprint({
    ...evidenceInput,
    metrics: { ...evidenceInput.metrics, impressions: 1201 },
}), "changed report numbers change source identity");

const built = buildCampaignCueReadOnlyResultEvidence({
    input: {
        ...evidenceInput,
        metrics: {
            ...evidenceInput.metrics,
            reach: -1,
            messages: 1.5,
        },
    },
    recordedAt: "2026-08-10T10:00:00.000Z",
});
check(built.source === "owner_copied_report" && built.confidence === "manual", "active evidence remains owner-copied and manual");
check(built.attribution === "directional_not_campaign_attribution", "evidence cannot claim campaign attribution");
check(built.metrics.callClicks === 0, "zero is retained as a valid report number");
check(!("reach" in built.metrics) && !("messages" in built.metrics), "invalid metrics are removed before persistence");
check(built.note === "Copied from the visible report.", "source note is trimmed before persistence");

const validAction = {
    action: "record_result_evidence",
    idempotencyKey: "result_evidence_123",
    resultEvidence: evidenceInput,
};
check(CampaignCueCampaignActionSchema.safeParse(validAction).success, "valid copied report evidence passes the action boundary");
check(!CampaignCueCampaignActionSchema.safeParse({ ...validAction, resultEvidence: undefined }).success, "evidence action requires evidence");
check(!CampaignCueCampaignActionSchema.safeParse({ ...validAction, action: "mark_used" }).success, "unrelated actions reject evidence payloads");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, periodStart: "2026-02-30" },
}).success, "invalid calendar dates are rejected");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, periodStart: "2026-08-08", periodEnd: "2026-08-07" },
}).success, "reversed report windows are rejected");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, periodStart: "2026-01-01", periodEnd: "2026-04-03" },
}).success, "report windows longer than 92 days are rejected");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, metrics: {} },
}).success, "at least one report number is required");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, metrics: { impressions: -1 } },
}).success, "negative report numbers are rejected");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, metrics: { impressions: 1.25 } },
}).success, "fractional report numbers are rejected");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, metrics: { impressions: 1_000_000_001 } },
}).success, "unbounded report numbers are rejected");
check(!CampaignCueCampaignActionSchema.safeParse({
    ...validAction,
    resultEvidence: { ...evidenceInput, metrics: { impressions: 10, privateMetric: 1 } },
}).success, "unknown provider metrics are rejected");

check(campaignCueCanRecordResultEvidence("owner"), "owner can save copied report evidence");
check(campaignCueCanRecordResultEvidence("local_manager"), "local manager can save branch evidence");
check(!campaignCueCanRecordResultEvidence("reviewer"), "review-only role cannot save report evidence");
check(!campaignCueCanRecordResultEvidence(undefined), "missing role fails closed");
check(CAMPAIGNCUE_READ_ONLY_RESULT_CONNECTOR_POSTURE.providerApiStatus === "disabled_until_verified_connection", "provider API remains disabled");
check(
    getStoreLocalDateKey("Asia/Kolkata", new Date("2026-08-11T18:45:00.000Z")) === "2026-08-12",
    "future-date boundary follows the workspace date east of UTC",
);
check(
    getStoreLocalDateKey("America/Los_Angeles", new Date("2026-08-12T05:30:00.000Z")) === "2026-08-11",
    "future-date boundary follows the workspace date west of UTC",
);

const server = read("src/lib/campaigncue/server.ts");
const ui = read("src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx");
const database = read("src/constants/campaigncue/database.ts");
const gbpStore = read("src/database/integrations/gbp.ts");
const evidenceEventBlock = server.slice(
    server.indexOf('params.input.action === "record_result_evidence" ? {'),
    server.indexOf('} : params.input.action === "accept_experiment"'),
);
check(server.includes("ENABLE_CAMPAIGNCUE_READ_ONLY_RESULT_EVIDENCE"), "server enforces the result-evidence feature gate");
check(server.includes("CAMPAIGNCUE_RESULT_EVIDENCE_ROLE_SET"), "server enforces the shared role allowlist");
check(server.includes("A provider report cannot end in the future."), "server rejects future report windows");
check(server.includes("getStoreLocalDateKey(currentWorkspace.settings.timezone, now.toDate())"), "server evaluates future report dates in the current workspace timezone");
check(server.includes("CAMPAIGNCUE_CURRENT_WORKSPACE_RECHECK_ACTIONS"), "evidence save rechecks current membership inside the transaction");
check(server.includes('params.input.action !== "record_result_evidence"'), "provider evidence skips dashboard-summary mutation");
check(server.includes('"owner_result_evidence_recorded"'), "a bounded audit event identifies report evidence");
check(evidenceEventBlock.includes("metricNames") && !evidenceEventBlock.includes("note:"), "audit metadata records metric names without copied note text");
check(!evidenceEventBlock.includes("metrics:"), "audit metadata does not duplicate report values");
check(ui.indexOf("Numbers from a provider report") > ui.indexOf('tab === "analytics"'), "report evidence is rendered in Results");
check(ui.includes("This is not a live account connection"), "owner UI states the live-connection boundary");
check(ui.includes("It does not change Campaign Memory recommendations"), "owner UI states the learning boundary");
check(ui.includes("max={resultEvidenceTodayKey}"), "owner date inputs use the workspace-local date boundary");
check(gbpStore.includes('GBP_TOKEN_STORE_DISABLED = "GBP_TOKEN_STORE_DISABLED"'), "existing GBP token storage still fails closed");
check(!database.includes("RESULT_EVIDENCE"), "result evidence adds no Firestore collection");

process.stdout.write(`CampaignCue read-only result evidence verification passed (${checks} checks).\n`);
