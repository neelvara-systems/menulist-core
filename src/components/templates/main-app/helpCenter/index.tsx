'use client'
import { Card, Flex, Typography } from 'antd';
import { useMemo, useState } from 'react';
import HeroSearchBar from './HeroSearchBar';
import LandingPage from './landing';
import MainSectionTabs from './MainSectionTabs';
import { DEFAULT_HOME_TAB, HELP_CENTER_TABS, HOME_TAB_KEY } from './tabsConfig';

const { Title } = Typography;

function HelpCenter() {
    const [activeKey, setActiveKey] = useState<string>(HOME_TAB_KEY);

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

    return (
        <Card style={cardStyle} styles={{ body: cardBodyStyle }}>
            <Flex vertical align='center' gap={24} style={flexStyle}>
                <HeroSearchBar activeTab={activeKey} setActiveTab={setActiveKey} />
                {activeKey === HOME_TAB_KEY ?
                    <>
                        {/* <GettingStarted /> */}
                        <MainSectionTabs activeKey={activeKey} onSelect={setActiveKey} />
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
                                {activeKey !== "changelog" && <Title level={4} style={titleStyle}>{activeTab?.title ?? DEFAULT_HOME_TAB.title}</Title>}
                                {activeTab?.render}
                            </Card>
                        )}
                    </div>}
            </Flex>
        </Card>
    );
}

export default HelpCenter;