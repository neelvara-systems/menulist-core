import SelectedItemCheck from '@atoms/selectedItemCheck';
import { ASPECT_RATIOS_LIST } from '@constant/common';
import useDeviceType from '@hook/useDeviceType';
import { Card, Flex, Typography, theme } from 'antd';
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
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : `repeat(${ASPECT_RATIOS_LIST.length}, minmax(0, 1fr))`,
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
              position: 'relative',
              minHeight: 112,
            }}
          >
            <Flex align="center" justify="center" vertical style={{ height: '100%', width: '100%', paddingBottom: 20 }}>
              <SelectedItemCheck active={selectedAspectRatio === ratio.value} />
              <div
                style={{
                  width: ratio.width,
                  height: ratio.height,
                  border: '2px solid',
                  borderColor: selectedAspectRatio === ratio.value ? token.colorPrimary : '#999',
                  borderRadius: 4,
                  transition: 'all 0.2s',
                  marginBottom: 8
                }}
              />
              <Flex vertical style={{
                position: 'absolute',
                bottom: 4,
                width: '100%',
                textAlign: 'center',
                marginTop: 8,
                color: selectedAspectRatio === ratio.value ? token.colorPrimary : undefined,
                transition: 'all 0.2s'
              }}>
                <Typography.Text style={{ fontSize: 10 }}>{ratio.title}</Typography.Text>
                <Typography.Text style={{ fontSize: 10 }} type='secondary'>{ratio.value}</Typography.Text>
                {ratio.useCase && <Typography.Text style={{ fontSize: 8, lineHeight: 1.2 }} type='secondary'>{ratio.useCase}</Typography.Text>}
              </Flex>
            </Flex>
          </Card>
        ))}
      </div>
    </Flex>
  );
};

export default AspectRatioSelector;
