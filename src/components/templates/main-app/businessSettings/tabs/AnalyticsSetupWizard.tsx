import { Alert, Button, Card, Form, Modal, Space, Steps, Switch, Typography, theme, type FormInstance } from 'antd';
import React, { useEffect, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheckCircle, LuInfo } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const { Step } = Steps;

interface AnalyticsSetupWizardProps {
    open: boolean;
    onClose: () => void;
    form: FormInstance;
}

const AnalyticsSetupWizard: React.FC<AnalyticsSetupWizardProps> = ({ open, onClose, form }) => {
    const { token } = theme.useToken();
    const [currentStep, setCurrentStep] = useState(0);
    const analytics = Form.useWatch('analytics', form) || {};

    useEffect(() => {
        if (open) setCurrentStep(0);
    }, [open]);

    const steps = [
        {
            title: "",
            content: (
                <Card variant="borderless">
                    <Title level={4}>Let&apos;s Set Up Your Analytics!</Title>
                    <Paragraph>
                        We&apos;ll help you track important things like:
                    </Paragraph>
                    <ul>
                        <li>How many people view your menu</li>
                        <li>Which dishes are most popular</li>
                        <li>Where your customers come from</li>
                        <li>Which customer actions happen after a menu visit</li>
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
                                <Text>2. Open Admin and create a Google Analytics 4 property. If this is your first property, choose &quot;Start measuring&quot;.</Text>
                                <Text>3. Add a Web data stream:</Text>
                                <ul>
                                    <li>Enter your business name</li>
                                    <li>Use your public MenuList link as the website URL</li>
                                    <li>Open the new Web stream</li>
                                </ul>
                                <Text>4. Under Stream details, copy the Measurement ID (starts with &quot;G-&quot;)</Text>
                            </Space>
                        </Card>

                        <Alert
                            message="You can leave this ID blank and come back later."
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
                    <Title level={4}>Step 2: Help People Find Your Menu (Optional)</Title>
                    <Space direction="vertical" size="large">
                        <Alert
                            message="This verifies your menu site with Google and lets you monitor its search presence."
                            type="info"
                            showIcon
                        />

                        <Card type="inner" title="Quick Setup Steps">
                            <Space direction="vertical">
                                <Text>1. Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console</a></Text>
                                <Text>2. Add a URL-prefix property for your exact public MenuList link</Text>
                                <Text>3. Choose &quot;HTML tag&quot; under ownership verification</Text>
                                <Text>4. Copy the provided verification tag and paste it into the Google Search Console field below</Text>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                    <div>
                                        <Text strong={true}>Track Menu Activity</Text>
                                        <br />
                                        <Text type="secondary">Track menu opens, item detail opens, search demand, unavailable-item demand, final menu CTA clicks, and entry source</Text>
                                    </div>
                                    <Switch
                                        checked={analytics.trackMenuViews !== false}
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
                                        checked={analytics.trackDecisionBlocks !== false}
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
                                        checked={analytics.trackOfficialBusinessPage !== false}
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
                                        checked={analytics.trackCustomerApp !== false}
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
                                        checked={analytics.trackLocation === true}
                                        onChange={(checked) => form.setFieldValue(['analytics', 'trackLocation'], checked)}
                                    />
                                </div>
                            </Space>
                        </Card>

                        <Alert
                            message="MenuList analytics does not collect customer names, emails, payment details, or exact GPS locations."
                            description="Approximate location, when enabled, uses rounded location or timezone-region information."
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
                        <LuCheckCircle size={48} style={{ color: token.colorSuccess }} />
                        <Title level={4}>Review Your Analytics Settings</Title>
                        <Paragraph>
                            Close this guide, review the choices on the Analytics Settings page, and save your changes.
                        </Paragraph>
                        <Alert
                            message="Before you finish"
                            description={
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    <li>✓ Add only the external IDs you actually use</li>
                                    <li>✓ Review the tracking categories</li>
                                    <li>✓ Save changes on the settings page</li>
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
                    <LuInfo />
                    <span>Analytics Setup Guide</span>
                </Space>
            }
            open={open}
            onCancel={onClose}
            width={800}
            footer={[
                currentStep > 0 && (
                    <Button key="back" onClick={prev} icon={<LuArrowLeft />}>
                        Back
                    </Button>
                ),
                !isLastStep ? (
                    <Button type="primary" onClick={next} icon={<LuArrowRight />}>
                        Next Step
                    </Button>
                ) : (
                    <Button type="primary" onClick={onClose} icon={<LuCheckCircle />}>
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
