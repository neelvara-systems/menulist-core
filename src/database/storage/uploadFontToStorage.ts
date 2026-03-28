
import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
// const storageRef = ref(storage, 'templates');

// Data URL string
// const message4 = 'data:text/plain;base64,5b6p5Y+344GX44G+44GX44Gf77yB44GK44KB44Gn44Go44GG77yB';
// uploadString(storageRef, message4, 'data_url').then((snapshot) => {
//     console.log('Uploaded a data_url string!');
// });


type DataType = {
    name: any,
    file: any
}
const uploadFontToStorage = (data: DataType) => {
    return new Promise((resolve: any, reject: any) => {

        // Upload file and metadata to the object 'images/mountains.jpg'
        const storageRef = ref(firebaseStorage, `fonts/${data.name}`);
        const uploadTask = uploadBytes(storageRef, data.file);

        uploadTask.then((res: any) => {
            console.log("res.metadata.fullPath", res?.metadata?.fullPath)
            getDownloadURL(storageRef).then((downloadURL) => {
                console.log('File available at', downloadURL);
                resolve(downloadURL)
            })
        })
            .catch((error: any) => {
                console.log("error while uploading file", error)
                resolve(null);
            })
    })
}
export default uploadFontToStorage;