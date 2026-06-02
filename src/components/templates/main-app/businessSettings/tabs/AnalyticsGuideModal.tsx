'use client';

import { Button, List, Modal, Space, Steps, Tabs, Typography } from 'antd';
import React from 'react';
import { LuExternalLink, LuHelpCircle } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const { Step } = Steps;

interface AnalyticsGuideModalProps {
    open: boolean;
    onClose: () => void;
}

const QuickStartGuide = () => (
    <div style={{ padding: '16px 0' }}>
        <Steps direction="vertical" current={-1}>
            <Step
                title="Set Up Google Analytics"
                description={
                    <List size="small">
                        <List.Item>1. Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">analytics.google.com</a></List.Item>
                        <List.Item>2. Click &quot;Start measuring&quot;</List.Item>
                        <List.Item>3. Follow the setup wizard</List.Item>
                        <List.Item>4. Copy your Measurement ID (starts with &quot;G-&quot;)</List.Item>
                        <List.Item>5. Paste the ID in MenuList settings</List.Item>
                    </List>
                }
            />
            <Step
                title="Set Up Google Search Console"
                description={
                    <List size="small">
                        <List.Item>1. Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Search Console</a></List.Item>
                        <List.Item>2. Click &quot;Add Property&quot;</List.Item>
                        <List.Item>3. Enter your menu website URL</List.Item>
                        <List.Item>4. Choose &quot;HTML tag&quot; verification</List.Item>
                        <List.Item>5. Copy the meta tag content</List.Item>
                        <List.Item>6. Paste it in MenuList settings</List.Item>
                    </List>
                }
            />
            <Step
                title="Set Up Facebook Pixel"
                description={
                    <List size="small">
                        <List.Item>1. Go to <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer">Events Manager</a></List.Item>
                        <List.Item>2. Click &quot;Connect Data Sources&quot;</List.Item>
                        <List.Item>3. Select &quot;Web&quot; as your platform</List.Item>
                        <List.Item>4. Copy your Pixel ID</List.Item>
                        <List.Item>5. Paste the ID in MenuList settings</List.Item>
                    </List>
                }
            />
            <Step
                title="Enable Enhanced Features"
                description={
                    <List size="small">
                        <List.Item>1. Enable Enhanced E-commerce for detailed order tracking</List.Item>
                        <List.Item>2. Turn on Menu Item Views to see popular items</List.Item>
                        <List.Item>3. Enable Location Tracking for customer insights</List.Item>
                        <List.Item>4. Wait 24-48 hours for data to appear</List.Item>
                    </List>
                }
            />
        </Steps>
    </div>
);

const CompleteGuide = () => (
    <div style={{ padding: '16px 0' }}>
        <Title level={4}>Complete Analytics Guide</Title>

        <Title level={5}>Google Analytics Reports</Title>
        <List size="small">
            <List.Item>
                <Text strong>Real-Time Visitors</Text>
                <Paragraph>
                    Path: &quot;Reports&quot; &gt; &quot;Realtime&quot;
                    <br />
                    See current users, viewed items, and locations
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Menu Performance</Text>
                <Paragraph>
                    Path: &quot;Reports&quot; &gt; &quot;Engagement&quot; &gt; &quot;Events&quot;
                    <br />
                    Track views, cart adds, and purchases
                </Paragraph>
            </List.Item>
        </List>

        <Title level={5}>Search Console Features</Title>
        <List size="small">
            <List.Item>
                <Text strong>Search Performance</Text>
                <Paragraph>
                    See how customers find your menu in Google
                    <br />
                    Track clicks, impressions, and search terms
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Mobile Usability</Text>
                <Paragraph>
                    Ensure your menu works well on phones
                    <br />
                    Fix any mobile display issues
                </Paragraph>
            </List.Item>
        </List>

        <Title level={5}>Facebook Pixel Insights</Title>
        <List size="small">
            <List.Item>
                <Text strong>Customer Journey</Text>
                <Paragraph>
                    Track how customers interact with your menu
                    <br />
                    See which items interest them most
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Ad Performance</Text>
                <Paragraph>
                    Measure Facebook ad effectiveness
                    <br />
                    Track conversions and ROI
                </Paragraph>
            </List.Item>
        </List>

        <Title level={5}>Enhanced E-commerce Features</Title>
        <List size="small">
            <List.Item>
                <Text strong>Shopping Behavior</Text>
                <Paragraph>
                    View-to-purchase conversion rates
                    <br />
                    Cart abandonment analysis
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Menu Performance</Text>
                <Paragraph>
                    Most viewed and purchased items
                    <br />
                    Category performance metrics
                </Paragraph>
            </List.Item>
        </List>

        <Title level={5}>Location Analytics</Title>
        <List size="small">
            <List.Item>
                <Text strong>Geographic Distribution</Text>
                <Paragraph>
                    Customer locations and patterns
                    <br />
                    Regional preferences and trends
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Time Zone Analysis</Text>
                <Paragraph>
                    Peak ordering times by region
                    <br />
                    Optimize business hours
                </Paragraph>
            </List.Item>
        </List>

        <Title level={5}>Help Resources</Title>

        <Title level={5} style={{ marginTop: '16px' }}>Google Analytics</Title>
        <Space direction="vertical">
            <Button type="link" icon={<LuExternalLink />} href="https://support.google.com/analytics" target="_blank" rel="noopener noreferrer">
                Google Analytics Help Center
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://analytics.google.com/analytics/academy" target="_blank" rel="noopener noreferrer">
                Analytics Academy (Free Courses)
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://support.google.com/analytics/answer/9304153" target="_blank" rel="noopener noreferrer">
                E-commerce Tracking Guide
            </Button>
        </Space>

        <Title level={5} style={{ marginTop: '16px' }}>Google Search Console</Title>
        <Space direction="vertical">
            <Button type="link" icon={<LuExternalLink />} href="https://support.google.com/webmasters" target="_blank" rel="noopener noreferrer">
                Search Console Help Center
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://developers.google.com/search/docs" target="_blank" rel="noopener noreferrer">
                SEO Best Practices Guide
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://support.google.com/webmasters/answer/9128668" target="_blank" rel="noopener noreferrer">
                Performance Report Guide
            </Button>
        </Space>

        <Title level={5} style={{ marginTop: '16px' }}>Facebook Pixel</Title>
        <Space direction="vertical">
            <Button type="link" icon={<LuExternalLink />} href="https://www.facebook.com/business/help/952192354843755" target="_blank" rel="noopener noreferrer">
                Facebook Pixel Setup Guide
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://www.facebook.com/business/help/402791146561655" target="_blank" rel="noopener noreferrer">
                Events Manager Guide
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://www.facebook.com/business/help/1021909254506499" target="_blank" rel="noopener noreferrer">
                Conversion Tracking Guide
            </Button>
        </Space>

        <Title level={5} style={{ marginTop: '16px' }}>Enhanced E-commerce</Title>
        <Space direction="vertical">
            <Button type="link" icon={<LuExternalLink />} href="https://developers.google.com/analytics/devguides/collection/ga4/ecommerce" target="_blank" rel="noopener noreferrer">
                GA4 E-commerce Implementation
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://support.google.com/analytics/answer/9268036" target="_blank" rel="noopener noreferrer">
                E-commerce Reports Guide
            </Button>
        </Space>

        <Title level={5} style={{ marginTop: '16px' }}>MenuListAI Support</Title>
        <Space direction="vertical">
            <Button type="link" icon={<LuExternalLink />} href="mailto:support@menulistai.com" rel="noopener noreferrer">
                Contact Support Team
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://docs.menulistai.com/analytics" rel="noopener noreferrer">
                MenuListAI Analytics Docs
            </Button>
        </Space>
    </div>
);

const AnalyticsGuideModal: React.FC<AnalyticsGuideModalProps> = ({ open, onClose }) => {
    return (
        <Modal
            title={
                <Space>
                    <LuHelpCircle />
                    <span>Analytics Guide</span>
                </Space>
            }
            open={open}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="close" onClick={onClose}>
                    Close
                </Button>
            ]}
        >
            <Tabs
                defaultActiveKey="quick"
                items={[
                    {
                        key: 'quick',
                        label: 'Quick Start Guide',
                        children: (
                            <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                                <QuickStartGuide />
                            </div>
                        ),
                    },
                    {
                        key: 'complete',
                        label: 'Complete Guide',
                        children: (
                            <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                                <CompleteGuide />
                            </div>
                        ),
                    },
                ]}
            />
        </Modal>
    );
};

export default AnalyticsGuideModal;
