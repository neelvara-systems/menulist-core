import { buildLocalizedWebsiteResources } from './buildLocalizedResources';
import { enUSWebsiteResources } from './en-US';
import { esESResourceTranslationPack } from './locales/es-ES';

export const esESWebsiteResources = buildLocalizedWebsiteResources(
    enUSWebsiteResources,
    esESResourceTranslationPack,
);
