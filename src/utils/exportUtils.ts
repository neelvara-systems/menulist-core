import { logger } from '@lib/monitoring/logger';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { message } from 'antd';

/**
 * Generic CSV Export Configuration
 */
export interface CSVColumn<T = any> {
    header: string;
    accessor: (item: T) => string | number | null | undefined;
}

export interface ExportOptions {
    filename?: string;
    dateFormat?: 'iso' | 'locale';
    showSuccessMessage?: boolean;
}

/**
 * Escape CSV values to handle special characters
 */
const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';

    const stringValue = String(value);

    // If value contains comma, newline, or quotes, wrap in quotes and escape existing quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
};

/**
 * Generic CSV export function
 * @param data - Array of data to export
 * @param columns - Column configuration with headers and accessors
 * @param options - Export options (filename, date format, etc.)
 */
export const exportToCSV = <T = any>(
    data: T[],
    columns: CSVColumn<T>[],
    options: ExportOptions = {}
): void => {
    if (!data || data.length === 0) {
        message.warning('No data to export');
        return;
    }

    const {
        filename = `export-${new Date().toISOString().split('T')[0]}`,
        showSuccessMessage = true,
    } = options;

    try {
        // Extract headers
        const headers = columns.map(col => col.header);

        // Extract rows using column accessors
        const rows = data.map(item => {
            return columns.map(col => {
                const value = col.accessor(item);
                return escapeCSVValue(value);
            });
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup
        URL.revokeObjectURL(url);

        // Security Audit: Log data export
        logger.security('Data Exported (CSV)', {
            action: 'EXPORT_CSV',
            recordCount: data.length,
            filename: `${filename}.csv`,
            columnCount: columns.length,
        }, 'low');

        if (showSuccessMessage) {
            message.success(`Exported ${data.length} ${data.length === 1 ? 'record' : 'records'} to CSV`);
        }
    } catch (error) {
        logRuntimeFailure('csv_export_failed', error, {
            ...getBoundedRuntimeStringContext('filename', filename),
            recordCount: data.length,
            columnCount: columns.length,
        });
        message.error('Failed to export data');
    }
};

/**
 * Export data to Excel format (CSV with Excel-specific encoding)
 */
export const exportToExcel = <T = any>(
    data: T[],
    columns: CSVColumn<T>[],
    options: ExportOptions = {}
): void => {
    if (!data || data.length === 0) {
        message.warning('No data to export');
        return;
    }

    const {
        filename = `export-${new Date().toISOString().split('T')[0]}`,
        showSuccessMessage = true,
    } = options;

    try {
        const headers = columns.map(col => col.header);
        const rows = data.map(item => {
            return columns.map(col => {
                const value = col.accessor(item);
                return escapeCSVValue(value);
            });
        });

        // Add BOM for Excel UTF-8 recognition
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        // Security Audit: Log data export
        logger.security('Data Exported (Excel)', {
            action: 'EXPORT_EXCEL',
            recordCount: data.length,
            filename: `${filename}.csv`,
            columnCount: columns.length,
        }, 'low');

        if (showSuccessMessage) {
            message.success(`Exported ${data.length} ${data.length === 1 ? 'record' : 'records'} to Excel`);
        }
    } catch (error) {
        logRuntimeFailure('excel_export_failed', error, {
            ...getBoundedRuntimeStringContext('filename', filename),
            recordCount: data.length,
            columnCount: columns.length,
        });
        message.error('Failed to export data');
    }
};

/**
 * Helper to format Firestore Timestamp for CSV
 */
export const formatTimestampForCSV = (timestamp: any, format: 'iso' | 'locale' = 'iso'): string => {
    if (!timestamp) return 'N/A';

    try {
        const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);

        if (format === 'iso') {
            return date.toISOString();
        }

        return date.toLocaleString();
    } catch {
        return 'Invalid Date';
    }
};
