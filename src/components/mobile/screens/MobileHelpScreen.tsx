'use client'

import HelpCenter from '@template/main-app/helpCenter';
import { HELP_CENTER_TABS, HOME_TAB_KEY } from '@template/main-app/helpCenter/tabsConfig';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { LuHelpCircle } from 'react-icons/lu';
import { Flex, Text } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileHelpScreenProps {
    initialTab?: string;
    onBack: () => void;
}

const VALID_HELP_CENTER_TABS = new Set([HOME_TAB_KEY, ...HELP_CENTER_TABS.map((tab) => tab.key)]);

function normalizeHelpCenterTab(tab?: string | null) {
    return tab && VALID_HELP_CENTER_TABS.has(tab) ? tab : HOME_TAB_KEY;
}

export default function MobileHelpScreen({ initialTab, onBack }: MobileHelpScreenProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const activeTab = useMemo(
        () => normalizeHelpCenterTab(requestedTab || initialTab),
        [initialTab, requestedTab],
    );

    useEffect(() => {
        const nextPath = activeTab === HOME_TAB_KEY ? '/help-center' : `/help-center?tab=${activeTab}`;
        const currentPath = `${window.location.pathname}${window.location.search}`;

        if (currentPath !== nextPath) {
            router.replace(`${nextPath}${window.location.hash}`, { scroll: false });
        }
    }, [activeTab, router]);

    const handleBack = () => {
        window.history.replaceState(null, '', '/dashboard#mobile/more');
        router.replace('/dashboard#mobile/more', { scroll: false });
        onBack();
    };

    return (
        <Flex style={{ minHeight: '100%', minWidth: 0 }} vertical>
            <MobileSettingsScreenHeader
                description="Search docs, check updates, and contact support."
                infoContent={(
                    <Flex gap={4} style={{ maxWidth: 240 }} vertical>
                        <Text strong>Help Center</Text>
                        <Text type="secondary">Use the back arrow to return to MenuList.</Text>
                    </Flex>
                )}
                onBack={handleBack}
                right={<LuHelpCircle color="#3b82f6" size={18} />}
                title="Help Center"
            />
            <div
                data-mobile-help-center
                style={{
                    maxWidth: '100%',
                    minWidth: 0,
                    overflowX: 'hidden',
                    padding: 12,
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <style jsx global>{`
                    [data-mobile-help-center] {
                        width: 100%;
                    }

                    [data-mobile-help-center] .ant-layout {
                        background: transparent !important;
                        min-height: auto !important;
                    }

                    [data-mobile-help-center] .ant-card {
                        border-radius: 8px;
                        max-width: 100% !important;
                        min-width: 0 !important;
                        width: 100%;
                    }

                    [data-mobile-help-center] > .ant-card {
                        background: transparent !important;
                        border: 0 !important;
                        box-shadow: none !important;
                    }

                    [data-mobile-help-center] > .ant-card > .ant-card-body {
                        padding: 0 !important;
                    }

                    [data-mobile-help-center] > .ant-card > .ant-card-body > .ant-flex {
                        gap: 16px !important;
                    }

                    [data-mobile-help-center] .ant-card-body,
                    [data-mobile-help-center] .ant-card-head {
                        min-width: 0;
                        padding-left: 12px !important;
                        padding-right: 12px !important;
                    }

                    [data-mobile-help-center] .ant-row {
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                        row-gap: 12px;
                    }

                    [data-mobile-help-center] .ant-col {
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                    }

                    [data-mobile-help-center] .ant-flex,
                    [data-mobile-help-center] .ant-space,
                    [data-mobile-help-center] .ant-form,
                    [data-mobile-help-center] .ant-list,
                    [data-mobile-help-center] .ant-collapse,
                    [data-mobile-help-center] .ant-steps {
                        max-width: 100%;
                        min-width: 0;
                    }

                    [data-mobile-help-center] .ant-space,
                    [data-mobile-help-center] .ant-form .ant-flex,
                    [data-mobile-help-center] .ant-list-item,
                    [data-mobile-help-center] .ant-steps {
                        flex-wrap: wrap;
                    }

                    [data-mobile-help-center] .ant-table-wrapper,
                    [data-mobile-help-center] .ant-table-content,
                    [data-mobile-help-center] .ant-segmented,
                    [data-mobile-help-center] .ant-tabs-nav,
                    [data-mobile-help-center] .ant-upload-wrapper,
                    [data-mobile-help-center] .ant-upload-list,
                    [data-mobile-help-center] .ant-upload-list-item {
                        max-width: 100%;
                        overflow-x: auto;
                    }

                    [data-mobile-help-center] .ant-input-affix-wrapper,
                    [data-mobile-help-center] .ant-input,
                    [data-mobile-help-center] .ant-select,
                    [data-mobile-help-center] .ant-picker,
                    [data-mobile-help-center] textarea {
                        max-width: 100%;
                        min-width: 0;
                    }

                    [data-mobile-help-center] .ant-btn,
                    [data-mobile-help-center] [role="button"] {
                        min-height: 44px;
                    }

                    [data-mobile-help-center] .ant-typography,
                    [data-mobile-help-center] p,
                    [data-mobile-help-center] span,
                    [data-mobile-help-center] a,
                    [data-mobile-help-center] button {
                        overflow-wrap: anywhere;
                        white-space: normal;
                    }

                    [data-mobile-help-center] h1,
                    [data-mobile-help-center] .ant-typography h1 {
                        font-size: 24px;
                        line-height: 1.25;
                    }

                    [data-mobile-help-center] h2,
                    [data-mobile-help-center] .ant-typography h2 {
                        font-size: 22px;
                        line-height: 1.3;
                    }

                    [data-mobile-help-center] h3,
                    [data-mobile-help-center] .ant-typography h3 {
                        font-size: 20px;
                        line-height: 1.35;
                    }

                    [data-mobile-help-center] h4,
                    [data-mobile-help-center] .ant-typography h4 {
                        font-size: 18px;
                        line-height: 1.35;
                    }

                    [data-mobile-help-center] .help-center-hero-search[data-active-tab="home"] {
                        padding: 20px 12px !important;
                    }

                    [data-mobile-help-center] .help-center-hero-search[data-active-tab="home"] h2,
                    [data-mobile-help-center] .help-center-hero-search[data-active-tab="home"] h2 span {
                        font-size: 28px !important;
                        line-height: 1.15 !important;
                    }

                    [data-mobile-help-center] .help-center-hero-search:not([data-active-tab="home"]) {
                        min-height: 88px;
                        padding: 0 !important;
                    }

                    [data-mobile-help-center] .help-center-search-width {
                        width: 100% !important;
                    }

                    [data-mobile-help-center] .help-center-search-control.ant-input-affix-wrapper {
                        align-items: center;
                        border-radius: 10px !important;
                        box-shadow: none !important;
                        cursor: pointer;
                        height: 44px !important;
                        min-height: 44px;
                        padding: 2px 3px 2px 12px !important;
                    }

                    [data-mobile-help-center] .help-center-search-control .ant-input-prefix {
                        align-items: center;
                        display: inline-flex;
                        margin-inline-end: 8px;
                    }

                    [data-mobile-help-center] .help-center-search-icon {
                        height: 16px;
                        width: 16px;
                    }

                    [data-mobile-help-center] .help-center-search-control .ant-input {
                        background: transparent;
                        font-size: 13px !important;
                        height: 100%;
                        line-height: 20px;
                        overflow: hidden;
                        padding: 0 !important;
                        text-overflow: ellipsis;
                    }

                    [data-mobile-help-center] .help-center-search-control-suffix {
                        align-items: center;
                        display: inline-flex;
                        flex-shrink: 0;
                        gap: 6px;
                    }

                    [data-mobile-help-center] .help-center-search-shortcut {
                        display: none !important;
                    }

                    [data-mobile-help-center] .help-center-search-button {
                        border-radius: 9px !important;
                        flex: 0 0 86px;
                        font-size: 13px !important;
                        height: 40px !important;
                        min-height: 40px !important;
                        min-width: 82px;
                        padding-left: 10px !important;
                        padding-right: 10px !important;
                    }

                    [data-mobile-help-center] .help-center-tab-crumbs {
                        position: static !important;
                        width: 100%;
                        margin-bottom: 8px;
                    }

                    [data-mobile-help-center] .help-center-tab-crumbs .ant-flex {
                        gap: 8px !important;
                    }

                    [data-mobile-help-center] .help-center-breadcrumb-home-desktop {
                        display: none !important;
                    }

                    [data-mobile-help-center] .help-center-breadcrumb-home-mobile {
                        display: inline !important;
                    }

                    [data-mobile-help-center] .help-center-tab-crumbs .ant-breadcrumb {
                        display: block;
                        font-size: 13px;
                        line-height: 1.35;
                    }

                    [data-mobile-help-center] .help-center-tab-crumbs .ant-breadcrumb-link,
                    [data-mobile-help-center] .help-center-tab-crumbs .ant-breadcrumb-separator {
                        display: inline-flex;
                        align-items: center;
                        min-height: 32px;
                    }

                    [data-mobile-help-center] .changelog-mobile-search-input.ant-input-affix-wrapper {
                        align-items: center;
                        border-radius: 10px !important;
                        height: 44px;
                        min-height: 44px;
                        padding: 0 12px !important;
                    }

                    [data-mobile-help-center] .changelog-mobile-search-input .ant-input-prefix {
                        align-items: center;
                        display: inline-flex;
                        margin-inline-end: 8px;
                    }

                    [data-mobile-help-center] .changelog-mobile-search-input .ant-input-prefix svg {
                        height: 16px;
                        width: 16px;
                    }

                    [data-mobile-help-center] .changelog-mobile-search-input .ant-input {
                        background: transparent;
                        font-size: 13px !important;
                        line-height: 20px;
                        padding: 0 !important;
                    }
                `}</style>
                <HelpCenter />
            </div>
        </Flex>
    );
}
