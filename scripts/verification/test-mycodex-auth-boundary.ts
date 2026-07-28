import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
    createMyCodexSessionToken,
    isMyCodexAccessConfigured,
    sanitizeMyCodexReturnTo,
    verifyMyCodexSessionToken,
} from "../../src/lib/mycodex/auth";
import {
    MYCODEX_MARKDOWN_MAX_BYTES,
    resolveMyCodexDocument,
} from "../../src/lib/mycodex/docs";

const originalSessionSecret = process.env.MYCODEX_SESSION_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const originalUsername = process.env.MYCODEX_BASIC_AUTH_USER;
const originalPassword = process.env.MYCODEX_BASIC_AUTH_PASSWORD;

async function run(): Promise<void> {
    assert.equal(sanitizeMyCodexReturnTo("/queue?from=home#next"), "/queue?from=home#next");
    assert.equal(sanitizeMyCodexReturnTo("//evil.example"), "/");
    assert.equal(sanitizeMyCodexReturnTo("/\\evil.example"), "/");
    assert.equal(sanitizeMyCodexReturnTo("/%5cevil.example"), "/");
    assert.equal(sanitizeMyCodexReturnTo("/%2f%2fevil.example"), "/");
    assert.equal(sanitizeMyCodexReturnTo("/api/document"), "/");
    assert.equal(sanitizeMyCodexReturnTo("/%61pi/document"), "/");
    assert.equal(sanitizeMyCodexReturnTo("/sites/mycodex"), "/");
    assert.equal(sanitizeMyCodexReturnTo("/login?returnTo=/queue"), "/");
    assert.equal(sanitizeMyCodexReturnTo("https://evil.example"), "/");

    delete process.env.MYCODEX_SESSION_SECRET;
    process.env.NEXTAUTH_SECRET = "must-not-sign-mycodex";
    process.env.MYCODEX_BASIC_AUTH_PASSWORD = "must-not-sign-mycodex-either";
    process.env.MYCODEX_BASIC_AUTH_USER = "owner";
    assert.equal(isMyCodexAccessConfigured(), false);
    assert.equal(
        await createMyCodexSessionToken("owner"),
        null,
        "MenuList NextAuth/password secrets must not substitute for the MyCodex session secret",
    );

    process.env.MYCODEX_SESSION_SECRET = "dedicated-mycodex-test-secret";
    assert.equal(isMyCodexAccessConfigured(), true);
    const token = await createMyCodexSessionToken("owner");
    assert.ok(token);
    assert.equal(await verifyMyCodexSessionToken(token), true);
    assert.equal(await verifyMyCodexSessionToken(`${token}tampered`), false);

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mycodex-auth-boundary-"));
    const outsideFile = path.join(tempDir, "outside.md");
    const symlinkPath = path.resolve("__docs__/.mycodex-outside-test.md");
    const oversizedPath = path.resolve("__docs__/.mycodex-oversized-test.md");
    try {
        await fs.writeFile(outsideFile, "# Outside\n\nMust not be readable.");
        await fs.symlink(outsideFile, symlinkPath);
        await fs.writeFile(oversizedPath, Buffer.alloc(MYCODEX_MARKDOWN_MAX_BYTES + 1, 65));

        const escaped = await resolveMyCodexDocument([".mycodex-outside-test"]);
        assert.equal(escaped.resolvedFilePath, null);
        assert.match(escaped.markdown, /Document Not Found/);

        const oversized = await resolveMyCodexDocument([".mycodex-oversized-test"]);
        assert.equal(oversized.resolvedFilePath, null);
        assert.match(oversized.markdown, /Document Not Found/);
    } finally {
        await Promise.allSettled([
            fs.unlink(symlinkPath),
            fs.unlink(oversizedPath),
            fs.rm(tempDir, { force: true, recursive: true }),
        ]);
    }

    process.stdout.write("MyCodex auth boundary tests passed.\n");
}

run().finally(() => {
    if (originalSessionSecret === undefined) delete process.env.MYCODEX_SESSION_SECRET;
    else process.env.MYCODEX_SESSION_SECRET = originalSessionSecret;
    if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
    if (originalUsername === undefined) delete process.env.MYCODEX_BASIC_AUTH_USER;
    else process.env.MYCODEX_BASIC_AUTH_USER = originalUsername;
    if (originalPassword === undefined) delete process.env.MYCODEX_BASIC_AUTH_PASSWORD;
    else process.env.MYCODEX_BASIC_AUTH_PASSWORD = originalPassword;
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
