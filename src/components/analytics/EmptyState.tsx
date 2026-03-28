/**
 * EmptyState Component
 * Consistent empty states for analytics
 */

import React from 'react';
import { Empty, Button, Space, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  image?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  description,
  action,
  image,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <Empty
        image={image || <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
        imageStyle={{
          height: 100,
        }}
        description={
          <Space direction="vertical" size="small">
            <Text strong style={{ fontSize: 16 }}>
              {title}
            </Text>
            {description && (
              <Text type="secondary" style={{ fontSize: 14 }}>
                {description}
              </Text>
            )}
          </Space>
        }
      >
        {action && (
          <Button
            type="primary"
            icon={action.icon}
            onClick={action.onClick}
          >
            {action.text}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;
