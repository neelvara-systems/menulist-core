export const MYCODEX_SITE_URL = 'https://mycodex.invalid';
export const MYCODEX_THEME_COLOR = '#09090b';
export const MYCODEX_BACKGROUND_COLOR = '#09090b';
export const MYCODEX_MANIFEST_PATH = '/mycodex.webmanifest';
export const MYCODEX_LOGO_PATH = '/mycodex-logo.svg';

const MYCODEX_SPLASH_BASE_PATH = '/mycodex-splash';

const MYCODEX_APPLE_STARTUP_IMAGES = [
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-1290x2796.png`,
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-1179x2556.png`,
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-1170x2532.png`,
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-1125x2436.png`,
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-1242x2688.png`,
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-828x1792.png`,
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-1242x2208.png`,
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-750x1334.png`,
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        url: `${MYCODEX_SPLASH_BASE_PATH}/apple-splash-640x1136.png`,
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
    },
] as const;

export const getStaticMyCodexAppleStartupImages = () => [...MYCODEX_APPLE_STARTUP_IMAGES];
