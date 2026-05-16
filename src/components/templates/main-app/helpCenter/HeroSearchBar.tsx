'use client'

import AnimatedGradientBubbles from '@atoms/AnimatedGradientBubbles';
import { APP_THEME_COLOR } from '@constant/common';
import { Breadcrumb, Button, Flex, Input, Typography, theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import HelpChat from '../helpChat';
import { HELP_CENTER_OPEN_AI_SEARCH_EVENT } from './events';
import { HELP_CENTER_TABS, HOME_TAB_KEY } from './tabsConfig';

const { Paragraph } = Typography;

const HeroSearchBar = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (key: string) => void }) => {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();
    const [showAISearchModal, setShowAISearchModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const primaryColor = mounted ? token.colorPrimary : APP_THEME_COLOR;
    const primaryBg = mounted ? token.colorPrimaryBg : '#eef6ff';
    const elevatedBg = mounted ? token.colorBgElevated : '#ffffff';

    // Get current tab info for breadcrumb
    const currentTab = HELP_CENTER_TABS.find(tab => tab.key === activeTab);
    const productContext = useMemo(() => {
        const normalizedTab = activeTab || HOME_TAB_KEY;
        const workflowByTab: Record<string, string> = {
            [HOME_TAB_KEY]: 'search_help',
            kb: 'browse_knowledge_base',
            ticket: 'submit_ticket',
            feedback: 'submit_feedback',
            faq: 'read_faq',
            contact: 'contact_support',
            changelog: 'view_changelog',
        };

        return {
            contextVersion: 1,
            feature: 'help_center',
            page: normalizedTab === HOME_TAB_KEY ? 'help_center_home' : `help_center_${normalizedTab}`,
            workflow: workflowByTab[normalizedTab] || 'search_help',
            entityHints: normalizedTab === HOME_TAB_KEY ? ['help_center'] : ['help_center', normalizedTab],
        };
    }, [activeTab]);

    // Keyboard shortcut: Ctrl+/ or Cmd+/ to open AI search (changed from Cmd+K to avoid conflict with settings)
    useEffect(() => {
        setMounted(true);

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                setShowAISearchModal(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleOpenAISearch = () => setShowAISearchModal(true);

        window.addEventListener(HELP_CENTER_OPEN_AI_SEARCH_EVENT, handleOpenAISearch);
        return () => window.removeEventListener(HELP_CENTER_OPEN_AI_SEARCH_EVENT, handleOpenAISearch);
    }, []);

    return (
        <>
            <motion.div
                className="help-center-hero-search"
                data-active-tab={activeTab}
                layout
                style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: token.borderRadiusLG,
                    overflow: 'hidden',
                }}
                initial={false}
                animate={{
                    padding: activeTab === 'home' ? '48px 24px' : '0px',
                    background: activeTab === 'home' ? `linear-gradient(90deg, ${primaryBg} 0%, ${elevatedBg} 100%)` : 'linear-gradient(90deg, transparent 0%, transparent 100%)',
                }}
                transition={{
                    duration: 0.6,
                    ease: [0.32, 0.72, 0, 1],
                    padding: {
                        duration: activeTab === 'home' ? 0.6 : 0.3,
                        ease: activeTab === 'home' ? [0.25, 0.46, 0.45, 0.94] : [0.32, 0.72, 0, 1]
                    }
                }}
            >
                {mounted && activeTab === 'home' && (
                    <AnimatedGradientBubbles colors={[`${primaryColor}40`, `${primaryColor}20`, `${primaryColor}10`]} count={10} speed="fast" />
                )}

                <motion.div
                    layout
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    style={{ width: '100%', position: 'relative', zIndex: 1 }}
                >
                    <Flex
                        vertical={true}
                        gap={activeTab === 'home' ? 12 : 0}
                        justify='center'
                        align={activeTab === 'home' ? 'center' : 'flex-end'}
                        style={{
                            transition: 'align-items 0.5s cubic-bezier(0.32, 0.72, 0, 1), gap 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
                        }}
                    >
                        <AnimatePresence>
                            {activeTab === 'home' && (
                                <motion.div
                                    key="hero-text"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                        duration: 0.5,
                                        ease: [0.32, 0.72, 0, 1],
                                        exit: {
                                            opacity: { duration: 0.15 },
                                            height: { duration: 0.25, ease: [0.32, 0.72, 0, 1] }
                                        }
                                    }}
                                    style={{
                                        textAlign: 'center',
                                        overflow: 'hidden',
                                        width: '100%',
                                        alignSelf: 'center'
                                    }}
                                >
                                    <h2 style={{ margin: 0, fontSize: token.fontSizeHeading2, fontWeight: 600, lineHeight: token.lineHeightHeading2 }}>
                                        {t('heroTitle')} <span style={{
                                            backgroundImage: `linear-gradient(90deg, ${primaryColor} 0%, ${APP_THEME_COLOR} 100%)`,
                                            WebkitBackgroundClip: 'text',
                                            backgroundClip: 'text',
                                            color: 'transparent',
                                            fontSize: token.fontSizeHeading2,
                                            fontWeight: 600,
                                            lineHeight: token.lineHeightHeading2
                                        }}>{t('heroTitleHighlight')}</span>
                                    </h2>
                                    <Paragraph style={{ marginTop: 8, marginBottom: 0, color: token.colorTextSecondary }}>
                                        {t('heroSubtitle')}
                                    </Paragraph>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div
                            className="help-center-search-width"
                            layout
                            animate={{
                                width: activeTab === 'home' ? 720 : 600,
                            }}
                            transition={{
                                duration: 0.6,
                                ease: [0.32, 0.72, 0, 1],
                                width: {
                                    duration: activeTab === 'home' ? 0.6 : 0.5,
                                    ease: activeTab === 'home' ? [0.25, 0.46, 0.45, 0.94] : [0.32, 0.72, 0, 1]
                                },
                                layout: {
                                    duration: 0.6,
                                    ease: [0.32, 0.72, 0, 1]
                                }
                            }}
                            style={{
                                zIndex: 2,
                                maxWidth: '100%',
                                minWidth: 0,
                            }}
                        >
                            <Input
                                readOnly
                                className="help-center-search-control"
                                size="large"
                                placeholder={t('searchPlaceholder')}
                                aria-label="Search help center"
                                prefix={<LuSearch className="help-center-search-icon" size={18} color={token.colorTextPlaceholder} aria-hidden="true" />}
                                suffix={(
                                    <span className="help-center-search-control-suffix">
                                        <span
                                            className="help-center-search-shortcut"
                                            aria-hidden="true"
                                        >
                                            <kbd style={{
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                background: token.colorBgElevated,
                                                border: `1px solid ${token.colorBorder}`,
                                                fontSize: 10
                                            }}>⌘K</kbd>
                                        </span>
                                        <Button
                                            className="help-center-search-button"
                                            size="large"
                                            style={{
                                                height: activeTab === 'home' ? 40 : 30,
                                                fontSize: activeTab === 'home' ? 14 : 12,
                                                paddingLeft: 16,
                                                paddingRight: 16,
                                                borderRadius: activeTab === 'home' ? 10 : 7,
                                                border: 'none',
                                                background: `linear-gradient(135deg, ${primaryColor} 0%, ${APP_THEME_COLOR} 100%)`,
                                                color: '#ffffff',
                                                boxShadow: activeTab === 'home' ? `0 8px 18px ${primaryColor}59` : 'none',
                                                transition: 'all 0.5s ease'
                                            }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setShowAISearchModal(true);
                                            }}
                                            onMouseDown={(event) => event.preventDefault()}
                                        >
                                            {t('search')}
                                        </Button>
                                    </span>
                                )}
                                onClick={() => setShowAISearchModal(true)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowAISearchModal(true) }}
                                style={{
                                    width: '100%',
                                    background: token.colorBgContainer,
                                    borderRadius: activeTab === 'home' ? 12 : 10,
                                    border: `1px solid ${token.colorBorder}`,
                                    boxShadow: activeTab === 'home' ? '0 20px 40px rgba(2,6,23,0.08)' : 'none',
                                    height: activeTab === 'home' ? 48 : 38,
                                    padding: '3px 3px 3px 12px',
                                    transition: 'all 0.5s ease',
                                    cursor: 'pointer'
                                }}
                            />
                        </motion.div>
                    </Flex>
                </motion.div>

                <AnimatePresence>
                    {activeTab !== 'home' && currentTab && (
                        <motion.div
                            className="help-center-tab-crumbs"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                        >
                            <Flex align="center" gap={16}>
                                <Breadcrumb
                                    separator=">"
                                    items={[
                                        {
                                            title: (
                                                <a
                                                    onClick={() => setActiveTab(HOME_TAB_KEY)}
                                                    style={{
                                                        color: token.colorPrimary,
                                                        cursor: 'pointer',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    <span className="help-center-breadcrumb-home-desktop">{t('breadcrumbHome')}</span>
                                                    <span className="help-center-breadcrumb-home-mobile" style={{ display: 'none' }}>{t('home')}</span>
                                                </a>
                                            ),
                                        },
                                        {
                                            title: (
                                                <span style={{
                                                    color: token.colorText,
                                                    fontWeight: 600
                                                }}>
                                                    {currentTab.title}
                                                </span>
                                            ),
                                        },
                                    ]}
                                    style={{ fontSize: 14 }}
                                />
                            </Flex>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            <HelpChat
                open={showAISearchModal}
                onClose={() => setShowAISearchModal(false)}
                productContext={productContext}
            />
        </>
    );
};

export default HeroSearchBar;
