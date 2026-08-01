// This file will export the basic utitlity function to use globally.
import Compressor from 'compressorjs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Timestamp } from 'firebase/firestore';
import { v4 as uuid } from 'uuid';

export function convertRGBtoOBJ(colorString: string): Record<'a' | 'b' | 'g' | 'r', string> {
  const rgbKeys = ['r', 'g', 'b', 'a'];
  const rgbObj: Record<'a' | 'b' | 'g' | 'r', string> = {
    a: '1',
    b: '1',
    g: '1',
    r: '1',
  };
  const color = colorString.replace(/^rgba?\(|\s+|\)$/g, '').split(',');

  rgbKeys.forEach((key, index) => {
    rgbObj[key as keyof typeof rgbObj] = color[index] || '1';
  });

  return rgbObj;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

/**
 * Converts a hex color string to RGB or RGBA object
 * @param hex - The hex color string (3 or 6 digits with optional #)
 * @param alpha - Optional alpha value between 0 and 1
 * @returns RGB or RGBA object, or null if invalid hex
 * @example
 * hexToRgb('#ff0000') // returns { r: 255, g: 0, b: 0 }
 * hexToRgb('#f00') // returns { r: 255, g: 0, b: 0 }
 * hexToRgb('#ff0000', 0.5) // returns { r: 255, g: 0, b: 0, a: 0.5 }
 */
export function hexToRgb(hex: string, alpha?: number): RGB | RGBA | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle both short and long hex
  const digits = hex.length === 3 ? hex.split('').map(d => d + d).join('') : hex;

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(digits)) return null;

  // Convert to RGB using bit operations
  const value = parseInt(digits, 16);
  const rgb = {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };

  // Add alpha if specified
  return typeof alpha === 'number' ? { ...rgb, a: alpha } : rgb;
}

/**
 * Converts a hex color string to RGBA string format
 * @param hex - The hex color string
 * @param alpha - Optional alpha value between 0 and 1
 * @returns RGBA string or throws if invalid hex
 * @example
 * hexToRgbA('#ff0000', 0.5) // returns 'rgba(255,0,0,0.5)'
 */
export function hexToRgbA(hex: string, alpha: number = 1): string {
  const color = hexToRgb(hex, alpha);
  if (!color) throw new Error(`Invalid hex color: ${hex}`);
  return 'a' in color
    ? `rgba(${color.r},${color.g},${color.b},${color.a})`
    : `rgb(${color.r},${color.g},${color.b})`;
}

const UNSAFE_CLONE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function cloneObjectValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null || value === undefined || typeof value !== 'object') return value;

  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return new Date(value.getTime());

  const seenValue = seen.get(value);
  if (seenValue !== undefined) return seenValue;

  if (value instanceof Set) {
    const clonedSet = new Set<unknown>();
    seen.set(value, clonedSet);
    value.forEach((entry) => clonedSet.add(cloneObjectValue(entry, seen)));
    return clonedSet;
  }

  if (Array.isArray(value)) {
    const clonedArray: unknown[] = [];
    seen.set(value, clonedArray);
    value.forEach((entry) => clonedArray.push(cloneObjectValue(entry, seen)));
    return clonedArray;
  }

  const clonedObject: Record<string, unknown> = {};
  seen.set(value, clonedObject);
  Object.keys(value).forEach((key) => {
    if (UNSAFE_CLONE_KEYS.has(key)) return;
    clonedObject[key] = cloneObjectValue(Reflect.get(value, key), seen);
  });
  return clonedObject;
}

export function removeObjRef<T>(obj: T): T;
export function removeObjRef(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  return cloneObjectValue(obj, new WeakMap());
}

export function updateDeepPathValue<T extends object>(object: T, path: string, val: unknown): T {
  const keys = path.split(".");
  if (keys.some((key) => !key || UNSAFE_CLONE_KEYS.has(key))) {
    throw new TypeError('Unsafe or empty object path segment');
  }
  const lastKey = keys.pop();
  if (!lastKey) throw new TypeError('Object path must contain a destination key');

  let lastObj: object = object;
  keys.forEach((key) => {
    const currentValue = Reflect.get(lastObj, key);
    if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
      const nextValue: Record<string, unknown> = {};
      Reflect.set(lastObj, key, nextValue);
      lastObj = nextValue;
      return;
    }
    lastObj = currentValue;
  });
  Reflect.set(lastObj, lastKey, val);
  return object;
}
// updateDeepPath(originalObject, 'data.nested.value', 'modified value');

function markComparedPair(
  left: object,
  right: object,
  compared: WeakMap<object, WeakSet<object>>,
): boolean {
  const existing = compared.get(left);
  if (existing?.has(right)) return true;
  if (existing) {
    existing.add(right);
  } else {
    compared.set(left, new WeakSet([right]));
  }
  return false;
}

function areDeepValuesEqual(
  value: unknown,
  other: unknown,
  compared: WeakMap<object, WeakSet<object>>,
): boolean {
  if (Object.is(value, other)) return true;
  if (!value || !other || typeof value !== 'object' || typeof other !== 'object') return false;
  if (value.constructor !== other.constructor) return false;
  if (value instanceof Date && other instanceof Date) return value.getTime() === other.getTime();
  if (value instanceof Timestamp && other instanceof Timestamp) return value.isEqual(other);
  if (markComparedPair(value, other, compared)) return true;

  if (Array.isArray(value) || Array.isArray(other)) {
    if (!Array.isArray(value) || !Array.isArray(other) || value.length !== other.length) return false;
    return value.every((entry, index) => areDeepValuesEqual(entry, other[index], compared));
  }

  if (value instanceof Set && other instanceof Set) {
    if (value.size !== other.size) return false;
    const leftEntries = Array.from(value);
    const rightEntries = Array.from(other);
    return leftEntries.every((entry, index) => (
      areDeepValuesEqual(entry, rightEntries[index], compared)
    ));
  }

  const left = value as Record<string, unknown>;
  const right = other as Record<string, unknown>;
  const leftKeys = Object.keys(left).filter((key) => !UNSAFE_CLONE_KEYS.has(key));
  const rightKeys = Object.keys(right).filter((key) => !UNSAFE_CLONE_KEYS.has(key));
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => (
      Object.prototype.hasOwnProperty.call(right, key)
      && areDeepValuesEqual(left[key], right[key], compared)
    ));
}

export function isSameObjects(value: unknown, other: unknown): boolean {
  if (!value || !other || typeof value !== 'object' || typeof other !== 'object') return false;
  return areDeepValuesEqual(value, other, new WeakMap());
}

export const arrayNullCheck = (arrayObj: readonly unknown[] | null | undefined): boolean => {
  return Boolean(arrayObj?.length);
}

export const objectNullCheck = (object: unknown, key = ''): boolean => {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  const record = object as Record<string, unknown>;
  return Object.keys(record).length > 0 && (key ? Boolean(record[key]) : true);
}

export const getUID = () => {
  return uuid();
}

export const getBase64 = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('FileReader returned a non-string data URL'));
    };
    reader.onerror = (error) => reject(error);
  });

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('FileReader returned a non-string data URL'));
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed to read the blob'));
    reader.readAsDataURL(blob);
  });
}

export const getCompressedImage = (file: File, quality = 0.8): Promise<string | null> => {
  return new Promise((resolve) => {
    new Compressor(file, {
      quality,
      // The compression process is asynchronous,
      async success(compressedBlob: Blob) {
        try {
          resolve(await blobToBase64(compressedBlob));
        } catch (error) {
          logRuntimeFailure('image_compression_failed', error, {
            ...getBoundedRuntimeStringContext('fileType', file?.type),
            fileSizeBytes: Number.isFinite(Number(file?.size)) ? Number(file.size) : undefined,
            quality,
          });
          resolve(null);
        }
      },
      error(err) {
        logRuntimeFailure('image_compression_failed', err, {
          ...getBoundedRuntimeStringContext('fileType', file?.type),
          fileSizeBytes: Number.isFinite(Number(file?.size)) ? Number(file.size) : undefined,
          quality,
        });
        resolve(null)
      },
    });
  });
}

export const getBase64Length = (dataUrl: unknown): number => {
  if (typeof dataUrl !== 'string') return 0;
  const commaIndex = dataUrl.indexOf(',');
  const metadata = commaIndex >= 0 ? dataUrl.slice(0, commaIndex) : '';
  const rawPayload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  if (!rawPayload) return 0;

  if (metadata.toLowerCase().includes(';base64') || commaIndex < 0) {
    const payload = rawPayload.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.length % 4 === 1) return 0;
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }

  try {
    return new TextEncoder().encode(decodeURIComponent(rawPayload)).byteLength;
  } catch {
    return 0;
  }
}

type RuntimeFontPreset = {
  code: string;
  fileUrl: string;
};

const isAllowedFontSource = (value: string): boolean => {
  if (value.length > 4_096) return false;
  if (/^data:(?:font\/(?:otf|ttf|woff2?)|application\/(?:font-(?:sfnt|woff)|x-font-(?:opentype|ttf)));base64,[A-Za-z0-9+/]+={0,2}$/i.test(value)) {
    return true;
  }
  if (/["'(){};\\\r\n]/.test(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

export const buildFontFaceRule = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const preset = value as Partial<RuntimeFontPreset>;
  if (
    typeof preset.code !== 'string'
    || !/^[A-Za-z0-9_-]{1,128}$/.test(preset.code)
    || typeof preset.fileUrl !== 'string'
    || !isAllowedFontSource(preset.fileUrl)
  ) {
    return null;
  }
  return `/* menulist-font:${preset.code} */\n@font-face { font-family: "${preset.code}"; src: url(${JSON.stringify(preset.fileUrl)}); }`;
};

export const addFontFaceStyle = (presetsList: readonly unknown[]): void => {
  let styleTag = document.getElementById("ecoms.ai-font-face");
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = "ecoms.ai-font-face";
  }

  const admittedMarkers = new Set<string>();
  const fontFaces = presetsList
    .map(buildFontFaceRule)
    .filter((rule): rule is string => Boolean(rule))
    .filter((rule) => {
      const marker = rule.slice(0, rule.indexOf('\n'));
      if (admittedMarkers.has(marker) || styleTag.textContent?.includes(marker)) return false;
      admittedMarkers.add(marker);
      return true;
    })
    .join('\n');
  if (!fontFaces) return;
  try {
    styleTag.appendChild(document.createTextNode(fontFaces));
  } catch (error) {
    logRuntimeFailure('font_face_style_append_failed', error, {
      admittedRuleCount: fontFaces.split('/* menulist-font:').length - 1,
    });
    return;
  }
  document.head?.appendChild(styleTag);
};

/**
 * Updates a list of objects with an updated item.
 * 
 * @param {any[]} originalList - The original list of objects
 * @param {any} item - The updated item
 * @param {string} [optionalAction='last'] - How to add the updated item to the list. Options are 'first' or 'last'. Default is 'last'.
 * @param {string} [key='id'] - The key to find the item in the list. Default is 'id'.
 * @returns {any[]} The updated list with the updated item
 */
export const updateList = <T extends object>(
  originalList: readonly T[],
  item: T,
  optionalAction: 'first' | 'last' = 'last',
  key = 'id',
): T[] => {
  const updatedList = removeObjRef<T[]>(Array.from(originalList));
  const index = updatedList.findIndex((entry) => Reflect.get(entry, key) === Reflect.get(item, key));
  if (index > -1) {
    // If the item is already in the list, update it
    updatedList[index] = item;
  } else {
    // If the item is not in the list, add it
    if (optionalAction === 'first') {
      // Add it to the beginning of the list
      updatedList.unshift(item);
    } else if (optionalAction === 'last') {
      // Add it to the end of the list
      updatedList.push(item);
    }
  }
  return updatedList;
}

/**
 * Calculates the next available index from a list of items.
 * The list is sorted by the 'index' key, and the function returns the largest index + 1.
 * If the list is empty, it returns 0.
 * 
 * @param {any[]} list - The list of items, where each item is expected to have an 'index' property.
 * @param {string} [key='index'] - The key to sort the list by. Default is 'index'.
 * @returns {number} The next available index.
 */
export const getNewIndex = <T extends object>(
  list: ReadonlyArray<T> | null | undefined,
  key = "index",
): number => {
  if (!list || list.length === 0) {
    return 0;
  }
  const finiteIndexes = list
    .map((item): unknown => Reflect.get(item, key))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return finiteIndexes.length > 0 ? Math.max(...finiteIndexes) + 1 : 0;
};

export const getYouTubeID = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match?.[2];
  return videoId?.length === 11 ? videoId : null;
};

export const generateGradientFromHex = (hexColor: string) => {
  if (!hexColor || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexColor)) {
    // Fallback gradient if color is invalid
    return 'linear-gradient(135deg, #f0f2f5CC 0%, #f0f2f580 50%, #f0f2f533 100%)';
  }
  // Append opacity values to the hex color
  const colorWith20 = `${hexColor}33`; // 20% opacity
  const colorWith10 = `${hexColor}1A`; // 10% opacity
  const colorWith05 = `${hexColor}0D`; // 5% opacity
  return `linear-gradient(135deg, ${colorWith05} 0%, ${colorWith10} 50%, ${colorWith20} 100%)`;
};
