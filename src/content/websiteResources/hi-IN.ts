import { enUSWebsiteResources } from './en-US';
import { buildLocalizedWebsiteResources } from './buildLocalizedResources';
import { hiINResourceTranslationPack } from './locales/hi-IN';

export const hiINWebsiteResources = buildLocalizedWebsiteResources(
    enUSWebsiteResources,
    hiINResourceTranslationPack,
);
