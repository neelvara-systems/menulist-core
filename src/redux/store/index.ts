import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { windowRef } from "@util/window";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";
import rootReducer from "../slices";
import storage from "./customStorage";

const persistConfig = {
  key: "nextjs",
  whitelist: ["clientThemeConfig"],
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const reduxStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
  }),
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
