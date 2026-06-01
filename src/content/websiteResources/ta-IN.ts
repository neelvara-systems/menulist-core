import { enUSWebsiteResources } from './en-US';
import { buildLocalizedWebsiteResources } from './buildLocalizedResources';
import { taINResourceTranslationPack } from './locales/ta-IN';

export const taINWebsiteResources = buildLocalizedWebsiteResources(
    enUSWebsiteResources,
    taINResourceTranslationPack,
);
