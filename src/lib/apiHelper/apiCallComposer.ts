// import { reduxStore } from "@reduxStore/index";

import { windowRef } from "@util/window";
import { apiCallComposerClient } from "./apiCallComposerClient";
import { apiCallComposerServer } from "./apiCallComposerServer";

type DalOperation<T> = () => Promise<T> | T;

export const apiCallComposer = async <T>(fn: DalOperation<T>, ...args: unknown[]): Promise<T> => {

    if (windowRef()) {
        //this logic is writed due to dependancy or redux store in case of client
        return await apiCallComposerClient(fn, ...args);
    } else {
        return await apiCallComposerServer(fn, ...args);
    }
}
