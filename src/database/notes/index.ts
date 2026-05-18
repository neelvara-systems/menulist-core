import { DB_COLLECTIONS } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { generateStoragePath } from "@lib/storage/pathGenerator";
import { addDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.NOTES;

interface NoteConfig {
    categories: Array<{
        id: string;
        name: string;
        color: string;
    }>;
    tags: Array<{
        id: string;
        name: string;
        color: string;
    }>;
}

const getCollectionRef = (session: any) => {
    return collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`)
}

const getDocRef = (session: any, docId: string) => {
    return doc(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`, docId)
}

const getNoteConfigDocRef = (session: any) => {
    return doc(firebaseClient, `${DB_COLLECTIONS.NOTES_METADATA}/data/${session.tId}/${session.sId}`)
}


const uploadImage = async (data, type = '', fileId, session: any) => {

    let newUrl: any = '';
    let imageType: any = data.imageType;
    let imageToUpdate: any = data.imageToUpdate;
    const docId = `${data.id}/${fileId}`;

    if (imageToUpdate) {
        if (imageToUpdate?.includes('base64')) {
            //upload logo image to firebase storage
            newUrl = await uploadBase64ToStorage({
                fileId: docId,
                url: imageToUpdate,
                path: generateStoragePath({
                    collection: COLLECTION,
                    fileType: type,
                    session,
                    fileId: docId,
                }),
                type: imageType
            })
        }
        return newUrl
    } else return ''
}

export const addNote = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const submitData = await requestBodyComposer({ ...data, active: true, deleted: false, stared: false });
            delete submitData.documents;
            //upload additional documents files
            const docRef = await addDoc(getCollectionRef(session), submitData);

            const files = data.documents?.filter(doc => doc.url.includes('base64')) || [];
            if (files.length) {
                submitData.documents = data.documents;
                for (let i = 0; i < data.documents.length; i++) {
                    if (submitData.documents[i].url.includes('base64')) {
                        submitData.documents[i].url = await uploadImage({ imageType: data.documents[i].type, imageToUpdate: data.documents[i].url }, 'documents', data.documents[i].label, session)
                    }
                }
            }
            return { ...submitData, ...await updateNote({ documents: submitData.documents, id: docRef.id }) } as any;
        },
        data,
        "addNote"
    );
}

export const updateNote = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const updateData = await requestBodyComposer(data);

            const files = data.documents?.filter(doc => doc.url.includes('base64')) || [];
            if (files.length) {
                for (let i = 0; i < data.documents.length; i++) {
                    if (updateData.documents[i].url.includes('base64')) {
                        updateData.documents[i].url = await uploadImage({ imageType: data.documents[i].type, imageToUpdate: data.documents[i].url }, 'documents', data.documents[i].label, session)
                    }
                }
            }

            await setDoc(getDocRef(session, data.id), updateData, { merge: true });
            return updateData;
        },
        data,
        "updateNote"
    );
}

export const deleteNote = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            if (data.documents?.length) {
                for (let i = 0; i < data.documents.length; i++) {
                    await deleteFileByUrl(data.documents[i].url)
                }
            }
            const docRef = getDocRef(session, data.id);
            await deleteDoc(docRef);
            return null;
        },
        data,
        "deleteNote"
    );
}

export const restoreNote = async (data: any) => {
    return await updateNote({ ...data, deleted: false });
}

export const getNoteById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = getDocRef(session, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            }
            return null;
        },
        id,
        "getNoteById"
    );
}

export const getAllNotes = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const q = query(
                getCollectionRef(session),
                where("uId", "==", session.uId)
            );
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            return list;
        },
        "getAllNotes"
    );
}

export const getNoteConfig = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docSnap = await getDoc(getNoteConfigDocRef(session));
            if (docSnap.exists()) {
                return docSnap.data() as NoteConfig;
            }
            return null;
        },
        null,
        "getNoteConfig"
    );
}

export const updateNoteConfig = async (data: Partial<NoteConfig>) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            await setDoc(getNoteConfigDocRef(session), data, { merge: true });
            return data;
        },
        data,
        "updateNoteConfig"
    );
}

export const updateNoteCategories = async (categories: NoteConfig['categories']) => {
    return await updateNoteConfig({ categories });
}

export const getNoteTags = async () => {
    const config = await getNoteConfig();
    return config?.tags || [];
}

export const updateNoteTags = async (tags: NoteConfig['tags']) => {
    return await updateNoteConfig({ tags });
}
