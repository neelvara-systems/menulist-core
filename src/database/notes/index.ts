import { DB_COLLECTIONS } from "@constant/database";
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
import uploadBase64ToStorage, { type SupportedFileType } from "@database/storage/uploadBase64ToStorage";
import { collection, deleteDoc, doc, getDoc, getDocFromServer, getDocs, query, runTransaction, setDoc, where } from "@firebase/firestore";
import { composeRequestBody } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { buildNoteAttachmentFileId, collectNoteAttachmentUrls, getNoteAttachmentCommitStatus, getRemovedNoteAttachmentUrls } from "@lib/notes/noteAttachmentBoundary";
import { createRuntimeId } from "@lib/runtime/randomId";
import { logRuntimeDiagnostic, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { isDataUrl } from "@lib/media/mediaStorage";
import { generateStoragePath } from "@lib/storage/pathGenerator";
import { addDoc } from "firebase/firestore";
import { ref } from "firebase/storage";

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

const uploadNoteAttachment = async (
    data: NoteAttachmentUpload,
    noteId: string,
    fileId: string,
    session: Awaited<ReturnType<typeof getActiveSession>>,
): Promise<string> => {
    if (!isDataUrl(data.imageToUpdate)) return '';
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

const cleanupNoteAttachments = async (urls: string[], operation: 'create' | 'update' | 'delete' | 'update_removed') => {
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

const deferPersistedNoteAttachmentCleanup = (
    urls: readonly string[],
    operation: 'delete' | 'update_removed',
): void => {
    const retainedCount = new Set(urls.filter(Boolean)).size;
    if (retainedCount === 0) return;
    logRuntimeDiagnostic('note_attachment_cleanup_deferred_shared_reference', {
        operation,
        retainedCount,
    });
};

const isOwnedNoteAttachmentUrl = (
    url: string,
    noteId: string,
    session: Awaited<ReturnType<typeof getActiveSession>>,
): boolean => {
    const expectedPathPrefix = `notes/documents/${session.tId}/${session.sId}/${noteId}/`;
    try {
        return ref(firebaseStorage, url).fullPath.startsWith(expectedPathPrefix);
    } catch {
        return false;
    }
};

const readCurrentNoteFromServer = async (
    noteId: string,
    session: Awaited<ReturnType<typeof getActiveSession>>,
): Promise<Record<string, unknown> | null> => {
    const snapshot = await getDocFromServer(getDocRef(session, noteId));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (
        String(data.tId) !== String(session.tId)
        || String(data.sId) !== String(session.sId)
    ) {
        throw new Error('note_persisted_scope_invalid');
    }
    return data;
};

const logAmbiguousNoteAttachmentCommit = (
    operation: 'create' | 'update',
    uploadedUrls: readonly string[],
    error: unknown,
): void => {
    logRuntimeFailure('note_attachment_persistence_outcome_ambiguous', error, {
        operation,
        uploadedAttachmentCount: uploadedUrls.length,
    });
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
            const documents = Array.isArray(data.documents) ? [...data.documents] : [];
            let documentUpdate: ReturnType<typeof composeRequestBody> | null = null;
            let documentPersistenceAttempted = false;
            try {
                for (let i = 0; i < documents.length; i++) {
                    if (isDataUrl(documents[i]?.url)) {
                        const uploadedUrl = await uploadNoteAttachment(
                            { imageType: documents[i].type, imageToUpdate: documents[i].url },
                            docRef.id,
                            buildNoteAttachmentFileId({
                                attemptId: createRuntimeId('upload'),
                                index: i,
                                label: documents[i].label,
                            }),
                            session,
                        );
                        uploadedUrls.push(uploadedUrl);
                        documents[i] = { ...documents[i], url: uploadedUrl };
                    }
                }

                if (documents.length > 0) {
                    documentUpdate = composeRequestBody({ documents }, session, { isNew: false });
                    documentPersistenceAttempted = true;
                    await setDoc(docRef, documentUpdate, { merge: true });
                    return { ...submitData, ...documentUpdate, id: docRef.id } as any;
                }
                return { ...submitData, id: docRef.id } as any;
            } catch (error) {
                if (uploadedUrls.length > 0 && documentPersistenceAttempted && documentUpdate) {
                    try {
                        const currentNote = await readCurrentNoteFromServer(docRef.id, session);
                        const commitStatus = getNoteAttachmentCommitStatus(currentNote, uploadedUrls);
                        if (commitStatus === 'all') {
                            return { ...submitData, ...documentUpdate, id: docRef.id } as any;
                        }
                        if (commitStatus === 'partial') {
                            logAmbiguousNoteAttachmentCommit('create', uploadedUrls, error);
                            throw error;
                        }
                    } catch (readBackError) {
                        if (readBackError === error) throw error;
                        logAmbiguousNoteAttachmentCommit('create', uploadedUrls, readBackError);
                        throw error;
                    }
                }
                await cleanupNoteAttachments(uploadedUrls, 'create');
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
            let removedAttachmentUrls: string[] = [];
            let persistenceAttempted = false;
            try {
                if (Array.isArray(data.documents)) {
                    for (let i = 0; i < data.documents.length; i++) {
                        if (isDataUrl(updateData.documents[i]?.url)) {
                            const uploadedUrl = await uploadNoteAttachment(
                                { imageType: data.documents[i].type, imageToUpdate: data.documents[i].url },
                                noteId,
                                buildNoteAttachmentFileId({
                                    attemptId: createRuntimeId('upload'),
                                    index: i,
                                    label: data.documents[i].label,
                                }),
                                session,
                            );
                            uploadedUrls.push(uploadedUrl);
                            updateData.documents[i].url = uploadedUrl;
                        }
                    }
                }

                const noteRef = getDocRef(session, noteId);
                if (Array.isArray(updateData.documents)) {
                    persistenceAttempted = true;
                    removedAttachmentUrls = await runTransaction(firebaseClient, async (transaction) => {
                        const noteSnapshot = await transaction.get(noteRef);
                        if (!noteSnapshot.exists()) throw new Error('note_update_target_missing');
                        transaction.set(noteRef, updateData, { merge: true });
                        return getRemovedNoteAttachmentUrls({
                            after: { documents: updateData.documents },
                            before: noteSnapshot.data(),
                        }).filter((url) => isOwnedNoteAttachmentUrl(url, noteId, session));
                    });
                } else {
                    persistenceAttempted = true;
                    await setDoc(noteRef, updateData, { merge: true });
                }
            } catch (error) {
                if (uploadedUrls.length > 0 && persistenceAttempted) {
                    try {
                        const currentNote = await readCurrentNoteFromServer(noteId, session);
                        const commitStatus = getNoteAttachmentCommitStatus(currentNote, uploadedUrls);
                        if (commitStatus === 'all') {
                            logRuntimeFailure('note_update_removed_attachment_cleanup_deferred', new Error('persistence_outcome_reconciled'), {
                                uploadedAttachmentCount: uploadedUrls.length,
                            });
                            return updateData;
                        }
                        if (commitStatus === 'partial') {
                            logAmbiguousNoteAttachmentCommit('update', uploadedUrls, error);
                            throw error;
                        }
                    } catch (readBackError) {
                        if (readBackError === error) throw error;
                        logAmbiguousNoteAttachmentCommit('update', uploadedUrls, readBackError);
                        throw error;
                    }
                }
                await cleanupNoteAttachments(uploadedUrls, 'update');
                throw error;
            }
            deferPersistedNoteAttachmentCleanup(removedAttachmentUrls, 'update_removed');
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
            const noteId = requireNoteDocumentId(data.id);
            const noteRef = getDocRef(session, noteId);
            const attachmentUrls = await runTransaction(firebaseClient, async (transaction) => {
                const noteSnapshot = await transaction.get(noteRef);
                if (!noteSnapshot.exists()) return [];
                const ownedUrls = collectNoteAttachmentUrls(noteSnapshot.data())
                    .filter((url) => isOwnedNoteAttachmentUrl(url, noteId, session));
                transaction.delete(noteRef);
                return ownedUrls;
            });
            deferPersistedNoteAttachmentCleanup(attachmentUrls, 'delete');
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
