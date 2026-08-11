const { Redis } = require('@upstash/redis');

const url = (process.env.MENULIST_UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim();
const token = (process.env.MENULIST_UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();

if (!url || !token) {
  console.error('Upstash readiness blocked: required URL/token are not available in this shell');
  process.exit(2);
}

let endpoint;
try {
  endpoint = new URL(url);
  if (
    endpoint.protocol !== 'https:'
    || !endpoint.hostname
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
    || (endpoint.pathname && endpoint.pathname !== '/')
  ) {
    throw new Error('UPSTASH_READINESS_URL_UNSAFE');
  }
} catch {
  console.error('Upstash readiness failed: URL must be a credential-free HTTPS origin');
  process.exit(1);
}
const host = endpoint.hostname;

const timeoutMs = 3000;
let timeoutId;
const timeout = new Promise((_, reject) => {
  timeoutId = setTimeout(() => reject(new Error('UPSTASH_READINESS_TIMEOUT')), timeoutMs);
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
  } finally {
    clearTimeout(timeoutId);
  }
})();
