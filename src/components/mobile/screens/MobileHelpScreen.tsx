'use client'

import { useTranslations } from 'next-intl';
import { LuBookOpen, LuBug, LuMail, LuMessageCircle } from 'react-icons/lu';
import { Card, Collapse, Flex, List, NavBar, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileHelpScreenProps {
    onBack: () => void;
}

const FAQ_ITEMS = [
    { key: '1', question: 'How do I upgrade my subscription?', answer: 'Go to More → Billing → tap &quot;Upgrade Plan&quot; and select your new plan.' },
    { key: '2', question: 'What file formats are supported for menu uploads?', answer: 'We support JPG, PNG, and PDF formats for menu uploads.' },
    { key: '3', question: 'How long does it take to process a menu?', answer: 'A standard menu is typically processed within 2 minutes. Larger menus may take slightly longer.' },
    { key: '4', question: 'Can I edit the menu after it has been digitized?', answer: 'Yes! Tap any item in the Menu tab to edit name, price, description, and availability.' },
    { key: '5', question: 'How do I share my digital menu?', answer: 'Go to More → Share & QR Code. You can copy the link, show the QR code, or download a PDF.' },
    { key: '6', question: 'Can staff see the same menu?', answer: 'Yes. Add staff in More → Staff, assign a role, and they can log in with their own account.' },
];

export default function MobileHelpScreen({ onBack }: MobileHelpScreenProps) {
    const t = useTranslations('MobileHelp');

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack}>{t('title')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle="Find quick answers, contact support, and open the help resources you need."
                    title={t('title')}
                />
                <Flex gap={12}>
                    <Card onClick={() => window.open('https://wa.me/917042916884?text=Hi%2C%20I%20need%20help%20with%20MenuList.ai', '_blank')} style={{ flex: 1 }}>
                        <Flex align="center" gap={8} vertical>
                            <LuMessageCircle color="#22c55e" size={24} />
                            <Text strong>{t('whatsapp')}</Text>
                            <Text type="secondary">{t('chatWithUs')}</Text>
                        </Flex>
                    </Card>
                    <Card onClick={() => window.open('mailto:support@menulist.ai?subject=Help%20Request', '_blank')} style={{ flex: 1 }}>
                        <Flex align="center" gap={8} vertical>
                            <LuMail color="#1677ff" size={24} />
                            <Text strong>{t('email')}</Text>
                            <Text type="secondary">support@menulist.ai</Text>
                        </Flex>
                    </Card>
                </Flex>

                <Card title={t('faq')}>
                    <Collapse accordion>
                        {FAQ_ITEMS.map((faq) => (
                            <Collapse.Panel key={faq.key} title={faq.question}>
                                <Text>{faq.answer}</Text>
                            </Collapse.Panel>
                        ))}
                    </Collapse>
                </Card>

                <Card>
                    <List>
                        <List.Item
                            arrow
                            onClick={() => window.open('https://menulist.ai/help', '_blank')}
                            prefix={<LuBookOpen color="#8b5cf6" size={18} />}
                            title={<Text strong>{t('knowledgeBase')}</Text>}
                        />
                        <List.Item
                            arrow
                            description={<Text type="secondary">{t('ticketDesktopNote')}</Text>}
                            onClick={() => Toast.show({ content: t('ticketDesktopToast'), duration: 3000 })}
                            prefix={<LuBug color="#f59e0b" size={18} />}
                            title={<Text strong>{t('submitTicket')}</Text>}
                        />
                    </List>
                </Card>

                <Card>
                    <Title level={5} style={{ margin: 0 }}>{t('businessHours')}</Title>
                </Card>
            </Flex>
        </Flex>
    );
}
