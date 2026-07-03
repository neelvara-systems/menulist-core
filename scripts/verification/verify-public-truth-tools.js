const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const VERIFIERS = [
  'verify-tools-hub.js',
  'verify-shareable-tool-reports.js',
  'verify-report-leads-boundary.js',
  'verify-public-truth-check.js',
  'verify-qr-link-health-check.js',
  'verify-menu-readability-check.js',
  'verify-customer-question-coverage-check.js',
  'verify-booking-inquiry-readiness-check.js',
  'verify-price-availability-gap-check.js',
  'verify-menu-pdf-cleanup-check.js',
  'verify-google-profile-basics-checklist.js',
  'verify-customer-link-preview.js',
  'verify-social-bio-link-check.js',
  'verify-whatsapp-action-link-check.js',
  'verify-hours-check.js',
  'verify-photo-gap-check.js',
];

for (const verifier of VERIFIERS) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'verification', verifier)], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('Public Truth Tools verification passed');
