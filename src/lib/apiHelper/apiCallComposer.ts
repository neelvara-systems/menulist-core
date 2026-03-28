// import { reduxStore } from "@reduxStore/index";

import { windowRef } from "@util/window";
import { apiCallComposerClient } from "./apiCallComposerClient";
import { apiCallComposerServer } from "./apiCallComposerServer";

export const apiCallComposer = async (fn, ...args) => {

    // console.log("apiCallComposer called:", args[args.length - 1])
    if (windowRef()) {
        //this logic is writed due to dependancy or redux store in case of client
        return await apiCallComposerClient(fn, ...args);
    } else {
        return await apiCallComposerServer(fn, ...args);
    }
}