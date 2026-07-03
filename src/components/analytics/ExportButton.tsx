/**
 * ExportButton Component
 * Export data in various formats (CSV, JSON, PDF)
 */

import React, { useState } from 'react';
import { Button, Dropdown, message, theme } from 'antd';
import { DownloadOutlined, FileTextOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportButtonProps {
  data: any[];
  filename?: string;
  formats?: ExportFormat[];
  onExport?: (format: ExportFormat, data: any[]) => Promise<void> | void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

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

  // Convert to CSV
  const convertToCSV = (jsonData: any[]): string => {
    if (!jsonData || jsonData.length === 0) return '';

    const headers = Object.keys(jsonData[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = jsonData.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        const stringValue = String(value === null || value === undefined ? '' : value);
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  };

  // Download file
  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    if (!data || data.length === 0) {
      message.warning('No data to export');
      return;
    }

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
      const fileName = `${filename}_${timestamp}`;

      switch (format) {
        case 'csv': {
          const csv = convertToCSV(data);
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
    onClick: () => handleExport(format),
  }));

  // Single format - just a button
  if (formats.length === 1) {
    return (
      <Button
        icon={<DownloadOutlined />}
        onClick={() => handleExport(formats[0])}
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
