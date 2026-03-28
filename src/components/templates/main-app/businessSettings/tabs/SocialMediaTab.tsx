import { Button, Card, Divider, Flex, Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { LuPlus, LuTrash } from 'react-icons/lu';
import { TbBrandFacebook, TbBrandInstagram, TbBrandLinkedin, TbBrandTwitter, TbBrandWhatsapp, TbBrandYoutube } from 'react-icons/tb';

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
    { key: 'facebook', icon: TbBrandFacebook, placeholder: 'Facebook profile URL' },
    { key: 'instagram', icon: TbBrandInstagram, placeholder: 'Instagram profile URL' },
    { key: 'twitter', icon: TbBrandTwitter, placeholder: 'Twitter profile URL' },
    { key: 'linkedin', icon: TbBrandLinkedin, placeholder: 'LinkedIn profile URL' },
    { key: 'youtube', icon: TbBrandYoutube, placeholder: 'YouTube channel URL' },
    { key: 'whatsapp', icon: TbBrandWhatsapp, placeholder: 'WhatsApp number with country code' }
];

const SocialMediaTab: React.FC<SocialMediaTabProps> = ({ scrollRef, socialMedia, setSocialMedia }) => {
    const t = useTranslations('BusinessSettings');
    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('socialMedia')}</Title>
            <Button
                type="link"
                icon={<LuPlus />}
                style={{ float: 'right', marginTop: '-28px' }}
                onClick={() => {
                    let newKey = '';
                    let counter = 1;
                    while (newKey in socialMedia) {
                        newKey = `${counter}`;
                        counter++;
                    }
                    setSocialMedia({ ...socialMedia, [newKey]: '' });
                }}
            >
                {t('addPlatform')}
            </Button>
            <Divider />

            <Flex vertical gap={16}>
                {/* Default social media platforms */}
                {defaultPlatforms.map(({ key, icon: Icon, placeholder }) => {
                    const value = socialMedia[key] || '';
                    return (
                        <Flex key={key} gap={8}>
                            <Text style={{ minWidth: 150, textTransform: 'capitalize' }}>{key}</Text>
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
                    );
                })}

                {/* Custom social media platforms */}
                {Object.entries(socialMedia)
                    .filter(([key]) => !defaultPlatforms.map(p => p.key).includes(key))
                    .map(([key, value]) => (
                        <Flex key={key} gap={8}>
                            <Input
                                allowClear
                                style={{ minWidth: 150 }}
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
                            <Input
                                allowClear
                                placeholder={t('profileUrl')}
                                value={value}
                                onChange={(e) => {
                                    setSocialMedia({
                                        ...socialMedia,
                                        [key]: e.target.value
                                    });
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
                    ))}
            </Flex>
        </Card>
    );
};

export default SocialMediaTab;
