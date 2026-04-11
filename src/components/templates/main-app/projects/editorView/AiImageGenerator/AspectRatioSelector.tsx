import SelectedItemCheck from '@atoms/selectedItemCheck';
import { ASPECT_RATIOS_LIST } from '@constant/common';
import useDeviceType from '@hook/useDeviceType';
import { Card, Flex, Typography, theme } from 'antd';
import { LuCheck } from 'react-icons/lu';
import React from 'react';

interface AspectRatioSelectorProps {
  selectedAspectRatio: string;
  onChange: (aspectRatio: string) => void;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  selectedAspectRatio,
  onChange
}) => {
  const { token } = theme.useToken();
  const { isMobile } = useDeviceType();

  return (
    <Flex vertical gap={8} style={{ width: '100%' }}>
      <Typography.Text type='secondary'>Aspect Ratio:</Typography.Text>
      {isMobile ? (
        <Flex gap={10} vertical style={{ width: '100%' }}>
          {ASPECT_RATIOS_LIST.map((ratio) => {
            const isSelected = selectedAspectRatio === ratio.value;

            return (
              <Flex
                align="center"
                gap={10}
                key={ratio.value}
                onClick={() => onChange(ratio.value)}
                style={{
                  background: token.colorFillAlter,
                  border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '10px 12px',
                  width: '100%',
                }}
              >
                <Flex
                  align="center"
                  justify="center"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                    borderRadius: '999px',
                    color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                    flex: '0 0 auto',
                    height: 24,
                    width: 24,
                  }}
                >
                  <LuCheck size={12} />
                </Flex>
                <Flex align="center" gap={12} style={{ minWidth: 0, width: '100%' }}>
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      flex: '0 0 auto',
                      minWidth: 44,
                    }}
                  >
                    <div
                      style={{
                        width: ratio.width,
                        height: ratio.height,
                        border: '2px solid',
                        borderColor: isSelected ? token.colorPrimary : token.colorTextQuaternary,
                        borderRadius: 4,
                        transition: 'all 0.2s',
                      }}
                    />
                  </Flex>
                  <Flex gap={2} style={{ minWidth: 0 }} vertical>
                    <Typography.Text style={{ color: isSelected ? token.colorPrimary : undefined, lineHeight: 1.25 }}>
                      {ratio.title}
                    </Typography.Text>
                    <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: 1.3 }}>
                      {ratio.value}
                    </Typography.Text>
                    {ratio.useCase ? (
                      <Typography.Text style={{ fontSize: 12, lineHeight: 1.35 }} type='secondary'>
                        {ratio.useCase}
                      </Typography.Text>
                    ) : null}
                  </Flex>
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
            width: '100%',
          }}
        >
          {ASPECT_RATIOS_LIST.map((ratio) => (
            <Card
              key={ratio.value}
              size='small'
              hoverable
              onClick={() => onChange(ratio.value)}
              style={{
                cursor: 'pointer',
                width: "100%",
                border: `1px solid ${selectedAspectRatio === ratio.value ? token.colorPrimary : token.colorBorder}`,
                borderRadius: 8,
                transition: 'all 0.2s',
                minHeight: 124,
              }}
              styles={{ body: { padding: 12 } }}
            >
              <Flex align="center" justify="space-between" vertical style={{ height: '100%', width: '100%' }}>
                <SelectedItemCheck active={selectedAspectRatio === ratio.value} />
                <div
                  style={{
                    width: ratio.width,
                    height: ratio.height,
                    border: '2px solid',
                    borderColor: selectedAspectRatio === ratio.value ? token.colorPrimary : '#999',
                    borderRadius: 4,
                    transition: 'all 0.2s',
                    marginBottom: 10
                  }}
                />
                <Flex
                  gap={2}
                  vertical
                  style={{
                    color: selectedAspectRatio === ratio.value ? token.colorPrimary : undefined,
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    width: '100%',
                  }}
                >
                  <Typography.Text style={{ fontSize: 12, lineHeight: 1.25 }}>{ratio.title}</Typography.Text>
                  <Typography.Text style={{ fontSize: 11, lineHeight: 1.25 }} type='secondary'>{ratio.value}</Typography.Text>
                </Flex>
              </Flex>
            </Card>
          ))}
        </div>
      )}
    </Flex>
  );
};

export default AspectRatioSelector;
