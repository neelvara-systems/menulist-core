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

export const reduxStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false })
});

export const reduxPersistor = windowRef() ? persistStore(reduxStore) : null;

export const getReduxStoreClient = () => reduxStore;
export type AppStore = typeof reduxStore;
export type AppDispatch = AppStore["dispatch"];
export type AppState = ReturnType<AppStore["getState"]>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  Action
>;
