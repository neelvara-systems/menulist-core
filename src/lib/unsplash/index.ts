import { BACKGROUND_IMAGES_ORIENTATIONS, SEARCHED_IMAGES_COUNT_PER_REQUEST_UNSPLASH } from "@constant/common";
import { getImageProviderRequestLogContext, logImageProviderFailure } from "@lib/imageProviderDiagnostics";
import {
    buildImageProviderUrl,
    IMAGE_PROVIDER_REQUEST_TIMEOUT_MS,
    normalizeImageProviderOrientation,
    normalizeImageProviderPage,
    normalizeImageProviderQuery,
    normalizeImageProviderResultUrl,
} from "@lib/imageProviderRequests";
import { axiosClient } from "../axios/axiosClient";

const SEARCH_API_URL = 'https://api.unsplash.com/search/photos';
const TOPICS_API_URL = 'https://api.unsplash.com/topics';
// {
//     "total": 133,
//         "total_pages": 7,
//             "results": [
//                 {
//                     "id": "eOLpJytrbsQ",
//                     "created_at": "2014-11-18T14:35:36-05:00",
//                     "width": 4000,
//                     "height": 3000,
//                     "color": "#A7A2A1",
//                     "blur_hash": "LaLXMa9Fx[D%~q%MtQM|kDRjtRIU",
//                     "likes": 286,
//                     "liked_by_user": false,
//                     "description": "A man drinking a coffee.",
//                     "user": {   },
//                     "current_user_collections": [],
//                     "urls": {
//                         "raw": "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f",
//                         "full": "https://hd.unsplash.com/photo-1416339306562-f3d12fefd36f",
//                         "regular": "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&s=92f3e02f63678acc8416d044e189f515",
//                         "small": "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&s=263af33585f9d32af39d165b000845eb",
//                         "thumb": "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max&s=8aae34cf35df31a592f0bef16e6342ef"
//                     },
//                 },
//                 // more photos ...
//             ]
// }

export const UNPLASH_IMAGE_SIZES = {
    RAW: 'raw',//28mb
    FULL: 'full',//6mb
    REGULAR: 'regular',//125kb
    SMALL: 'small',//31kb
    THUMB: 'thumb',//11kb
    SRC: 'full'
}

export interface UnsplashImageSearchResult {
    images: Array<{ src: string; thumb: string }>;
    total: number;
    totalPages: number;
}

export const parseUnsplashImageSearchResponse = (value: unknown): UnsplashImageSearchResult | null => {
    try {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const payload = value as Record<string, unknown>;
        if (
            !Number.isSafeInteger(payload.total)
            || (payload.total as number) < 0
            || !Number.isSafeInteger(payload.total_pages)
            || (payload.total_pages as number) < 0
            || !Array.isArray(payload.results)
            || payload.results.length > SEARCHED_IMAGES_COUNT_PER_REQUEST_UNSPLASH
        ) return null;
        const images = payload.results.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const source = (item as Record<string, unknown>).urls;
            if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
            const urls = source as Record<string, unknown>;
            const src = normalizeImageProviderResultUrl(urls.full, ['images.unsplash.com']);
            const thumb = normalizeImageProviderResultUrl(urls.thumb, ['images.unsplash.com']);
            return src && thumb ? { src, thumb } : null;
        });
        if (images.some((image) => image === null)) return null;
        return {
            total: payload.total as number,
            totalPages: payload.total_pages as number,
            images: images as UnsplashImageSearchResult['images'],
        };
    } catch {
        return null;
    }
};

export const parseUnsplashTrendingTopicsResponse = (value: unknown): string[] | null => {
    try {
        if (!Array.isArray(value)) return null;
        const words = value.slice(0, 4).map((topic) => {
            if (!topic || typeof topic !== 'object' || Array.isArray(topic)) return null;
            const title = (topic as Record<string, unknown>).title;
            if (typeof title !== 'string') return null;
            const normalized = title.trim();
            return normalized && normalized.length <= 80 ? normalized : null;
        });
        return words.some((word) => word === null) ? null : words as string[];
    } catch {
        return null;
    }
};

export const getUnsplashImagesBySearchQuery = async (
    searchQuery: unknown,
    orientation: unknown = BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE,
    page: unknown = 1,
): Promise<UnsplashImageSearchResult> => {
    const normalizedOrientation = normalizeImageProviderOrientation(orientation);
    const normalizedPage = normalizeImageProviderPage(page);
    const requestUrl = buildImageProviderUrl(SEARCH_API_URL, {
        client_id: process.env.NEXT_PUBLIC_UNSPLASH_API_CLIENTID || '',
        orientation: normalizedOrientation,
        page: normalizedPage,
        per_page: SEARCHED_IMAGES_COUNT_PER_REQUEST_UNSPLASH,
        query: normalizeImageProviderQuery(searchQuery),
    });

    try {
        const response = await axiosClient.GET(requestUrl, { timeout: IMAGE_PROVIDER_REQUEST_TIMEOUT_MS });
        const parsed = parseUnsplashImageSearchResponse(response.data);
        if (!parsed) throw new Error('IMAGE_PROVIDER_RESPONSE_INVALID');
        return parsed;
    } catch (error) {
        logImageProviderFailure('image_provider_unsplash_search_failed', error, getImageProviderRequestLogContext({
            operation: 'search',
            orientation: normalizedOrientation,
            page: normalizedPage,
            provider: 'unsplash',
            query: searchQuery,
        }));
        throw new Error('Error while fetching images');
    }
}

export const getTrendingWords = async (): Promise<string[]> => {
    const requestUrl = buildImageProviderUrl(TOPICS_API_URL, {
        client_id: process.env.NEXT_PUBLIC_UNSPLASH_API_CLIENTID || '',
    });

    try {
        const response = await axiosClient.GET(requestUrl, { timeout: IMAGE_PROVIDER_REQUEST_TIMEOUT_MS });
        const words = parseUnsplashTrendingTopicsResponse(response.data);
        if (!words) throw new Error('IMAGE_PROVIDER_RESPONSE_INVALID');
        return words;
    } catch (error) {
        logImageProviderFailure('image_provider_unsplash_topics_failed', error, getImageProviderRequestLogContext({
            operation: 'topics',
            provider: 'unsplash',
        }));
        throw new Error('Error while fetching image topics');
    }
}
