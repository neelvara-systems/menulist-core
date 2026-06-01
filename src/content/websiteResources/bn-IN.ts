import { enUSWebsiteResources } from './en-US';
import { buildLocalizedWebsiteResources } from './buildLocalizedResources';
import { bnINResourceTranslationPack } from './locales/bn-IN';

export const bnINWebsiteResources = buildLocalizedWebsiteResources(
    enUSWebsiteResources,
    bnINResourceTranslationPack,
);
