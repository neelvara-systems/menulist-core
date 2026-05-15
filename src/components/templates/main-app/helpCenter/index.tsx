'use client'
import { Card, Flex, Typography } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import HeroSearchBar from './HeroSearchBar';
import { HELP_CENTER_SELECT_TAB_EVENT, type HelpCenterSelectTabEventDetail } from './events';
import LandingPage from './landing';
import MainSectionTabs from './MainSectionTabs';
import { DEFAULT_HOME_TAB, HELP_CENTER_TABS, HOME_TAB_KEY } from './tabsConfig';

const { Title } = Typography;

function HelpCenter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const requestedTabIsValid = requestedTab === HOME_TAB_KEY || HELP_CENTER_TABS.some(tab => tab.key === requestedTab);
    const [activeKey, setActiveKey] = useState<string>(requestedTab && requestedTabIsValid ? requestedTab : HOME_TAB_KEY);

    const activeTab = useMemo(() => HELP_CENTER_TABS.find(tab => tab.key === activeKey) || null, [activeKey]);

    // Memoize styles to prevent re-renders
    const cardStyle = useMemo(() => ({ height: '100%' }), []);
    const cardBodyStyle = useMemo(() => ({ padding: activeKey === HOME_TAB_KEY ? 24 : 12 }), [activeKey]);
    const flexStyle = useMemo(() => ({ height: '100%' }), []);
    const mainSectionStyle = useMemo(() => ({ marginTop: 24, width: '100%', margin: 'auto' }), []);
    const ticketContainerStyle = useMemo(() => ({ width: '100%' }), []);
    const tabCardStyle = useMemo(() => ({ 
        width: '100%', 
        maxWidth: activeTab?.maxWidth ?? '100%', 
        margin: 'auto' 
    }), [activeTab?.maxWidth]);
    const titleStyle = useMemo(() => ({ marginBottom: 24 }), []);
    const shouldShowTabTitle = activeKey !== "changelog" && activeKey !== "kb";

    useEffect(() => {
        if (requestedTabIsValid && requestedTab) {
            setActiveKey(requestedTab);
            return;
        }

        if (requestedTab && !requestedTabIsValid) {
            setActiveKey(HOME_TAB_KEY);
            router.replace(pathname, { scroll: false });
        }
    }, [pathname, requestedTab, requestedTabIsValid, router]);

    const handleTabChange = useCallback((nextKey: string) => {
        setActiveKey(nextKey);
        router.replace(nextKey === HOME_TAB_KEY ? pathname : `${pathname}?tab=${nextKey}`, { scroll: false });
    }, [pathname, router]);

    useEffect(() => {
        const handleSelectTab = (event: Event) => {
            const nextKey = (event as CustomEvent<HelpCenterSelectTabEventDetail>).detail?.tabKey;

            if (!nextKey || (nextKey !== HOME_TAB_KEY && !HELP_CENTER_TABS.some(tab => tab.key === nextKey))) {
                return;
            }

            handleTabChange(nextKey);
        };

        window.addEventListener(HELP_CENTER_SELECT_TAB_EVENT, handleSelectTab);
        return () => window.removeEventListener(HELP_CENTER_SELECT_TAB_EVENT, handleSelectTab);
    }, [handleTabChange]);

    return (
        <Card style={cardStyle} styles={{ body: cardBodyStyle }}>
            <Flex vertical align='center' gap={24} style={flexStyle}>
                <HeroSearchBar activeTab={activeKey} setActiveTab={handleTabChange} />
                {activeKey === HOME_TAB_KEY ?
                    <>
                        {/* <GettingStarted /> */}
                        <MainSectionTabs activeKey={activeKey} onSelect={handleTabChange} />
                        <LandingPage />
                    </>
                    :
                    <div style={mainSectionStyle}>
                        {activeKey === "ticket" ? (
                            // No parent Card for ticket view - it has its own cards
                            <div style={ticketContainerStyle}>
                                {activeTab?.render}
                            </div>
                        ) : (
                            <Card style={tabCardStyle}>
                                {shouldShowTabTitle && <Title level={4} style={titleStyle}>{activeTab?.title ?? DEFAULT_HOME_TAB.title}</Title>}
                                {activeTab?.render}
                            </Card>
                        )}
                    </div>}
            </Flex>
        </Card>
    );
}

export default HelpCenter;
