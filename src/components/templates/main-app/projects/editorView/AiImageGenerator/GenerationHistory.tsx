import { UserUploadedFileType } from '@type/common';
import { formatDateTime } from '@util/dateTime';
import { Button, Card, Empty, Flex, Image, Popover, Space, Typography, theme } from 'antd';
import { useFormatter } from 'next-intl';
import React from 'react';
import { LuClock, LuRefreshCw, LuTrash2 } from 'react-icons/lu';
import { ImageGenerationConfigType } from '../../types';

interface GenerationHistoryProps {
  history: Array<{
    image: UserUploadedFileType;
    prompt: string;
    timestamp: number;
    config: Partial<ImageGenerationConfigType>;
  }>;
  onSelectImage: (image: UserUploadedFileType) => void;
  onRegenerate: (config: Partial<ImageGenerationConfigType>) => void;
  onClearHistory: () => void;
}

const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  history,
  onSelectImage,
  onRegenerate,
  onClearHistory
}) => {
  const { token } = theme.useToken();
  const formatter = useFormatter();

  if (!history || history.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    return formatDateTime(timestamp, 'datetime', formatter);
  };

  const renderHistoryContent = () => {
    if (history.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No generation history yet"
          style={{ margin: '20px 0' }}
        />
      );
    }

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {history.map((item, index) => (
          <Card
            key={index}
            size="small"
            style={{
              width: '100%',
              marginBottom: 8,
              borderRadius: 8,
              overflow: 'hidden'
            }}
          >
            <Flex align="center" gap={12}>
              <Image
                src={item.image.url}
                alt={item.image.name}
                style={{
                  width: 60,
                  height: 60,
                  objectFit: 'cover',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                preview={false}
                onClick={() => onSelectImage(item.image)}
              />
              <Flex vertical style={{ flex: 1, overflow: 'hidden' }}>
                <Typography.Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 0, fontSize: 12 }}
                >
                  {item.prompt}
                </Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {formatTimestamp(item.timestamp)}
                </Typography.Text>
              </Flex>
              <Button
                type="text"
                icon={<LuRefreshCw size={16} />}
                onClick={() => onRegenerate(item.config)}
                title="Regenerate with these settings"
              />
            </Flex>
          </Card>
        ))}
        <Button
          danger
          type="text"
          icon={<LuTrash2 />}
          onClick={onClearHistory}
          style={{ marginTop: 8 }}
        >
          Clear History
        </Button>
      </Space>
    );
  };

  return (
    <Popover
      title={
        <Flex align="center" gap={8}>
          <LuClock />
          <span>Generation History</span>
        </Flex>
      }
      content={
        <div style={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
          {renderHistoryContent()}
        </div>
      }
      trigger="click"
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={<LuClock />}
        title="View generation history"
      >
        History
      </Button>
    </Popover>
  );
};

export default GenerationHistory;
