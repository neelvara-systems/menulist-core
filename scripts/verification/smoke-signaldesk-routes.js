const http = require("http");
const https = require("https");

const BASE_URL = new URL(process.env.SIGNALDESK_SMOKE_BASE_URL || "http://localhost:3000");
const PUBLIC_HOST = process.env.SIGNALDESK_SMOKE_PUBLIC_HOST || "menulist.ai";
const ALLOW_RATE_LIMIT_UNAVAILABLE = process.env.SIGNALDESK_SMOKE_ALLOW_RATE_LIMIT_UNAVAILABLE === "1";

const results = [];

function request(pathname, options = {}) {
  const url = new URL(pathname, BASE_URL);
  const client = url.protocol === "https:" ? https : http;
  const headers = { ...(options.headers || {}) };
  if (options.host) {
    headers.Host = options.host;
    // Public-host routing is exercised as the canonical HTTPS request that the
    // deployed proxy receives. An HTTP forwarded protocol correctly triggers
    // the transport redirect before product/path isolation can be evaluated.
    if (!headers["x-forwarded-proto"]) headers["x-forwarded-proto"] = "https";
  }
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";

  return new Promise((resolve, reject) => {
    const req = client.request({
      hostname: url.hostname,
      method: options.method || "GET",
      path: `${url.pathname}${url.search}`,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      protocol: url.protocol,
      headers,
      timeout: 15000,
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          body,
          headers: res.headers,
          status: res.statusCode,
        });
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error(`Timed out requesting ${url.href}`));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function pass(label) {
  results.push({ label, status: "PASS" });
}

function assert(condition, label, detail) {
  if (!condition) {
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`${label}${suffix}`);
  }
  pass(label);
}

function headerIncludes(response, name, value) {
  return String(response.headers[name.toLowerCase()] || "").toLowerCase().includes(value.toLowerCase());
}

async function expectHead(pathname, label) {
  const response = await request(pathname, { method: "HEAD" });
  assert(response.status === 200, `${label} returns 200`, `received ${response.status}`);
  assert(headerIncludes(response, "x-robots-tag", "noindex"), `${label} is noindexed`);
}

async function main() {
  for (const pathname of [
    "/signaldesk",
    "/signaldesk/signin",
    "/signaldesk/opportunities",
    "/signaldesk/conversations",
    "/signaldesk/activations",
    "/signaldesk/controls",
    "/signaldesk/content",
    "/signaldesk/partners",
    "/signaldesk/settings",
    "/signaldesk/control-room",
  ]) {
    await expectHead(pathname, pathname);
  }

  const publicAlias = await request("/sd", { host: PUBLIC_HOST, method: "HEAD" });
  assert(publicAlias.status === 404, "/sd alias is not exposed on public MenuList host", `received ${publicAlias.status}`);

  for (const pathname of [
    "/signaldesk",
    "/signaldesk/signin",
    "/api/signaldesk/overview",
  ]) {
    const publicSignalDeskPath = await request(pathname, { host: PUBLIC_HOST, method: "HEAD" });
    assert(
      publicSignalDeskPath.status === 404,
      `${pathname} is not exposed on public MenuList host`,
      `received ${publicSignalDeskPath.status}`,
    );
    assert(headerIncludes(publicSignalDeskPath, "x-robots-tag", "noindex"), `${pathname} public-host denial is noindexed`);
  }

  const privatePage = await request("/signaldesk");
  assert(privatePage.status === 200, "/signaldesk unauthenticated page returns local dev shell", `received ${privatePage.status}`);
  assert(privatePage.body.includes("/signaldesk/signin?callbackUrl=%2Fsignaldesk"), "/signaldesk unauthenticated page redirects to the isolated SignalDesk sign-in");
  [
    "SIGNALDESK_SMTP_PASS",
    "SIGNALDESK_META_ACCESS_TOKEN",
    "SIGNALDESK_APIFY_API_TOKEN",
    "SIGNALDESK_WEBHOOK_SECRET",
  ].forEach((secretName) => {
    assert(!privatePage.body.includes(secretName), `/signaldesk HTML does not expose ${secretName}`);
  });

  const overview = await request("/api/signaldesk/overview");
  assert(overview.status === 401, "Overview API rejects unauthenticated requests", `received ${overview.status}`);

  const workspace = await request("/api/signaldesk/workspace?section=settings");
  assert(workspace.status === 401, "Workspace API rejects unauthenticated requests", `received ${workspace.status}`);

  const action = await request("/api/signaldesk/actions", {
    body: JSON.stringify({ action: "send-approved-message", payload: { approvalId: "approval_test", channel: "email" } }),
    method: "POST",
  });
  assert(action.status === 401, "Actions API rejects unauthenticated provider-send attempt", `received ${action.status}`);

  const killSwitch = await request("/api/signaldesk/kill-switches", {
    body: JSON.stringify({ scope: "email", status: "active", reason: "smoke" }),
    method: "POST",
  });
  assert(killSwitch.status === 401, "Kill-switch API rejects unauthenticated mutation", `received ${killSwitch.status}`);

  const unsignedWebhook = await request("/api/signaldesk/webhooks/apify", {
    body: JSON.stringify({ eventType: "actor.run.succeeded", runId: "smoke" }),
    method: "POST",
  });
  if (unsignedWebhook.status === 503 && ALLOW_RATE_LIMIT_UNAVAILABLE) {
    assert(headerIncludes(unsignedWebhook, "cache-control", "no-store"), "Unavailable webhook response is not cached");
    assert(Number(unsignedWebhook.headers["retry-after"] || 0) > 0, "Unavailable webhook response includes retry guidance");
    assert(unsignedWebhook.body.includes("Webhook temporarily unavailable"), "Unavailable webhook response is generic and safe");
  } else {
    assert(unsignedWebhook.status === 400, "Apify webhook rejects missing signature", `received ${unsignedWebhook.status}`);
  }

  const unknownWebhook = await request("/api/signaldesk/webhooks/unknown", {
    body: JSON.stringify({ eventType: "smoke" }),
    method: "POST",
  });
  assert(unknownWebhook.status === 404, "Unknown webhook provider returns 404", `received ${unknownWebhook.status}`);

  const unsignedOutcome = await request("/api/signaldesk/outcomes", {
    body: JSON.stringify({ eventId: "smoke-outcome" }),
    method: "POST",
  });
  if (unsignedOutcome.status === 503 && ALLOW_RATE_LIMIT_UNAVAILABLE) {
    assert(headerIncludes(unsignedOutcome, "cache-control", "no-store"), "Unavailable outcome response is not cached");
    assert(Number(unsignedOutcome.headers["retry-after"] || 0) > 0, "Unavailable outcome response includes retry guidance");
    assert(unsignedOutcome.body.includes("Outcome bridge temporarily unavailable"), "Unavailable outcome response is generic and safe");
  } else {
    assert(unsignedOutcome.status === 400, "Outcome bridge rejects missing signature", `received ${unsignedOutcome.status}`);
  }

  console.log(`SignalDesk route/API smoke passed (${results.length} checks)`);
}

main().catch((error) => {
  console.error("SignalDesk route/API smoke failed");
  console.error(error.message);
  console.error(`Base URL: ${BASE_URL.href}`);
  console.error("Start the local Next.js app first, then re-run this script.");
  process.exit(1);
});
