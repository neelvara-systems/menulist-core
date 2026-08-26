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
                title="Review MenuList Tracking"
                description={
                    <List size="small">
                        <List.Item>1. Review each tracking category in MenuList</List.Item>
                        <List.Item>2. Keep approximate location off unless you need coarse regional reporting</List.Item>
                        <List.Item>3. Add only the external analytics IDs you actively use</List.Item>
                        <List.Item>4. Save changes on the settings page</List.Item>
                    </List>
                }
            />
        </Steps>
    </div>
);

const CompleteGuide = () => (
    <div style={{ padding: '16px 0' }}>
        <Title level={4}>Complete Analytics Guide</Title>

        <Title level={5}>What MenuList Tracks</Title>
        <List size="small">
            <List.Item>
                <Text strong>Menu activity</Text>
                <Paragraph>
                    Menu opens, item detail opens, search demand, unavailable-item taps,
                    final menu actions, entry source, and anonymous session totals.
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Featured choices</Text>
                <Paragraph>
                    Impressions and taps when the Featured section appears.
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Official Business Page and Customer App</Text>
                <Paragraph>
                    Public-page views and actions, owner shares, plus customer-app prompt,
                    install, open, and shortcut events.
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Approximate location (optional)</Text>
                <Paragraph>
                    Rounded location or timezone-region information when enabled; never exact GPS.
                </Paragraph>
            </List.Item>
        </List>

        <Title level={5}>External Analytics Tools</Title>
        <List size="small">
            <List.Item>
                <Text strong>Google Analytics</Text>
                <Paragraph>
                    Add your GA4 Measurement ID if you want MenuList public-page events sent to your Google Analytics property.
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Google Search Console</Text>
                <Paragraph>
                    Add the verification tag to prove ownership and monitor your public link&apos;s search presence.
                </Paragraph>
            </List.Item>
            <List.Item>
                <Text strong>Meta Pixel</Text>
                <Paragraph>
                    Add your Pixel ID only if you actively use Meta advertising and want public-page activity sent to that provider.
                </Paragraph>
            </List.Item>
        </List>

        <Paragraph>
            MenuList analytics does not collect customer names, emails, payment details, purchases, or exact GPS locations.
        </Paragraph>

        <Title level={5}>Help Resources</Title>

        <Title level={5} style={{ marginTop: '16px' }}>Google Analytics</Title>
        <Space direction="vertical">
            <Button type="link" icon={<LuExternalLink />} href="https://support.google.com/analytics" target="_blank" rel="noopener noreferrer">
                Google Analytics Help Center
            </Button>
            <Button type="link" icon={<LuExternalLink />} href="https://analytics.google.com/analytics/academy" target="_blank" rel="noopener noreferrer">
                Analytics Academy (Free Courses)
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
