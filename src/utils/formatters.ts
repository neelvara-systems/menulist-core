import {
  APP_DATE_FORMAT_COOKIES_KEY,
  APP_LOCALE_COOKIES_KEY,
  APP_TIME_FORMAT_COOKIES_KEY,
  defaultDateFormat,
  defaultLocale,
  defaultTimeFormat,
  getDateFormatOptions,
  getTimeFormatOptions,
  normalizeLocalePreference,
} from '@lib/localization/config';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
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
    if (amount === undefined || amount === null || !Number.isFinite(amount)) return '-';

    // Convert cents to the base unit (dollars, euros, etc.)
    const baseAmount = amount / 100;

    // Use next-intl formatter to respect all user preferences
    try {
      return formatter.number(baseAmount, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return '-';
    }
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
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return '-';

  // Try to get locale from cookie if not provided
  if (!locale) {
    try {
      locale = getCookie(APP_LOCALE_COOKIES_KEY) as string || defaultLocale;
    } catch (e) {
      // If cookies aren't available (e.g., in SSR), use default locale
      locale = defaultLocale;
    }
  }
  locale = normalizeLocalePreference(locale) || defaultLocale;

  // Convert cents to the base unit and format
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return '-';
  }
};

export const formatNumber = (
  value: number | undefined | null,
  options: Intl.NumberFormatOptions = {},
  locale?: string,
): string => {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '-';

  let resolvedLocale = normalizeLocalePreference(locale);
  if (!resolvedLocale) {
    try {
      resolvedLocale = normalizeLocalePreference(getCookie(APP_LOCALE_COOKIES_KEY) as string);
    } catch {
      resolvedLocale = null;
    }
  }

  return new Intl.NumberFormat(resolvedLocale || defaultLocale, options).format(Number(value));
};

export const formatInrAmount = (
  amount: number | undefined,
  options: Intl.NumberFormatOptions = {},
): string => {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return '-';

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
): string => formatInrAmount((paise === undefined ? 0 : paise) / 100, options);

/**
 * Get user's date format preference or fall back to default
 * @returns The date format options based on user preferences
 */
export const getUserDateFormatOptions = (): DateTimeFormatOptions => {
  try {
    return getDateFormatOptions(getCookie(APP_DATE_FORMAT_COOKIES_KEY) as string);
  } catch (e) {
    // If any error occurs, use system default
    logRuntimeFailure('date_format_preference_read_failed', e);
    return defaultDateFormat;
  }
};

/**
 * Get user's time format preference or fall back to default
 * @returns The time format options based on user preferences
 */
export const getUserTimeFormatOptions = (): DateTimeFormatOptions => {
  try {
    return getTimeFormatOptions(getCookie(APP_TIME_FORMAT_COOKIES_KEY) as string);
  } catch (e) {
    // If any error occurs, use system default
    logRuntimeFailure('time_format_preference_read_failed', e);
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
  if (milliseconds === undefined || milliseconds === null || !Number.isFinite(milliseconds)) return '-';
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
