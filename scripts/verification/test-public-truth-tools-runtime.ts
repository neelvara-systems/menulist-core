import assert from 'node:assert/strict';

import {
  MAX_MAPS_PLACE_ID_LENGTH,
  normalizeMapsGroundingPlaceId,
  normalizeMapsGroundingSourceUri,
} from '../../functions/src/logic/mapsPlaceIdentityBoundary';
import { buildPrintShareToolReport } from '../../src/lib/public-asset-tools/printShareToolReport';
import { buildBookingInquiryReadinessReport } from '../../src/lib/public-truth-tools/bookingInquiryReadinessReport';
import { buildBusinessFactsCopyPackReport } from '../../src/lib/public-truth-tools/businessFactsCopyPackReport';
import {
  buildMapsPlaceCheckIdentityBinding,
  buildOwnerGoogleMapsLinkIdentityBinding,
  EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION,
  normalizeExternalLocationIdentityBinding,
} from '../../src/lib/public-truth-tools/externalLocationIdentity';
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

assert.equal(
  EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION,
  'menulist.external-location-identity.v1',
);
const longMapsPlaceId = `E${'a'.repeat(682)}`;
assert.equal(normalizeMapsGroundingPlaceId(`places/${longMapsPlaceId}`), longMapsPlaceId);
assert.equal(
  normalizeMapsGroundingPlaceId(`E${'a'.repeat(MAX_MAPS_PLACE_ID_LENGTH)}`),
  undefined,
  'over-cap provider IDs must be rejected instead of truncated',
);
assert.equal(
  normalizeMapsGroundingSourceUri('https://www.google.com/maps/place/example'),
  'https://www.google.com/maps/place/example',
);
assert.equal(normalizeMapsGroundingSourceUri('https://example.com/maps/place/example'), undefined);
const ownerMapsBinding = buildOwnerGoogleMapsLinkIdentityBinding(
  ' https://www.google.com/maps/place/example ',
  '2026-07-19T10:00:00.000Z',
);
assert.deepEqual(ownerMapsBinding, {
  provider: 'google_maps',
  providerUri: 'https://www.google.com/maps/place/example',
  resolution: 'provider_uri',
  confirmationStatus: 'owner_confirmed',
  source: 'owner_maps_link',
  confirmedAt: '2026-07-19T10:00:00.000Z',
});
assert.equal(
  buildOwnerGoogleMapsLinkIdentityBinding(
    'https://example.com/not-google-maps',
    '2026-07-19T10:00:00.000Z',
  ),
  null,
);
const placeCheckBinding = buildMapsPlaceCheckIdentityBinding({
  placeId: 'places/ChIJ_model-text-must-not-win',
  uri: 'https://maps.google.com/?q=model-text-must-not-win',
  proposedFacts: { address: 'Provider text is not persisted in the binding.' },
  sources: [{
    title: 'Attributable Maps source',
    placeId: 'places/ChIJ_test-place',
    uri: 'https://maps.google.com/?q=example',
  }],
}, '2026-07-19T10:05:00.000Z');
assert.deepEqual(placeCheckBinding, {
  provider: 'google_maps',
  providerLocationId: 'ChIJ_test-place',
  providerUri: 'https://maps.google.com/?q=example',
  resolution: 'provider_location_id',
  confirmationStatus: 'owner_confirmed',
  source: 'maps_place_check',
  confirmedAt: '2026-07-19T10:05:00.000Z',
});
assert.equal(
  Object.prototype.hasOwnProperty.call(placeCheckBinding || {}, 'proposedFacts'),
  false,
  'grounded proposed facts must not enter the persisted identity binding',
);
assert.equal(
  buildMapsPlaceCheckIdentityBinding({
    placeId: 'ChIJ_test-place',
    uri: 'https://maps.google.com/?q=unattributed',
    sources: [],
  }, '2026-07-19T10:05:00.000Z'),
  null,
  'model-parsed identity without a matching Maps grounding source must not be persisted',
);
assert.deepEqual(
  normalizeExternalLocationIdentityBinding(placeCheckBinding),
  placeCheckBinding,
);
assert.equal(
  normalizeExternalLocationIdentityBinding({
    ...placeCheckBinding,
    confirmationStatus: 'proposed',
  }),
  null,
);
assert.equal(
  normalizeExternalLocationIdentityBinding({
    ...placeCheckBinding,
    provider: 'google_business_profile',
    source: 'maps_place_check',
  }),
  null,
  'provider and confirmation source must remain coherent',
);
assert.equal(
  normalizeExternalLocationIdentityBinding({
    ...ownerMapsBinding,
    providerLocationId: 'ChIJ_owner-link-cannot-prove-this',
    resolution: 'provider_location_id',
  }),
  null,
  'an owner-saved URI must not claim a stable provider location ID',
);
assert.equal(
  normalizeExternalLocationIdentityBinding({
    provider: 'google_maps',
    providerUri: 'https://maps.google.com/?q=missing-source-id',
    resolution: 'provider_uri',
    confirmationStatus: 'owner_confirmed',
    source: 'maps_place_check',
    confirmedAt: '2026-07-19T10:05:00.000Z',
  }),
  null,
  'Maps Place Check confirmation must require an attributable provider ID and URI',
);
assert.deepEqual(
  normalizeExternalLocationIdentityBinding({
    provider: 'google_business_profile',
    providerLocationId: '123456789',
    resolution: 'provider_location_id',
    confirmationStatus: 'owner_confirmed',
    source: 'gbp_connection',
    confirmedAt: '2026-07-19T10:05:00.000Z',
  }),
  {
    provider: 'google_business_profile',
    providerLocationId: '123456789',
    resolution: 'provider_location_id',
    confirmationStatus: 'owner_confirmed',
    source: 'gbp_connection',
    confirmedAt: '2026-07-19T10:05:00.000Z',
  },
);
assert.deepEqual(
  buildMapsPlaceCheckIdentityBinding({
    proposedFacts: {},
    sources: [{
      title: 'Fallback source',
      placeId: 'places/ChIJ_source-place',
      uri: 'https://www.google.com/maps/place/source',
    }],
  }, '2026-07-19T10:06:00.000Z'),
  {
    provider: 'google_maps',
    providerLocationId: 'ChIJ_source-place',
    providerUri: 'https://www.google.com/maps/place/source',
    resolution: 'provider_location_id',
    confirmationStatus: 'owner_confirmed',
    source: 'maps_place_check',
    confirmedAt: '2026-07-19T10:06:00.000Z',
  },
);
assert.deepEqual(
  buildMapsPlaceCheckIdentityBinding({
    proposedFacts: {},
    sources: [{
      title: 'Long valid provider identity',
      placeId: `places/${longMapsPlaceId}`,
      uri: 'https://www.google.com/maps/place/long-identity',
    }],
  }, '2026-07-19T10:07:00.000Z'),
  {
    provider: 'google_maps',
    providerLocationId: longMapsPlaceId,
    providerUri: 'https://www.google.com/maps/place/long-identity',
    resolution: 'provider_location_id',
    confirmationStatus: 'owner_confirmed',
    source: 'maps_place_check',
    confirmedAt: '2026-07-19T10:07:00.000Z',
  },
  'valid long Place IDs must be preserved exactly',
);

assert.equal(isPublicHttpsUrl('https://example.com/menu'), true);
assert.equal(isPublicHttpsUrl('example.com/menu'), true);
assert.equal(isPublicHttpsUrl('http://example.com/menu'), false);
assert.equal(isPublicHttpsUrl('https://localhost./menu'), false);
assert.equal(isPublicHttpsUrl('https://127.0.0.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://100.64.0.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://192.0.2.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://198.18.0.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://198.51.100.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://203.0.113.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://224.0.0.1/menu'), false);
assert.equal(isPublicHttpsUrl('https://255.255.255.255/menu'), false);
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
