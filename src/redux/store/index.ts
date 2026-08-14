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
import { syncPersistedClientThemePreferences } from "../slices/clientThemeConfig";
import type { PersistedClientThemePreferences } from "../slices/clientThemeConfig";
import storage from "./customStorage";

export const PERSISTED_REDUX_STORAGE_KEY = "persist:nextjs";

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

export const parsePersistedClientThemePreferences = (
  serializedState: string | null,
): Partial<PersistedClientThemePreferences> | null => {
  if (!serializedState) return null;

  try {
    const persistedState = JSON.parse(serializedState) as Record<string, unknown>;
    if (typeof persistedState.clientThemeConfig !== "string") return null;

    const clientThemeConfig = JSON.parse(persistedState.clientThemeConfig) as unknown;
    if (!clientThemeConfig || typeof clientThemeConfig !== "object" || Array.isArray(clientThemeConfig)) {
      return null;
    }

    return clientThemeConfig as Partial<PersistedClientThemePreferences>;
  } catch {
    return null;
  }
};

if (windowRef()) {
  window.addEventListener("storage", (event) => {
    if (event.key !== PERSISTED_REDUX_STORAGE_KEY) return;

    const preferences = parsePersistedClientThemePreferences(event.newValue);
    if (!preferences) return;

    reduxStore.dispatch(syncPersistedClientThemePreferences(preferences));
  });
}

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
