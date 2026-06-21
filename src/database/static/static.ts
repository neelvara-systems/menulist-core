import { ERROR_RESPONSE, SUCCESS_RESPONSE } from "@constant/common";
import { DB_COLLECTIONS } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { addDoc, collection } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { AssetsCategoryType, CraftBuilderAssetsTypesType } from "@type/assets";
import { arrayRemove, arrayUnion, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";

const COLLECTION = `${DB_COLLECTIONS.COMMON}/${DB_COLLECTIONS.ASSETS}/`;

const getCollectionRef = async (type) => {
    return collection(firebaseClient, `${COLLECTION}${type}`)
}

const getDocRef = async (type: any, docId: any) => {
    return doc(firebaseClient, `${COLLECTION}${type}`, docId)
}

const getPreviewUrl = (type, data: any) => {
    return new Promise(async (res, rej) => {
        if (data.newPreview) {
            const id = String(new Date().getTime())
            if (data.preview && data.preview.includes("menulist-qa.appspot.com")) await deleteFileByUrl(data.preview);
            //deployed url : "https://firebasestorage.googleapis.com/v0/b/menulist-qa.appspot.com/o/craftBuilder%2Fassets%2Fillustrations%2F1725798041128?alt=media&token=..."
            //upload new preview image 
            let previewUrl = await uploadBase64ToStorage({
                cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
                fileId: id,
                url: data.newPreview,
                path: `${DB_COLLECTIONS.COMMON}/${DB_COLLECTIONS.ASSETS}/${type}/${id}`,
                type: data.previewType
            })
            delete data.newPreview;
            data.preview = previewUrl;
            res(data)
        } else {
            res(data)
        }
    })
}

export const addAssetsCategory = async (type: CraftBuilderAssetsTypesType, data: any) => {
    return await apiCallComposer(
        async () => {
            data = await getPreviewUrl(type, data);
            const docRef = await addDoc(await getCollectionRef(type), await requestBodyComposer(data));
            const newId = docRef.id
            console.log("Document written with ID: ", newId);
            return { ...data, id: newId };
        },
        type,
        data,
        "addAssetsCategory"
    );
}

export const updateAssetsCategory = async (type: CraftBuilderAssetsTypesType, data: any, docId: string) => {
    return await apiCallComposer(
        async () => {
            data = await getPreviewUrl(type, data);
            const collectionDocRef = await getDocRef(type, docId);
            const docRef = await updateDoc(collectionDocRef, await requestBodyComposer(data));
            console.log("Document written with ID: ", collectionDocRef.id);
            return { ...data };
        },
        type,
        data,
        docId,
        "updateAssetsCategory"
    );
}

export const deleteAssetsCategory = async (type: CraftBuilderAssetsTypesType, categoryDetails: AssetsCategoryType) => {
    return await apiCallComposer(
        async () => {
            const filesTodelete = [];
            if (categoryDetails.preview) filesTodelete.push(categoryDetails.preview)
            if (categoryDetails?.subCategories?.length) {
                categoryDetails?.subCategories.map((subCategory) => {
                    Boolean(subCategory.preview) && filesTodelete.push(subCategory.preview)
                    if (subCategory?.items?.length) {
                        subCategory?.items.map((i) => Boolean(i.preview) && filesTodelete.push(i.preview))
                    }
                })
            } else if (categoryDetails?.items?.length) {
                categoryDetails?.items.map((c) => Boolean(c.preview) && filesTodelete.push(c.preview))
            }
            if (filesTodelete.length != 0) {
                try {
                    const deletePromises = filesTodelete.map(async url => {
                        return await deleteFileByUrl(url);
                    });
                    // Wait for all deletion promises to resolve
                    await Promise.all(deletePromises);
                } catch (e) {
                    console.log("Unbale to delete siome files")
                }
            }
            const collectionDocRef = await getDocRef(type, categoryDetails.id);
            await deleteDoc(collectionDocRef);
            return SUCCESS_RESPONSE
        },
        type,
        categoryDetails,
        "deletAssetsCategory"
    );
}

export const addAssetsSubCategory = async (type: CraftBuilderAssetsTypesType, data: any, docId: string) => {
    return await apiCallComposer(
        async () => {
            data = await getPreviewUrl(type, data);
            const collectionDocRef = await getDocRef(type, docId);
            // Update the parent category's subCategories array using arrayUnion
            const docRef = await updateDoc(collectionDocRef, { subCategories: arrayUnion(data) });
            console.log("Document written with ID: ", collectionDocRef.id);
            return { ...data };
        },
        type,
        data,
        docId,
        "updateAssetsCategory"
    );
}

export const updateAssetsSubCategory = async (type: CraftBuilderAssetsTypesType, data: any, parentCategory: AssetsCategoryType) => {
    return await apiCallComposer(
        async () => {
            const subcategoryIndex = parentCategory.subCategories.findIndex(subcategory => subcategory.id === data.id);
            if (subcategoryIndex !== -1) {

                data = await getPreviewUrl(type, data);
                const collectionDocRef = await getDocRef(type, parentCategory.id);
                // Update the parent category's subCategories array using arrayUnion
                const newSubCats = [...parentCategory.subCategories];
                newSubCats[subcategoryIndex] = data;
                const docRef = await updateDoc(collectionDocRef, { subCategories: newSubCats });
                return { ...data };
            } else {
                console.error("Subcategory not found.");
                return ERROR_RESPONSE
            }
        },
        type,
        data,
        parentCategory,
        "updateAssetsCategory"
    );
}

export const deleteAssetsSubCategory = async (type: CraftBuilderAssetsTypesType, categoryDetails: AssetsCategoryType, parentCategory: AssetsCategoryType) => {
    return await apiCallComposer(
        async () => {
            const filesTodelete = [];
            if (categoryDetails.preview) filesTodelete.push(categoryDetails.preview)
            if (categoryDetails?.items?.length) {
                categoryDetails?.items.map((c) => Boolean(c.preview) && filesTodelete.push(c.preview))
            }
            if (filesTodelete.length != 0) {
                try {
                    const deletePromises = filesTodelete.map(async url => {
                        return await deleteFileByUrl(url);
                    });
                    // Wait for all deletion promises to resolve
                    await Promise.all(deletePromises);
                } catch (e) {
                    console.log("Unbale to delete siome files")
                }
            }
            const collectionDocRef = await getDocRef(type, parentCategory.id);
            // Update the parent category's subCategories array using arrayUnion
            const docRef = await updateDoc(collectionDocRef, { subCategories: arrayRemove(categoryDetails) });
            return SUCCESS_RESPONSE
        },
        type,
        categoryDetails,
        "deletAssetsCategory"
    );
}

export const addAssetsItem = async (type: CraftBuilderAssetsTypesType, data: any, parentCategory: AssetsCategoryType, subCategory: AssetsCategoryType) => {
    return await apiCallComposer(
        async () => {
            data = await getPreviewUrl(type, data);
            const collectionDocRef = await getDocRef(type, parentCategory.id);
            if (Boolean(subCategory?.id)) {
                const subcategoryIndex = parentCategory.subCategories.findIndex(subcategory => subcategory.id === subCategory.id);
                const newSubCats = [...parentCategory.subCategories];
                newSubCats[subcategoryIndex].items.push(data);
                await updateDoc(collectionDocRef, { subCategories: newSubCats });
            } else {
                await updateDoc(collectionDocRef, { items: arrayUnion(data) });
            }
            // Update the parent category's subCategories array using arrayUnion
            console.log("Document written with ID: ", collectionDocRef.id);
            return { ...data };
        },
        type,
        data,
        parentCategory,
        subCategory,
        "updateAssetsCategory"
    );
}

export const updateAssetsItem = async (type: CraftBuilderAssetsTypesType, data: any, parentCategory: AssetsCategoryType, subCategory: AssetsCategoryType) => {
    return await apiCallComposer(
        async () => {
            data = await getPreviewUrl(type, data);
            const collectionDocRef = await getDocRef(type, parentCategory.id);
            if (Boolean(subCategory?.id)) {
                const subcategoryIndex = parentCategory.subCategories.findIndex(subcategory => subcategory.id === subCategory.id);
                const newSubCats = [...parentCategory.subCategories];
                let iIndex = newSubCats[subcategoryIndex].items.findIndex(i => i.id == data.id)
                newSubCats[subcategoryIndex].items[iIndex] = data;
                await updateDoc(collectionDocRef, { subCategories: newSubCats });
            } else {
                const newItems = [...parentCategory.items];
                let iIndex = parentCategory.items.findIndex(i => i.id == data.id)
                newItems[iIndex] = data;
                await updateDoc(collectionDocRef, { items: newItems });
            }
            // Update the parent category's subCategories array using arrayUnion
            console.log("Document written with ID: ", collectionDocRef.id);
            return { ...data };
        },
        type,
        parentCategory,
        subCategory,
        "updateAssetsCategory"
    );
}

export const deleteAssetsItem = async (type: CraftBuilderAssetsTypesType, data: any, parentCategory: AssetsCategoryType, subCategory: AssetsCategoryType) => {
    return await apiCallComposer(
        async () => {

            if (data.preview) await deleteFileByUrl(data.preview);
            const collectionDocRef = await getDocRef(type, parentCategory.id);

            if (Boolean(subCategory?.id)) {
                const subcategoryIndex = parentCategory.subCategories.findIndex(subcategory => subcategory.id === subCategory.id);
                const newSubCats = [...parentCategory.subCategories];
                let iIndex = newSubCats[subcategoryIndex].items.findIndex(i => i.id == data.id)
                newSubCats[subcategoryIndex].items.splice(iIndex, 1);
                await updateDoc(collectionDocRef, { subCategories: newSubCats });
            } else {
                const newItems = [...parentCategory.items];
                let iIndex = parentCategory.items.findIndex(i => i.id == data.id)
                newItems.splice(iIndex, 1);
                await updateDoc(collectionDocRef, { items: newItems });
            }

            return SUCCESS_RESPONSE
        },
        type,
        data,
        parentCategory,
        subCategory,
        "deletAssetsCategory"
    );
}

export async function getAllAssetsByType(type: CraftBuilderAssetsTypesType,) {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef(type));
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id });
            });
            return (list);
        },
        type,
        "getAllIllustrations"
    );
}


export async function getBusinessAssetsByType(type: CraftBuilderAssetsTypesType, businessType: string) {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef(type));
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id });
            });
            return (list);
        },
        type,
        "getAllIllustrations"
    );
}
