import {
  APP_DATE_FORMAT_COOKIES_KEY,
  APP_LOCALE_COOKIES_KEY,
  APP_TIME_FORMAT_COOKIES_KEY,
  DATE_FORMATS,
  defaultDateFormat,
  defaultDateFormatString,
  defaultLocale,
  defaultTimeFormat,
  defaultTimeFormatString,
  TIME_FORMATS
} from '@lib/localization/config';
import { getCookie } from 'cookies-next';
import { DateTimeFormatOptions, useFormatter, useLocale } from 'next-intl';

/**
 * Utility functions for formatting various data types in the application
 */

/**
 * Hook to get a currency formatter that integrates with next-intl and your localization system
 * @returns A currency formatting function
 */
export const useFormatCurrency = () => {
  // Get the current locale from next-intl
  const locale = useLocale();
  // Get the formatter from next-intl (more powerful than just Intl.NumberFormat)
  const formatter = useFormatter();

  /**
   * Formats a currency amount from cents to a human-readable string
   * @param amount Amount in cents (smallest currency unit)
   * @param currency Currency code (default: USD)
   * @returns Formatted currency string
   */
  return (amount: number | undefined, currency = 'USD'): string => {
    if (amount === undefined || amount === null) return '-';

    // Convert cents to the base unit (dollars, euros, etc.)
    const baseAmount = amount / 100;

    // Use next-intl formatter to respect all user preferences
    return formatter.number(baseAmount, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
};

/**
 * Static utility for formatting currency when hooks can't be used
 * (e.g., server-side code or outside of React components)
 * @param amount Amount in cents (smallest currency unit)
 * @param currency Currency code (default: USD)
 * @param locale Locale string (reads from cookie or falls back to default)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | undefined, currency = 'USD', locale?: string): string => {
  if (amount === undefined || amount === null) return '-';

  // Try to get locale from cookie if not provided
  if (!locale) {
    try {
      locale = getCookie(APP_LOCALE_COOKIES_KEY) as string || defaultLocale;
    } catch (e) {
      // If cookies aren't available (e.g., in SSR), use default locale
      locale = defaultLocale;
    }
  }

  // Convert cents to the base unit and format
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

export const formatInrAmount = (
  amount: number | undefined,
  options: Intl.NumberFormatOptions = {},
): string => {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '-';

  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency',
    ...options,
  }).format(Number(amount));
};

export const formatInrPaise = (
  paise: number | undefined,
  options: Intl.NumberFormatOptions = {},
): string => formatInrAmount((paise || 0) / 100, options);

/**
 * Get user's date format preference or fall back to default
 * @returns The date format options based on user preferences
 */
export const getUserDateFormatOptions = (): DateTimeFormatOptions => {
  try {
    // Get date format from cookie or use default
    const dateFormatStr = getCookie(APP_DATE_FORMAT_COOKIES_KEY) as string || defaultDateFormatString;

    // Find the format in predefined formats
    const dateFormat = DATE_FORMATS.find(format => format.label === dateFormatStr);

    if (dateFormat) {
      return dateFormat.value;
    }

    // If not found in predefined formats, parse it
    const [day, month, year] = dateFormatStr.split('|');
    return { day, month, year } as DateTimeFormatOptions;
  } catch (e) {
    // If any error occurs, use system default
    console.error('Error getting date format:', e);
    return defaultDateFormat;
  }
};

/**
 * Get user's time format preference or fall back to default
 * @returns The time format options based on user preferences
 */
export const getUserTimeFormatOptions = (): DateTimeFormatOptions => {
  try {
    // Get time format from cookie or use default
    const timeFormatStr = getCookie(APP_TIME_FORMAT_COOKIES_KEY) as string || defaultTimeFormatString;

    // Find the format in predefined formats
    const timeFormat = TIME_FORMATS.find(format => format.label === timeFormatStr);

    if (timeFormat) {
      return timeFormat.value;
    }

    // If not found in predefined formats, parse it
    const [hour, minute, hour12Str] = timeFormatStr.split('|');
    return { hour, minute, hour12: hour12Str === 'true' } as DateTimeFormatOptions;
  } catch (e) {
    // If any error occurs, use system default
    console.error('Error getting time format:', e);
    return defaultTimeFormat;
  }
};

/**
 * Format processing time from milliseconds to a readable format
 * @param milliseconds Processing time in milliseconds
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted time string with seconds unit
 */
export const formatProcessingTime = (milliseconds: number, decimals = 2): string => {
  if (milliseconds === undefined || milliseconds === null) return '-';
  return `${(milliseconds / 1000).toFixed(decimals)}s`;
};

/**
 * Hook to use date/time formatting with next-intl
 * This respects user preferences from the DateFormatSwitcher
 * @returns Object with date formatting functions
 */
export const useDateFormatters = () => {
  const formatter = useFormatter();

  return {
    /**
     * Format a date with internationalization support
     * @param date Date to format
     * @param options String format identifier or options object
     * @returns Formatted date string
     */
    formatDate: (date: Date | string, options?: string | Record<string, any>) => {
      let dateObj = typeof date === 'string' ? new Date(date) : date;

      if (options === 'date') {
        // Basic date format
        return formatter.dateTime(dateObj, "date");
      } else if (options === 'time') {
        // Basic time format
        return formatter.dateTime(dateObj, "time");
      } else if (typeof options === 'object') {
        // Custom formats as object
        return formatter.dateTime(dateObj, options);
      } else {
        // Default combined format
        return formatter.dateTime(dateObj, "dateAndTime");
      }
    },

    /**
     * Format a date to show only the date portion
     * @param date Date to format
     * @returns Formatted date string (date only)
     */
    formatDateOnly: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatter.dateTime(dateObj, getUserDateFormatOptions());
    },

    /**
     * Format a date to show only the time portion
     * @param date Date to format
     * @returns Formatted time string (time only)
     */
    formatTimeOnly: (date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatter.dateTime(dateObj, getUserTimeFormatOptions());
    }
  };

};
