/**
 * DataTable Component
 * Sortable and filterable table for analytics data
 */

import React, { useState } from 'react';
import { Table, Card, Input, Space, Typography, theme } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { TableProps, ColumnType } from 'antd/es/table';

const { Title } = Typography;

export interface DataTableColumn<T = Record<string, unknown>> extends ColumnType<T> {
  searchable?: boolean;
}

export interface DataTableProps<T = Record<string, unknown>> {
  title?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  pageSize?: number;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (record: T) => void;
  rowKey?: string | ((record: T) => React.Key);
  className?: string;
  size?: 'small' | 'middle' | 'large';
  showPagination?: boolean;
}

export function getDataTableSearchValue<T extends object>(
  record: T,
  dataIndex: NonNullable<ColumnType<T>['dataIndex']>,
): unknown {
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
  return path.reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== 'object') return undefined;
    if (typeof segment !== 'string' && typeof segment !== 'number' && typeof segment !== 'symbol') {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    return Reflect.get(current, segment);
  }, record);
}

export const DataTable = <T extends Record<string, unknown>>({
  title,
  columns,
  data,
  loading = false,
  pageSize = 10,
  showSearch = false,
  searchPlaceholder = 'Search...',
  onRowClick,
  rowKey = 'id',
  className,
  size = 'middle',
  showPagination = true,
}: DataTableProps<T>) => {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<T[]>(data);

  // Filter data based on search
  React.useEffect(() => {
    if (!searchText) {
      setFilteredData(data);
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = data.filter((record) => {
      return columns.some((col) => {
        if (col.searchable === false) return false;
        
        const value = col.dataIndex ? getDataTableSearchValue(record, col.dataIndex) : null;
        if (value === null || value === undefined) return false;
        
        return String(value).toLowerCase().includes(searchLower);
      });
    });

    setFilteredData(filtered);
  }, [searchText, data, columns]);

  // Table configuration
  const tableConfig: TableProps<T> = {
    columns,
    dataSource: filteredData,
    loading,
    rowKey,
    size,
    pagination: showPagination
      ? {
          pageSize,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }
      : false,
    onRow: onRowClick
      ? (record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: 'pointer' },
        })
      : undefined,
    style: {
      cursor: onRowClick ? 'pointer' : 'default',
    },
  };

  return (
    <Card className={className}>
      {/* Header */}
      {(title || showSearch) && (
        <Space
          direction="vertical"
          style={{ width: '100%', marginBottom: 16 }}
          size="middle"
        >
          {title && <Title level={5}>{title}</Title>}
          
          {showSearch && (
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              maxLength={500}
              allowClear
              style={{ maxWidth: 400 }}
            />
          )}
        </Space>
      )}

      {/* Table */}
      <Table {...tableConfig} />
    </Card>
  );
};

export default DataTable;
