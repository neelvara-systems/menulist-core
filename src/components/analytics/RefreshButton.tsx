/**
 * RefreshButton Component
 * Manual refresh button with loading state
 */

import React from 'react';
import { Button, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

export interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  loading?: boolean;
  disabled?: boolean;
  tooltip?: string;
  size?: 'small' | 'middle' | 'large';
  type?: 'default' | 'primary' | 'text' | 'link';
  showText?: boolean;
  className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  disabled = false,
  tooltip = 'Refresh data',
  size = 'middle',
  type = 'default',
  showText = false,
  className,
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const button = (
    <Button
      icon={<ReloadOutlined spin={isRefreshing || loading} />}
      onClick={handleRefresh}
      loading={isRefreshing || loading}
      disabled={disabled}
      size={size}
      type={type}
      className={className}
    >
      {showText && 'Refresh'}
    </Button>
  );

  if (tooltip && !showText) {
    return <Tooltip title={tooltip}>{button}</Tooltip>;
  }

  return button;
};

export default RefreshButton;
