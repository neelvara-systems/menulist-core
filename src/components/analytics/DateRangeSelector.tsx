/**
 * DateRangeSelector Component
 * Date picker with preset ranges for analytics
 */

import React from 'react';
import { DatePicker, Space, Button, theme } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangeSelectorProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  maxDays?: number;
  showPresets?: boolean;
  className?: string;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  maxDays = 90,
  showPresets = true,
  className,
}) => {
  const { token } = theme.useToken();

  // Convert Date to Dayjs
  const dayjsValue: [Dayjs, Dayjs] | null = value
    ? [dayjs(value.start), dayjs(value.end)]
    : null;

  // Handle range change
  const handleChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      onChange({
        start: dates[0].toDate(),
        end: dates[1].toDate(),
      });
    }
  };

  // Preset ranges
  const presets = [
    {
      label: 'Last 7 Days',
      value: () => ({
        start: dayjs().subtract(7, 'days').toDate(),
        end: dayjs().toDate(),
      }),
    },
    {
      label: 'Last 14 Days',
      value: () => ({
        start: dayjs().subtract(14, 'days').toDate(),
        end: dayjs().toDate(),
      }),
    },
    {
      label: 'Last 30 Days',
      value: () => ({
        start: dayjs().subtract(30, 'days').toDate(),
        end: dayjs().toDate(),
      }),
    },
    {
      label: 'Last 90 Days',
      value: () => ({
        start: dayjs().subtract(90, 'days').toDate(),
        end: dayjs().toDate(),
      }),
    },
    {
      label: 'This Month',
      value: () => ({
        start: dayjs().startOf('month').toDate(),
        end: dayjs().toDate(),
      }),
    },
    {
      label: 'Last Month',
      value: () => ({
        start: dayjs().subtract(1, 'month').startOf('month').toDate(),
        end: dayjs().subtract(1, 'month').endOf('month').toDate(),
      }),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} className={className}>
      {/* Range Picker */}
      <RangePicker
        value={dayjsValue}
        onChange={handleChange}
        format="YYYY-MM-DD"
        allowClear
        maxDate={dayjs()}
        disabledDate={(current) => {
          // Disable future dates
          if (current && current > dayjs().endOf('day')) {
            return true;
          }
          // Disable dates beyond maxDays
          if (dayjsValue && dayjsValue[0]) {
            const diff = Math.abs(current.diff(dayjsValue[0], 'days'));
            return diff > maxDays;
          }
          return false;
        }}
        style={{ width: '100%' }}
        suffixIcon={<CalendarOutlined style={{ color: token.colorTextSecondary }} />}
      />

      {/* Preset Buttons */}
      {showPresets && (
        <Space wrap size="small">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              size="small"
              onClick={() => onChange(preset.value())}
              type={
                value &&
                dayjs(value.start).isSame(dayjs(preset.value().start), 'day') &&
                dayjs(value.end).isSame(dayjs(preset.value().end), 'day')
                  ? 'primary'
                  : 'default'
              }
            >
              {preset.label}
            </Button>
          ))}
        </Space>
      )}
    </Space>
  );
};

export default DateRangeSelector;
