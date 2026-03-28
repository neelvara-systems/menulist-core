import { combineReducers } from "@reduxjs/toolkit";
import { clientThemeConfig } from "./clientThemeConfig";
import { activeModalPage } from "./common";
import { loader } from "./loader";
import { toast } from "./toast";

const rootReducer = combineReducers({
  [loader.name]: loader.reducer,
  [activeModalPage.name]: activeModalPage.reducer,
  [toast.name]: toast.reducer,
  [clientThemeConfig.name]: clientThemeConfig.reducer
});
export default rootReducer;