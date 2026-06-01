import { hiINResourceTranslationPack } from './hi-IN';
import { taINResourceTranslationPack } from './ta-IN';
import { teINResourceTranslationPack } from './te-IN';
import { mrINResourceTranslationPack } from './mr-IN';
import { bnINResourceTranslationPack } from './bn-IN';
import { arSAResourceTranslationPack } from './ar-SA';
import { esESResourceTranslationPack } from './es-ES';

export const WEBSITE_RESOURCE_TRANSLATION_PACKS = [
    hiINResourceTranslationPack,
    taINResourceTranslationPack,
    teINResourceTranslationPack,
    mrINResourceTranslationPack,
    bnINResourceTranslationPack,
    arSAResourceTranslationPack,
    esESResourceTranslationPack,
] as const;

export const WEBSITE_RESOURCE_REVIEWED_LOCALES = WEBSITE_RESOURCE_TRANSLATION_PACKS
    .filter((pack) => pack.status === 'reviewed')
    .map((pack) => pack.locale);

export const WEBSITE_RESOURCE_PLANNED_INDIAN_LOCALES = [] as const;
