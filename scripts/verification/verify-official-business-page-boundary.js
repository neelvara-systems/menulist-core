#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const root = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label}: expected to find ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label}: did not expect to find ${needle}`);
}

function verifyPackageScript() {
  const pkg = JSON.parse(read('package.json'));
  assert(
    pkg.scripts['verify:official-business-page-boundary'] === 'node scripts/verification/verify-official-business-page-boundary.js',
    'package.json must expose verify:official-business-page-boundary',
  );
}

function verifyPublicLinkHelperRuntime() {
  const {
    normalizeOBPExternalHttpsUrl,
    normalizeOBPGoogleMapsUrl,
    normalizeOBPReviewUrl,
    normalizeOBPSocialUrl,
    normalizeOBPWebsiteUrl,
  } = require(path.join(root, 'src/lib/obp/publicLinks.ts'));

  const accepted = [
    ['generic HTTPS host fallback', normalizeOBPExternalHttpsUrl('example.com/order'), 'https://example.com/order'],
    ['explicit HTTPS URL', normalizeOBPExternalHttpsUrl('https://book.example.com/table?party=2'), 'https://book.example.com/table?party=2'],
    ['maps.google.com URL', normalizeOBPGoogleMapsUrl('https://maps.google.com/?q=restaurant'), 'https://maps.google.com/?q=restaurant'],
    ['google maps path URL', normalizeOBPGoogleMapsUrl('https://www.google.com/maps/place/example'), 'https://www.google.com/maps/place/example'],
    ['Google write review URL', normalizeOBPReviewUrl('https://search.google.com/local/writereview?placeid=abc123'), 'https://search.google.com/local/writereview?placeid=abc123'],
    ['g.page review URL', normalizeOBPReviewUrl('https://g.page/example/review'), 'https://g.page/example/review'],
    ['Instagram handle fallback', normalizeOBPSocialUrl('instagram', '@menulist'), 'https://instagram.com/menulist'],
    ['YouTube short host fallback', normalizeOBPSocialUrl('youtube', 'youtu.be/example'), 'https://youtu.be/example'],
    ['Website host fallback', normalizeOBPWebsiteUrl('menulist.ai'), 'https://menulist.ai/'],
  ];

  for (const [label, actual, expected] of accepted) {
    assert(actual === expected, `${label}: expected ${expected}, received ${actual}`);
  }

  const rejected = [
    ['JavaScript URL', normalizeOBPExternalHttpsUrl('javascript:alert(1)')],
    ['HTTP URL', normalizeOBPExternalHttpsUrl('http://example.com/order')],
    ['Fake Google Maps host', normalizeOBPGoogleMapsUrl('https://evil-google.com/maps/place/example')],
    ['Generic Google search URL', normalizeOBPGoogleMapsUrl('https://google.com/search?q=not-maps')],
    ['Non-Google review URL', normalizeOBPReviewUrl('https://example.com/review')],
    ['Wrong Instagram host', normalizeOBPSocialUrl('instagram', 'https://example.com/not-instagram')],
    ['HTTP social URL', normalizeOBPSocialUrl('twitter', 'http://twitter.com/menulist')],
    ['Oversized website URL', normalizeOBPWebsiteUrl('x'.repeat(2100))],
  ];

  for (const [label, actual] of rejected) {
    assert(actual === null, `${label}: expected null, received ${actual}`);
  }
}

function verifyPublicRenderingBoundary() {
  const helper = read('src/lib/obp/publicLinks.ts');
  const resolvedSurface = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const actions = read('src/app/client/obp/OBPActions.tsx');
  const externalLinks = read('src/app/client/obp/OBPExternalLinks.tsx');
  const obpSchema = read('src/app/client/obp/schema.ts');
  const sharedSchema = read('src/lib/schema/index.ts');
  const directions = read('src/app/client/pwa/directions/page.tsx');
  const reservation = read('src/app/client/pwa/reservation/page.tsx');
  const order = read('src/app/client/pwa/order/page.tsx');
  const manifest = read('src/app/manifest.webmanifest/route.ts');

  for (const token of [
    'normalizeOBPExternalHttpsUrl',
    'normalizeOBPGoogleMapsUrl',
    'normalizeOBPReviewUrl',
    'normalizeOBPSocialUrl',
    'normalizeOBPWebsiteUrl',
    "parsed.protocol !== 'https:'",
    'parsed.username || parsed.password',
  ]) {
    assertIncludes(helper, token, 'OBP public link helper');
  }

  for (const token of [
    'normalizeOBPGoogleMapsUrl(pp.googleMapsUrl)',
    'normalizeOBPExternalHttpsUrl(pp.reservationUrl)',
    'normalizeOBPExternalHttpsUrl(pp.orderUrl)',
    'normalizeOBPReviewUrl(pp.googleReviewUrl)',
    'showDirections = (pp.showDirections !== false) && !!(safeGoogleMapsUrl || fullAddress)',
    'showReservation = (pp.showReservation !== false) && !!safeReservationUrl',
    'showOrder = (pp.showOrder !== false) && !!safeOrderUrl',
    'showGoogleReview = (pp.showGoogleReview !== false) && !!safeGoogleReviewUrl',
    'const directionsUrl = safeGoogleMapsUrl ||',
    'googleMapsUrl: safeGoogleMapsUrl || undefined',
    "normalizeOBPSocialUrl('instagram', socialMedia.instagram)",
    "normalizeOBPSocialUrl('facebook', socialMedia.facebook)",
    "normalizeOBPSocialUrl('twitter', socialMedia.twitter)",
    "normalizeOBPSocialUrl('linkedin', socialMedia.linkedin)",
    "normalizeOBPSocialUrl('youtube', socialMedia.youtube)",
    'normalizeOBPWebsiteUrl(store?.url) || normalizeOBPWebsiteUrl(socialMedia.website)',
    'reservationUrl={safeReservationUrl || undefined}',
    'orderUrl={safeOrderUrl || undefined}',
  ]) {
    assertIncludes(resolvedSurface, token, 'OBP resolved surface safe public links');
  }

  for (const token of [
    'const directionsUrl = pp.googleMapsUrl ||',
    'const googleReviewUrl = pp.googleReviewUrl;',
    'reservationUrl={pp.reservationUrl}',
    'orderUrl={pp.orderUrl}',
  ]) {
    assertNotIncludes(resolvedSurface, token, 'OBP resolved surface raw public links');
  }

  for (const token of [
    'const safeDirectionsUrl = normalizeOBPGoogleMapsUrl(directionsUrl)',
    'const safeReservationUrl = normalizeOBPExternalHttpsUrl(reservationUrl)',
    'const safeOrderUrl = normalizeOBPExternalHttpsUrl(orderUrl)',
    'const safeGoogleReviewUrl = normalizeOBPReviewUrl(googleReviewUrl)',
    'href={safeDirectionsUrl}',
    'href={safeReservationUrl}',
    'href={safeOrderUrl}',
    'href={safeGoogleReviewUrl}',
  ]) {
    assertIncludes(actions, token, 'OBP actions safe hrefs');
  }

  for (const token of [
    'href={directionsUrl}',
    'href={reservationUrl}',
    'href={orderUrl}',
    'href={googleReviewUrl}',
  ]) {
    assertNotIncludes(actions, token, 'OBP actions raw hrefs');
  }

  for (const token of [
    'const reviewUrl = normalizeOBPReviewUrl(googleReviewUrl)',
    "normalizeOBPSocialUrl('instagram', instagram)",
    "normalizeOBPSocialUrl('facebook', facebook)",
    "normalizeOBPSocialUrl('twitter', twitter)",
    "normalizeOBPSocialUrl('linkedin', linkedin)",
    "normalizeOBPSocialUrl('youtube', youtube)",
    'normalizeOBPWebsiteUrl(website)',
    'href={reviewUrl}',
  ]) {
    assertIncludes(externalLinks, token, 'OBP external links safe hrefs');
  }

  assertNotIncludes(externalLinks, 'function normalizeUrl', 'OBP external links local URL normalizer');
  assertNotIncludes(externalLinks, 'href={googleReviewUrl}', 'OBP external links raw review href');

  for (const token of [
    'const reservationUrl = normalizeOBPExternalHttpsUrl(storeData?.publicPresence?.reservationUrl)',
    'const orderUrl = normalizeOBPExternalHttpsUrl(storeData?.publicPresence?.orderUrl)',
    'acceptsReservations: !!reservationUrl',
    "target: {\n                '@type': 'EntryPoint'",
    'urlTemplate: reservationUrl',
    'urlTemplate: orderUrl',
  ]) {
    assertIncludes(obpSchema, token, 'OBP schema safe action targets');
  }

  assertNotIncludes(obpSchema, 'target: storeData?.publicPresence?.reservationUrl', 'OBP schema raw reservation URL target');
  assertNotIncludes(obpSchema, 'target: storeData?.publicPresence?.orderUrl', 'OBP schema raw order URL target');

  for (const token of [
    "addDirectLink(normalizeOBPSocialUrl('instagram', socialMedia.instagram))",
    "addDirectLink(normalizeOBPSocialUrl('facebook', socialMedia.facebook))",
    "addDirectLink(normalizeOBPSocialUrl('twitter', socialMedia.twitter))",
    "addDirectLink(normalizeOBPSocialUrl('linkedin', socialMedia.linkedin))",
    "addDirectLink(normalizeOBPSocialUrl('youtube', socialMedia.youtube))",
    'addDirectLink(normalizeOBPWebsiteUrl(storeData.url))',
    'addDirectLink(normalizeOBPWebsiteUrl(socialMedia.website))',
  ]) {
    assertIncludes(sharedSchema, token, 'Shared schema safe sameAs links');
  }

  assertNotIncludes(sharedSchema, "addLink(socialMedia.instagram, 'https://instagram.com/')", 'Shared schema old social fallback');
  assertIncludes(directions, 'normalizeOBPGoogleMapsUrl(store?.publicPresence?.googleMapsUrl)', 'PWA directions safe Google Maps handoff');
  assertIncludes(reservation, 'normalizeOBPExternalHttpsUrl(store.publicPresence?.reservationUrl)', 'PWA reservation safe external handoff');
  assertIncludes(order, 'normalizeOBPExternalHttpsUrl(store.publicPresence?.orderUrl)', 'PWA order safe external handoff');
  assertNotIncludes(reservation, 'const reservationUrl: string | undefined = store.publicPresence?.reservationUrl', 'PWA reservation raw external handoff');
  assertNotIncludes(order, 'const orderUrl: string | undefined = store.publicPresence?.orderUrl', 'PWA order raw external handoff');
  assertIncludes(manifest, 'const mapsUrl = normalizeOBPGoogleMapsUrl(store.publicPresence?.googleMapsUrl)', 'Customer app manifest safe Maps shortcut');
  assertIncludes(manifest, 'const reservationUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.reservationUrl)', 'Customer app manifest safe reservation shortcut');
  assertIncludes(manifest, 'const orderUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.orderUrl)', 'Customer app manifest safe order shortcut');
  assertNotIncludes(manifest, 'mapsUrl: store.publicPresence?.googleMapsUrl || null', 'Customer app manifest raw Maps shortcut');
}

function verifyDocsParity() {
  const docs = {
    readme: read('__docs__/official-business-page/README.md'),
    impl: read('__docs__/official-business-page/official-business-page_impl.md'),
    firebase: read('__docs__/official-business-page/official-business-page_firebase.md'),
    mobile: read('__docs__/official-business-page/official-business-page_mobile-support.md'),
    helpdoc: read('__docs__/official-business-page/official-business-page_helpdoc.md'),
    website: read('__docs__/official-business-page/official-business-page_website.md'),
    audit: read('__docs__/audits/menulist-production-readiness-audit.md'),
  };

  for (const [name, content] of Object.entries(docs)) {
    assertIncludes(content, 'npm run verify:official-business-page-boundary', `${name} source gate`);
  }

  assertIncludes(docs.readme, 'Public link safety boundary', 'OBP README public link boundary');
  assertIncludes(docs.impl, 'Public link safety boundary', 'OBP implementation public link boundary');
  assertIncludes(docs.firebase, 'Public link safety is render-time and cost-neutral', 'OBP Firebase cost-neutral public link boundary');
  assertIncludes(docs.mobile, 'Public OBP external-link source gate', 'OBP mobile external-link source gate');
  assertIncludes(docs.helpdoc, 'secure public links', 'OBP helpdoc secure public links wording');
  assertIncludes(docs.website, 'External link safety', 'OBP website external link safety claim');
  assertIncludes(docs.audit, 'Official Business Page boundary source-gate checkpoint', 'Production audit OBP checkpoint');
}

verifyPackageScript();
verifyPublicLinkHelperRuntime();
verifyPublicRenderingBoundary();
verifyDocsParity();

console.log('Official Business Page boundary verification passed.');
