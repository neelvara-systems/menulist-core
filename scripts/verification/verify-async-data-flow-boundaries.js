const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_ROOTS = [
  'src',
  'functions/src',
  'functions-answerlattice/src',
  'functions-signaldesk/src',
];
const ASYNC_PROMISE_EXECUTOR = /new\s+Promise(?:\s*<[^;{}()]+>)?\s*\(\s*async\b/g;
const ASYNC_FOR_EACH = /\.forEach\s*\(\s*async\b/g;

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [relativePath] : [];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const violations = [];
for (const file of SOURCE_ROOTS.flatMap(walk)) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const [label, expression] of [
    ['async Promise executor', ASYNC_PROMISE_EXECUTOR],
    ['async forEach callback', ASYNC_FOR_EACH],
  ]) {
    expression.lastIndex = 0;
    let match;
    while ((match = expression.exec(source)) !== null) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${file}:${line} ${label}`);
    }
  }
}

assert(violations.length === 0, `Unsafe async data-flow patterns found:\n${violations.join('\n')}`);

const paymentHook = fs.readFileSync(path.join(ROOT, 'src/hooks/usePaymentHandler.ts'), 'utf8');
assert((paymentHook.match(/ondismiss: \(\) => reject\(createCheckoutDismissedError\(\)\)/g) || []).length === 3, 'Every Razorpay checkout must settle on modal dismissal');
assert(paymentHook.includes("readPaymentResponseJson<unknown>"), 'Payment provider responses must enter through unknown runtime shapes');
assert(paymentHook.includes('const checkoutInFlightRef = useRef(false);'), 'Payment checkout must use a synchronous duplicate-operation guard');
assert((paymentHook.match(/if \(checkoutInFlightRef\.current\)/g) || []).length === 4, 'Subscription, upgrade, top-up, and onboarding checkout entry points must reject same-tick duplicates');
assert((paymentHook.match(/checkoutInFlightRef\.current = false;/g) || []).length === 4, 'Every guarded checkout path must release its duplicate-operation guard after settlement');

const pdfUtility = fs.readFileSync(path.join(ROOT, 'src/components/templates/main-app/projects/utils/pdfUtils.ts'), 'utf8');
assert(pdfUtility.includes('pdfjsLoadPromise = null;'), 'PDF loader failures must permit retry');
assert(pdfUtility.includes("name: `${file.name.replace(/\\.pdf$/i, '')}-page-${i}.jpg`"), 'PDF page filenames must use the actual one-based page number');

for (const loggerFile of [
  'src/database/loggers/applicationLogger.ts',
  'src/database/loggers/errorLogger.ts',
]) {
  const source = fs.readFileSync(path.join(ROOT, loggerFile), 'utf8');
  assert(source.includes('push(getCollectionRef())'), `${loggerFile} must use collision-safe Firebase keys`);
  assert(!source.includes('onValue('), `${loggerFile} one-shot Promise readers must not leak realtime listeners`);
}

console.log('Async data-flow boundary verification passed');
