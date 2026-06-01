import { enUSWebsiteResources } from './en-US';
import { buildLocalizedWebsiteResources } from './buildLocalizedResources';
import { mrINResourceTranslationPack } from './locales/mr-IN';

export const mrINWebsiteResources = buildLocalizedWebsiteResources(
    enUSWebsiteResources,
    mrINResourceTranslationPack,
);
