import { BACKGROUND_IMAGES_ORIENTATIONS, SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS } from "@constant/common";
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

const SEARCH_API_URL = 'https://api.pexels.com/v1/search';


export const PEXELS_IMAGE_SIZES = {
    "original": 'original',//8.7mb
    "large2x": 'large2x',//44kb webp
    "large": 'large',//16kb webp
    "medium": 'medium',//7kb webp
    "small": 'small',//3kb 
    "portrait": 'portrait',//25kb
    "landscape": 'landscape',//21kb webp
    "tiny": 'tiny'//3kb webp
}

export interface PexelsImageSearchResult {
    images: Array<{ src: string; thumb: string }>;
    total: number;
    totalPages: number;
}

export const parsePexelsImageSearchResponse = (value: unknown): PexelsImageSearchResult | null => {
    try {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const payload = value as Record<string, unknown>;
        if (!Number.isSafeInteger(payload.total_results) || (payload.total_results as number) < 0 || !Array.isArray(payload.photos)) return null;
        if (payload.photos.length > SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS) return null;
        const images = payload.photos.map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const source = (item as Record<string, unknown>).src;
            if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
            const urls = source as Record<string, unknown>;
            const src = normalizeImageProviderResultUrl(urls.large2x, ['images.pexels.com'])
                || normalizeImageProviderResultUrl(urls.original, ['images.pexels.com']);
            const thumb = normalizeImageProviderResultUrl(urls.large, ['images.pexels.com']);
            return src && thumb ? { src, thumb } : null;
        });
        if (images.some((image) => image === null)) return null;
        const total = payload.total_results as number;
        return {
            total,
            totalPages: Math.ceil(total / SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS),
            images: images as PexelsImageSearchResult['images'],
        };
    } catch {
        return null;
    }
};

export const getPexelsImagesBySearchQuery = async (
    searchQuery: unknown,
    orientation: unknown = BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE,
    page: unknown = 1,
): Promise<PexelsImageSearchResult> => {
    const normalizedOrientation = normalizeImageProviderOrientation(orientation);
    const normalizedPage = normalizeImageProviderPage(page);
    const requestUrl = buildImageProviderUrl(SEARCH_API_URL, {
        orientation: normalizedOrientation,
        page: normalizedPage,
        per_page: SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS,
        query: normalizeImageProviderQuery(searchQuery),
    });

    try {
        const response = await axiosClient.GET(requestUrl, {
            headers: {
                Accept: "application/json",
                Authorization: process.env.NEXT_PUBLIC_PEXELS_API_CLIENTID || '',
            },
            timeout: IMAGE_PROVIDER_REQUEST_TIMEOUT_MS,
        });
        const parsed = parsePexelsImageSearchResponse(response.data);
        if (!parsed) throw new Error('IMAGE_PROVIDER_RESPONSE_INVALID');
        return parsed;
    } catch (error) {
        logImageProviderFailure('image_provider_pexels_search_failed', error, getImageProviderRequestLogContext({
            operation: 'search',
            orientation: normalizedOrientation,
            page: normalizedPage,
            provider: 'pexels',
            query: searchQuery,
        }));
        throw new Error('Error while fetching images');
    }
}

// {
//     "total_results": 10000,
//         "page": 1,
//             "per_page": 1,
//                 "photos": [
//                     {
//                         "id": 3573351,
//                         "width": 3066,
//                         "height": 3968,
//                         "url": "https://www.pexels.com/photo/trees-during-day-3573351/",
//                         "photographer": "Lukas Rodriguez",
//                         "photographer_url": "https://www.pexels.com/@lukas-rodriguez-1845331",
//                         "photographer_id": 1845331,
//                         "avg_color": "#374824",
//                         "src": {
//                             "original": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png",
//                             "large2x": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
//                             "large": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png?auto=compress&cs=tinysrgb&h=650&w=940",
//                             "medium": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png?auto=compress&cs=tinysrgb&h=350",
//                             "small": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png?auto=compress&cs=tinysrgb&h=130",
//                             "portrait": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
//                             "landscape": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
//                             "tiny": "https://images.pexels.com/photos/3998365/pexels-photo-3998365.png?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280"
//                         },
//                         "liked": false,
//                         "alt": "Brown Rocks During Golden Hour"
//                     }
//                 ],
//                     "next_page": "https://api.pexels.com/v1/search/?page=2&per_page=1&query=nature"
// }
