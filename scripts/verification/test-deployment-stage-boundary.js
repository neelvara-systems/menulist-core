const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

require("ts-node").register({
  compilerOptions: { module: "CommonJS", target: "ES2022" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const {
  DeploymentStageConfigurationError,
  getDeploymentStage,
  resolveDeploymentStage,
} = require("../../src/constants/deploymentTargets");

const assertStage = (name, env, expectedStage) => {
  const resolution = resolveDeploymentStage(env);
  assert.deepEqual(resolution, {
    errorCode: null,
    stage: expectedStage,
    valid: true,
  }, name);
  assert.equal(getDeploymentStage(env), expectedStage, name);
};

const assertInvalid = (name, env, expectedCode, expectedFallbackStage) => {
  const resolution = resolveDeploymentStage(env);
  assert.equal(resolution.valid, false, name);
  assert.equal(resolution.errorCode, expectedCode, name);
  assert.equal(resolution.stage, expectedFallbackStage, name);
  assert.throws(
    () => getDeploymentStage(env),
    (error) => (
      error instanceof DeploymentStageConfigurationError
      && error.code === expectedCode
      && error.message === expectedCode
    ),
    name,
  );
};

assertStage("empty environment stays local", {}, "local");
assertStage("NODE_ENV production cannot promote deployment", { NODE_ENV: "production" }, "local");
assertStage("legacy public preview marker", { NEXT_PUBLIC_ENV: "preview" }, "preview");
assertStage("legacy public production marker", { NEXT_PUBLIC_ENV: "production" }, "production");
assertStage("official public preview marker", { NEXT_PUBLIC_VERCEL_ENV: "preview" }, "preview");
assertStage("official public production marker", { NEXT_PUBLIC_VERCEL_ENV: "production" }, "production");
assertStage("official public development marker", { NEXT_PUBLIC_VERCEL_ENV: "development" }, "local");
assertStage("server preview is authoritative", {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_ENV: "preview",
  NEXT_PUBLIC_VERCEL_ENV: "preview",
}, "preview");
assertStage("server production is authoritative", {
  VERCEL: "1",
  VERCEL_ENV: "production",
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
}, "production");

assertInvalid("invalid server marker", {
  VERCEL_ENV: "staging",
}, "INVALID_SERVER_VERCEL_STAGE", "local");
assertInvalid("invalid official public marker", {
  NEXT_PUBLIC_VERCEL_ENV: "staging",
}, "INVALID_PUBLIC_VERCEL_STAGE", "local");
assertInvalid("invalid legacy public marker", {
  NEXT_PUBLIC_ENV: "staging",
}, "INVALID_PUBLIC_DEPLOYMENT_STAGE", "local");
assertInvalid("Vercel requires its server marker", {
  VERCEL: "1",
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
}, "MISSING_SERVER_VERCEL_STAGE", "production");
assertInvalid("public markers cannot disagree", {
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "preview",
}, "PUBLIC_DEPLOYMENT_STAGE_CONFLICT", "preview");
assertInvalid("public marker cannot promote Vercel preview", {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_ENV: "production",
  NEXT_PUBLIC_VERCEL_ENV: "production",
}, "SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT", "preview");
assertInvalid("public marker cannot demote Vercel production", {
  VERCEL: "1",
  VERCEL_ENV: "production",
  NEXT_PUBLIC_ENV: "preview",
  NEXT_PUBLIC_VERCEL_ENV: "preview",
}, "SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT", "production");

const ROOT = path.resolve(__dirname, "../..");
const STAGE_ENV_KEYS = [
  "NEXT_PUBLIC_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
];

const cleanEnvironment = () => {
  const env = { ...process.env };
  STAGE_ENV_KEYS.forEach((key) => delete env[key]);
  return env;
};

const nextConfigLoader = [
  "const Module = require('node:module');",
  "const originalLoad = Module._load;",
  "Module._load = function(request) {",
  "  if (request === 'next-pwa') return () => (config) => config;",
  "  return originalLoad.apply(this, arguments);",
  "};",
  "const config = require('./next.config.js');",
].join(" ");

const loadNextConfig = (name, overrides) => {
  const child = spawnSync(process.execPath, [
    "-e",
    `${nextConfigLoader} process.stdout.write(JSON.stringify(config.env) + '\\n');`,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...cleanEnvironment(), ...overrides },
  });
  assert.equal(child.status, 0, `${name} failed:\n${child.stderr || child.stdout}`);
  const lines = child.stdout.trim().split("\n").filter(Boolean);
  assert.ok(lines.length > 0, `${name} returned no config state`);
  return JSON.parse(lines.at(-1));
};

const previewConfig = loadNextConfig("Vercel preview config", {
  NEXT_PUBLIC_ENV: "preview",
  NEXT_PUBLIC_VERCEL_ENV: "preview",
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
});
assert.equal(previewConfig.NEXT_PUBLIC_ENV, "preview");
assert.equal(previewConfig.NEXT_PUBLIC_VERCEL_ENV, "preview");

const publicOnlyConfig = loadNextConfig("public-only production config", {
  NEXT_PUBLIC_VERCEL_ENV: "production",
  NODE_ENV: "production",
});
assert.equal(publicOnlyConfig.NEXT_PUBLIC_ENV, "production");
assert.equal(publicOnlyConfig.NEXT_PUBLIC_VERCEL_ENV, "production");

const conflictingConfig = spawnSync(process.execPath, ["-e", "require('./next.config.js')"], {
  cwd: ROOT,
  encoding: "utf8",
  env: {
    ...cleanEnvironment(),
    NEXT_PUBLIC_ENV: "production",
    NEXT_PUBLIC_VERCEL_ENV: "production",
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "preview",
  },
});
assert.notEqual(conflictingConfig.status, 0);
assert.match(
  `${conflictingConfig.stderr}\n${conflictingConfig.stdout}`,
  /SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT/,
);

process.stdout.write("Deployment-stage boundary tests passed.\n");
