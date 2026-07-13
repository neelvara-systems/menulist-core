export type FirestoreSanitizeOptions = Readonly<{
  atomicTransform?: (value: object, path: string) => Readonly<
    | { handled: true; value: unknown }
    | { handled: false }
  >;
  dateTransform?: (value: Date) => unknown;
  undefinedObjectValue?: 'null' | 'omit';
  unsafeObjectKey?: 'reject' | 'omit';
}>;

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const OMIT = Symbol('omit-firestore-value');

const isPlainRecord = (value: object): value is Record<string, unknown> => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const childPath = (path: string, key: string | number) => (
  typeof key === 'number' ? `${path}[${key}]` : `${path}.${key}`
);

const sanitizeValue = (
  value: unknown,
  path: string,
  options: FirestoreSanitizeOptions,
  active: WeakSet<object>,
  insideArray: boolean,
): unknown | typeof OMIT => {
  if (value === undefined) return !insideArray && options.undefinedObjectValue === 'omit' ? OMIT : null;
  if (value === null) return null;
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
    throw new TypeError(`Unsupported Firestore value at ${path}`);
  }
  if (typeof value !== 'object') return value;
  if (value instanceof Date && options.dateTransform) return options.dateTransform(value);

  const objectValue = value as object;
  const atomicResult = options.atomicTransform?.(objectValue, path);
  if (atomicResult?.handled) return atomicResult.value;
  if (!Array.isArray(value) && !isPlainRecord(objectValue)) return value;
  if (active.has(objectValue)) throw new TypeError(`Circular Firestore value at ${path}`);
  active.add(objectValue);

  try {
    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).some((symbol) => Object.prototype.propertyIsEnumerable.call(value, symbol))) {
        throw new TypeError(`Enumerable symbol key is not supported at ${path}`);
      }
      for (const key of Object.keys(value)) {
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index < 0 || index >= value.length || String(index) !== key) {
          throw new TypeError(`Custom array property is not supported at ${childPath(path, key)}`);
        }
      }
      return Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor) return null;
        if (!('value' in descriptor)) throw new TypeError(`Accessor property is not supported at ${childPath(path, index)}`);
        const nested = sanitizeValue(descriptor.value, childPath(path, index), options, active, true);
        return nested === OMIT ? null : nested;
      });
    }

    if (Object.getOwnPropertySymbols(value).some((symbol) => Object.prototype.propertyIsEnumerable.call(value, symbol))) {
      throw new TypeError(`Enumerable symbol key is not supported at ${path}`);
    }
    const output: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!descriptor.enumerable) continue;
      if (UNSAFE_KEYS.has(key)) {
        if (options.unsafeObjectKey === 'omit') continue;
        throw new TypeError(`Unsafe object key at ${childPath(path, key)}`);
      }
      if (!('value' in descriptor)) throw new TypeError(`Accessor property is not supported at ${childPath(path, key)}`);
      const nested = sanitizeValue(descriptor.value, childPath(path, key), options, active, false);
      if (nested !== OMIT) output[key] = nested;
    }
    return output;
  } finally {
    active.delete(objectValue);
  }
};

export const sanitizeForFirestore = <T>(
  value: T,
  options: FirestoreSanitizeOptions = {},
): T extends undefined ? null : T => {
  const sanitized = sanitizeValue(value, '$', options, new WeakSet(), false);
  return (sanitized === OMIT ? null : sanitized) as T extends undefined ? null : T;
};
