import { CUSTOMER_APPLE_STARTUP_IMAGES } from '@lib/pwa/customerAppAssets';

export const CAMPAIGNCUE_SITE_THEME_COLOR = '#011b6d';
export const CAMPAIGNCUE_SITE_BACKGROUND_COLOR = '#fbf7fa';
export const CAMPAIGNCUE_MANIFEST_PATH = '/campaigncue.webmanifest';
export const CAMPAIGNCUE_SPLASH_BASE_PATH = '/campaigncue-splash';

export function getStaticCampaignCueAppleStartupImages() {
    return CUSTOMER_APPLE_STARTUP_IMAGES.map((image) => ({
        url: `${CAMPAIGNCUE_SPLASH_BASE_PATH}/apple-splash-${image.size}.png`,
        media: image.media,
    }));
}
