import { BACKGROUND_IMAGES_ORIENTATIONS, SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY } from "@constant/common";
import { getImageProviderRequestLogContext, logImageProviderFailure } from "@lib/imageProviderDiagnostics";
import {
    buildImageProviderUrl,
    IMAGE_PROVIDER_REQUEST_TIMEOUT_MS,
    normalizeImageProviderPage,
    normalizeImageProviderQuery,
    normalizeImageProviderResultUrl,
    normalizePixabayImageProviderOrientation,
} from "@lib/imageProviderRequests";
import { axiosClient } from "../axios/axiosClient";

const SEARCH_API_URL = 'https://pixabay.com/api';

export const PIXABAY_IMAGE_SIZES = {
    "largeImageURL": 'largeImageURL',//56kb
    "previewURL": 'previewURL',//3kb
    "webformatURL": 'webformatURL',//19kb webp
}

export interface PixabayImageSearchResult {
    images: Array<{ src: string; thumb: string }>;
    total: number;
    totalPages: number;
}

export const parsePixabayImageSearchResponse = (value: unknown): PixabayImageSearchResult | null => {
    try {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const payload = value as Record<string, unknown>;
        if (!Number.isSafeInteger(payload.total) || (payload.total as number) < 0 || !Array.isArray(payload.hits)) return null;
        if (payload.hits.length > SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY) return null;
        const images = payload.hits.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const record = item as Record<string, unknown>;
            const src = normalizeImageProviderResultUrl(record.largeImageURL, ['pixabay.com']);
            const thumb = normalizeImageProviderResultUrl(record.previewURL, ['pixabay.com']);
            return src && thumb ? { src, thumb } : null;
        });
        if (images.some((image) => image === null)) return null;
        const total = payload.total as number;
        return {
            total,
            totalPages: Math.ceil(total / SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY),
            images: images as PixabayImageSearchResult['images'],
        };
    } catch {
        return null;
    }
};

export const getPixabayImagesBySearchQuery = async (
    searchQuery: unknown,
    orientation: unknown = BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE,
    page: unknown = 1,
): Promise<PixabayImageSearchResult> => {
    const normalizedOrientation = normalizePixabayImageProviderOrientation(orientation);
    const normalizedPage = normalizeImageProviderPage(page);
    const requestUrl = buildImageProviderUrl(SEARCH_API_URL, {
        key: process.env.NEXT_PUBLIC_PIXABAY_API_CLIENTID || '',
        orientation: normalizedOrientation,
        page: normalizedPage,
        per_page: SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY,
        q: normalizeImageProviderQuery(searchQuery),
    });

    try {
        const response = await axiosClient.GET(requestUrl, { timeout: IMAGE_PROVIDER_REQUEST_TIMEOUT_MS });
        const parsed = parsePixabayImageSearchResponse(response.data);
        if (!parsed) throw new Error('IMAGE_PROVIDER_RESPONSE_INVALID');
        return parsed;
    } catch (error) {
        logImageProviderFailure('image_provider_pixabay_search_failed', error, getImageProviderRequestLogContext({
            operation: 'search',
            orientation: normalizedOrientation,
            page: normalizedPage,
            provider: 'pixabay',
            query: searchQuery,
        }));
        throw new Error('Error while fetching images');
    }
}
// {
//     "total": 4692,
//         "totalHits": 500,
//             "hits": [
//                 {
//                     "id": 195893,
//                     "pageURL": "https://pixabay.com/en/blossom-bloom-flower-195893/",
//                     "type": "photo",
//                     "tags": "blossom, bloom, flower",
//                     "previewURL": "https://cdn.pixabay.com/photo/2013/10/15/09/12/flower-195893_150.jpg"
//         "previewWidth": 150,
//                     "previewHeight": 84,
//                     "webformatURL": "https://pixabay.com/get/35bbf209e13e39d2_640.jpg",
//                     "webformatWidth": 640,
//                     "webformatHeight": 360,
//                     "largeImageURL": "https://pixabay.com/get/ed6a99fd0a76647_1280.jpg",
//                     "fullHDURL": "https://pixabay.com/get/ed6a9369fd0a76647_1920.jpg",
//                     "imageURL": "https://pixabay.com/get/ed6a9364a9fd0a76647.jpg",
//                     "imageWidth": 4000,
//                     "imageHeight": 2250,
//                     "imageSize": 4731420,
//                     "views": 7671,
//                     "downloads": 6439,
//                     "likes": 5,
//                     "comments": 2,
//                     "user_id": 48777,
//                     "user": "Josch13",
//                     "userImageURL": "https://cdn.pixabay.com/user/2013/11/05/02-10-23-764_250x250.jpg",
//                 },
//                 {
//                     "id": 73424,
//                     ...
//     },
//                 ...
// ]
// }
