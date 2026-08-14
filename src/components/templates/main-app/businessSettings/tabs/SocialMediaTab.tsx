import { Button, Card, Flex, Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useRef, type Dispatch, type SetStateAction } from 'react';
import { LuMessageCircle, LuPlus, LuTrash, LuX } from 'react-icons/lu';

const { Title, Text } = Typography;

interface SocialMediaPlatform {
    key: string;
    icon: React.ElementType;
    placeholder: string;
}

interface SocialMediaTabProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    socialMedia: Record<string, string>;
    setSocialMedia: Dispatch<SetStateAction<Record<string, string>>>;
}

const defaultPlatforms: SocialMediaPlatform[] = [
    { key: 'facebook', icon: LuMessageCircle, placeholder: 'Facebook profile URL' },
    { key: 'instagram', icon: LuMessageCircle, placeholder: 'Instagram profile URL' },
    { key: 'twitter', icon: LuMessageCircle, placeholder: 'Twitter profile URL' },
    { key: 'linkedin', icon: LuMessageCircle, placeholder: 'LinkedIn profile URL' },
    { key: 'youtube', icon: LuMessageCircle, placeholder: 'YouTube channel URL' }
];

const SocialMediaTab: React.FC<SocialMediaTabProps> = ({ scrollRef, socialMedia, setSocialMedia }) => {
    const t = useTranslations('BusinessSettings');
    const defaultPlatformKeys = defaultPlatforms.map((platform) => platform.key);
    const customPlatforms = Object.entries(socialMedia).filter(([key]) => !defaultPlatformKeys.includes(key) && key !== 'whatsapp');
    const customPlatformRowIdsRef = useRef(new Map<string, string>());
    const nextCustomPlatformRowIdRef = useRef(1);

    const getCustomPlatformRowId = (platformKey: string) => {
        const existingId = customPlatformRowIdsRef.current.get(platformKey);
        if (existingId) return existingId;

        const nextId = `custom-social-platform-${nextCustomPlatformRowIdRef.current}`;
        nextCustomPlatformRowIdRef.current += 1;
        customPlatformRowIdsRef.current.set(platformKey, nextId);
        return nextId;
    };

    const transferCustomPlatformRowId = (previousKey: string, nextKey: string) => {
        const rowId = getCustomPlatformRowId(previousKey);
        customPlatformRowIdsRef.current.delete(previousKey);
        customPlatformRowIdsRef.current.set(nextKey, rowId);
    };

    return (
        <Card size='small' ref={scrollRef}>
            <Flex vertical gap={16}>
                <Flex align="flex-start" justify="space-between" gap={16}>
                    <Flex vertical gap={4}>
                        <Title level={5} style={{ margin: 0 }}>{t('socialMedia')}</Title>
                        <Text type="secondary">
                            Add the public social profiles customers should open. WhatsApp stays under official page phone settings.
                        </Text>
                    </Flex>
                    <Button
                        type="link"
                        icon={<LuPlus />}
                        onClick={() => {
                            setSocialMedia((currentSocialMedia) => {
                                let newKey = '';
                                let counter = 1;
                                while (newKey in currentSocialMedia || !newKey) {
                                    newKey = `platform_${counter}`;
                                    counter++;
                                }
                                return { ...currentSocialMedia, [newKey]: '' };
                            });
                        }}
                    >
                        {t('addPlatform')}
                    </Button>
                </Flex>

                <Flex vertical gap={12}>
                    {defaultPlatforms.map(({ key, icon: Icon, placeholder }) => {
                        const value = socialMedia[key] || '';
                        return (
                            <Card key={key} size="small">
                                <Flex gap={10} vertical>
                                    <Text strong style={{ textTransform: 'capitalize' }}>{key}</Text>
                                    <Input
                                        aria-label={placeholder}
                                        allowClear={{ clearIcon: <LuX aria-label={`Clear ${placeholder}`} /> }}
                                        prefix={<Icon />}
                                        placeholder={placeholder}
                                        value={value}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;
                                            setSocialMedia((currentSocialMedia) => ({
                                                ...currentSocialMedia,
                                                [key]: nextValue,
                                            }));
                                        }}
                                    />
                                </Flex>
                            </Card>
                        );
                    })}
                </Flex>

                {customPlatforms.length > 0 ? (
                    <Flex vertical gap={12}>
                        {customPlatforms.map(([key, value]) => (
                            <Card key={getCustomPlatformRowId(key)} size="small">
                                <Flex gap={10} vertical>
                                    <Flex align="center" gap={8}>
                                        <Input
                                            aria-label={t('platformName')}
                                            allowClear={{ clearIcon: <LuX aria-label={`Clear ${t('platformName')}`} /> }}
                                            style={{ minWidth: 180 }}
                                            placeholder={t('platformName')}
                                            value={key}
                                            onChange={(e) => {
                                                const nextKey = e.target.value.toLowerCase();
                                                if (
                                                    nextKey
                                                    && nextKey !== key
                                                    && !Object.prototype.hasOwnProperty.call(socialMedia, nextKey)
                                                ) {
                                                    transferCustomPlatformRowId(key, nextKey);
                                                    setSocialMedia((currentSocialMedia) => {
                                                        if (Object.prototype.hasOwnProperty.call(currentSocialMedia, nextKey)) {
                                                            return currentSocialMedia;
                                                        }
                                                        const newState = { ...currentSocialMedia };
                                                        const currentValue = newState[key] ?? value;
                                                        delete newState[key];
                                                        newState[nextKey] = currentValue;
                                                        return newState;
                                                    });
                                                }
                                            }}
                                        />
                                        <Button
                                            aria-label={`Remove ${key}`}
                                            danger
                                            icon={<LuTrash />}
                                            onClick={() => {
                                                customPlatformRowIdsRef.current.delete(key);
                                                setSocialMedia((currentSocialMedia) => {
                                                    const newState = { ...currentSocialMedia };
                                                    delete newState[key];
                                                    return newState;
                                                });
                                            }}
                                        />
                                    </Flex>
                                    <Input.TextArea
                                        aria-label={`${key} ${t('profileUrl')}`}
                                        allowClear={{ clearIcon: <LuX aria-label={`Clear ${key} ${t('profileUrl')}`} /> }}
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        placeholder={t('profileUrl')}
                                        value={value}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;
                                            setSocialMedia((currentSocialMedia) => ({
                                                ...currentSocialMedia,
                                                [key]: nextValue,
                                            }));
                                        }}
                                    />
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
};

export default SocialMediaTab;
