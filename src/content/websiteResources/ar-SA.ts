import { buildLocalizedWebsiteResources } from './buildLocalizedResources';
import { enUSWebsiteResources } from './en-US';
import { arSAResourceTranslationPack } from './locales/ar-SA';

export const arSAWebsiteResources = buildLocalizedWebsiteResources(
    enUSWebsiteResources,
    arSAResourceTranslationPack,
);
