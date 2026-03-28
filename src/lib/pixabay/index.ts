import { BACKGROUND_IMAGES_ORIENTATIONS, SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY } from "@constant/common";
import { axiosClient } from "../axios/axiosClient";

const SEARCH_API_URL = `https://pixabay.com/api?key=${process.env.NEXT_PUBLIC_PIXABAY_API_CLIENTID}&`;

export const PIXABAY_IMAGE_SIZES = {
    "largeImageURL": 'largeImageURL',//56kb
    "previewURL": 'previewURL',//3kb
    "webformatURL": 'webformatURL',//19kb webp
}

export const getPixabayImagesBySearchQuery = (searchQuery: any, orientation = BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE, page = 1) => {
    if (orientation == BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE || orientation == BACKGROUND_IMAGES_ORIENTATIONS.SQUARE) orientation = 'horizontal';
    if (orientation == BACKGROUND_IMAGES_ORIENTATIONS.PORTRAIT) orientation = 'vertical';
    return new Promise((res, rej) => {
        axiosClient.GET(`${SEARCH_API_URL}orientation=${orientation}&page=${page}&per_page=${SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY}&q=${searchQuery}`)
            .then((response) => {
                const data = {
                    total: response.data.total,
                    totalPages: (response.data.total / SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY).toFixed(),
                    images: response.data.hits.map((i: any) => { return { src: i.largeImageURL, thumb: i.previewURL } })
                }
                res(data);
            }).catch(function (error) {
                rej(error?.response?.data || 'Error while fetching images');
                console.log(`Error in api/unsplash/getImages = `, error);
            });
    })
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