#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const arguments = process.argv.slice(2);
const productArgumentIndex = arguments.indexOf('--product');
const selectedProduct = productArgumentIndex >= 0 ? arguments[productArgumentIndex + 1] : null;
const MENULIST_SIBLING_ROUTE_PATTERN = /^src\/app\/api\/(?:answerlattice|campaigncue|signaldesk|growthos|kitstamp|mycodex|neelvara)(?:\/|$)/i;

if (selectedProduct && selectedProduct !== 'menulist') {
  throw new Error(`Unsupported failure-observability product filter: ${selectedProduct}`);
}
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (content, token, label) => {
  assert(content.includes(token), `${label} must include ${token}`);
};

const globalError = read('src/app/global-error.tsx');
const appError = read('src/app/error.tsx');
const globalPagesError = read('src/app/(global-pages)/error.tsx');
const clientError = read('src/app/client/error.tsx');
const layoutProvider = read('src/providers/layoutProvider.tsx');
const errorReport = read('src/components/shared/debug/ErrorReportButton.tsx');
const localLogs = read('src/lib/localLogs/localLogsTracker.ts');
const consoleBuffer = read('src/lib/debug/clientConsoleBuffer.ts');
const instrumentationClient = read('instrumentation-client.ts');
const ticketCache = read('src/hooks/useTicketCache.ts');
const sentryShared = read('src/lib/monitoring/sentryShared.ts');

for (const [label, content, code] of [
  ['global error boundary', globalError, 'global_error_boundary_rendered'],
  ['app error boundary', appError, 'app_error_boundary_rendered'],
  ['global-pages error boundary', globalPagesError, 'global_pages_error_boundary_rendered'],
  ['client menu error boundary', clientError, 'client_menu_error_boundary'],
]) {
  includes(content, code, label);
  assert(!content.includes('error.message}'), `${label} must not render raw error text`);
}

includes(globalError, "getBoundedErrorStringField(error, 'digest')", 'global error descriptor-safe digest admission');
assert(!globalError.includes('error?.digest'), 'global error boundary must not invoke an error digest getter');

includes(globalPagesError, 'onClick={() => reset()}>Try Again</Button>', 'global-pages in-place retry');
includes(globalPagesError, 'onClick={() => window.location.reload()}>Refresh Page</Button>', 'global-pages explicit hard refresh');
includes(globalPagesError, 'href={HELP_ROUTE}>Get Help</Button>', 'global-pages Help handoff');
assert(!globalPagesError.includes('clearBrowserCache'), 'ordinary error recovery must not delete Cache Storage');
assert(!globalPagesError.includes("We're working on a fix"), 'error UI must not claim active support work');
assert(!globalPagesError.includes('Contact Us</Button>'), 'retry must not be mislabeled as contact');

includes(layoutProvider, 'return <LayoutFailureFallback />;', 'layout failure non-recursive fallback');
includes(layoutProvider, 'role="alert"', 'layout failure semantics');
assert(!layoutProvider.includes('fallback={<SimpleLayout>{children}</SimpleLayout>}'), 'layout boundary must not rerender the failed tree as its fallback');

includes(errorReport, "setStatus(nextReportId ? 'sent' : 'copy_ready')", 'diagnostic delivery acknowledgement');
includes(errorReport, 'Automatic reporting is unavailable. Copy the details for support.', 'diagnostic no-backend truth');
includes(errorReport, 'normalizeRuntimeDiagnosticUrl(window.location.href, window.location.origin)', 'diagnostic current URL minimization');
includes(errorReport, 'normalizeRuntimeDiagnosticUrl(document.referrer, window.location.origin)', 'diagnostic referrer minimization');
includes(errorReport, "getBoundedErrorStringField(error, 'digest')", 'diagnostic digest descriptor-safe admission');
includes(errorReport, 'getBoundedErrorName(error)', 'diagnostic error-name descriptor-safe admission');
assert(!errorReport.includes('location: window.location.href'), 'diagnostics must not retain raw query-bearing current URLs');
assert(!errorReport.includes('referrer: document.referrer'), 'diagnostics must not retain raw referrer paths or queries');
assert(!errorReport.includes('digest: error?.digest'), 'diagnostics must not invoke an error digest getter');
assert(!errorReport.includes('errorName: error?.name'), 'diagnostics must not invoke an error name getter');
assert(!errorReport.includes('Report queued.'), 'diagnostics must not claim an unconfirmed queue');

includes(localLogs, "event: 'window_error'", 'bounded browser error capture');
includes(localLogs, "event: 'unhandled_rejection'", 'bounded rejection capture');
assert(!localLogs.includes("capture('error', e.message)"), 'ticket logs must not retain raw browser error messages');
assert(!localLogs.includes('String(e.reason)'), 'ticket logs must not stringify raw rejection payloads');
for (const content of [localLogs, consoleBuffer]) {
  includes(content, 'emailTextPattern', 'diagnostic bare-email redaction');
  includes(content, 'bearerTextPattern', 'diagnostic bearer redaction');
  includes(content, 'sanitizeLogData({ value }).value', 'diagnostic contained object projection');
  assert(!content.includes('JSON.stringify(value,'), 'diagnostic buffers must not invoke unknown toJSON hooks');
  assert(!content.includes('sanitizeLogText(String(value))'), 'diagnostic buffers must not broadly stringify unknown values');
}

includes(instrumentationClient, 'sendDefaultPii: false', 'client monitoring PII boundary');
includes(instrumentationClient, 'maskAllInputs: true', 'replay input masking');
includes(instrumentationClient, 'maskAllText: true', 'replay text masking');
includes(instrumentationClient, 'blockAllMedia: true', 'replay media blocking');
includes(instrumentationClient, 'networkCaptureBodies: false', 'replay network body denial');
includes(instrumentationClient, 'networkDetailAllowUrls: []', 'replay network detail deny-by-default');
includes(instrumentationClient, 'beforeAddRecordingEvent: () => null', 'replay custom URL-bearing frame denial');
includes(instrumentationClient, 'beforeSendTransaction(event)', 'client trace sanitizer');
includes(sentryShared, 'sanitizeMonitoringEvent', 'monitoring event sanitizer');
includes(sentryShared, 'summarizeMonitoringString', 'monitoring string minimization');

includes(ticketCache, 'const scopedTickets = cachedTickets.scopeKey === scopeKey ? cachedTickets.tickets : [];', 'tenant-scoped last-known ticket truth');
includes(ticketCache, 'return scopedTickets;', 'failed refresh tenant-scoped last-known ticket truth');
assert(!ticketCache.includes('failed refresh as a confirmed empty inbox.\\n                return [];'), 'failed ticket refresh must not become a confirmed empty inbox');

const routeRoot = path.join(ROOT, 'src/app/api');
const routeFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.name === 'route.ts') routeFiles.push(absolute);
  }
};
walk(routeRoot);

const rawMessageAllowlist = new Map([
  ['src/app/api/campaigncue/campaigns/[campaignId]/offer-page/route.ts', ['CampaignCueOfferPageMutationError']],
  ['src/app/api/answerlattice/public-api-key/route.ts', ['AnswerlatticePublicApiKeyStoreError']],
  ['src/app/api/helpCenter/search-kb/route.ts', ['AnswerlatticeSupportSearchCapacityError']],
  ['src/app/api/widget/search/route.ts', ['AnswerlatticeSupportSearchCapacityError']],
  ['src/app/api/answerlattice/answer-tests/run/route.ts', ['AnswerlatticeAnswerTestRunConflictError', 'AnswerlatticeAnswerTestCapacityError']],
  ['src/app/api/answerlattice/answer-tests/release-check/route.ts', ['AnswerlatticeAnswerTestRunConflictError', 'AnswerlatticeAnswerTestCapacityError']],
  ['src/app/api/answerlattice/answer-tests/route.ts', ['AnswerlatticeAnswerTestSummaryTooLargeError']],
  ['src/app/api/answerlattice/integrations/route.ts', ['IntegrationConfigInputError']],
  ['src/app/api/onboarding/create-subscription/route.ts', ['BillingTaxProfileError']],
  ['src/app/api/projects/delete/route.ts', ['ProjectDeleteRejection']],
  ['src/app/api/razorpay/create-subscription/route.ts', ['BillingTaxProfileError']],
  ['src/app/api/razorpay/create-topup-order/route.ts', ['BillingTaxProfileError']],
]);
for (const absolute of routeFiles) {
  const content = fs.readFileSync(absolute, 'utf8');
  if (!/\berror\s*:\s*(?:err|error|e)\.message\b/.test(content)) continue;
  const relative = path.relative(ROOT, absolute);
  if (selectedProduct === 'menulist' && MENULIST_SIBLING_ROUTE_PATTERN.test(relative)) continue;
  const requiredTypes = rawMessageAllowlist.get(relative);
  assert(requiredTypes, `${relative} returns an unreviewed raw exception message`);
  requiredTypes.forEach((typeName) => includes(content, `instanceof ${typeName}`, `${relative} typed public error`));
}

[
  '__docs__/global-failure-observability/README.md',
  '__docs__/global-failure-observability/global-failure-observability_spec.md',
  '__docs__/global-failure-observability/global-failure-observability_impl.md',
  '__docs__/global-failure-observability/global-failure-observability_marketing.md',
  '__docs__/global-failure-observability/global-failure-observability_website.md',
  '__docs__/global-failure-observability/global-failure-observability_helpdoc.md',
  '__docs__/global-failure-observability/global-failure-observability_firebase.md',
  '__docs__/global-failure-observability/global-failure-observability_mobile-support.md',
  '__docs__/global-failure-observability/global-failure-observability_test-cases.md',
  '__docs__/global-failure-observability/global-failure-observability_verification.md',
].forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log(selectedProduct === 'menulist'
  ? 'MenuList and shared failure-observability source boundary passed; explicit sibling-product API routes excluded.'
  : 'Global failure and observability source boundary passed.');
