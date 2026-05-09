import type { MediaAspectRatioOption, MediaAspectRatioValue, MediaImageType } from '@lib/media/imageProfiles';
import { getAllowedMediaAspectRatioOptions, MEDIA_ASPECT_RATIO_OPTIONS } from '@lib/media/imageProfiles';
import useDeviceType from '@hook/useDeviceType';
import { Card, Flex, Typography, theme } from 'antd';
import React from 'react';
import { LuCheck } from 'react-icons/lu';

interface MediaAspectRatioSelectorProps {
    allowedAspectRatios?: MediaAspectRatioValue[];
    imageType?: MediaImageType;
    onChange: (aspectRatio: MediaAspectRatioValue) => void;
    selectedAspectRatio: string;
}

function resolveOptions(
    imageType?: MediaImageType,
    allowedAspectRatios?: MediaAspectRatioValue[],
): MediaAspectRatioOption[] {
    if (imageType) {
        return getAllowedMediaAspectRatioOptions(imageType);
    }

    if (allowedAspectRatios?.length) {
        const allowed = new Set(allowedAspectRatios);
        return MEDIA_ASPECT_RATIO_OPTIONS.filter((option) => allowed.has(option.value));
    }

    return MEDIA_ASPECT_RATIO_OPTIONS;
}

const MediaAspectRatioSelector: React.FC<MediaAspectRatioSelectorProps> = ({
    allowedAspectRatios,
    imageType,
    onChange,
    selectedAspectRatio,
}) => {
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const options = resolveOptions(imageType, allowedAspectRatios);

    return (
        <Flex vertical gap={8} style={{ width: '100%' }}>
            <Typography.Text type="secondary">Aspect Ratio:</Typography.Text>
            {isMobile ? (
                <Flex gap={10} vertical style={{ width: '100%' }}>
                    {options.map((ratio) => {
                        const isSelected = selectedAspectRatio === ratio.value;

                        return (
                            <button
                                key={ratio.value}
                                onClick={() => onChange(ratio.value)}
                                style={{
                                    alignItems: 'center',
                                    appearance: 'none',
                                    background: token.colorFillAlter,
                                    border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                    borderRadius: 8,
                                    color: token.colorText,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: 10,
                                    minHeight: 64,
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    width: '100%',
                                }}
                                type="button"
                            >
                                <Flex
                                    align="center"
                                    justify="center"
                                    style={{
                                        background: 'transparent',
                                        border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                                        borderRadius: 999,
                                        color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                                        flex: '0 0 auto',
                                        height: 24,
                                        width: 24,
                                    }}
                                >
                                    <LuCheck size={12} />
                                </Flex>
                                <Flex align="center" gap={12} style={{ minWidth: 0, width: '100%' }}>
                                    <Flex align="center" justify="center" style={{ flex: '0 0 auto', minWidth: 44 }}>
                                        <div
                                            style={{
                                                border: '2px solid',
                                                borderColor: isSelected ? token.colorPrimary : token.colorTextQuaternary,
                                                borderRadius: 4,
                                                height: ratio.height,
                                                transition: 'all 0.2s',
                                                width: ratio.width,
                                            }}
                                        />
                                    </Flex>
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Typography.Text style={{ color: isSelected ? token.colorPrimary : undefined, lineHeight: 1.25 }}>
                                            {ratio.title}
                                        </Typography.Text>
                                        <Typography.Text style={{ fontSize: 12, lineHeight: 1.3 }} type="secondary">
                                            {ratio.value}
                                        </Typography.Text>
                                        <Typography.Text style={{ fontSize: 12, lineHeight: 1.35 }} type="secondary">
                                            {ratio.useCase}
                                        </Typography.Text>
                                    </Flex>
                                </Flex>
                            </button>
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
                    {options.map((ratio) => {
                        const isSelected = selectedAspectRatio === ratio.value;

                        return (
                            <Card
                                hoverable
                                key={ratio.value}
                                onClick={() => onChange(ratio.value)}
                                size="small"
                                style={{
                                    border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    minHeight: 124,
                                    transition: 'all 0.2s',
                                    width: '100%',
                                }}
                                styles={{ body: { height: '100%', padding: 12 } }}
                            >
                                <Flex align="center" justify="space-between" style={{ height: '100%', width: '100%' }} vertical>
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                                            borderRadius: 999,
                                            color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                                            height: 24,
                                            width: 24,
                                        }}
                                    >
                                        {isSelected ? <LuCheck size={13} /> : null}
                                    </Flex>
                                    <div
                                        style={{
                                            border: '2px solid',
                                            borderColor: isSelected ? token.colorPrimary : token.colorTextQuaternary,
                                            borderRadius: 4,
                                            height: ratio.height,
                                            marginBottom: 10,
                                            transition: 'all 0.2s',
                                            width: ratio.width,
                                        }}
                                    />
                                    <Flex gap={2} style={{ color: isSelected ? token.colorPrimary : undefined, textAlign: 'center', transition: 'all 0.2s', width: '100%' }} vertical>
                                        <Typography.Text style={{ fontSize: 12, lineHeight: 1.25 }}>{ratio.title}</Typography.Text>
                                        <Typography.Text style={{ fontSize: 11, lineHeight: 1.25 }} type="secondary">
                                            {ratio.value}
                                        </Typography.Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        );
                    })}
                </div>
            )}
        </Flex>
    );
};

export default MediaAspectRatioSelector;

