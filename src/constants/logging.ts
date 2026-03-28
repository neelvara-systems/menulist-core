/**
 * Centralized log file name constants
 * Used by writeLogEntry function across the application
 */
export const LOG_FILES = {
    KB_SEARCH: "kb-search.log",
    KB_SEARCH_PERFORMANCE: "kb-search-performance.log", // Search performance metrics
    // Add other log files as needed
} as const;
