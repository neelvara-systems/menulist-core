const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.resolve(__dirname, 'check-upstash-readiness.js');

const run = (env) => spawnSync(process.execPath, [script], {
  encoding: 'utf8',
  env: {
    PATH: process.env.PATH,
    ...env,
  },
  timeout: 5_000,
});

const missing = run({});
assert.equal(missing.status, 2);
assert.match(missing.stderr, /required URL\/token are not available/);

for (const unsafeUrl of [
  'http://redis.example.test',
  'https://user:password@redis.example.test',
  'https://redis.example.test/path',
  'https://redis.example.test?token=leak',
  'https://redis.example.test#fragment',
]) {
  const result = run({
    UPSTASH_REDIS_REST_TOKEN: 'test-token-not-sent',
    UPSTASH_REDIS_REST_URL: unsafeUrl,
  });
  assert.equal(result.status, 1, unsafeUrl);
  assert.match(result.stderr, /credential-free HTTPS origin/, unsafeUrl);
  assert.doesNotMatch(result.stderr, /test-token-not-sent/, unsafeUrl);
}

console.log('Upstash readiness URL boundary passed.');
