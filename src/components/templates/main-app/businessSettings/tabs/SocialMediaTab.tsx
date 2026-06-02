import { Button, Card, Flex, Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { LuMessageCircle, LuPlus, LuTrash } from 'react-icons/lu';

const { Title, Text } = Typography;

interface SocialMediaPlatform {
    key: string;
    icon: React.ElementType;
    placeholder: string;
}

interface SocialMediaTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    socialMedia: Record<string, string>;
    setSocialMedia: (media: Record<string, string>) => void;
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
                            let newKey = '';
                            let counter = 1;
                            while (newKey in socialMedia || !newKey) {
                                newKey = `platform_${counter}`;
                                counter++;
                            }
                            setSocialMedia({ ...socialMedia, [newKey]: '' });
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
                                        allowClear
                                        prefix={<Icon />}
                                        placeholder={placeholder}
                                        value={value}
                                        onChange={(e) => {
                                            setSocialMedia({
                                                ...socialMedia,
                                                [key]: e.target.value
                                            });
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
                            <Card key={key} size="small">
                                <Flex gap={10} vertical>
                                    <Flex align="center" gap={8}>
                                        <Input
                                            allowClear
                                            style={{ minWidth: 180 }}
                                            placeholder={t('platformName')}
                                            value={key}
                                            onChange={(e) => {
                                                if (e.target.value && e.target.value !== key) {
                                                    const newState = { ...socialMedia };
                                                    delete newState[key];
                                                    newState[e.target.value.toLowerCase()] = value;
                                                    setSocialMedia(newState);
                                                }
                                            }}
                                        />
                                        <Button
                                            danger
                                            icon={<LuTrash />}
                                            onClick={() => {
                                                const newState = { ...socialMedia };
                                                delete newState[key];
                                                setSocialMedia(newState);
                                            }}
                                        />
                                    </Flex>
                                    <Input.TextArea
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        placeholder={t('profileUrl')}
                                        value={value}
                                        onChange={(e) => {
                                            setSocialMedia({
                                                ...socialMedia,
                                                [key]: e.target.value
                                            });
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
