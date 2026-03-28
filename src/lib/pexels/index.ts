import { BACKGROUND_IMAGES_ORIENTATIONS, SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS } from "@constant/common";
import { axiosClient } from "../axios/axiosClient";

const SEARCH_API_URL = `https://api.pexels.com/v1/search?`;


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
export const getPexelsImagesBySearchQuery = (searchQuery: any, orientation = BACKGROUND_IMAGES_ORIENTATIONS.LANDSCAPE, page = 1) => {
    return new Promise((res, rej) => {
        axiosClient.GET(`${SEARCH_API_URL}orientation=${orientation}&page=${page}&per_page=${SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS}&query=${searchQuery}`, {
            Accept: "application/json",
            Authorization: process.env.NEXT_PUBLIC_PEXELS_API_CLIENTID,
        }).then((response) => {
            const data = {
                total: response.data.total_results,
                totalPages: (response.data.total_results / SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS).toFixed(),
                images: response.data.photos.map((i: any) => { return { src: i.src.large2x || i.src.original, thumb: i.src.large } })
            }
            res(data);
        }).catch(function (error) {
            rej(error.response.data);
            console.log(`Error in api/unsplash/getImages = `, error);
        });
    })
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