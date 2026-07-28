'use client';

import { useState } from 'react';

export const parseCookieItem = <T,>(cookieHeader: string, key: string): T | undefined => {
    if (!key) return undefined;
    const encodedName = `${encodeURIComponent(key)}=`;
    const match = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(encodedName));
    if (!match) return undefined;

    try {
        return JSON.parse(decodeURIComponent(match.slice(encodedName.length))) as T;
    } catch {
        return undefined;
    }
};

const getCookieItem = <T,>(key: string): T | undefined => (
    typeof document === 'undefined' ? undefined : parseCookieItem<T>(document.cookie, key)
);

export const serializeCookieItem = <T,>(
    key: string,
    value: T,
    numberOfDays: number,
    nowMs = Date.now(),
): string | null => {
    if (
        !key
        || !Number.isFinite(numberOfDays)
        || numberOfDays <= 0
        || !Number.isFinite(nowMs)
    ) {
        return null;
    }

    try {
        const expiresAt = new Date(nowMs + (numberOfDays * 24 * 60 * 60 * 1000));
        const serializedValue = JSON.stringify(value);
        if (serializedValue === undefined) return null;
        return `${encodeURIComponent(key)}=${encodeURIComponent(serializedValue)}; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`;
    } catch {
        return null;
    }
};

const setCookieItem = <T,>(key: string, value: T, numberOfDays: number): boolean => {
    if (typeof document === 'undefined') return false;
    const serialized = serializeCookieItem(key, value, numberOfDays);
    if (!serialized) return false;
    document.cookie = serialized;
    return true;
};

const useCookie = <T,>(
    key: string,
    defaultValue: T,
): readonly [T, (value: T, numberOfDays: number) => boolean] => {
    const [cookie, setCookie] = useState<T>(() => getCookieItem<T>(key) ?? defaultValue);

    const updateCookie = (value: T, numberOfDays: number): boolean => {
        if (!setCookieItem(key, value, numberOfDays)) return false;
        setCookie(value);
        return true;
    };

    return [cookie, updateCookie] as const;
};

export default useCookie;
