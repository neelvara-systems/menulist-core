/**
 * Device detection utilities for analytics tracking
 */
import { DEVICE_TYPES_LIST } from '@constant/builder';
import { UAParser } from 'ua-parser-js';
import { DeviceInfo } from './types';

/**
 * Parses user agent string to extract device information
 * @param userAgent - Browser user agent string
 * @returns Device information object
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  if (!userAgent) {
    return { type: 'unknown' };
  }

  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Determine device type
    let type: DeviceInfo['type'] = DEVICE_TYPES_LIST.DESKTOP;
    if (result.device && result.device.type) {
      if (result.device.type === DEVICE_TYPES_LIST.MOBILE || result.device.type === DEVICE_TYPES_LIST.TABLET) {
        type = result.device.type as DeviceInfo['type'];
      }
    }

    return {
      type,
      browser: result.browser.name,
      os: result.os.name
    };
  } catch (error) {
    console.error('Error parsing user agent:', error);
    return { type: 'unknown' };
  }
}

/**
 * Gets device information from current browser
 * @returns Device information object
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return { type: 'unknown' };
  }

  try {
    return parseUserAgent(window.navigator.userAgent);
  } catch (error) {
    console.error('Error getting device info:', error);
    return { type: 'unknown' };
  }
}
