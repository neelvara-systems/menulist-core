import { BACKGROUND_IMAGES_ORIENTATIONS, SEARCHED_IMAGES_COUNT_PER_REQUEST_UNSPLASH } from "@constant/common";
import { getImageProviderRequestLogContext, logImageProviderFailure } from "@lib/imageProviderDiagnostics";
import {
    buildImageProviderUrl,
    IMAGE_PROVIDER_REQUEST_TIMEOUT_MS,
    normalizeImageProviderOrientation,
    normalizeImageProviderPage,
    normalizeImageProviderQuery,
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

export const getUnsplashImagesBySearchQuery = (searchQuery: any, orientation = BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE, page = 1) => {
    const normalizedOrientation = normalizeImageProviderOrientation(orientation);
    const normalizedPage = normalizeImageProviderPage(page);
    const requestUrl = buildImageProviderUrl(SEARCH_API_URL, {
        client_id: process.env.NEXT_PUBLIC_UNSPLASH_API_CLIENTID || '',
        orientation: normalizedOrientation,
        page: normalizedPage,
        per_page: SEARCHED_IMAGES_COUNT_PER_REQUEST_UNSPLASH,
        query: normalizeImageProviderQuery(searchQuery),
    });

    return new Promise((res, rej) => {
        axiosClient.GET(requestUrl, { timeout: IMAGE_PROVIDER_REQUEST_TIMEOUT_MS })
            .then((response) => {
                const data = {
                    total: response.data.total,
                    totalPages: response.data.total_pages,
                    images: response.data.results.map((i: any) => { return { src: i.urls.full, thumb: i.urls.thumb } })
                }
                res(data);
            }).catch(function (error) {
                logImageProviderFailure('image_provider_unsplash_search_failed', error, getImageProviderRequestLogContext({
                    operation: 'search',
                    orientation: normalizedOrientation,
                    page: normalizedPage,
                    provider: 'unsplash',
                    query: searchQuery,
                }));
                rej('Error while fetching images');
            });
    })
}

export const getTrendingWords = () => {
    const requestUrl = buildImageProviderUrl(TOPICS_API_URL, {
        client_id: process.env.NEXT_PUBLIC_UNSPLASH_API_CLIENTID || '',
    });

    return new Promise((res, rej) => {
        axiosClient.GET(requestUrl, { timeout: IMAGE_PROVIDER_REQUEST_TIMEOUT_MS })
            .then((response) => {
                const words = response.data.slice(0, 4).map((topic: any) => topic.title);
                res(words);
            }).catch(function (error) {
                logImageProviderFailure('image_provider_unsplash_topics_failed', error, getImageProviderRequestLogContext({
                    operation: 'topics',
                    provider: 'unsplash',
                }));
                rej('Error while fetching image topics');
            });
    })
}
