#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type FeatureModule = typeof import("../../src/config/features");

const root = process.cwd();
const featureModulePath = require.resolve("../../src/config/features");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(directory: string, output: string[] = []): string[] {
    if (!fs.existsSync(directory)) return output;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute, output);
        else if (sourceExtensions.has(path.extname(entry.name))) output.push(absolute);
    }
    return output;
}

function loadFeatureModule(environment: Record<string, string | undefined>): FeatureModule {
    const previous = {
        ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING,
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
        NODE_ENV: process.env.NODE_ENV,
    };
    for (const [name, value] of Object.entries(environment)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    }
    delete require.cache[featureModulePath];
    const loaded = require(featureModulePath) as FeatureModule;
    for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    }
    return loaded;
}

const featureSourcePath = path.join(root, "src/config/features.ts");
const featureSource = fs.readFileSync(featureSourcePath, "utf8");
const declaredFlags = [...featureSource.matchAll(/^\s*(ENABLE_[A-Z0-9_]+)\s*:/gm)]
    .map((match) => match[1]);
assert.equal(new Set(declaredFlags).size, declaredFlags.length, "Feature registry contains duplicate flag declarations.");

const current = loadFeatureModule({});
const runtimeFlags = Object.keys(current.FEATURE_FLAGS).filter((name) => name.startsWith("ENABLE_"));
assert.deepEqual(runtimeFlags.sort(), [...declaredFlags].sort(), "Runtime feature registry differs from its source declarations.");

for (const flag of declaredFlags) {
    const typedFlag = flag as keyof typeof current.FEATURE_FLAGS;
    const value = current.FEATURE_FLAGS[typedFlag];
    assert.equal(typeof value, "boolean", `${flag} must resolve to a boolean runtime value.`);
    assert.equal(current.isFeatureEnabled(typedFlag), value, `${flag} helper result differs from its registry value.`);
    assert.equal(current.getFeatureValue(typedFlag), value, `${flag} value helper differs from its registry value.`);
}

const sourceFiles = walk(path.join(root, "src"))
    .filter((file) => file !== featureSourcePath)
    .sort();
const readers = new Map<string, string[]>();
const unknownReaders: string[] = [];
const directWrites: string[] = [];
for (const file of sourceFiles) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bFEATURE_FLAGS\.(ENABLE_[A-Z0-9_]+)\b/g)) {
        const flag = match[1];
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        if (!declaredFlags.includes(flag)) unknownReaders.push(`${relative}:${line}:${flag}`);
        const locations = readers.get(flag) ?? [];
        locations.push(`${relative}:${line}`);
        readers.set(flag, locations);
    }
    for (const match of source.matchAll(/\bFEATURE_FLAGS\.(ENABLE_[A-Z0-9_]+)\s*=(?!=)/g)) {
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        directWrites.push(`${relative}:${line}:${match[1]}`);
    }
}
assert.deepEqual(unknownReaders, [], "Runtime source reads undeclared feature flags.");
assert.deepEqual(directWrites, [], "Runtime source mutates the frozen feature registry directly.");

const developmentEmulator = loadFeatureModule({
    ENABLE_RATE_LIMITING: undefined,
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
    NODE_ENV: "development",
});
assert.equal(developmentEmulator.FEATURE_FLAGS.ENABLE_RATE_LIMITING, false, "Local emulator runtime must default rate limiting off.");

const explicitLocalEnable = loadFeatureModule({
    ENABLE_RATE_LIMITING: "true",
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
    NODE_ENV: "development",
});
assert.equal(explicitLocalEnable.FEATURE_FLAGS.ENABLE_RATE_LIMITING, true, "Explicit rate-limit enable must override the local default.");

const explicitProductionDisable = loadFeatureModule({
    ENABLE_RATE_LIMITING: "false",
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: undefined,
    NODE_ENV: "production",
});
assert.equal(explicitProductionDisable.FEATURE_FLAGS.ENABLE_RATE_LIMITING, false, "Explicit rate-limit disable must remain deterministic.");

const productionDefault = loadFeatureModule({
    ENABLE_RATE_LIMITING: undefined,
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: undefined,
    NODE_ENV: "production",
});
assert.equal(productionDefault.FEATURE_FLAGS.ENABLE_RATE_LIMITING, true, "Production must default rate limiting on.");

const flagsWithReaders = declaredFlags.filter((flag) => readers.has(flag));
const flagsWithoutReaders = declaredFlags.filter((flag) => !readers.has(flag));
const totalReaderLocations = [...readers.values()].reduce((sum, locations) => sum + locations.length, 0);
const sourceManifest = crypto.createHash("sha256");
for (const file of [featureSourcePath, ...sourceFiles.filter((candidate) => {
    const source = fs.readFileSync(candidate, "utf8");
    return /\bFEATURE_FLAGS\.ENABLE_[A-Z0-9_]+\b/.test(source);
})]) {
    sourceManifest.update(path.relative(root, file).split(path.sep).join("/"));
    sourceManifest.update("\0");
    sourceManifest.update(fs.readFileSync(file));
    sourceManifest.update("\0");
}

console.log("MenuList feature-flag runtime registry: PASS");
console.log(`Declared flags: ${declaredFlags.length}`);
console.log(`Flags with runtime readers: ${flagsWithReaders.length}`);
console.log(`Declared flags without runtime readers: ${flagsWithoutReaders.length}`);
console.log(`Runtime reader locations: ${totalReaderLocations}`);
console.log(`Source manifest: ${sourceManifest.digest("hex")}`);
console.log("Rate-limit environment states: development emulator default off; explicit on/off deterministic; production default on");
console.log("Scope: registry/helper/environment and reader integrity only; individual flag-on/flag-off product journeys require separate runtime evidence");
