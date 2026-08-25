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

function withSuppressedConsoleError(fn) {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    return fn();
  } finally {
    console.error = originalConsoleError;
  }
}

function verifyPackageScript() {
  const pkg = JSON.parse(read('package.json'));
  assert(
    pkg.scripts['verify:official-business-page-boundary']
      === 'node scripts/verification/verify-official-business-page-boundary.js && npm run test:obp-i18n-boundary && npm run test:obp-freshness-timestamp-boundary',
    'package.json must expose the OBP source, i18n and freshness behavior gates',
  );
  assert(
    pkg.scripts['test:obp-i18n-boundary']
      === 'ts-node --compiler-options \'{"module":"CommonJS","target":"ES2022"}\' -r tsconfig-paths/register scripts/verification/test-obp-i18n-boundary.ts',
    'package.json must expose test:obp-i18n-boundary',
  );
  assert(
    pkg.scripts['test:obp-freshness-timestamp-boundary']
      === 'ts-node --compiler-options \'{"module":"CommonJS"}\' -r tsconfig-paths/register scripts/verification/test-obp-freshness-timestamp-boundary.ts',
    'package.json must expose test:obp-freshness-timestamp-boundary',
  );
}

function verifyFirestoreCostBoundary() {
  const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
  const exemptStoreFields = new Set(
    (firestoreIndexes.fieldOverrides || [])
      .filter((entry) => entry.collectionGroup === 'stores' && Array.isArray(entry.indexes) && entry.indexes.length === 0)
      .map((entry) => entry.fieldPath),
  );

  for (const fieldPath of ['publicPresence', 'businessCopyMeta', 'businessAttributes', 'workingHours']) {
    assert(
      exemptStoreFields.has(fieldPath),
      `stores.${fieldPath} must stay exempt from unused automatic single-field indexes`,
    );
  }
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
    ['Malformed HTTPS URL', withSuppressedConsoleError(() => normalizeOBPExternalHttpsUrl('https://[bad-url'))],
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

function verifyOwnerMutationBoundary() {
  const { normalizeGeoCoordinateDraft } = require(path.join(root, 'src/lib/businessIdentity/geoCoordinates.ts'));
  const { normalizeOwnerPublicPresenceLinks } = require(path.join(root, 'src/lib/obp/ownerPublicPresenceBoundary.ts'));
  const { normalizeOwnerSocialMediaLinks } = require(path.join(root, 'src/lib/obp/ownerSocialMediaBoundary.ts'));
  const { getStoreDeepDifference, isStoreNestedDelete } = require(path.join(root, 'src/lib/store/storeNestedUpdateProjection.ts'));
  const { buildVisualProfileCompletion } = require(path.join(root, 'src/lib/visualProfile/visualProfileCompletion.ts'));

  assert(JSON.stringify(normalizeGeoCoordinateDraft('', '')) === JSON.stringify({ ok: true, geo: null }), 'blank geo pair must clear geo');
  assert(JSON.stringify(normalizeGeoCoordinateDraft('0', '0')) === JSON.stringify({ ok: true, geo: { latitude: 0, longitude: 0 } }), 'zero geo pair must remain valid');
  assert(normalizeGeoCoordinateDraft('12', '').ok === false, 'partial geo pair must fail');
  assert(normalizeGeoCoordinateDraft('91', '20').ok === false, 'out-of-range latitude must fail');
  assert(normalizeGeoCoordinateDraft('20', '-181').ok === false, 'out-of-range longitude must fail');

  const normalizedLinks = normalizeOwnerPublicPresenceLinks({
    googleMapsUrl: 'https://www.google.com/maps/place/example',
    googleReviewUrl: 'https://g.page/example/review',
    orderUrl: 'order.example.com/menu',
    reservationUrl: '',
  });
  assert(normalizedLinks.invalidKeys.length === 0, 'valid owner public links must normalize');
  assert(normalizedLinks.presence.orderUrl === 'https://order.example.com/menu', 'generic owner URL must normalize to HTTPS');
  assert(
    normalizeOwnerPublicPresenceLinks({ googleMapsUrl: 'https://example.com/not-maps' }).invalidKeys.includes('googleMapsUrl'),
    'invalid owner Maps URL must fail before persistence',
  );
  const clearedOwnerAccent = normalizeOwnerPublicPresenceLinks({
    accentColor: '',
    reservationUrl: 'https://example.com/reserve',
  });
  assert(
    !Object.prototype.hasOwnProperty.call(clearedOwnerAccent.presence, 'accentColor'),
    'blank owner accent must become a nested deletion instead of retained hidden truth',
  );
  const clearedOwnerAccentDifference = getStoreDeepDifference(
    { publicPresence: clearedOwnerAccent.presence },
    { publicPresence: { accentColor: '#1677ff', reservationUrl: 'https://example.com/reserve' } },
  );
  assert(
    isStoreNestedDelete(clearedOwnerAccentDifference.publicPresence?.accentColor),
    'blank owner accent must project to the existing nested delete marker',
  );
  const normalizedOwnerSocialMedia = normalizeOwnerSocialMediaLinks({
    instagram: '@menulist',
    twitter: 'https://x.com/menulist',
    tripadvisor: 'tripadvisor.com/example',
    youtube: '',
  });
  assert(normalizedOwnerSocialMedia.invalidKeys.length === 0, 'valid owner social links must normalize');
  assert(
    normalizedOwnerSocialMedia.socialMedia.instagram === 'https://instagram.com/menulist',
    'owner Instagram handle must normalize to the public renderer contract',
  );
  assert(
    normalizedOwnerSocialMedia.socialMedia.twitter === 'https://x.com/menulist',
    'owner X link must retain its admitted HTTPS host',
  );
  assert(
    normalizedOwnerSocialMedia.socialMedia.tripadvisor === 'https://tripadvisor.com/example',
    'owner custom social link must normalize as generic HTTPS',
  );
  assert(
    !Object.prototype.hasOwnProperty.call(normalizedOwnerSocialMedia.socialMedia, 'youtube'),
    'blank owner social links must be omitted for nested deletion',
  );
  assert(
    normalizeOwnerSocialMediaLinks({ instagram: 'https://example.com/not-instagram' }).invalidKeys.includes('instagram'),
    'wrong-host owner Instagram link must fail before persistence',
  );
  assert(
    normalizeOwnerSocialMediaLinks({ twitter: 'http://twitter.com/menulist' }).invalidKeys.includes('twitter'),
    'insecure owner social link must fail before persistence',
  );

  const duplicatePhotoCompletion = buildVisualProfileCompletion({
    businessCategory: 'food',
    businessCover: ' cover.webp ',
    photos: ['one.webp', ' one.webp ', 'two.webp'],
    projects: [
      { active: false, projectImage: 'inactive.webp' },
      { active: true, isSpecialMenu: true, projectImage: 'special.webp' },
    ],
  });
  assert(duplicatePhotoCompletion.photoCount === 2, 'visual completion must count unique trimmed gallery URLs');
  assert(duplicatePhotoCompletion.status === 'needs-attention', 'duplicate and ineligible project photos must not complete the profile');

  const locationTab = read('src/components/templates/main-app/businessSettings/tabs/LocationInfoTab.tsx');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const mobileBasic = read('src/components/mobile/screens/MobileBasicSettingsScreen.tsx');
  const mobileOfficial = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
  const officialTab = read('src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx');
  const socialMediaTab = read('src/components/templates/main-app/businessSettings/tabs/SocialMediaTab.tsx');
  const mobileAdvancedSettings = read('src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx');
  const b2cView = read('src/components/templates/main-app/projects/b2cView/index.tsx');
  const storageHelper = read('src/database/stores/uploadOBPPhoto.ts');
  const obpContent = read('src/app/client/obp/OBPContent.tsx');
  const brandContent = read('src/app/client/obp/BrandOBPContent.tsx');
  const resolvedSurface = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const actions = read('src/app/client/obp/OBPActions.tsx');
  const visualCompletion = read('src/lib/visualProfile/visualProfileCompletion.ts');
  const obpSchema = read('src/app/client/obp/schema.ts');
  const publicMenuPage = read('src/app/client/[[...slug]]/page.tsx');
  const basicInfoTab = read('src/components/templates/main-app/businessSettings/tabs/BasicInfoTab.tsx');
  const publicImage = read('src/app/client/obp/OBPPublicImage.tsx');
  const menuCta = read('src/app/client/obp/OBPMenuCTA.tsx');
  const obpStyles = read('src/app/client/obp/obp.module.scss');

  assertIncludes(locationTab, 'name="addressLine"', 'desktop canonical address field');
  assertIncludes(locationTab, 'name="postalCode"', 'desktop canonical postal field');
  assertNotIncludes(locationTab, 'name="address"', 'desktop legacy address field');
  assertNotIncludes(locationTab, 'name="pincode"', 'desktop legacy postal field');
  assertIncludes(businessSettings, "addressLine: storeDetails?.addressLine || storeDetails?.address || ''", 'desktop legacy address hydration');
  assertIncludes(businessSettings, "postalCode: storeDetails?.postalCode || storeDetails?.pincode || ''", 'desktop legacy postal hydration');
  assertIncludes(businessSettings, 'normalizeGeoCoordinateDraft(latitudeInput, longitudeInput)', 'desktop shared geo boundary');
  assertIncludes(businessSettings, 'normalizeOwnerPublicPresenceLinks(changesToUpload.publicPresence)', 'desktop owner public-link boundary');
  assertIncludes(businessSettings, 'normalizeOwnerSocialMediaLinks(socialMedia)', 'desktop owner social-link boundary');
  assertIncludes(businessSettings, "messageApi.error('Enter valid public social profile links before saving.')", 'desktop scoped owner social-link rejection');
  assertIncludes(socialMediaTab, 'aria-label={placeholder}', 'desktop named default social inputs');
  assertIncludes(socialMediaTab, 'aria-label={`Clear ${placeholder}`}', 'desktop named default social clear actions');
  assertIncludes(socialMediaTab, 'aria-label={`Remove ${key}`}', 'desktop named custom social removal');
  assertIncludes(socialMediaTab, 'key={getCustomPlatformRowId(key)}', 'desktop stable custom social row identity');
  assertIncludes(socialMediaTab, 'transferCustomPlatformRowId(key, nextKey)', 'desktop custom social rename focus continuity');
  assert(
    (socialMediaTab.match(/setSocialMedia\(\(currentSocialMedia\)/g) || []).length >= 5,
    'desktop social add, default edit, custom rename, custom removal, and custom URL edit must use functional draft updates',
  );
  assertIncludes(mobileAdvancedSettings, 'normalizeOwnerSocialMediaLink(', 'mobile shared single social-link boundary');
  assertIncludes(mobileAdvancedSettings, 'normalizeOwnerSocialMediaLinks(socialMedia)', 'mobile shared full social-map boundary');
  assertIncludes(mobileAdvancedSettings, 'aria-label={`Open ${platform.label}`}', 'mobile named social open action');
  assertIncludes(mobileAdvancedSettings, 'aria-label={`Edit ${platform.label}`}', 'mobile named social edit action');
  assertIncludes(mobileAdvancedSettings, 'aria-label={`Remove ${platform.label}`}', 'mobile named social remove action');
  assertIncludes(mobileAdvancedSettings, 'aria-label="Close social link editor"', 'mobile named social editor close action');
  assertIncludes(mobileAdvancedSettings, 'minHeight: 44, minWidth: 44', 'mobile social icon action touch target');
  assertIncludes(mobileBasic, "storeDetails?.geo?.latitude !== undefined", 'mobile zero latitude hydration');
  assertIncludes(mobileBasic, 'normalizeGeoCoordinateDraft(formData.latitude, formData.longitude)', 'mobile shared geo boundary');
  assertIncludes(mobileBasic, 'MOBILE_BASIC_STORE_UPDATE_KEYS', 'mobile exact optimistic store-key registry');
  assertIncludes(mobileBasic, 'ownsMobileBasicOptimisticValues(previous, optimisticUpdates)', 'mobile exact optimistic rollback ownership');
  assertIncludes(mobileBasic, '? { ...previous, ...previousOptimisticValues }', 'mobile canonical field rollback projection');
  assertIncludes(mobileOfficial, 'normalizeOwnerPublicPresenceLinks(publicPresenceDraft)', 'mobile owner public-link boundary');
  assertIncludes(officialTab, "name={['publicPresence', 'iconVariant']}", 'desktop registered icon variant field');
  assertIncludes(officialTab, "name={['publicPresence', 'photos']}", 'desktop registered gallery photos field');
  assertIncludes(officialTab, "getValueProps={(value) => ({ checked: value === 'emoji' })}", 'desktop icon variant checked projection');
  assertIncludes(officialTab, "getValueFromEvent={(checked: boolean) => checked ? 'emoji' : 'icons'}", 'desktop icon variant persistence projection');
  assertIncludes(officialTab, "<Switch aria-label={t('obpUseEmojiIcons')} />", 'desktop accessible icon variant switch');
  assertIncludes(officialTab, 'aria-label={t(\'accentColor\')}', 'desktop accessible native accent control');
  assertIncludes(officialTab, 'type="color"', 'desktop native accent control');
  assertIncludes(officialTab, "form.setFieldValue(['publicPresence', 'accentColor'], hex)", 'desktop accent form registration');
  assertIncludes(mobileOfficial, "aria-label={t('obpUseEmojiIcons')}", 'mobile accessible icon variant switch');
  assertIncludes(mobileOfficial, 'aria-haspopup="dialog"', 'mobile accent picker dialog semantics');
  assertIncludes(mobileOfficial, 'showDefaultColorOption', 'mobile accent default restoration');
  const mobileColorPicker = read('src/components/mobile/sheets/ColorPickerSheet.tsx');
  assertIncludes(mobileColorPicker, 'aria-pressed={isToneStyleColorSelected}', 'mobile accent default pressed state');
  assertIncludes(mobileColorPicker, 'aria-pressed={isBusinessBrandColorSelected}', 'mobile business accent pressed state');
  assertIncludes(mobileColorPicker, 'type="color"', 'mobile native custom accent control');
  for (const translationKey of [
    'showCallButton',
    'showWhatsAppButton',
    'showDirectionsButton',
    'showReservationButton',
    'showOrderButton',
    'showGoogleReviewButton',
    'showFeedbackButton',
    'showPrivacyLink',
    'showTermsLink',
    'showRefundLink',
  ]) {
    assertIncludes(
      mobileOfficial,
      `aria-label={t('${translationKey}')}`,
      `mobile accessible OBP visibility switch ${translationKey}`,
    );
  }
  assertIncludes(mobileOfficial, 'businessCopyMeta: previousBusinessCopyMeta', 'mobile optimistic metadata rollback');
  assertIncludes(mobileOfficial, '&& previous?.businessCopyMeta === payload.businessCopyMeta', 'mobile attempt-owned metadata rollback');
  assertIncludes(mobileOfficial, '&& previous?.publicPresence === payload.publicPresence', 'mobile attempt-owned presence rollback');
  assertIncludes(mobileOfficial, '|| presenceSaveInFlightRef.current', 'mobile in-flight save unmount cleanup guard');
  assertIncludes(mobileOfficial, 'await deleteOBPPhotos([url]);', 'mobile obsolete uploaded media cleanup');
  assertIncludes(b2cView, 'normalizeOwnerPublicPresenceLinks(storeDraft?.publicPresence || {})', 'embedded editor owner public-link boundary');

  assertIncludes(officialTab, 'queuePhotoDelete(url);', 'desktop new upload cleanup candidate');
  assertIncludes(mobileOfficial, 'queuePhotoDelete(url);', 'mobile new upload cleanup candidate');
  assertIncludes(storageHelper, '): Promise<string[]>', 'OBP cleanup retry result contract');
  assertIncludes(storageHelper, 'return failedPhotoUrls;', 'OBP cleanup failed URL retention');
  assertIncludes(businessSettings, 'reconcileOBPPhotoDeleteQueue(', 'desktop failed cleanup retry queue');
  assertIncludes(mobileOfficial, 'setPhotoDeleteQueue(failedPhotoDeletes)', 'mobile failed cleanup retry queue');
  assertIncludes(mobileOfficial, 'persistedPublicPresenceRef.current = nextPublicPresence', 'mobile acknowledged media retention race boundary');
  assertIncludes(mobileOfficial, 'photoDeleteQueueRef.current = failedPhotoDeletes', 'mobile synchronous cleanup retry ref');
  assertIncludes(b2cView, 'setObpPhotoDeleteQueue(failedPhotoDeletes)', 'embedded failed cleanup retry queue');
  assertIncludes(b2cView, 'persistedPublicPresenceRef.current = nextStoreDetails.publicPresence', 'embedded acknowledged media retention race boundary');
  assertIncludes(b2cView, 'obpPhotoDeleteQueueRef.current = failedPhotoDeletes', 'embedded synchronous cleanup retry ref');

  assertIncludes(obpContent, '.limit(FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1)', 'single-outlet OBP bounded tenant read');
  assertIncludes(obpContent, '() => withTimeout(countActiveStoresForTenant(storeData.tenantId))', 'single-outlet OBP retryable tenant count');
  assertIncludes(obpContent, 'throw error;', 'OBP read failures propagate to the public error boundary');
  assertNotIncludes(obpContent, 'return { hasMenu: false, defaultSlug: undefined, projects: [] } as ObpMenuInfo', 'OBP failure must not become a false missing-menu state');
  assertNotIncludes(obpContent, 'return 1;', 'OBP failure must not become a false single-location state');
  assertIncludes(brandContent, '.limit(FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1)', 'brand OBP bounded tenant read');
  assertIncludes(brandContent, "return [{ ...outlet, publicPath: 'menu' }];", 'brand OBP master-location canonical menu route');
  assertIncludes(brandContent, 'generateBrandOBPSchema({', 'brand OBP structured-data projection');
  assertIncludes(brandContent, '<JsonLdScript id="brand-obp-schema-jsonld"', 'brand OBP structured-data render');
  assertIncludes(brandContent, '<OBPPublicImage', 'brand OBP failed-image fallback');
  assertIncludes(resolvedSurface, '<OBPPublicImage', 'single-location OBP failed-image fallback');
  assertIncludes(publicImage, 'failedSrc === src', 'OBP image failure state is source-specific');
  assertIncludes(publicImage, 'image.naturalWidth === 0', 'OBP pre-hydration image failure recovery');
  assertIncludes(menuCta, 'projects.length > 4 ? styles.projectCardsDense', 'many-menu mobile density boundary');
  assertIncludes(obpStyles, '.projectCardsDense', 'many-menu responsive presentation');
  assertIncludes(obpStyles, 'min-height: 44px;', 'mobile language touch target');
  assertIncludes(resolvedSurface, 'normalizeGeoCoordinateDraft(params.geo?.latitude, params.geo?.longitude)', 'public map shared geo boundary');
  assertIncludes(resolvedSurface, 'const safeCallHref = buildTelHref({', 'public safe call admission');
  assertIncludes(resolvedSurface, 'const safeWhatsAppPhoneParam = buildWhatsAppPhoneParam({', 'public safe WhatsApp admission');
  assertIncludes(actions, '{showCall && callHref && (', 'OBP action nonempty call href guard');
  assertIncludes(actions, '{showWhatsApp && whatsappHref && (', 'OBP action nonempty WhatsApp href guard');
  assertIncludes(visualCompletion, 'const photoCount = new Set(', 'visual completion unique gallery count');
  assertNotIncludes(obpSchema, 'storeData?.email', 'OBP schema account-email disclosure boundary');
  assertIncludes(obpSchema, "normalizePublicOutletSlug(location.publicPath)", 'brand schema public-path admission');
  assertNotIncludes(publicMenuPage, 'storeData?.email', 'menu schema account-email disclosure boundary');
  assertNotIncludes(basicInfoTab, 'Public contact:', 'owner preview hidden-email claim boundary');
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
    'obp_public_link_url_parse_failed',
    'logOBPPublicLinkParseFailure',
    'MAX_OBP_PUBLIC_LINK_PARSE_DIAGNOSTICS',
    'reportedOBPPublicLinkParseFailures',
    "getBoundedRuntimeStringContext('valueKind', valueKind)",
    'candidateLength: candidate.length',
    'allowedHostBaseCount: options.allowedHostBases?.length || 0',
    'hasFallbackBase: Boolean(options.fallbackBase)',
    'hasProtocol: /^[a-z][a-z\\d+\\-.]*:/i.test(candidate)',
    "parsed.protocol !== 'https:'",
    'parsed.username || parsed.password',
  ]) {
    assertIncludes(helper, token, 'OBP public link helper');
  }
  assertNotIncludes(helper, '    } catch {\n        return null;\n    }', 'OBP public link URL parsing must not fail silently');

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
  assertIncludes(reservation, 'store.publicPresence?.showReservation === false', 'PWA reservation owner visibility boundary');
  assertIncludes(order, 'store.publicPresence?.showOrder === false', 'PWA order owner visibility boundary');
  assertNotIncludes(reservation, 'const reservationUrl: string | undefined = store.publicPresence?.reservationUrl', 'PWA reservation raw external handoff');
  assertNotIncludes(order, 'const orderUrl: string | undefined = store.publicPresence?.orderUrl', 'PWA order raw external handoff');
  assertIncludes(manifest, 'const mapsUrl = normalizeOBPGoogleMapsUrl(store.publicPresence?.googleMapsUrl)', 'Customer app manifest safe Maps shortcut');
  assertIncludes(manifest, 'const reservationUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.reservationUrl)', 'Customer app manifest safe reservation shortcut');
  assertIncludes(manifest, 'const orderUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.orderUrl)', 'Customer app manifest safe order shortcut');
  assertIncludes(manifest, 'const showReservation = store.publicPresence?.showReservation !== false', 'Customer app manifest reservation visibility boundary');
  assertIncludes(manifest, 'const showOrder = store.publicPresence?.showOrder !== false', 'Customer app manifest order visibility boundary');
  assertIncludes(manifest, 'reservationUrl: showReservation ? reservationUrl || null : null', 'Customer app manifest hidden reservation omission');
  assertIncludes(manifest, 'orderUrl: showOrder ? orderUrl || null : null', 'Customer app manifest hidden order omission');
  assertNotIncludes(manifest, 'mapsUrl: store.publicPresence?.googleMapsUrl || null', 'Customer app manifest raw Maps shortcut');
}

function verifyDocsParity() {
  const docs = {
    readme: read('__docs__/official-business-page/README.md'),
    impl: read('__docs__/official-business-page/official-business-page_impl.md'),
    marketing: read('__docs__/official-business-page/official-business-page_marketing.md'),
    firebase: read('__docs__/official-business-page/official-business-page_firebase.md'),
    mobile: read('__docs__/official-business-page/official-business-page_mobile-support.md'),
    helpdoc: read('__docs__/official-business-page/official-business-page_helpdoc.md'),
    website: read('__docs__/official-business-page/official-business-page_website.md'),
    audit: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelog: read('__docs__/changelog.md'),
  };

  for (const [name, content] of Object.entries(docs)) {
    assertIncludes(content, 'npm run verify:official-business-page-boundary', `${name} source gate`);
  }

  assertIncludes(docs.readme, 'Public link safety boundary', 'OBP README public link boundary');
  assertIncludes(docs.impl, 'Public link safety boundary', 'OBP implementation public link boundary');
  assertIncludes(docs.impl, 'Public link parse diagnostics', 'OBP implementation public link parse diagnostics');
  assertIncludes(docs.impl, 'tag invalidation on acknowledged store update', 'OBP implementation cache invalidation boundary');
  assertIncludes(docs.marketing, 'public cache path', 'OBP marketing public cache path wording');
  assertIncludes(docs.marketing, 'current owner-approved source', 'OBP marketing owner-approved freshness wording');
  assertIncludes(docs.firebase, 'Public link safety is render-time and cost-neutral', 'OBP Firebase cost-neutral public link boundary');
  assertIncludes(docs.firebase, 'Public link parse diagnostics', 'OBP Firebase public link parse diagnostics');
  assertIncludes(docs.mobile, 'Public OBP external-link source gate', 'OBP mobile external-link source gate');
  assertIncludes(docs.helpdoc, 'secure public links', 'OBP helpdoc secure public links wording');
  assertIncludes(docs.helpdoc, 'After the save succeeds', 'OBP helpdoc save acknowledgement wording');
  assertIncludes(docs.helpdoc, 'current 1-minute public cache window', 'OBP helpdoc cache-window wording');
  assertIncludes(docs.website, 'External link safety', 'OBP website external link safety claim');
  assertIncludes(docs.website, 'acknowledged save and public cache refresh', 'OBP website freshness boundary');
  assertIncludes(docs.readme, 'public cache path', 'OBP README public cache path wording');
  assertIncludes(docs.readme, 'current cache window documented as 60 seconds', 'OBP README cache-window wording');
  assertIncludes(docs.audit, 'Official Business Page boundary source-gate checkpoint', 'Production audit OBP checkpoint');
  assertIncludes(docs.audit, 'Official Business Page freshness-copy boundary checkpoint', 'Production audit OBP freshness checkpoint');
  assertIncludes(docs.audit, 'Official Business Page server fallback diagnostics checkpoint', 'Production audit OBP server fallback checkpoint');
  assertIncludes(docs.audit, 'OBP public link parse diagnostics checkpoint', 'Production audit OBP public link parse diagnostics checkpoint');
  assertIncludes(docs.impl, 'OBP server fallback diagnostics log `public_obp_menu_info_lookup_failed`, `public_obp_menu_info_resolution_failed`, and `public_obp_store_count_lookup_failed`', 'OBP implementation server fallback diagnostics');
  assertIncludes(docs.firebase, 'OBP server fallback diagnostics', 'OBP Firebase server fallback diagnostics');
  assertIncludes(docs.changelog, 'Official Business Page Freshness Copy Boundary', 'Changelog OBP freshness checkpoint');
  assertIncludes(docs.changelog, 'Official Business Page Server Fallback Diagnostics', 'Changelog OBP server fallback checkpoint');
  assertIncludes(docs.changelog, 'OBP Public Link Parse Diagnostics', 'Changelog OBP public link parse diagnostics checkpoint');
  assertIncludes(docs.readme, 'Owner mutation integrity boundary', 'OBP README owner mutation boundary');
  assertIncludes(docs.impl, 'retryable cleanup candidates', 'OBP implementation retryable media cleanup');
  assertIncludes(docs.firebase, '`MAX_OUTLETS_PER_TENANT + 1`', 'OBP Firebase bounded public outlet read');
  assertIncludes(docs.mobile, 'shared coordinate and public-link validators', 'OBP mobile mutation parity');
  assertIncludes(docs.audit, 'Official Business Page owner-mutation integrity checkpoint', 'Production audit owner mutation checkpoint');
  assertIncludes(docs.changelog, 'Official Business Page Owner Mutation Integrity', 'Changelog owner mutation checkpoint');
}

function verifyFreshnessBoundary() {
  const docs = {
    readme: read('__docs__/official-business-page/README.md'),
    impl: read('__docs__/official-business-page/official-business-page_impl.md'),
    marketing: read('__docs__/official-business-page/official-business-page_marketing.md'),
    helpdoc: read('__docs__/official-business-page/official-business-page_helpdoc.md'),
    website: read('__docs__/official-business-page/official-business-page_website.md'),
  };
  const joinedDocs = Object.values(docs).join('\n');
  const stalePhrases = [
    'Updates instantly when store data changes',
    'Customers always see the latest info',
    'Updated instantly',
    'updated instantly',
    'This always shows your latest menu automatically',
    'Your latest menu, always accessible',
    'Update once, updated everywhere',
    'instant invalidation on store update',
    'Changes appear on your official page automatically (within 1 minute)',
    'It updates itself',
  ];

  for (const phrase of stalePhrases) {
    assertNotIncludes(joinedDocs, phrase, 'OBP active docs freshness boundary');
  }

  const revalidateAction = read('src/lib/actions/revalidateMenuCache.ts');
  const postCommitEffects = read('src/lib/cache/storePublicTruthPostCommit.ts');
  const publicClientCache = read('src/lib/cache/publicClientCache.ts');
  const storeDal = read('src/database/stores/index.tsx');
  const clientStoreLookup = read('src/lib/firestore/clientStoreLookup.ts');
  const obpContent = read('src/app/client/obp/OBPContent.tsx');

  assertIncludes(
    revalidateAction,
    'revalidate: (tag) => revalidateTag(tag, { expire: 0 })',
    'OBP public cache tag invalidation adapter',
  );
  for (const token of [
    'params.deps.revalidate(`menu-store-${storeId}`)',
    'params.deps.revalidate(`store-${storeId}`)',
    "params.deps.revalidate('client-stores')",
  ]) {
    assertIncludes(postCommitEffects, token, 'OBP public cache tag invalidation source');
  }

  assertIncludes(publicClientCache, "fetch('/api/revalidate/menu'", 'OBP browser public cache revalidation endpoint');
  assertIncludes(
    storeDal,
    'await revalidatePublicClientCache(data.storeId, "updateStore", {',
    'OBP store update public cache revalidation',
  );
  assertIncludes(
    storeDal,
    'touchScreen: hasDigitalScreenStoreOutputFieldChanges(data)',
    'OBP store update digital-screen attribution',
  );
  assertIncludes(clientStoreLookup, "Tag `client-stores`", 'OBP lookup shared cache tag documentation');
  assertIncludes(clientStoreLookup, "{ revalidate: 60, tags: ['client-stores'] }", 'OBP lookup 60s public cache window');
  assertIncludes(obpContent, "{ revalidate: 60, tags: ['client-stores'] }", 'OBP content 60s public cache window');

  for (const token of [
    'logObpServerResolutionFailure',
    'public_obp_menu_info_lookup_failed',
    'public_obp_menu_info_resolution_failed',
    'public_obp_store_count_lookup_failed',
    "getBoundedRuntimeStringContext('storeId', context.storeId)",
    "getBoundedRuntimeStringContext('tenantId', context.tenantId)",
    "getBoundedRuntimeStringContext('tenantType', context.tenantType)",
    "getBoundedRuntimeStringContext('activeSpecialMenuId', context.activeSpecialMenuId)",
    "getBoundedRuntimeStringContext('operation', context.operation)",
    "operation: 'menu_info_lookup'",
    "operation: 'store_count_lookup'",
    "operation: 'menu_info_resolution'",
  ]) {
    assertIncludes(obpContent, token, 'OBP server fallback bounded diagnostics');
  }

  for (const token of [
    '} catch {\n            return empty;\n        }',
    '} catch {\n            return 1;\n        }',
    '.catch(() => ({ hasMenu: false, defaultSlug: undefined, projects: [] } as ObpMenuInfo))',
    'console.error',
    'console.warn',
  ]) {
    assertNotIncludes(obpContent, token, 'OBP server fallback silent/direct diagnostics');
  }
}

verifyPackageScript();
verifyFirestoreCostBoundary();
verifyPublicLinkHelperRuntime();
verifyOwnerMutationBoundary();
verifyPublicRenderingBoundary();
verifyDocsParity();
verifyFreshnessBoundary();

console.log('Official Business Page boundary verification passed.');
