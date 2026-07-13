import { DB_COLLECTIONS } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage, { type SupportedFileType } from "@database/storage/uploadBase64ToStorage";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "@firebase/firestore";
import { composeRequestBody } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
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


type NoteAttachmentUpload = Readonly<{
    imageType?: SupportedFileType;
    imageToUpdate: string;
}>;

const requireNoteDocumentId = (value: unknown): string => {
    if (!isValidFirestoreDocumentId(value)) throw new TypeError('invalid_note_document_id');
    return value.trim();
};

const getNoteAttachmentFileId = (label: unknown, index: number): string => {
    const normalizedLabel = String(label || 'attachment')
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return `${index}-${normalizedLabel || 'attachment'}`;
};

const uploadNoteAttachment = async (
    data: NoteAttachmentUpload,
    noteId: string,
    fileId: string,
    session: Awaited<ReturnType<typeof getActiveSession>>,
): Promise<string> => {
    if (!data.imageToUpdate.includes('base64')) return '';
    const storageFileId = `${requireNoteDocumentId(noteId)}/${fileId}`;
    return uploadBase64ToStorage({
        fileId: storageFileId,
        url: data.imageToUpdate,
        path: generateStoragePath({
            collection: COLLECTION,
            fileType: 'documents',
            session,
            fileId: storageFileId,
        }),
        type: data.imageType,
    });
};

const cleanupNewNoteAttachments = async (urls: string[], operation: 'create' | 'update') => {
    if (urls.length === 0) return;
    const results = await Promise.all(urls.map((url) => deleteFileByUrl(url)));
    const failedCleanupCount = results.filter((result) => !result.success).length;
    if (failedCleanupCount > 0) {
        logRuntimeFailure('note_attachment_compensation_failed', new Error('storage_cleanup_failed'), {
            operation,
            attemptedCleanupCount: urls.length,
            failedCleanupCount,
        });
    }
};

export const addNote = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const submitData = composeRequestBody(
                { ...data, active: true, deleted: false, stared: false },
                session,
                { isNew: true },
            );
            delete submitData.documents;
            const docRef = await addDoc(getCollectionRef(session), submitData);
            const uploadedUrls: string[] = [];
            try {
                const documents = Array.isArray(data.documents) ? [...data.documents] : [];
                for (let i = 0; i < documents.length; i++) {
                    if (typeof documents[i]?.url === 'string' && documents[i].url.includes('base64')) {
                        const uploadedUrl = await uploadNoteAttachment(
                            { imageType: documents[i].type, imageToUpdate: documents[i].url },
                            docRef.id,
                            getNoteAttachmentFileId(documents[i].label, i),
                            session,
                        );
                        uploadedUrls.push(uploadedUrl);
                        documents[i] = { ...documents[i], url: uploadedUrl };
                    }
                }

                if (documents.length > 0) {
                    const documentUpdate = composeRequestBody({ documents }, session, { isNew: false });
                    await setDoc(docRef, documentUpdate, { merge: true });
                    return { ...submitData, ...documentUpdate, id: docRef.id } as any;
                }
                return { ...submitData, id: docRef.id } as any;
            } catch (error) {
                await cleanupNewNoteAttachments(uploadedUrls, 'create');
                try {
                    await deleteDoc(docRef);
                } catch (cleanupError) {
                    logRuntimeFailure('note_create_compensation_failed', cleanupError, {});
                }
                throw error;
            }
        },
        data,
        "addNote"
    );
}

export const updateNote = async (data: any) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const noteId = requireNoteDocumentId(data.id);
            const updateData = composeRequestBody(data, session, { isNew: false });
            const uploadedUrls: string[] = [];
            try {
                if (Array.isArray(data.documents)) {
                    for (let i = 0; i < data.documents.length; i++) {
                        if (typeof updateData.documents[i]?.url === 'string' && updateData.documents[i].url.includes('base64')) {
                            const uploadedUrl = await uploadNoteAttachment(
                                { imageType: data.documents[i].type, imageToUpdate: data.documents[i].url },
                                noteId,
                                getNoteAttachmentFileId(data.documents[i].label, i),
                                session,
                            );
                            uploadedUrls.push(uploadedUrl);
                            updateData.documents[i].url = uploadedUrl;
                        }
                    }
                }

                await setDoc(getDocRef(session, noteId), updateData, { merge: true });
                return updateData;
            } catch (error) {
                await cleanupNewNoteAttachments(uploadedUrls, 'update');
                throw error;
            }
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
