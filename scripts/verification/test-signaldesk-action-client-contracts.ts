import assert from "node:assert/strict";
import {
    isSignalDeskActionAcknowledgementData,
    runSignalDeskAction,
    type SignalDeskAction,
} from "../../src/database/signaldesk";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

const responseFor = (data: unknown): Response => new Response(
    JSON.stringify({ data }),
    {
        headers: { "content-type": "application/json" },
        status: 200,
    },
);

const runWithResponse = async <Action extends SignalDeskAction>(
    action: Action,
    data: unknown,
) => {
    globalThis.fetch = async () => responseFor(data);
    return runSignalDeskAction(action, { fixture: true });
};

const expectRejectedResponse = async (
    label: string,
    action: SignalDeskAction,
    data: unknown,
) => {
    console.error = () => undefined;
    try {
        await assert.rejects(
            () => runWithResponse(action, data),
            (error: unknown) => (
                error instanceof Error
                && error.message === "SignalDesk action failed"
            ),
            label,
        );
    } finally {
        console.error = originalConsoleError;
    }
};

const assertCommonAcknowledgementContracts = async () => {
    const acknowledgement = {
        approvalId: "approval_1",
        duplicate: false,
        status: "approved",
    };
    assert.equal(isSignalDeskActionAcknowledgementData(acknowledgement), true);
    assert.deepEqual(
        await runWithResponse("review-approval", acknowledgement),
        acknowledgement,
        "A bounded status-and-identity acknowledgement did not pass",
    );

    const malformed: Array<[string, unknown]> = [
        ["truthy string", "approved"],
        ["truthy number", 1],
        ["truthy array", [{ approvalId: "approval_1" }]],
        ["empty object", {}],
        ["arbitrary object without an acknowledgement marker", { message: "ok" }],
        ["private root field", { approvalId: "approval_1", private: "internal" }],
        ["private nested field", { approvalId: "approval_1", result: { _private: true } }],
        ["oversized string", { approvalId: "approval_1", result: "x".repeat(10_001) }],
        ["oversized array", { approvalId: "approval_1", rows: Array.from({ length: 501 }, () => null) }],
    ];
    for (const [label, value] of malformed) {
        assert.equal(isSignalDeskActionAcknowledgementData(value), false, `${label} passed the direct guard`);
        await expectRejectedResponse(label, "review-approval", value);
    }
    assert.equal(
        isSignalDeskActionAcknowledgementData({ approvalId: "approval_1", result: Number.POSITIVE_INFINITY }),
        false,
        "A non-finite in-memory acknowledgement passed the direct guard",
    );

    await expectRejectedResponse(
        "The array-returning content-draft action must use an object response DTO",
        "generate-content-distribution-drafts",
        [{ contentDraftId: "content_draft_1", status: "draft" }],
    );
    assert.deepEqual(
        await runWithResponse("generate-content-distribution-drafts", {
            drafts: [{ contentDraftId: "content_draft_1", status: "draft" }],
        }),
        { drafts: [{ contentDraftId: "content_draft_1", status: "draft" }] },
        "The bounded content-draft object wrapper did not pass",
    );
};

const assertAiVolumeResultContract = async () => {
    const result = await runWithResponse("run-ai-volume-batch", {
        aiRunId: "ai_volume_1",
        childRunIds: ["ai_child_1"],
        requestFingerprintHash: "internal-hash-not-consumed-by-ui",
        status: "partial",
        volumeRunId: "ai_volume_1",
    });
    assert.deepEqual(result, {
        aiRunId: "ai_volume_1",
        status: "partial",
        volumeRunId: "ai_volume_1",
    }, "AI volume action did not project to its consumed identity/status contract");

    for (const [label, value] of [
        ["missing AI volume identity", { status: "completed", volumeRunId: "ai_volume_1" }],
        ["mismatched AI volume identity", { aiRunId: "ai_volume_1", status: "completed", volumeRunId: "ai_volume_2" }],
        ["unsupported AI volume status", { aiRunId: "ai_volume_1", status: "failed", volumeRunId: "ai_volume_1" }],
        ["private AI volume result", { aiRunId: "ai_volume_1", privateKey: "secret", status: "completed", volumeRunId: "ai_volume_1" }],
    ] as const) {
        await expectRejectedResponse(label, "run-ai-volume-batch", value);
    }
};

const assertContentSourceResultContract = async () => {
    const result = await runWithResponse("upsert-content-source", {
        contentSourceId: "content_source_1",
        status: "active",
        title: "Owner proof source",
    });
    assert.deepEqual(
        result,
        { contentSourceId: "content_source_1" },
        "Content-source action did not project to its consumed identity contract",
    );

    for (const [label, value] of [
        ["missing content-source identity", { status: "active" }],
        ["blank content-source identity", { contentSourceId: " ", status: "active" }],
        ["non-canonical content-source identity", { contentSourceId: " content_source_1 ", status: "active" }],
        ["path-shaped content-source identity", { contentSourceId: "sources/content_source_1", status: "active" }],
        ["private content-source result", { contentSourceId: "content_source_1", secret: "must-not-pass", status: "active" }],
    ] as const) {
        await expectRejectedResponse(label, "upsert-content-source", value);
    }
};

async function main() {
    try {
        await assertCommonAcknowledgementContracts();
        await assertAiVolumeResultContract();
        await assertContentSourceResultContract();
        console.log("SignalDesk client action-response contract verification passed.");
    } finally {
        globalThis.fetch = originalFetch;
        console.error = originalConsoleError;
    }
}

void main().catch((error) => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    originalConsoleError(error);
    process.exitCode = 1;
});
