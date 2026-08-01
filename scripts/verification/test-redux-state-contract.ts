import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
    clientThemeConfig,
    toggleDarkMode,
    toggleRTLDirection,
    updateDarkThemeColor,
} from "../../src/redux/slices/clientThemeConfig";
import {
    activeModalPage,
    MODAL_PAGES_LIST,
    updateActiveModalPage,
} from "../../src/redux/slices/common";
import {
    clearToast,
    showErrorToast,
    toast,
} from "../../src/redux/slices/toast";

const themeInitial = clientThemeConfig.reducer(undefined, { type: "@@INIT" });
const darkModeState = clientThemeConfig.reducer(themeInitial, toggleDarkMode(false));
assert.equal(darkModeState.darkMode, false);

const rtlState = clientThemeConfig.reducer(darkModeState, toggleRTLDirection(true));
assert.equal(rtlState.isRTLDirection, true);

const colorState = clientThemeConfig.reducer(rtlState, updateDarkThemeColor("#123456"));
assert.equal(colorState.darkColor, "#123456");

const modalInitial = activeModalPage.reducer(undefined, { type: "@@INIT" });
const openModalState = activeModalPage.reducer(
    modalInitial,
    updateActiveModalPage(MODAL_PAGES_LIST.WEBSITE_BUILDER_HELP_PAGE),
);
assert.equal(openModalState.activeModalPage, MODAL_PAGES_LIST.WEBSITE_BUILDER_HELP_PAGE);

const closedModalState = activeModalPage.reducer(openModalState, updateActiveModalPage(null));
assert.equal(closedModalState.activeModalPage, null);

const errorToastState = toast.reducer(undefined, showErrorToast("Could not save"));
assert.equal(errorToastState.toast.type, "error");
assert.equal(errorToastState.toast.message, "Could not save");
assert.equal(toast.reducer(errorToastState, clearToast(null)).toast.message, "");

const storeSource = readFileSync(resolve("src/redux/store/index.ts"), "utf8");
const providerSource = readFileSync(resolve("src/providers/reduxProvider.tsx"), "utf8");
const persistenceStarts = `${storeSource}\n${providerSource}`.match(/persistStore\s*\(\s*reduxStore\s*\)/g) ?? [];
assert.equal(
    persistenceStarts.length,
    1,
    "the singleton Redux store must start exactly one persistence subscription",
);
assert.doesNotMatch(
    storeSource,
    /serializableCheck:\s*false/,
    "Redux must not disable serializability checks globally",
);
assert.match(
    storeSource,
    /ignoredActions:\s*\[FLUSH,\s*REHYDRATE,\s*PAUSE,\s*PERSIST,\s*PURGE,\s*REGISTER\]/,
    "Redux Persist protocol actions must be the only serializability exceptions",
);
assert.doesNotMatch(
    storeSource,
    /whitelist:\s*\[[^\]]*["']auth["']/,
    "the persistence whitelist must not claim a nonexistent auth reducer",
);

console.log("Redux state contract tests passed.");
