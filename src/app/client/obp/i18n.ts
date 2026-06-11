import arSA from "public/locales/menulist.ai/ar-SA.json";
import asIN from "public/locales/menulist.ai/as-IN.json";
import bnIN from "public/locales/menulist.ai/bn-IN.json";
import brxIN from "public/locales/menulist.ai/brx-IN.json";
import csCZ from "public/locales/menulist.ai/cs-CZ.json";
import daDK from "public/locales/menulist.ai/da-DK.json";
import deDE from "public/locales/menulist.ai/de-DE.json";
import doiIN from "public/locales/menulist.ai/doi-IN.json";
import elGR from "public/locales/menulist.ai/el-GR.json";
import enGB from "public/locales/menulist.ai/en-GB.json";
import enUS from "public/locales/menulist.ai/en-US.json";
import esES from "public/locales/menulist.ai/es-ES.json";
import faIR from "public/locales/menulist.ai/fa-IR.json";
import fiFI from "public/locales/menulist.ai/fi-FI.json";
import filPH from "public/locales/menulist.ai/fil-PH.json";
import frFR from "public/locales/menulist.ai/fr-FR.json";
import guIN from "public/locales/menulist.ai/gu-IN.json";
import heIL from "public/locales/menulist.ai/he-IL.json";
import hiIN from "public/locales/menulist.ai/hi-IN.json";
import huHU from "public/locales/menulist.ai/hu-HU.json";
import idID from "public/locales/menulist.ai/id-ID.json";
import itIT from "public/locales/menulist.ai/it-IT.json";
import jaJP from "public/locales/menulist.ai/ja-JP.json";
import knIN from "public/locales/menulist.ai/kn-IN.json";
import koKR from "public/locales/menulist.ai/ko-KR.json";
import kokIN from "public/locales/menulist.ai/kok-IN.json";
import ksIN from "public/locales/menulist.ai/ks-IN.json";
import maiIN from "public/locales/menulist.ai/mai-IN.json";
import mlIN from "public/locales/menulist.ai/ml-IN.json";
import mniIN from "public/locales/menulist.ai/mni-IN.json";
import msMY from "public/locales/menulist.ai/ms-MY.json";
import mrIN from "public/locales/menulist.ai/mr-IN.json";
import neNP from "public/locales/menulist.ai/ne-NP.json";
import nlNL from "public/locales/menulist.ai/nl-NL.json";
import orIN from "public/locales/menulist.ai/or-IN.json";
import paIN from "public/locales/menulist.ai/pa-IN.json";
import plPL from "public/locales/menulist.ai/pl-PL.json";
import ptBR from "public/locales/menulist.ai/pt-BR.json";
import roRO from "public/locales/menulist.ai/ro-RO.json";
import satIN from "public/locales/menulist.ai/sat-IN.json";
import sdIN from "public/locales/menulist.ai/sd-IN.json";
import svSE from "public/locales/menulist.ai/sv-SE.json";
import swKE from "public/locales/menulist.ai/sw-KE.json";
import taIN from "public/locales/menulist.ai/ta-IN.json";
import teIN from "public/locales/menulist.ai/te-IN.json";
import thTH from "public/locales/menulist.ai/th-TH.json";
import trTR from "public/locales/menulist.ai/tr-TR.json";
import ukUA from "public/locales/menulist.ai/uk-UA.json";
import urIN from "public/locales/menulist.ai/ur-IN.json";
import viVN from "public/locales/menulist.ai/vi-VN.json";
import zhCN from "public/locales/menulist.ai/zh-CN.json";
import zhTW from "public/locales/menulist.ai/zh-TW.json";

type TranslationValues = Record<string, string | number | boolean | null | undefined>;

const DICTIONARIES: Record<string, Record<string, any>> = {
    "ar-SA": arSA,
    "as-IN": asIN,
    "bn-IN": bnIN,
    "brx-IN": brxIN,
    "cs-CZ": csCZ,
    "da-DK": daDK,
    "de-DE": deDE,
    "doi-IN": doiIN,
    "el-GR": elGR,
    "en-GB": enGB,
    "en-US": enUS,
    "es-ES": esES,
    "fa-IR": faIR,
    "fi-FI": fiFI,
    "fil-PH": filPH,
    "fr-FR": frFR,
    "gu-IN": guIN,
    "he-IL": heIL,
    "hi-IN": hiIN,
    "hu-HU": huHU,
    "id-ID": idID,
    "it-IT": itIT,
    "ja-JP": jaJP,
    "kn-IN": knIN,
    "ko-KR": koKR,
    "kok-IN": kokIN,
    "ks-IN": ksIN,
    "mai-IN": maiIN,
    "ml-IN": mlIN,
    "mni-IN": mniIN,
    "ms-MY": msMY,
    "mr-IN": mrIN,
    "ne-NP": neNP,
    "nl-NL": nlNL,
    "or-IN": orIN,
    "pa-IN": paIN,
    "pl-PL": plPL,
    "pt-BR": ptBR,
    "ro-RO": roRO,
    "sat-IN": satIN,
    "sd-IN": sdIN,
    "sv-SE": svSE,
    "sw-KE": swKE,
    "ta-IN": taIN,
    "te-IN": teIN,
    "th-TH": thTH,
    "tr-TR": trTR,
    "uk-UA": ukUA,
    "ur-IN": urIN,
    "vi-VN": viVN,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
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
