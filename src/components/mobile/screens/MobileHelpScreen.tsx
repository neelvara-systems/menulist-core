'use client'

import { CANONICA_ROUTES } from '@constant/canonica/navigations';
import { useTranslations } from 'next-intl';
import { LuBookOpen, LuHelpCircle, LuReceipt, LuTicket } from 'react-icons/lu';
import { Card, Flex, List, Text } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileHelpScreenProps {
    onBack: () => void;
}

export default function MobileHelpScreen({ onBack }: MobileHelpScreenProps) {
    const t = useTranslations('MobileHelp');

    const openCanonicaRoute = (path: string) => {
        window.location.assign(path);
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="MenuList support now opens through Canonica."
                onBack={onBack}
                title={t('title')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card title="Canonica">
                    <List>
                        <List.Item
                            arrow
                            description={<Text type="secondary">Open the Canonica support overview.</Text>}
                            onClick={() => openCanonicaRoute(CANONICA_ROUTES.HELP)}
                            prefix={<LuHelpCircle color="#3b82f6" size={18} />}
                            title={<Text strong>{t('title')}</Text>}
                        />
                        <List.Item
                            arrow
                            description={<Text type="secondary">Browse docs and guides for MenuList.</Text>}
                            onClick={() => openCanonicaRoute(CANONICA_ROUTES.DOCS)}
                            prefix={<LuBookOpen color="#8b5cf6" size={18} />}
                            title={<Text strong>{t('knowledgeBase')}</Text>}
                        />
                        <List.Item
                            arrow
                            description={<Text type="secondary">Create or track a support request.</Text>}
                            onClick={() => openCanonicaRoute(CANONICA_ROUTES.SUPPORT)}
                            prefix={<LuTicket color="#f59e0b" size={18} />}
                            title={<Text strong>{t('submitTicket')}</Text>}
                        />
                        <List.Item
                            arrow
                            description={<Text type="secondary">See recent product updates.</Text>}
                            onClick={() => openCanonicaRoute(CANONICA_ROUTES.RELEASE_NOTES)}
                            prefix={<LuReceipt color="#0ea5e9" size={18} />}
                            title={<Text strong>Release Notes</Text>}
                        />
                    </List>
                </Card>
            </Flex>
        </Flex>
    );
}
