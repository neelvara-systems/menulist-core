import getActiveSession from "@lib/auth/getActiveSession";
import {
    composeRequestBody,
    type RequestBodyComposerOptions,
} from "./requestBodyComposition";

export {
    composeRequestBody,
    replaceUndefined,
    type RequestBodyComposerOptions,
    type RequestBodyComposerSession,
    type RequestBodyPersistenceMetadata,
    type UndefinedToNull,
} from "./requestBodyComposition";

export const requestBodyComposer = async <T extends object>(
    data: T,
    options: RequestBodyComposerOptions,
) => {
    const session = await getActiveSession();
    return composeRequestBody(data, session, options);
};
