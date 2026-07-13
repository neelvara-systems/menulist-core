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

const getUtcTodayCalendarDay = (): Dayjs => dayjs(new Date().toISOString().slice(0, 10));

const toUtcCalendarDate = (value: Dayjs): Date => (
  new Date(`${value.format('YYYY-MM-DD')}T00:00:00.000Z`)
);

const toCalendarDay = (value: Date): Dayjs => dayjs(value.toISOString().slice(0, 10));

const getTrailingUtcRange = (dayCount: number): DateRange => {
  const end = getUtcTodayCalendarDay();
  const start = end.subtract(dayCount - 1, 'day');
  return {
    start: toUtcCalendarDate(start),
    end: toUtcCalendarDate(end),
  };
};

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
    ? [toCalendarDay(value.start), toCalendarDay(value.end)]
    : null;

  // Handle range change
  const handleChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      onChange({
        start: toUtcCalendarDate(dates[0]),
        end: toUtcCalendarDate(dates[1]),
      });
    }
  };

  // Preset ranges
  const presets = [
    {
      label: 'Last 7 Days',
      value: () => getTrailingUtcRange(7),
    },
    {
      label: 'Last 14 Days',
      value: () => getTrailingUtcRange(14),
    },
    {
      label: 'Last 30 Days',
      value: () => getTrailingUtcRange(30),
    },
    {
      label: 'Last 90 Days',
      value: () => getTrailingUtcRange(90),
    },
    {
      label: 'This Month',
      value: () => {
        const end = getUtcTodayCalendarDay();
        return {
          start: toUtcCalendarDate(end.startOf('month')),
          end: toUtcCalendarDate(end),
        };
      },
    },
    {
      label: 'Last Month',
      value: () => {
        const previousMonth = getUtcTodayCalendarDay().subtract(1, 'month');
        return {
          start: toUtcCalendarDate(previousMonth.startOf('month')),
          end: toUtcCalendarDate(previousMonth.endOf('month')),
        };
      },
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
        maxDate={getUtcTodayCalendarDay()}
        disabledDate={(current) => {
          // Disable future dates
          if (current && current > getUtcTodayCalendarDay().endOf('day')) {
            return true;
          }
          // Disable dates beyond maxDays
          if (dayjsValue && dayjsValue[0]) {
            const diff = Math.abs(current.diff(dayjsValue[0], 'days'));
            return diff >= maxDays;
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
