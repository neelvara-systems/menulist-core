import assert from 'node:assert/strict';

import { parsePexelsImageSearchResponse } from '../../src/lib/pexels';
import { parsePixabayImageSearchResponse } from '../../src/lib/pixabay';
import {
    parseUnsplashImageSearchResponse,
    parseUnsplashTrendingTopicsResponse,
} from '../../src/lib/unsplash';
import getMenuCardDesignAdviceViaAPI from '../../src/services/ai/menuCardExport/getDesignAdviceViaAPI';
import type { MenuCardDesignAdvisorRequest } from '../../src/lib/validation/apiSchemas';
import { normalizeMenuCardDesignAdvice } from '../../src/lib/menu-card-export/ai/designAdvisor';

const pixabay = parsePixabayImageSearchResponse({
    total: 201,
    hits: [{
        largeImageURL: 'https://pixabay.com/get/image.jpg',
        previewURL: 'https://cdn.pixabay.com/photo/image_150.jpg',
    }],
});
assert.equal(pixabay?.totalPages, 2);
assert.equal(typeof pixabay?.totalPages, 'number');
assert.equal(parsePixabayImageSearchResponse({
    total: 1,
    hits: [{
        largeImageURL: 'https://attacker.invalid/image.jpg',
        previewURL: 'https://cdn.pixabay.com/photo/image_150.jpg',
    }],
}), null);

const pexels = parsePexelsImageSearchResponse({
    total_results: 81,
    photos: [{
        src: {
            large2x: 'https://images.pexels.com/photos/1/large2x.jpg',
            large: 'https://images.pexels.com/photos/1/large.jpg',
            original: 'https://images.pexels.com/photos/1/original.jpg',
        },
    }],
});
assert.equal(pexels?.totalPages, 2);
assert.equal(parsePexelsImageSearchResponse({
    total_results: 1,
    photos: [{ src: { large2x: 'javascript:alert(1)', large: 'https://images.pexels.com/large.jpg' } }],
}), null);

const unsplash = parseUnsplashImageSearchResponse({
    total: 1,
    total_pages: 1,
    results: [{
        urls: {
            full: 'https://images.unsplash.com/photo-1',
            thumb: 'https://images.unsplash.com/photo-1?w=200',
        },
    }],
});
assert.equal(unsplash?.images.length, 1);
assert.equal(parseUnsplashImageSearchResponse({
    total: 1,
    total_pages: 1,
    results: [{ urls: { full: 'https://example.com/photo-1', thumb: 'https://images.unsplash.com/photo-1' } }],
}), null);
assert.deepEqual(parseUnsplashTrendingTopicsResponse([
    { title: ' Food ' },
    { title: 'Restaurants' },
]), ['Food', 'Restaurants']);
assert.equal(parseUnsplashTrendingTopicsResponse([{ title: { toString: () => 'execute' } }]), null);

const throwingPayload = new Proxy({}, {
    get() {
        throw new Error('provider getter must be contained');
    },
});
assert.equal(parsePixabayImageSearchResponse(throwingPayload), null);
assert.equal(parsePexelsImageSearchResponse(throwingPayload), null);
assert.equal(parseUnsplashImageSearchResponse(throwingPayload), null);
assert.equal(parseUnsplashTrendingTopicsResponse(new Proxy([], {
    get() {
        throw new Error('topic traversal must be contained');
    },
})), null);

const normalizedHostileAdvice = normalizeMenuCardDesignAdvice(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('advisor field access must be contained');
    },
}), {
    preset: 'table_menu',
    styleId: 'premium',
    density: 'compact',
    includeDescriptions: true,
    includeQr: false,
    includeContactBlock: true,
});
assert.equal(normalizedHostileAdvice.preset, 'table_menu');
assert.equal(normalizedHostileAdvice.ownerNote, 'Layout suggestion is ready.');
assert.deepEqual(normalizeMenuCardDesignAdvice({
    warnings: [{ toString: () => 'execute' }, ' Keep this '],
}, {}).warnings, ['Keep this']);

const request: MenuCardDesignAdvisorRequest = {
    projectId: 'project_1',
    sourceHash: 'source_hash_1',
    currentSettings: {
        preset: 'home_print',
        styleId: 'classic',
        density: 'balanced',
        includeDescriptions: true,
        includeQr: true,
        includeContactBlock: true,
    },
    sourceSummary: {
        businessName: 'Example',
        menuTitle: 'Menu',
        categoryCount: 1,
        itemCount: 1,
        pageCount: 1,
        hasDescriptions: true,
        hasVariants: false,
        hasDietaryTags: false,
        hasMissingPrices: false,
    },
    preflightWarnings: [],
};

const validResponse = {
    success: true,
    recommendation: {
        preset: 'home_print',
        styleId: 'classic',
        density: 'balanced',
        includeDescriptions: true,
        includeQr: true,
        includeContactBlock: true,
        ownerNote: 'Ready.',
        reason: 'Matches the current menu.',
        warnings: [],
    },
    remainingBalance: {
        billingStoreId: 1,
        monthlyCredits: 9,
        topUpCredits: 2,
    },
    transaction: {
        transactionId: 'transaction_1',
        unitsConsumed: 1,
        processingTime: 10,
    },
};

async function main() {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response(JSON.stringify(validResponse), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
        assert.equal((await getMenuCardDesignAdviceViaAPI(request))?.recommendation.preset, 'home_print');

        globalThis.fetch = async () => new Response(JSON.stringify({
            ...validResponse,
            recommendation: {
                ...validResponse.recommendation,
                density: 'invented',
            },
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
        assert.equal(await getMenuCardDesignAdviceViaAPI(request), null);

        globalThis.fetch = async () => new Response(JSON.stringify({
            ...validResponse,
            success: false,
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
        assert.equal(await getMenuCardDesignAdviceViaAPI(request), null);
    } finally {
        globalThis.fetch = originalFetch;
    }

    console.log('Image-provider and design-advisor response boundary tests passed.');
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
