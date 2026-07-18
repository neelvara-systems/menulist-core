import { DB_COLLECTIONS } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, getDoc, getDocs, query, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isDataUrl } from "@lib/media/mediaStorage";
import { createRuntimeId } from "@lib/runtime/randomId";
import { logRuntimeDiagnostic, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { STORAGE_CACHE_CONTROL } from "@lib/storage/cacheControl";
import { getStorageReplacementCleanupTargets, type StorageReplacementCommitState } from "@lib/storage/replacementUploadBoundary";
import { doc, setDoc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.BLOGS;

const cleanupBlogImageReplacement = async ({
    blogId,
    commitState,
    previousUrl,
    uploadedUrl,
}: {
    blogId: unknown;
    commitState: StorageReplacementCommitState;
    previousUrl?: unknown;
    uploadedUrl?: unknown;
}): Promise<void> => {
    if (commitState === 'committed') {
        if (previousUrl && uploadedUrl && previousUrl !== uploadedUrl) {
            logRuntimeDiagnostic('blog_image_persisted_cleanup_deferred_shared_reference', {
                blogId: String(blogId || '').slice(0, 160),
            });
        }
        return;
    }
    const targets = getStorageReplacementCleanupTargets({ commitState, previousUrl, uploadedUrl });
    if (commitState === 'ambiguous' && uploadedUrl) {
        logRuntimeFailure('blog_image_ambiguous_persistence_media_retained', new Error('persistence_outcome_ambiguous'), {
            blogId: String(blogId || '').slice(0, 160),
        });
    }
    if (!targets.length) return;
    const results = await Promise.all(targets.map((url) => deleteFileByUrl(url)));
    const failedCount = results.filter((result) => !result.success).length;
    if (failedCount > 0) {
        logRuntimeFailure('blog_image_replacement_cleanup_failed', new Error('storage_cleanup_failed'), {
            blogId: String(blogId || '').slice(0, 160),
            commitState,
            failedCount,
        });
    }
};

const uploadBlogImage = async (imageToUpdate: string): Promise<string> => {
    const objectId = createRuntimeId('blog_image');
    return uploadBase64ToStorage({
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        fileId: objectId,
        path: `${COLLECTION}/profileImages/${objectId}`,
        url: imageToUpdate,
    });
};

const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const getAllBlogs = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllBlogs"
    );
}

export const getBlogsByStoreId = async (storeId) => {
    return await apiCallComposer(
        async () => {
            const ref = query(await getCollectionRef(), where("storeId", "==", storeId));
            const querySnapshot = await getDocs(ref);
            if (querySnapshot.empty) {
                return ([]);
            } else {
                const list: any = [];
                querySnapshot.forEach((doc) => {
                    list.push({ ...doc.data(), id: doc.id })
                });
                return (list)
            }
        },
        storeId,
        "getBlogssByStoreId"
    );
}

export const getBlogById = async (id: number) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = await getDocRef(id);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null
            }
        },
        id,
        "getBlogById"
    );
}

export const addBlog = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const blogRef = doc(getCollectionRef());
            const nextData = { ...data };
            const imageToUpdate: unknown = nextData.imageToUpdate;
            delete nextData.id;
            delete nextData.imageToUpdate;
            delete nextData.imageType;
            let uploadedUrl = '';
            let persistenceAttempted = false;
            try {
                if (isDataUrl(imageToUpdate)) {
                    uploadedUrl = await uploadBlogImage(imageToUpdate);
                    nextData.profileImage = uploadedUrl;
                } else if (typeof imageToUpdate === 'string' && imageToUpdate.trim()) {
                    nextData.profileImage = imageToUpdate.trim();
                }
                const composedData = await requestBodyComposer(nextData, { isNew: true });
                persistenceAttempted = true;
                await setDoc(blogRef, composedData);
                return { ...nextData, id: blogRef.id };
            } catch (error) {
                await cleanupBlogImageReplacement({
                    blogId: blogRef.id,
                    commitState: persistenceAttempted ? 'ambiguous' : 'not_persisted',
                    uploadedUrl,
                });
                throw error;
            }
        },
        data,
        "addBlog"
    );
}

export const updateBlog = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const blogRef = getDocRef(data.id);
            const nextData = { ...data };
            const imageToUpdate: unknown = nextData.imageToUpdate;
            delete nextData.id;
            delete nextData.imageToUpdate;
            delete nextData.imageType;
            let uploadedUrl = '';
            let previousUrl: unknown;
            let persistenceAttempted = false;
            if (isDataUrl(imageToUpdate)) {
                const currentSnapshot = await getDoc(blogRef);
                if (!currentSnapshot.exists()) throw new Error('blog_update_target_missing');
                previousUrl = currentSnapshot.data()?.profileImage;
            }
            try {
                if (isDataUrl(imageToUpdate)) {
                    uploadedUrl = await uploadBlogImage(imageToUpdate);
                    nextData.profileImage = uploadedUrl;
                } else if (typeof imageToUpdate === 'string' && imageToUpdate.trim()) {
                    nextData.profileImage = imageToUpdate.trim();
                }
                const composedData = await requestBodyComposer(nextData, { isNew: false });
                persistenceAttempted = true;
                await updateDoc(blogRef, composedData);
            } catch (error) {
                await cleanupBlogImageReplacement({
                    blogId: data.id,
                    commitState: persistenceAttempted ? 'ambiguous' : 'not_persisted',
                    uploadedUrl,
                });
                throw error;
            }
            await cleanupBlogImageReplacement({
                blogId: data.id,
                commitState: 'committed',
                previousUrl,
                uploadedUrl,
            });
            return { ...nextData, id: data.id };
        },
        data,
        "updateBlog"
    );
}
