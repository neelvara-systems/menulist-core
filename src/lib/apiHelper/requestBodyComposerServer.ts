import { ECOMSAI_PLATFORM_STORE_ID, ECOMSAI_PLATFORM_TENANT_ID, ECOMSAI_PLATFORM_USER_ID, ECOMSAI_PLATFORM_USER_NAME, ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { Timestamp } from "firebase/firestore";

// This is a simplified version of the client-side composer that accepts a session object.
export const requestBodyComposerServer = (data: any, session: any, options: { isNew: boolean } = { isNew: false }) => {
    const dataCopy = { ...data };

    if (session) {
        dataCopy.sId = session?.sId ?? ECOMSAI_PLATFORM_STORE_ID;
        dataCopy.tId = session?.tId ?? ECOMSAI_PLATFORM_TENANT_ID;
        dataCopy.role = session?.role ?? ECOMSAI_PLATFORM_USER_ROLE;
        dataCopy.uId = session?.uId ?? ECOMSAI_PLATFORM_USER_ID;
        dataCopy.modifiedBy = session?.user?.name ?? ECOMSAI_PLATFORM_USER_NAME;
    } else {
        dataCopy.sId = Number(data.sId || ECOMSAI_PLATFORM_STORE_ID);
        dataCopy.tId = Number(data.tId || ECOMSAI_PLATFORM_TENANT_ID);
        dataCopy.role = data.role || ECOMSAI_PLATFORM_USER_ROLE;
        dataCopy.uId = data.uId || ECOMSAI_PLATFORM_USER_ID;
        dataCopy.modifiedBy = data.modifiedBy || ECOMSAI_PLATFORM_USER_NAME;
    }

    dataCopy.modifiedOn = Timestamp.now();

    if (options.isNew) {
        dataCopy.createdOn = Timestamp.now();
        dataCopy.createdBy = session?.user?.name ?? data.createdBy ?? ECOMSAI_PLATFORM_USER_NAME;
    }

    // A simple undefined to null conversion, can be expanded if needed.
    Object.keys(dataCopy).forEach(key => {
        if (dataCopy[key] === undefined) {
            dataCopy[key] = null;
        }
    });

    return dataCopy;
};
