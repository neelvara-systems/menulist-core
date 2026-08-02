/**
 * ExportButton Component
 * Export data in various formats (CSV, JSON, PDF)
 */

import React, { useRef, useState } from 'react';
import { Button, Dropdown, message, theme } from 'antd';
import { DownloadOutlined, FileTextOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { escapeCSVValue } from '@util/exportUtils';

export type ExportFormat = 'csv' | 'json' | 'pdf';
export type AnalyticsExportRow = object;

export interface ExportButtonProps {
  data: AnalyticsExportRow[];
  filename?: string;
  formats?: ExportFormat[];
  onExport?: (format: ExportFormat, data: AnalyticsExportRow[]) => Promise<void> | void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

export const convertAnalyticsRowsToCSV = (rows: AnalyticsExportRow[]): string => {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  if (headers.length === 0) return '';
  const csvHeaders = headers.map(escapeCSVValue).join(',');
  const csvRows = rows.map((row) =>
    headers
      .map((header) =>
        escapeCSVValue(Object.prototype.hasOwnProperty.call(row, header) ? Reflect.get(row, header) : undefined),
      )
      .join(','),
  );
  return [csvHeaders, ...csvRows].join('\n');
};

export const normalizeAnalyticsExportFilename = (value: string): string => {
  const normalized = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 120);
  return normalized || 'export';
};

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename = 'export',
  formats = ['csv', 'json'],
  onExport,
  loading = false,
  disabled = false,
  size = 'middle',
  className,
}) => {
  const { token } = theme.useToken();
  const [exporting, setExporting] = useState(false);
  const exportInFlightRef = useRef(false);

  // Download file
  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('analytics_export_browser_runtime_unavailable');
    }
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    if (exportInFlightRef.current) return;
    if (!data || data.length === 0) {
      message.warning('No data to export');
      return;
    }

    exportInFlightRef.current = true;
    setExporting(true);

    try {
      // Custom export handler
      if (onExport) {
        await onExport(format, data);
        message.success(`Exported as ${format.toUpperCase()}`);
        return;
      }

      // Default export handlers
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${normalizeAnalyticsExportFilename(filename)}_${timestamp}`;

      switch (format) {
        case 'csv': {
          const csv = convertAnalyticsRowsToCSV(data);
          downloadFile(csv, `${fileName}.csv`, 'text/csv');
          break;
        }
        case 'json': {
          const json = JSON.stringify(data, null, 2);
          downloadFile(json, `${fileName}.json`, 'application/json');
          break;
        }
        case 'pdf': {
          message.info('PDF export is not available here.');
          return;
        }
      }

      message.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      logRuntimeFailure('analytics_export_failed', error, {
        ...getBoundedRuntimeStringContext('filename', filename),
        format,
        rowCount: Array.isArray(data) ? data.length : 0,
        hasCustomExport: Boolean(onExport),
      });
      message.error('Failed to export data');
    } finally {
      exportInFlightRef.current = false;
      setExporting(false);
    }
  };

  // Menu items
  const menuItems: MenuProps['items'] = formats.map(format => ({
    key: format,
    label: format.toUpperCase(),
    icon:
      format === 'csv' ? (
        <FileExcelOutlined />
      ) : format === 'json' ? (
        <FileTextOutlined />
      ) : (
        <FilePdfOutlined />
      ),
    onClick: () => void handleExport(format),
  }));

  // Single format - just a button
  if (formats.length === 1) {
    return (
      <Button
        icon={<DownloadOutlined />}
        onClick={() => void handleExport(formats[0])}
        loading={exporting || loading}
        disabled={disabled || !data || data.length === 0}
        size={size}
        className={className}
      >
        Export {formats[0].toUpperCase()}
      </Button>
    );
  }

  // Multiple formats - dropdown menu
  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      disabled={disabled || !data || data.length === 0}
    >
      <Button
        icon={<DownloadOutlined />}
        loading={exporting || loading}
        disabled={disabled || !data || data.length === 0}
        size={size}
        className={className}
      >
        Export
      </Button>
    </Dropdown>
  );
};

export default ExportButton;
