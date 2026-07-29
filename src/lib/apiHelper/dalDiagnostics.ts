const DAL_FUNCTION_NAME_MAX_LENGTH = 80;

export type DalArgumentSummary =
    | null
    | undefined
    | { type: string }
    | { type: "array"; length: number }
    | { type: "object"; keys: string[] }
    | { type: "string"; length: number };

export const getDalFunctionName = (args: readonly unknown[]): string => {
    const candidate = args.at(-1);
    return typeof candidate === "string" && candidate.length > 0
        ? candidate.slice(0, DAL_FUNCTION_NAME_MAX_LENGTH)
        : "unknownDalCall";
};

export const summarizeDalArgs = (args: readonly unknown[]): DalArgumentSummary[] => (
    args.slice(0, -1).map((arg): DalArgumentSummary => {
        if (arg === null) return null;
        if (arg === undefined) return undefined;
        if (typeof arg === "string") return { type: "string", length: arg.length };
        try {
            if (Array.isArray(arg)) {
                const length = Reflect.get(arg, "length");
                return {
                    type: "array",
                    length: typeof length === "number" && Number.isSafeInteger(length) && length >= 0
                        ? length
                        : 0,
                };
            }
            if (typeof arg === "object" || typeof arg === "function") {
                return {
                    type: "object",
                    keys: Object.keys(arg).slice(0, 8),
                };
            }
        } catch {
            return { type: "uninspectable" };
        }
        return { type: typeof arg };
    })
);

let loaderRequestSequence = 0;

export const createDalLoaderRequestId = (): string => {
    loaderRequestSequence = loaderRequestSequence >= Number.MAX_SAFE_INTEGER
        ? 1
        : loaderRequestSequence + 1;
    return `dal_${Date.now()}_${loaderRequestSequence}`;
};
