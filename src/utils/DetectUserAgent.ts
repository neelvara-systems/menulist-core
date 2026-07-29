/**
 * This function will detect the useragent is Mobile or not.
 */

// import { isMobile, isIOS, isChrome, isFirefox, isSafari, isIE } from 'react-device-detect';
// export const DetectMob = () => {
//     if (isMobile) return true;
//     else return false;
// }

// export const isIOSDevice = () => {
//     if (isIOS) return true;
//     else return false;
// }

// export const isSafariDevice = () => {
//     if (isSafari) return true;
//     else return false;
// }

export const isIEDevice = (
    userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): boolean => /MSIE|Trident\//i.test(userAgent);
