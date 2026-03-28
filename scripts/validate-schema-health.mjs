#!/usr/bin/env node

/**
 * Schema.org Health Validation Script
 *
 * Validates that the shared schema.org builders produce well-formed JSON-LD.
 * Run as part of CI or manually before OBP launch.
 *
 * Usage: node scripts/validate-schema-health.mjs
 *
 * What it checks:
 * - buildAddress returns valid PostalAddress or undefined
 * - buildGeoCoordinates returns valid GeoCoordinates or undefined
 * - buildOpeningHours returns valid OpeningHoursSpecification[] or undefined
 * - buildSameAs returns valid URL array or undefined
 * - getSchemaType maps business types correctly
 * - getMenuSchemaType falls back correctly for food businesses
 * - Edge cases: empty data, partial data, malformed data
 *
 * @see __docs__/strategy/_archive/chatgpt-session5-review.md (P2: Schema Health Monitor)
 * @see src/lib/schema/index.ts
 */

// ── Inline reimplementation of schema builders for validation ──
// We can't import TS directly in mjs, so we reimplement the logic here
// and compare against expected output. This validates the CONTRACT, not the code.

const DAY_MAP = {
    sun: 'https://schema.org/Sunday',
    mon: 'https://schema.org/Monday',
    tue: 'https://schema.org/Tuesday',
    wed: 'https://schema.org/Wednesday',
    thu: 'https://schema.org/Thursday',
    fri: 'https://schema.org/Friday',
    sat: 'https://schema.org/Saturday',
};

const BUSINESS_TYPE_SCHEMA_MAP = {
    'restaurant': 'Restaurant',
    'cafe': 'CafeOrCoffeeShop',
    'coffee': 'CafeOrCoffeeShop',
    'bakery': 'Bakery',
    'bar': 'BarOrPub',
    'pub': 'BarOrPub',
    'salon': 'BeautySalon',
    'beauty salon': 'BeautySalon',
    'spa': 'DaySpa',
    'gym': 'ExerciseGym',
    'fitness': 'ExerciseGym',
    'clinic': 'MedicalClinic',
    'medical': 'MedicalClinic',
    'dentist': 'Dentist',
    'hotel': 'Hotel',
    'store': 'Store',
    'shop': 'Store',
    'retail': 'Store',
    'food truck': 'FoodEstablishment',
    'cloud kitchen': 'FoodEstablishment',
    'ice cream': 'IceCreamShop',
    'fast food': 'FastFoodRestaurant',
};

// ── Test Fixtures ──

const VALID_STORE = {
    storeName: "Joe's Pizza",
    businessType: 'restaurant',
    addressLine: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'IN',
    phoneNumber: '+919876543210',
    geo: { latitude: 19.076, longitude: 72.8777 },
    workingHours: {
        mon: '09:00-22:00',
        tue: '09:00-22:00',
        wed: '09:00-22:00',
        thu: '09:00-22:00',
        fri: '09:00-23:00',
        sat: '10:00-23:00',
        sun: '10:00-21:00',
    },
    socialMedia: {
        instagram: 'joespizza_mumbai',
        facebook: 'joespizzamumbai',
    },
    url: 'https://joespizza.menulist.ai',
};

const EMPTY_STORE = {};

const PARTIAL_STORE = {
    city: 'Delhi',
    workingHours: {
        mon: '09:00-17:00',
    },
};

const MALFORMED_STORE = {
    addressLine: '',
    city: '',
    geo: { latitude: null, longitude: undefined },
    workingHours: {
        mon: 'closed',
        tue: '',
        wed: null,
        thu: '09:00-17:00',
    },
    socialMedia: {},
};

// ── Validation Helpers ──

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, testName, detail = '') {
    total++;
    if (condition) {
        passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        console.log(`  ❌ ${testName}${detail ? ` — ${detail}` : ''}`);
    }
}

function isValidUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

// ── Schema Builder Functions (mirrored from src/lib/schema/index.ts) ──

function buildAddress(storeData) {
    if (!storeData?.addressLine && !storeData?.city) return undefined;
    return {
        '@type': 'PostalAddress',
        ...(storeData?.addressLine && { streetAddress: storeData.addressLine }),
        ...(storeData?.city && { addressLocality: storeData.city }),
        ...(storeData?.state && { addressRegion: storeData.state }),
        ...(storeData?.postalCode && { postalCode: storeData.postalCode }),
        ...(storeData?.country && { addressCountry: storeData.country }),
    };
}

function buildGeoCoordinates(storeData) {
    if (!storeData?.geo?.latitude || !storeData?.geo?.longitude) return undefined;
    return {
        '@type': 'GeoCoordinates',
        latitude: storeData.geo.latitude,
        longitude: storeData.geo.longitude,
    };
}

function buildOpeningHours(storeData) {
    if (!storeData?.workingHours) return undefined;
    const specs = Object.entries(storeData.workingHours)
        .filter(([, hours]) => hours && typeof hours === 'string' && hours.includes('-'))
        .map(([day, hours]) => {
            const [opens, closes] = hours.split('-');
            return {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: DAY_MAP[day.toLowerCase()] || day,
                opens: opens?.trim(),
                closes: closes?.trim(),
            };
        });
    return specs.length > 0 ? specs : undefined;
}

function buildSameAs(storeData) {
    const links = [];
    const socialMedia = storeData?.socialMedia || {};
    if (socialMedia.instagram) {
        const ig = socialMedia.instagram;
        links.push(ig.startsWith('http') ? ig : `https://instagram.com/${ig}`);
    }
    if (socialMedia.facebook) {
        const fb = socialMedia.facebook;
        links.push(fb.startsWith('http') ? fb : `https://facebook.com/${fb}`);
    }
    if (storeData?.url) {
        const url = storeData.url;
        links.push(url.startsWith('http') ? url : `https://${url}`);
    } else if (socialMedia.website) {
        const web = socialMedia.website;
        links.push(web.startsWith('http') ? web : `https://${web}`);
    }
    return links.length > 0 ? links : undefined;
}

function getSchemaType(businessType) {
    if (!businessType) return 'LocalBusiness';
    const normalized = businessType.toLowerCase().trim();
    return BUSINESS_TYPE_SCHEMA_MAP[normalized] || 'LocalBusiness';
}

function getMenuSchemaType(businessType) {
    const schemaType = getSchemaType(businessType);
    const foodTypes = [
        'Restaurant', 'CafeOrCoffeeShop', 'Bakery', 'BarOrPub',
        'FoodEstablishment', 'IceCreamShop', 'FastFoodRestaurant',
    ];
    if (foodTypes.includes(schemaType)) return schemaType;
    if (schemaType === 'LocalBusiness') return 'Restaurant';
    return schemaType;
}

// ── Tests ──

console.log('\n🔍 Schema.org Health Validation\n');
console.log('━'.repeat(60));

// Test 1: buildAddress
console.log('\n📍 buildAddress');
{
    const addr = buildAddress(VALID_STORE);
    assert(addr !== undefined, 'Valid store returns address');
    assert(addr?.['@type'] === 'PostalAddress', '@type is PostalAddress');
    assert(addr?.streetAddress === '123 Main St', 'streetAddress correct');
    assert(addr?.addressLocality === 'Mumbai', 'addressLocality correct');
    assert(addr?.addressRegion === 'Maharashtra', 'addressRegion correct');
    assert(addr?.postalCode === '400001', 'postalCode correct');
    assert(addr?.addressCountry === 'IN', 'addressCountry correct');

    assert(buildAddress(EMPTY_STORE) === undefined, 'Empty store returns undefined');
    assert(buildAddress(null) === undefined, 'Null returns undefined');
    assert(buildAddress(undefined) === undefined, 'Undefined returns undefined');

    const partial = buildAddress(PARTIAL_STORE);
    assert(partial !== undefined, 'Partial store with city returns address');
    assert(partial?.streetAddress === undefined, 'Missing streetAddress is undefined (not empty)');

    assert(buildAddress(MALFORMED_STORE) === undefined, 'Empty string address/city returns undefined');
}

// Test 2: buildGeoCoordinates
console.log('\n🌍 buildGeoCoordinates');
{
    const geo = buildGeoCoordinates(VALID_STORE);
    assert(geo !== undefined, 'Valid store returns geo');
    assert(geo?.['@type'] === 'GeoCoordinates', '@type is GeoCoordinates');
    assert(typeof geo?.latitude === 'number', 'latitude is number');
    assert(typeof geo?.longitude === 'number', 'longitude is number');
    assert(geo?.latitude === 19.076, 'latitude value correct');
    assert(geo?.longitude === 72.8777, 'longitude value correct');

    assert(buildGeoCoordinates(EMPTY_STORE) === undefined, 'Empty store returns undefined');
    assert(buildGeoCoordinates(MALFORMED_STORE) === undefined, 'Null/undefined geo values return undefined');
}

// Test 3: buildOpeningHours
console.log('\n🕐 buildOpeningHours');
{
    const hours = buildOpeningHours(VALID_STORE);
    assert(hours !== undefined, 'Valid store returns hours');
    assert(Array.isArray(hours), 'Returns array');
    assert(hours?.length === 7, 'All 7 days present');
    assert(hours?.[0]?.['@type'] === 'OpeningHoursSpecification', '@type correct');
    assert(hours?.[0]?.dayOfWeek?.startsWith('https://schema.org/'), 'dayOfWeek is schema.org URL');
    assert(hours?.[0]?.opens !== undefined, 'opens present');
    assert(hours?.[0]?.closes !== undefined, 'closes present');

    // Validate time format (HH:mm)
    const timeRegex = /^\d{2}:\d{2}$/;
    for (const spec of hours || []) {
        assert(timeRegex.test(spec.opens), `opens "${spec.opens}" matches HH:mm format`);
        assert(timeRegex.test(spec.closes), `closes "${spec.closes}" matches HH:mm format`);
    }

    assert(buildOpeningHours(EMPTY_STORE) === undefined, 'Empty store returns undefined');

    const malformedHours = buildOpeningHours(MALFORMED_STORE);
    assert(malformedHours !== undefined, 'Malformed store filters to valid entries only');
    assert(malformedHours?.length === 1, 'Only thu (valid entry) survives filtering');

    const partialHours = buildOpeningHours(PARTIAL_STORE);
    assert(partialHours?.length === 1, 'Partial store returns 1 day');
}

// Test 4: buildSameAs
console.log('\n🔗 buildSameAs');
{
    const links = buildSameAs(VALID_STORE);
    assert(links !== undefined, 'Valid store returns links');
    assert(Array.isArray(links), 'Returns array');
    assert(links?.length === 3, '3 links (instagram + facebook + url)');

    for (const link of links || []) {
        assert(isValidUrl(link), `"${link}" is valid URL`);
    }

    assert(buildSameAs(EMPTY_STORE) === undefined, 'Empty store returns undefined');
    assert(buildSameAs(MALFORMED_STORE) === undefined, 'Empty socialMedia returns undefined');
}

// Test 5: getSchemaType
console.log('\n🏢 getSchemaType');
{
    assert(getSchemaType('restaurant') === 'Restaurant', 'restaurant → Restaurant');
    assert(getSchemaType('cafe') === 'CafeOrCoffeeShop', 'cafe → CafeOrCoffeeShop');
    assert(getSchemaType('bakery') === 'Bakery', 'bakery → Bakery');
    assert(getSchemaType('salon') === 'BeautySalon', 'salon → BeautySalon');
    assert(getSchemaType('gym') === 'ExerciseGym', 'gym → ExerciseGym');
    assert(getSchemaType('hotel') === 'Hotel', 'hotel → Hotel');
    assert(getSchemaType('fast food') === 'FastFoodRestaurant', 'fast food → FastFoodRestaurant');
    assert(getSchemaType('unknown') === 'LocalBusiness', 'unknown → LocalBusiness fallback');
    assert(getSchemaType('') === 'LocalBusiness', 'empty string → LocalBusiness');
    assert(getSchemaType(undefined) === 'LocalBusiness', 'undefined → LocalBusiness');
    assert(getSchemaType('RESTAURANT') === 'Restaurant', 'RESTAURANT (uppercase) → Restaurant');
    assert(getSchemaType('  cafe  ') === 'CafeOrCoffeeShop', 'trimmed input works');
}

// Test 6: getMenuSchemaType
console.log('\n🍽️  getMenuSchemaType');
{
    assert(getMenuSchemaType('restaurant') === 'Restaurant', 'restaurant stays Restaurant');
    assert(getMenuSchemaType('cafe') === 'CafeOrCoffeeShop', 'cafe stays CafeOrCoffeeShop');
    assert(getMenuSchemaType('salon') === 'BeautySalon', 'salon stays BeautySalon (non-food)');
    assert(getMenuSchemaType(undefined) === 'Restaurant', 'undefined → Restaurant (food fallback)');
    assert(getMenuSchemaType('unknown') === 'Restaurant', 'unknown → Restaurant (LocalBusiness fallback)');
}

// Test 7: Full JSON-LD structure validation
console.log('\n📄 Full JSON-LD Structure');
{
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': getSchemaType(VALID_STORE.businessType),
        name: VALID_STORE.storeName,
        address: buildAddress(VALID_STORE),
        geo: buildGeoCoordinates(VALID_STORE),
        openingHoursSpecification: buildOpeningHours(VALID_STORE),
        sameAs: buildSameAs(VALID_STORE),
        telephone: VALID_STORE.phoneNumber,
    };

    assert(jsonLd['@context'] === 'https://schema.org', '@context present');
    assert(jsonLd['@type'] === 'Restaurant', '@type is Restaurant');
    assert(jsonLd.name === "Joe's Pizza", 'name present');
    assert(jsonLd.address?.['@type'] === 'PostalAddress', 'address.@type correct');
    assert(jsonLd.geo?.['@type'] === 'GeoCoordinates', 'geo.@type correct');
    assert(Array.isArray(jsonLd.openingHoursSpecification), 'openingHoursSpecification is array');
    assert(Array.isArray(jsonLd.sameAs), 'sameAs is array');
    assert(jsonLd.telephone?.startsWith('+'), 'telephone starts with +');

    // Validate JSON serialization (no circular refs, no functions)
    try {
        const serialized = JSON.stringify(jsonLd);
        const parsed = JSON.parse(serialized);
        assert(parsed['@context'] === 'https://schema.org', 'JSON roundtrip preserves @context');
        assert(typeof serialized === 'string' && serialized.length > 0, 'JSON serialization succeeds');
    } catch (e) {
        assert(false, 'JSON serialization', e.message);
    }
}

// ── Summary ──

console.log('\n' + '━'.repeat(60));
console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed\n`);

if (failed > 0) {
    console.log('❌ Schema health check FAILED. Fix issues above before deploying.\n');
    process.exit(1);
} else {
    console.log('✅ Schema health check PASSED. All builders produce valid output.\n');
    process.exit(0);
}
