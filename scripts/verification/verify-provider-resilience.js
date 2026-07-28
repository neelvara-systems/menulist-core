const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assertIncludes = (source, needle, label) => {
  if (!source.includes(needle)) throw new Error(`${label}: missing ${needle}`);
};

const rootRateLimit = read('src/lib/rateLimit.ts');
const rootHelpers = read('src/lib/rateLimit/helpers.ts');
const functionsRateLimit = read('functions/src/lib/rateLimit.ts');
const functionsSharedTrigger = read('functions/src/triggers/shared.ts');

for (const [source, label] of [
  [rootRateLimit, 'Next.js rate limit'],
  [functionsRateLimit, 'Functions rate limit'],
]) {
  [
    'ATOMIC_SLIDING_WINDOW_SCRIPT',
    "redis.call('ZREMRANGEBYSCORE'",
    "redis.call('ZADD'",
    'RATE_LIMIT_PROVIDER_TIMEOUT_MS = 1500',
    'RATE_LIMIT_PROVIDER_BYPASS_MS = 60_000',
    "reason: 'provider_unavailable'",
    'failClosedOnProviderError',
  ].forEach((needle) => assertIncludes(source, needle, label));
}

[
  'checkAIOperationLimit',
  'checkDataWriteLimit',
  'checkFileUploadLimit',
  'checkExpensiveAILimit',
  'checkBatchOperationLimit',
].forEach((helper) => assertIncludes(rootHelpers, helper, 'Root fail-closed helper registry'));
const rootFailClosedCount = (rootHelpers.match(/failClosedOnProviderError:\s*true/g) || []).length;
if (rootFailClosedCount < 5) {
  throw new Error(`Root expensive/mutation rate-limit helpers must fail closed; found ${rootFailClosedCount}`);
}

assertIncludes(
  functionsSharedTrigger,
  'failClosedOnProviderError: true',
  'Maps provider-call fail-closed boundary',
);
assertIncludes(
  functionsSharedTrigger,
  "rateLimit.reason === 'provider_unavailable'",
  'Maps provider-unavailable response',
);

console.log('Provider resilience verifier passed');
