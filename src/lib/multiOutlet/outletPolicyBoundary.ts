import {
    DEFAULT_OUTLET_POLICY,
    type OutletPolicy,
} from "@type/multiOutlet.types";

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

export function normalizePersistedOutletPolicy(value: unknown): OutletPolicy | null {
    if (value === undefined || value === null) return { ...DEFAULT_OUTLET_POLICY };
    if (!isPlainRecord(value)) return null;

    try {
        const policy = { ...DEFAULT_OUTLET_POLICY };
        for (const key of Object.keys(DEFAULT_OUTLET_POLICY) as Array<keyof OutletPolicy>) {
            if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
            const fieldValue = Reflect.get(value, key);
            if (typeof fieldValue !== "boolean") return null;
            policy[key] = fieldValue;
        }
        return policy;
    } catch {
        return null;
    }
}
