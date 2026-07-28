const { Redis } = require('@upstash/redis');

const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();

if (!url || !token) {
  console.error('Upstash readiness blocked: required URL/token are not available in this shell');
  process.exit(2);
}

let host;
try {
  host = new URL(url).hostname;
} catch {
  console.error('Upstash readiness failed: URL is invalid');
  process.exit(1);
}

const timeoutMs = 3000;
const timeout = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('UPSTASH_READINESS_TIMEOUT')), timeoutMs);
});

(async () => {
  try {
    const redis = new Redis({ url, token });
    const response = await Promise.race([redis.ping(), timeout]);
    if (response !== 'PONG') throw new Error('UPSTASH_READINESS_UNEXPECTED_RESPONSE');
    console.log(JSON.stringify({
      host,
      originReview: 'Confirm in the Upstash console that this database was not created through DigitalOcean Marketplace',
      status: 'reachable',
    }));
  } catch (error) {
    console.error(JSON.stringify({
      host,
      status: 'unreachable',
      reason: error instanceof Error ? error.message : 'UPSTASH_READINESS_FAILED',
    }));
    process.exitCode = 1;
  }
})();
