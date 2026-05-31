import { CUSTOMER_APPLE_STARTUP_IMAGES } from '@lib/pwa/customerAppAssets';

export const ANSWERLATTICE_SPLASH_BASE_PATH = '/answerlattice-splash';

export function getStaticAnswerlatticeAppleStartupImages() {
    return CUSTOMER_APPLE_STARTUP_IMAGES.map((image) => ({
        url: `${ANSWERLATTICE_SPLASH_BASE_PATH}/apple-splash-${image.size}.png`,
        media: image.media,
    }));
}
