import { CUSTOMER_APPLE_STARTUP_IMAGES } from '@lib/pwa/customerAppAssets';

export const CANONICA_SPLASH_BASE_PATH = '/canonica-splash';

export function getStaticCanonicaAppleStartupImages() {
    return CUSTOMER_APPLE_STARTUP_IMAGES.map((image) => ({
        url: `${CANONICA_SPLASH_BASE_PATH}/apple-splash-${image.size}.png`,
        media: image.media,
    }));
}
