import {
    composeRequestBody,
    type RequestBodyComposerOptions,
    type RequestBodyComposerSession,
} from "./requestBodyComposition";

export const requestBodyComposerServer = <T extends object>(
    data: T,
    session: RequestBodyComposerSession | null | undefined,
    options: RequestBodyComposerOptions,
) => composeRequestBody(data, session, options);
