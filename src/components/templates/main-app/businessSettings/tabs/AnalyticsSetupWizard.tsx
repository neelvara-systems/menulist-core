import { CheckCircleOutlined, InfoCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Image, Modal, Space, Steps, Switch, Typography, theme } from 'antd';
import React, { useState } from 'react';

const { Text, Title, Paragraph } = Typography;
const { Step } = Steps;

interface AnalyticsSetupWizardProps {
    open: boolean;
    onClose: () => void;
    form: any;
}

const AnalyticsSetupWizard: React.FC<AnalyticsSetupWizardProps> = ({ open, onClose, form }) => {
    const { token } = theme.useToken();
    const [currentStep, setCurrentStep] = useState(0);
    // Using parent form directly

    const steps = [
        {
            title: "",
            content: (
                <Card variant="borderless">
                    <Title level={4}>Let&apos;s Set Up Your Restaurant Analytics!</Title>
                    <Paragraph>
                        We&apos;ll help you track important things like:
                    </Paragraph>
                    <ul>
                        <li>How many people view your menu</li>
                        <li>Which dishes are most popular</li>
                        <li>Where your customers come from</li>
                        <li>How much money you make</li>
                    </ul>
                    <Alert
                        message="Don&apos;t worry! This is easy and takes about 5 minutes."
                        type="info"
                        showIcon
                    />
                </Card>
            )
        },
        {
            title: "",
            content: (
                <Card variant="borderless">
                    <Title level={4}>Step 1: Set Up Google Analytics</Title>
                    <Space direction="vertical" size="large">
                        <Alert
                            message="This is the most important part! It helps you see how many people visit your menu."
                            type="info"
                            showIcon
                        />

                        <Card type="inner" title="How to Get Your ID">
                            <Space direction="vertical">
                                <Text>1. Open a new tab and go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">analytics.google.com</a></Text>
                                <Text>2. Click the blue &quot;Start measuring&quot; button</Text>
                                <Text>3. Follow these simple steps:</Text>
                                <ul>
                                    <li>Enter your restaurant name</li>
                                    <li>Choose &quot;Web&quot; for your menu website</li>
                                    <li>Click &quot;Save&quot;</li>
                                    <li>Click &quot;Create&quot;</li>
                                </ul>
                                <Text>4. Copy your Measurement ID (starts with &quot;G-&quot;)</Text>
                                <Image
                                    src="/images/analytics/ga4-id-location.png"
                                    alt="Where to find GA4 ID"
                                    style={{ maxWidth: '100%', marginTop: '16px' }}
                                />
                            </Space>
                        </Card>

                        <Alert
                            message="Need help? Watch our 2-minute video guide!"
                            type="success"
                            showIcon
                            action={
                                <Button type="link">
                                    Watch Video
                                </Button>
                            }
                        />
                    </Space>
                </Card>
            )
        },
        {
            title: "",
            content: (
                <Card variant="borderless">
                    <Title level={4}>Step 2: Help People Find Your Menu (Optional)</Title>
                    <Space direction="vertical" size="large">
                        <Alert
                            message="This helps your menu show up in Google search results!"
                            type="info"
                            showIcon
                        />

                        <Card type="inner" title="Quick Setup Steps">
                            <Space direction="vertical">
                                <Text>1. Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console</a></Text>
                                <Text>2. Click &quot;Start measuring&quot;</Text>
                                <Text>3. Enter your menu website address</Text>
                                <Text>4. Choose &quot;HTML tag&quot; verification</Text>
                                <Image
                                    src="/images/analytics/search-console-verification.png"
                                    alt="Search Console verification"
                                    style={{ maxWidth: '100%', marginTop: '16px' }}
                                />
                            </Space>
                        </Card>

                        <Alert
                            message="You can skip this step and come back later!"
                            type="warning"
                            showIcon
                        />
                    </Space>
                </Card>
            )
        },
        {
            title: "",
            content: (
                <Card variant="borderless">
                    <Title level={4}>Step 3: Connect Facebook (Optional)</Title>
                    <Space direction="vertical" size="large">
                        <Alert
                            message="This helps you see how well your Facebook ads work!"
                            type="info"
                            showIcon
                        />

                        <Card type="inner" title="Facebook Setup">
                            <Space direction="vertical">
                                <Text>1. Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer">business.facebook.com</a></Text>
                                <Text>2. Click &quot;Connect Data Sources&quot;</Text>
                                <Text>3. Select &quot;Web&quot; as your platform</Text>
                                <Text>4. Copy your Pixel ID number</Text>
                                <Image
                                    src="/images/analytics/facebook-pixel-id.png"
                                    alt="Facebook Pixel ID location"
                                    style={{ maxWidth: '100%', marginTop: '16px' }}
                                />
                            </Space>
                        </Card>

                        <Alert
                            message="This is optional - only needed if you run Facebook ads!"
                            type="warning"
                            showIcon
                        />
                    </Space>
                </Card>
            )
        },
        {
            title: "",
            content: (
                <Card variant="borderless">
                    <Title level={4}>Last Step: Pick What You Want to Track</Title>
                    <Space direction="vertical" size="large">
                        <Card type="inner">
                            <Space direction="vertical">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Text strong={true}>Track Orders & Sales</Text>
                                        <br />
                                        <Text type="secondary">See how much money you make</Text>
                                    </div>
                                    <Switch
                                        checked={form.getFieldValue(['analytics', 'enhancedEcommerce'])}
                                        onChange={(checked) => form.setFieldValue(['analytics', 'enhancedEcommerce'], checked)}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                    <div>
                                        <Text strong={true}>Track Menu Activity</Text>
                                        <br />
                                        <Text type="secondary">Track menu opens, item detail opens, search demand, unavailable-item demand, final menu CTA clicks, and entry source</Text>
                                    </div>
                                    <Switch
                                        checked={form.getFieldValue(['analytics', 'trackMenuViews'])}
                                        onChange={(checked) => form.setFieldValue(['analytics', 'trackMenuViews'], checked)}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                    <div>
                                        <Text strong={true}>Track Featured Section</Text>
                                        <br />
                                        <Text type="secondary">See when Featured choices are shown and tapped</Text>
                                    </div>
                                    <Switch
                                        checked={form.getFieldValue(['analytics', 'trackDecisionBlocks'])}
                                        onChange={(checked) => form.setFieldValue(['analytics', 'trackDecisionBlocks'], checked)}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                    <div>
                                        <Text strong={true}>Track Official Business Page</Text>
                                        <br />
                                        <Text type="secondary">See OBP views, CTA taps, social/review link clicks, owner shares, and menu conversion</Text>
                                    </div>
                                    <Switch
                                        checked={form.getFieldValue(['analytics', 'trackOfficialBusinessPage'])}
                                        onChange={(checked) => form.setFieldValue(['analytics', 'trackOfficialBusinessPage'], checked)}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                    <div>
                                        <Text strong={true}>Track Customer App</Text>
                                        <br />
                                        <Text type="secondary">See install prompt, install, open, and shortcut activity</Text>
                                    </div>
                                    <Switch
                                        checked={form.getFieldValue(['analytics', 'trackCustomerApp'])}
                                        onChange={(checked) => form.setFieldValue(['analytics', 'trackCustomerApp'], checked)}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                    <div>
                                        <Text strong={true}>Track Approximate Location</Text>
                                        <br />
                                        <Text type="secondary">Use rounded geolocation or timezone region, never exact GPS</Text>
                                    </div>
                                    <Switch
                                        checked={form.getFieldValue(['analytics', 'trackLocation'])}
                                        onChange={(checked) => form.setFieldValue(['analytics', 'trackLocation'], checked)}
                                    />
                                </div>
                            </Space>
                        </Card>

                        <Alert
                            message="We never collect personal information!"
                            description="We only track general information like city and country, never exact locations."
                            type="info"
                            showIcon
                        />
                    </Space>
                </Card>
            )
        },
        {
            title: "",
            content: (
                <Card variant="borderless">
                    <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
                        <CheckCircleOutlined style={{ fontSize: '48px', color: token.colorSuccess }} />
                        <Title level={4}>Great Job! You&apos;re All Set!</Title>
                        <Paragraph>
                            Your analytics are now ready to go! You&apos;ll start seeing data in about 24 hours.
                        </Paragraph>
                        <Alert
                            message="What's Next?"
                            description={
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    <li>✓ Check your dashboard tomorrow</li>
                                    <li>✓ See which items are popular</li>
                                    <li>✓ Watch your business grow!</li>
                                </ul>
                            }
                            type="success"
                            showIcon
                        />
                    </Space>
                </Card>
            )
        }
    ];

    const next = () => {
        setCurrentStep(currentStep + 1);
    };

    const prev = () => {
        setCurrentStep(currentStep - 1);
    };

    const isLastStep = currentStep === steps.length - 1;

    return (
        <Modal
            title={
                <Space>
                    <InfoCircleOutlined />
                    <span>Analytics Setup Guide</span>
                </Space>
            }
            open={open}
            onCancel={onClose}
            width={800}
            footer={[
                currentStep > 0 && (
                    <Button key="back" onClick={prev} icon={<LeftOutlined />}>
                        Back
                    </Button>
                ),
                !isLastStep ? (
                    <Button type="primary" onClick={next} icon={<RightOutlined />}>
                        Next Step
                    </Button>
                ) : (
                    <Button type="primary" onClick={onClose} icon={<CheckCircleOutlined />}>
                        Finish Setup
                    </Button>
                )
            ]}
        >
            <Steps current={currentStep} style={{ marginBottom: '24px' }}>
                {steps.map(item => (
                    <Step key={item.title} title={item.title} />
                ))}
            </Steps>
            <div style={{ maxHeight: '60vh', overflow: 'auto', padding: '0 16px' }}>
                {steps[currentStep].content}
            </div>
        </Modal>
    );
};

export default AnalyticsSetupWizard;
