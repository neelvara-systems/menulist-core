import assert from 'node:assert/strict';

import { buildPrintShareToolReport } from '../../src/lib/public-asset-tools/printShareToolReport';
import { buildBookingInquiryReadinessReport } from '../../src/lib/public-truth-tools/bookingInquiryReadinessReport';
import { buildBusinessFactsCopyPackReport } from '../../src/lib/public-truth-tools/businessFactsCopyPackReport';
import {
  isLikelyPhoneNumber,
  normalizePhoneDigits,
} from '../../src/lib/public-truth-tools/phoneValidation';
import { buildPublicTruthCheckReport } from '../../src/lib/public-truth-tools/publicTruthCheckReport';
import {
  isPublicHttpsUrl,
  parsePublicHttpsUrl,
} from '../../src/lib/public-truth-tools/publicUrlValidation';
import {
  decodeShareableToolReportPayload,
  encodeShareableToolReportPayload,
  SHAREABLE_TOOL_REPORT_SCHEMA_VERSION,
  type ShareableToolReportPayload,
} from '../../src/lib/public-truth-tools/shareableToolReport';
import { buildWhatsAppActionLinkReport } from '../../src/lib/public-truth-tools/whatsappActionLinkReport';
import { buildWhatsAppReplyPackReport } from '../../src/lib/public-truth-tools/whatsappReplyPackReport';
import { normalizePublicContactSourcePath } from '../../src/lib/publicContact/contactBoundary';

function getCheckResult(
  checks: Array<{ id: string; result: string }>,
  id: string,
): string | undefined {
  return checks.find((check) => check.id === id)?.result;
}

assert.equal(isPublicHttpsUrl('https://example.com/menu'), true);
assert.equal(isPublicHttpsUrl('example.com/menu'), true);
assert.equal(isPublicHttpsUrl('http://example.com/menu'), false);
assert.equal(isPublicHttpsUrl('https://localhost./menu'), false);
assert.equal(isPublicHttpsUrl('https://127.0.0.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://[::1]/menu'), false);
assert.equal(isPublicHttpsUrl('https://[::ffff:127.0.0.1]/menu'), false);
assert.equal(isPublicHttpsUrl('https://bad..example.com/menu'), false);
assert.equal(isPublicHttpsUrl('https://user:password@example.com/menu'), false);
assert.equal(parsePublicHttpsUrl('https://example.com./menu')?.hostname, 'example.com.');

assert.equal(normalizePhoneDigits('+91 98765 43210'), '919876543210');
assert.equal(isLikelyPhoneNumber('+91 98765 43210', { requireCountryCode: true }), true);
assert.equal(isLikelyPhoneNumber('(020) 1234 5678'), true);
assert.equal(isLikelyPhoneNumber('+91 hello 98765 43210', { requireCountryCode: true }), false);

assert.equal(normalizePublicContactSourcePath('/tools/reports'), '/tools/reports');
assert.equal(normalizePublicContactSourcePath('/\\evil.example/path'), null);
assert.equal(normalizePublicContactSourcePath('/%5cevil.example/path'), null);
assert.equal(normalizePublicContactSourcePath('//evil.example/path'), null);

const urlKeywordReport = buildPublicTruthCheckReport({
  mode: 'self_report',
  businessName: 'Example Cafe',
  cityOrArea: 'London',
  publicUrl: 'https://example.com/menu-prices-hours-contact-order-london',
  menuOrServiceText: '',
  facts: {
    pricesShown: false,
    pricesNotNeeded: false,
    hoursShown: false,
    locationShown: false,
    contactShown: false,
    customerActionShown: false,
    photosShown: false,
  },
});
for (const checkId of ['prices', 'hours', 'location', 'contact', 'customer_actions']) {
  assert.notEqual(
    getCheckResult(urlKeywordReport.checks, checkId),
    'present',
    `URL text must not prove ${checkId}`,
  );
}

const bookingBase = {
  mode: 'self_report' as const,
  businessName: 'Example Clinic',
  cityOrArea: 'Pune',
  sourceKind: 'service_list' as const,
  publicUrl: 'https://example.com/services',
  actionText: 'Book a slot. We reply within one hour during opening hours and confirm availability.',
  primaryAction: 'book' as const,
  actionVisible: true,
  responseTimeShown: true,
  hoursShown: true,
  fallbackContactShown: true,
  confirmationExpectationShown: true,
  serviceAreaOrLocationShown: true,
};
for (const invalidDestination of [
  'tel:not-a-phone',
  'mailto:not-an-email',
  'whatsapp://evil?phone=919876543210',
  '+91hello9876543210',
]) {
  const report = buildBookingInquiryReadinessReport({
    ...bookingBase,
    actionLinkOrNumber: invalidDestination,
  });
  assert.equal(getCheckResult(report.checks, 'action_destination'), 'unclear');
}
for (const validDestination of [
  'tel:+91 98765 43210',
  'mailto:owner@example.com',
  'whatsapp://send?phone=919876543210',
  '+91 98765 43210',
]) {
  const report = buildBookingInquiryReadinessReport({
    ...bookingBase,
    actionLinkOrNumber: validDestination,
  });
  assert.equal(getCheckResult(report.checks, 'action_destination'), 'present');
}

const invalidContactPack = buildBusinessFactsCopyPackReport({
  mode: 'self_report',
  businessName: 'Example Cafe',
  cityOrArea: 'Pune',
  businessType: 'Cafe',
  offerSummary: 'Current food menu and pickup options',
  shortDescription: 'A local cafe serving the current menu all day.',
  hours: 'Open 9am to 6pm',
  locationOrServiceArea: 'Pune',
  phoneOrWhatsapp: '+91hello9876543210',
  currentCustomerLink: 'https://example.com/menu',
  actionLink: '',
  preferredAction: 'call',
});
assert.equal(getCheckResult(invalidContactPack.checks, 'contact_path'), 'missing');

const whatsAppReply = buildWhatsAppReplyPackReport({
  mode: 'self_report',
  actionLink: 'https://example.com/book',
  businessName: 'Example Cafe',
  cityOrArea: 'Pune',
  currentCustomerLink: 'https://example.com/menu',
  deliveryOrPickup: 'Pickup available',
  hours: 'Open 9am to 6pm',
  locationOrServiceArea: 'Pune',
  offerSummary: 'Current food menu and pickup options',
  paymentInfo: 'Pay at pickup',
  preferredAction: 'order',
  responseTime: 'Within one hour',
  whatsappNumber: '+91hello9876543210',
});
assert.equal(getCheckResult(whatsAppReply.checks, 'whatsapp_number'), 'missing');
assert.equal(whatsAppReply.previewLink, null);

const invalidWhatsAppLink = buildWhatsAppActionLinkReport({
  mode: 'self_report',
  businessName: 'Example Cafe',
  cityOrArea: 'Pune',
  whatsappNumber: '',
  existingWhatsappLink: 'whatsapp://evil?phone=919876543210',
  currentCustomerLink: 'https://example.com/menu',
  messageIntent: 'order',
  suggestedMessage: 'I would like to order from the current menu today.',
  menuOrServiceLinkAttached: true,
  hoursExpectationSet: true,
  fallbackActionShown: true,
});
assert.notEqual(getCheckResult(invalidWhatsAppLink.checks, 'click_to_chat_format'), 'present');

const printShareReport = buildPrintShareToolReport('qr-poster-maker', {
  accentColor: '#24564d',
  body: 'Scan for the current menu.',
  businessName: 'Example Cafe',
  cityOrArea: 'Pune',
  customerLink: 'https://[::ffff:127.0.0.1]/menu',
  customerLinkCurrent: true,
  customerActionClear: true,
  ethicalFeedbackOnly: true,
  headline: 'Current menu',
  hoursText: '',
  readyToPrintOrShare: true,
  secondaryText: 'One current customer link',
  whatsappNumber: '',
});
assert.equal(getCheckResult(printShareReport.checks, 'customer_link'), 'missing');
assert.equal(printShareReport.customerLink, '');

const payload: ShareableToolReportPayload = {
  schemaVersion: SHAREABLE_TOOL_REPORT_SCHEMA_VERSION,
  toolId: 'runtime-test',
  toolName: 'Runtime test',
  reportTitle: 'Runtime test report',
  generatedAt: '2026-07-16T00:00:00.000Z',
  status: 'unclear',
  statusTitle: 'Needs checking',
  statusDescription: 'One row needs checking.',
  checkedSourceText: 'Owner-entered fields only.',
  notCheckedText: 'No external source was fetched.',
  summary: {
    present: 1,
    missing: 0,
    unclear: 1,
    notChecked: 0,
    primaryNumber: 1,
    primaryLabel: 'Rows to fix',
  },
  checks: [
    {
      id: 'identity',
      label: 'Business identity',
      result: 'present',
      helperText: 'Identity was entered.',
      evidenceText: 'Owner-entered fields only.',
    },
    {
      id: 'hours',
      label: 'Hours',
      result: 'unclear',
      helperText: 'Add current hours.',
      evidenceText: 'Hours were not provided.',
    },
  ],
  setupJobList: [{ id: 'injected', label: 'Forged job', reason: 'Unrelated to checks' }],
  nextAction: {
    title: 'Complete setup',
    description: 'Add the missing facts.',
    cta: 'Continue',
    href: '/\\evil.example/path',
  },
  publicBoundary: ['No external source was fetched.'],
};

const normalizedPayload = decodeShareableToolReportPayload(encodeShareableToolReportPayload(payload));
assert.ok(normalizedPayload);
assert.equal(normalizedPayload.nextAction.href, '/create-menu');
assert.deepEqual(normalizedPayload.setupJobList.map((job) => job.id), ['hours']);

const mismatchedPayload = {
  ...payload,
  summary: { ...payload.summary, present: 99 },
};
assert.throws(
  () => encodeShareableToolReportPayload(mismatchedPayload as ShareableToolReportPayload),
  /shareable_tool_report_payload_invalid/,
);
const forgedEncoded = Buffer.from(JSON.stringify(mismatchedPayload), 'utf8').toString('base64url');
const originalConsoleError = console.error;
try {
  console.error = () => undefined;
  assert.equal(decodeShareableToolReportPayload(forgedEncoded), null);
} finally {
  console.error = originalConsoleError;
}

console.log('Public Truth Tools runtime boundary tests passed');
