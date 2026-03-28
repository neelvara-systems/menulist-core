import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { windowRef } from "@util/window";
import { persistReducer, persistStore } from "redux-persist";
import rootReducer from "../slices";
import storage from "./customStorage";

const persistConfig = {
  key: "nextjs",
  whitelist: ["auth", "clientThemeConfig"], // make sure it does not clash with server keys
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const reduxStore: any = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false })
});

if (windowRef()) {
  reduxStore.__persistor = persistStore(reduxStore); // Nasty hack
}

export const getReduxStoreClient = () => reduxStore;
export type AppStore = ReturnType<typeof reduxStore>;
export type AppDispatch = ReturnType<AppStore["dispatch"]>;
export type AppState = ReturnType<AppStore["getState"]>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  Action
>;
