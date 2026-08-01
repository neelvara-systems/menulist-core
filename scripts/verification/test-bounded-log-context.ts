import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getBoundedLogValueContext } from "../../src/lib/monitoring/boundedLogContext";

assert.deepEqual(getBoundedLogValueContext("value", null), {
    valuePresent: false,
    valueLength: 0,
});
assert.deepEqual(getBoundedLogValueContext("value", ""), {
    valuePresent: false,
    valueLength: 0,
});
assert.deepEqual(getBoundedLogValueContext("value", " abc "), {
    valuePresent: true,
    valueLength: 5,
});
assert.deepEqual(getBoundedLogValueContext("value", 123), {
    valuePresent: true,
    valueLength: 3,
});

const throwingValue = {
    toString(): string {
        throw new Error("must not be called");
    },
};
assert.deepEqual(getBoundedLogValueContext("value", throwingValue), {
    valuePresent: true,
    valueLength: 0,
});
assert.deepEqual(getBoundedLogValueContext("value", Symbol("secret")), {
    valuePresent: true,
    valueLength: 0,
});

const repoRoot = path.resolve(__dirname, "../..");
const sourceFiles: string[] = [];
const collectSourceFiles = (directory: string): void => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collectSourceFiles(fullPath);
        } else if (/\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
            sourceFiles.push(fullPath);
        }
    });
};
collectSourceFiles(path.join(repoRoot, "src"));

const unsafeUnknownCoercion = /getBounded\w*StringContext\s*=\s*\([\s\S]{0,180}?value:\s*unknown[\s\S]{0,500}?String\(value(?:\s*\?\?\s*["']{2})?\)/;
assert.match(
    "const getBoundedExampleStringContext = (label: string, value: unknown) => { let normalized = ''; normalized = value === undefined || value === null ? '' : String(value); return { [label]: normalized.length }; };",
    unsafeUnknownCoercion,
);
sourceFiles.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.equal(
        unsafeUnknownCoercion.test(source),
        false,
        `${path.relative(repoRoot, file)} must not coerce unknown diagnostic context`,
    );
    if (
        source.includes("getBoundedLogValueContext")
        && !file.endsWith(path.join("monitoring", "boundedLogContext.ts"))
    ) {
        assert.match(
            source,
            /from ['"]@lib\/monitoring\/boundedLogContext['"]/,
            `${path.relative(repoRoot, file)} must import the shared projector`,
        );
    }
});

console.log("Bounded log context regression passed.");
