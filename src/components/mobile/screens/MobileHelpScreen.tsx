'use client'

import { Card, Collapse, List, NavBar, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuBookOpen, LuBug, LuMail, LuMessageCircle } from 'react-icons/lu';

interface MobileHelpScreenProps {
    onBack: () => void;
}

const FAQ_ITEMS = [
    { key: '1', question: 'How do I upgrade my subscription?', answer: 'Go to More → Billing → tap "Upgrade Plan" and select your new plan.' },
    { key: '2', question: 'What file formats are supported for menu uploads?', answer: 'We support JPG, PNG, and PDF formats for menu uploads.' },
    { key: '3', question: 'How long does it take to process a menu?', answer: 'A standard menu is typically processed within 2 minutes. Larger menus may take slightly longer.' },
    { key: '4', question: 'Can I edit the menu after it has been digitized?', answer: 'Yes! Tap any item in the Menu tab to edit name, price, description, and availability.' },
    { key: '5', question: 'How do I share my digital menu?', answer: 'Go to More → Share & QR Code. You can copy the link, show the QR code, or download a PDF.' },
    { key: '6', question: 'Can staff see the same menu?', answer: 'Yes. Add staff in More → Staff, assign a role, and they can log in with their own account.' },
];

/**
 * Mobile Help Screen — zero desktop dependency
 * 
 * FAQ, contact info, support WhatsApp link.
 * For ticket submission, links to desktop (complex form with file attachments).
 */
export default function MobileHelpScreen({ onBack }: MobileHelpScreenProps) {
    const t = useTranslations('MobileHelp');
    const [showContact, setShowContact] = useState(false);

    const openWhatsApp = () => {
        window.open('https://wa.me/917042916884?text=Hi%2C%20I%20need%20help%20with%20MenuList.ai', '_blank');
    };

    const openEmail = () => {
        window.open('mailto:support@menulist.ai?subject=Help%20Request', '_blank');
    };

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="rounded-xl" onClick={openWhatsApp}>
                        <div className="flex flex-col items-center gap-2 py-2">
                            <LuMessageCircle size={24} className="text-green-500" />
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('whatsapp')}</p>
                            <p className="text-xs text-gray-500">{t('chatWithUs')}</p>
                        </div>
                    </Card>
                    <Card className="rounded-xl" onClick={openEmail}>
                        <div className="flex flex-col items-center gap-2 py-2">
                            <LuMail size={24} className="text-blue-500" />
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('email')}</p>
                            <p className="text-xs text-gray-500">support@menulist.ai</p>
                        </div>
                    </Card>
                </div>

                {/* FAQ */}
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {t('faq')}
                    </p>
                    <Card style={{ padding: 0 }} className="rounded-xl">
                        <Collapse accordion>
                            {FAQ_ITEMS.map((faq) => (
                                <Collapse.Panel key={faq.key} title={faq.question}>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{faq.answer}</p>
                                </Collapse.Panel>
                            ))}
                        </Collapse>
                    </Card>
                </div>

                {/* More Help Options */}
                <Card style={{ padding: 0 }} className="rounded-xl">
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        <List.Item
                            prefix={<LuBookOpen size={18} className="text-purple-500" />}
                            onClick={() => window.open('https://menulist.ai/help', '_blank')}
                            arrow
                            style={{ minHeight: '48px' }}
                        >
                            <span className="text-[15px]">{t('knowledgeBase')}</span>
                        </List.Item>
                        <List.Item
                            prefix={<LuBug size={18} className="text-orange-500" />}
                            description={t('ticketDesktopNote')}
                            onClick={() => Toast.show({ content: t('ticketDesktopToast'), duration: 3000 })}
                            arrow
                            style={{ minHeight: '48px' }}
                        >
                            <span className="text-[15px]">{t('submitTicket')}</span>
                        </List.Item>
                    </List>
                </Card>

                <p className="text-xs text-center text-gray-400 pt-1">
                    {t('businessHours')}
                </p>
            </div>
        </div>
    );
}
