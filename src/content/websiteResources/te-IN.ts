import { enUSWebsiteResources } from './en-US';
import { buildLocalizedWebsiteResources } from './buildLocalizedResources';
import { teINResourceTranslationPack } from './locales/te-IN';

export const teINWebsiteResources = buildLocalizedWebsiteResources(
    enUSWebsiteResources,
    teINResourceTranslationPack,
);
