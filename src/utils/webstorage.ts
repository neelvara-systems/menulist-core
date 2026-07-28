'use client';

import { windowRef } from "./window";

const STORAGE_NAMESPACE = "salon";
type StorageRecord = Record<string, unknown>;

const isStorageRecord = (value: unknown): value is StorageRecord => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

export const parseWebStorageRecord = (raw: string | null): StorageRecord => {
  if (!raw || raw === "undefined") return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStorageRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const updateStorage = (
  storage: Storage,
  key: string,
  value: unknown,
): void => {
  const record = parseWebStorageRecord(storage.getItem(STORAGE_NAMESPACE));
  record[key] = value;
  storage.setItem(STORAGE_NAMESPACE, JSON.stringify(record));
};

const getStorageValue = <T>(
  storage: Storage,
  key: string,
): T | null => {
  const record = parseWebStorageRecord(storage.getItem(STORAGE_NAMESPACE));
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key] as T
    : null;
};

const removeStorageValue = (storage: Storage, key: string): void => {
  const record = parseWebStorageRecord(storage.getItem(STORAGE_NAMESPACE));
  if (!Object.prototype.hasOwnProperty.call(record, key)) return;
  delete record[key];
  storage.setItem(STORAGE_NAMESPACE, JSON.stringify(record));
};

export const setValueInLocalStorage = (key: string, value: unknown): void => {
  const browserWindow = windowRef();
  if (!browserWindow) return;
  updateStorage(browserWindow.localStorage, key, value);
};

export const getValueFromLocalStorage = <T = unknown>(key: string): T | null => {
  const browserWindow = windowRef();
  return browserWindow ? getStorageValue<T>(browserWindow.localStorage, key) : null;
};

export const removeItemFromLocalStorage = (key: string): void => {
  const browserWindow = windowRef();
  if (!browserWindow) return;
  removeStorageValue(browserWindow.localStorage, key);
};

export const setValueInSessionStorage = (key: string, value: unknown): void => {
  const browserWindow = windowRef();
  if (!browserWindow) return;
  updateStorage(browserWindow.sessionStorage, key, value);
};

export const getValueFromSessionStorage = <T = unknown>(key: string): T | null => {
  const browserWindow = windowRef();
  return browserWindow ? getStorageValue<T>(browserWindow.sessionStorage, key) : null;
};

export const removeItemFromSessionStorage = (key: string): void => {
  const browserWindow = windowRef();
  if (!browserWindow) return;
  removeStorageValue(browserWindow.sessionStorage, key);
};

const isCookieName = (key: string): boolean => (
  key.length > 0 && !/[\u0000-\u0020\u007f()<>@,;:\\"/[\]?={}]/.test(key)
);

export const setValueInCookies = (
  key: string,
  value: string,
  expires: Date | string,
): void => {
  const browserWindow = windowRef();
  if (!browserWindow || !isCookieName(key)) return;
  const expiry = expires instanceof Date ? expires : new Date(expires);
  if (!Number.isFinite(expiry.getTime())) return;
  browserWindow.document.cookie = `${key}=${encodeURIComponent(value)};expires=${expiry.toUTCString()};path=/;SameSite=Lax`;
};

export const getValueFromCookies = (key: string): string | null => {
  const browserWindow = windowRef();
  if (!browserWindow || !isCookieName(key)) return null;

  for (const item of browserWindow.document.cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== key) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1));
    } catch {
      return null;
    }
  }
  return null;
};

export const removeValueFromCookies = (key: string): void => {
  const browserWindow = windowRef();
  if (!browserWindow || !isCookieName(key)) return;
  browserWindow.document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
};
