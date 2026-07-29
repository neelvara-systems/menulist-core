import assert from "node:assert/strict";
import {
    readAuthAccountResponse,
    type AuthPasswordChangeResponse,
} from "../../src/lib/auth/accountClientResponses";

async function run(): Promise<void> {
    const validResponse = new Response(JSON.stringify({
        message: "Password changed successfully",
        reauthenticationRequired: true,
        success: true,
    }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
    });
    const valid = await readAuthAccountResponse<AuthPasswordChangeResponse>(
        validResponse,
        "password_change",
    );
    assert.equal(valid.success, true);
    assert.equal(valid.reauthenticationRequired, true);

    await assert.rejects(
        readAuthAccountResponse<AuthPasswordChangeResponse>(
            new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            }),
            "password_change",
        ),
        (error: unknown) => (
            error instanceof Error
            && (error as Error & { code?: string }).code === "AUTH_ACCOUNT_RESPONSE_INVALID"
        ),
        "password-change success without reauthenticationRequired must be rejected",
    );

    process.stdout.write("Auth account response boundary tests passed.\n");
}

void run();
