'use client'

import { Button, Flex, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { LuLifeBuoy, LuMail, LuMessageCircle, LuMessagesSquare, LuSparkles } from 'react-icons/lu';
import { HELP_CENTER_OPEN_AI_SEARCH_EVENT, HELP_CENTER_SELECT_TAB_EVENT } from './events';

const { Paragraph, Text } = Typography;

const SUPPORT_EMAIL = 'support@menulist.ai';
const PARTNERS_EMAIL = 'partners@menulist.ai';

const ContactUsView = () => {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();

    const goToTab = (tabKey: string) => {
        window.dispatchEvent(new CustomEvent(HELP_CENTER_SELECT_TAB_EVENT, { detail: { tabKey } }));
    };

    const openAssistant = () => {
        window.dispatchEvent(new CustomEvent(HELP_CENTER_OPEN_AI_SEARCH_EVENT));
    };

    const actionStyle: CSSProperties = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 12,
        padding: 16,
        background: token.colorBgContainer,
        minWidth: 0,
    };

    const iconBoxStyle: CSSProperties = {
        width: 40,
        height: 40,
        minWidth: 40,
        borderRadius: 10,
        background: token.colorPrimaryBg,
        color: token.colorPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    return (
        <Flex vertical gap={20}>
            <div>
                <Paragraph style={{ marginBottom: 4, color: token.colorTextSecondary }}>
                    {t('contactUsIntro')}
                </Paragraph>
                <Text type="secondary">{t('contactUsTrackableHint')}</Text>
            </div>

            <div
                className="help-center-contact-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 12,
                }}
            >
                <Flex vertical gap={14} style={actionStyle}>
                    <Flex gap={12} align="flex-start">
                        <span style={iconBoxStyle}><LuLifeBuoy size={20} /></span>
                        <Flex vertical gap={4}>
                            <Text strong>{t('contactTicketTitle')}</Text>
                            <Text type="secondary">{t('contactTicketDesc')}</Text>
                        </Flex>
                    </Flex>
                    <Button type="primary" size="large" block onClick={() => goToTab('ticket')}>
                        {t('contactTicketAction')}
                    </Button>
                </Flex>

                <Flex vertical gap={14} style={actionStyle}>
                    <Flex gap={12} align="flex-start">
                        <span style={iconBoxStyle}><LuMessageCircle size={20} /></span>
                        <Flex vertical gap={4}>
                            <Text strong>{t('contactAssistantTitle')}</Text>
                            <Text type="secondary">{t('contactAssistantDesc')}</Text>
                        </Flex>
                    </Flex>
                    <Button size="large" block onClick={openAssistant}>
                        {t('contactAssistantAction')}
                    </Button>
                </Flex>

                <Flex vertical gap={14} style={actionStyle}>
                    <Flex gap={12} align="flex-start">
                        <span style={iconBoxStyle}><LuMessagesSquare size={20} /></span>
                        <Flex vertical gap={4}>
                            <Text strong>{t('contactFeedbackTitle')}</Text>
                            <Text type="secondary">{t('contactFeedbackDesc')}</Text>
                        </Flex>
                    </Flex>
                    <Button size="large" block onClick={() => goToTab('feedback')}>
                        {t('contactFeedbackAction')}
                    </Button>
                </Flex>

                <Flex vertical gap={14} style={actionStyle}>
                    <Flex gap={12} align="flex-start">
                        <span style={iconBoxStyle}><LuMail size={20} /></span>
                        <Flex vertical gap={4}>
                            <Text strong>{t('contactEmailTitle')}</Text>
                            <Text type="secondary">{t('contactEmailDesc')}</Text>
                        </Flex>
                    </Flex>
                    <Button size="large" block href={`mailto:${SUPPORT_EMAIL}`}>
                        {SUPPORT_EMAIL}
                    </Button>
                </Flex>
            </div>

            <Flex
                gap={10}
                align="flex-start"
                style={{
                    padding: 14,
                    borderRadius: 12,
                    background: token.colorFillQuaternary,
                    border: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <LuSparkles size={18} color={token.colorPrimary} style={{ marginTop: 2, flexShrink: 0 }} />
                <Text type="secondary">
                    {t.rich('contactPartnershipNote', {
                        email: () => <a href={`mailto:${PARTNERS_EMAIL}`}>{PARTNERS_EMAIL}</a>,
                    })}
                </Text>
            </Flex>
        </Flex>
    );
};

export default ContactUsView;
