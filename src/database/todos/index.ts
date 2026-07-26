import { DB_COLLECTIONS } from "@constant/database";
import { collection, deleteDoc, doc, getDoc, getDocs, or, query, setDoc, where } from "@firebase/firestore";
import { composeRequestBody } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { addDoc } from "firebase/firestore";
import {
    parseTodoConfig,
    requireTodoConfigPatch,
    requireTodoDocumentId,
    requireTodoMutation,
    requireTodoScope,
    type TodoConfig,
} from "@lib/todos/todoBoundary";

const COLLECTION = DB_COLLECTIONS.TODOS;

const getCollectionRef = (session: unknown) => {
    const scope = requireTodoScope(session);
    return collection(firebaseClient, `${COLLECTION}/${scope.tId}/${scope.sId}`)
}

const getDocRef = (session: unknown, docId: unknown) => {
    const scope = requireTodoScope(session);
    return doc(firebaseClient, `${COLLECTION}/${scope.tId}/${scope.sId}`, requireTodoDocumentId(docId))
}

const getTodoConfigDocRef = (session: unknown) => {
    const scope = requireTodoScope(session);
    return doc(firebaseClient, `${DB_COLLECTIONS.TODOS_METADATA}/data/${scope.tId}/${scope.sId}`)
}

export const addTodo = async (data: unknown) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            requireTodoScope(session);
            const { payload } = requireTodoMutation(data, { requireId: false });
            const submitData = composeRequestBody(
                { ...payload, active: true, deleted: false },
                session,
                { isNew: true },
            );
            const docRef = await addDoc(getCollectionRef(session), submitData);
            return { ...submitData, id: docRef.id };
        },
        data,
        "addTodo"
    );
}

export const updateTodo = async (data: unknown) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            requireTodoScope(session);
            const { id, payload } = requireTodoMutation(data, { requireId: true });
            const updateData = composeRequestBody(payload, session, { isNew: false });
            await setDoc(getDocRef(session, id), updateData, { merge: true });
            return { ...updateData, id };
        },
        data,
        "updateTodo"
    );
}

export const getTodoById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            requireTodoScope(session);
            const docRef = getDocRef(session, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            }
            return null;
        },
        id,
        "getTodoById"
    );
}

export const getAllTodos = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = requireTodoScope(session);
            const q = query(
                getCollectionRef(session), or(
                    where("uId", "==", scope.uId),
                    where("assignee", "array-contains", scope.uId)
                )
            );
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            return list;
        },
        "getAllTodos"
    );
}

export const getTodoConfig = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docSnap = await getDoc(getTodoConfigDocRef(session));
            if (docSnap.exists()) {
                return parseTodoConfig(docSnap.data());
            }
            return null;
        },
        null,
        "getTodoConfig"
    );
}

export const updateTodoConfig = async (data: unknown) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const patch = requireTodoConfigPatch(data);
            await setDoc(getTodoConfigDocRef(session), patch, { merge: true });
            return patch;
        },
        data,
        "updateTodoConfig"
    );
}


export const deleteTodo = async (data: unknown) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const { id } = requireTodoMutation(data, { requireId: true });
            const docRef = getDocRef(session, id);
            await deleteDoc(docRef);
            return null;
        },
        data,
        "deleteTodo"
    );
}

export const updateTodoStatuses = async (statuses: TodoConfig['statuses']) => {
    return await updateTodoConfig({ statuses });
}

export const getTodoTags = async () => {
    const config = await getTodoConfig();
    return config?.tags || [];
}

export const updateTodoTags = async (tags: TodoConfig['tags']) => {
    return await updateTodoConfig({ tags });
}
