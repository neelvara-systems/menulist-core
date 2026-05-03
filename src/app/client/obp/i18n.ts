import arSA from "public/locales/menulist.ai/ar-SA.json";
import bnIN from "public/locales/menulist.ai/bn-IN.json";
import enGB from "public/locales/menulist.ai/en-GB.json";
import enUS from "public/locales/menulist.ai/en-US.json";
import esES from "public/locales/menulist.ai/es-ES.json";
import guIN from "public/locales/menulist.ai/gu-IN.json";
import hiIN from "public/locales/menulist.ai/hi-IN.json";
import mrIN from "public/locales/menulist.ai/mr-IN.json";
import taIN from "public/locales/menulist.ai/ta-IN.json";
import teIN from "public/locales/menulist.ai/te-IN.json";
import zhCN from "public/locales/menulist.ai/zh-CN.json";

type TranslationValues = Record<string, string | number | boolean | null | undefined>;

const DICTIONARIES: Record<string, Record<string, any>> = {
    "ar-SA": arSA,
    "bn-IN": bnIN,
    "en-GB": enGB,
    "en-US": enUS,
    "es-ES": esES,
    "gu-IN": guIN,
    "hi-IN": hiIN,
    "mr-IN": mrIN,
    "ta-IN": taIN,
    "te-IN": teIN,
    "zh-CN": zhCN,
};

function readPath(source: Record<string, any>, path: string): unknown {
    return path.split(".").reduce<unknown>((current, part) => {
        if (!current || typeof current !== "object") return undefined;
        return (current as Record<string, unknown>)[part];
    }, source);
}

function interpolate(template: string, values?: TranslationValues): string {
    if (!values) return template;
    return template.replace(/\{([^}]+)\}/g, (_, key) => {
        const value = values[key];
        return value === null || value === undefined ? "" : String(value);
    });
}

export function getOBPTranslations(locale: string): (key: string, values?: TranslationValues) => string {
    const messages = DICTIONARIES[locale] || DICTIONARIES["en-US"];
    const fallback = DICTIONARIES["en-US"];

    return (key: string, values?: TranslationValues) => {
        const value =
            readPath(messages.BusinessSettings || {}, key) ??
            readPath(fallback.BusinessSettings || {}, key);

        return typeof value === "string"
            ? interpolate(value, values)
            : key;
    };
}
