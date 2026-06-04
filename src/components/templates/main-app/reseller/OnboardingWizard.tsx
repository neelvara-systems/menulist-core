'use client';

import { getActiveResellerTiers, calculateOfflineAmount, RESELLER_COMMITMENT_OPTIONS, ResellerPricingTier } from "@config/resellerPricing";
import { BUSINESS_TYPES } from "@constant/common";
import { DEFAULT_PHONE_COUNTRY_CODE, getDialCodeForCountry, getUniquePhoneCountries, normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { formatInrPaise } from "@util/formatters";
import { Button, Card, Col, Divider, Flex, Form, Input, InputNumber, message, Radio, Result, Row, Select, Steps, Typography, theme } from "antd";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowLeft, LuArrowRight, LuCheck, LuCopy, LuStore } from "react-icons/lu";

const { Title, Text, Paragraph } = Typography;

interface OnboardResult {
    dashboardUrl?: string;
    loginEmail?: string;
    locationCount?: number;
    ownerUsername?: string;
    passwordSet?: boolean;
    publicUrl?: string;
    storeId: number;
    subdomain?: string;
    tenantId: number;
    subscriptionId: string;
    shortUrl?: string;
    status: string;
}

function OnboardingWizard() {
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const router = useRouter();
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OnboardResult | null>(null);

    const tiers = getActiveResellerTiers();
    const businessTypeOptions = BUSINESS_TYPES.map((bt: any) => ({
        label: bt.label || bt.value,
        value: bt.value,
    }));
    const countryOptions = getUniquePhoneCountries().map((country) => ({
        label: `${country.flag} ${country.code} (${country.dialCode})`,
        value: country.code,
    }));

    const steps = [
        { title: 'Business Details', icon: <LuStore /> },
        { title: 'Plan Setup' },
        { title: 'Confirm & Activate' },
    ];

    const getStepFieldNames = (step: number) => {
        if (step === 0) return ['businessName', 'businessType', 'ownerPhone', 'ownerPassword'];
        if (step === 1) {
            const paymentMode = form.getFieldValue('paymentMode');
            return paymentMode === 'offline'
                ? ['pricingTier', 'paymentMode', 'locationCount', 'commitmentMonths']
                : ['pricingTier', 'paymentMode', 'locationCount', 'billingInterval'];
        }
        return [];
    };

    const handleNext = async () => {
        try {
            await form.validateFields(getStepFieldNames(currentStep));
            setCurrentStep(s => s + 1);
        } catch {
            // Ant Design marks the exact fields inline.
        }
    };

    const handleSubmit = async () => {
        try {
            await form.validateFields([
                'businessName',
                'businessType',
                'ownerPhone',
                'ownerPassword',
                'pricingTier',
                'paymentMode',
                'locationCount',
                ...(form.getFieldValue('paymentMode') === 'offline' ? ['commitmentMonths'] : ['billingInterval']),
            ]);
            const values = form.getFieldsValue(true);
            setLoading(true);

            const response = await fetch('/api/reseller/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessName: values.businessName,
                    businessType: values.businessType,
                    ownerCountryCode: values.ownerCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
                    ownerDialCode: values.ownerDialCode || getDialCodeForCountry(values.ownerCountryCode || DEFAULT_PHONE_COUNTRY_CODE),
                    ownerPhone: values.ownerPhone,
                    ownerEmail: values.ownerEmail || undefined,
                    ownerPassword: values.ownerPassword,
                    pricingTier: values.pricingTier,
                    billingInterval: values.billingInterval || 'MONTH',
                    commitmentMonths: values.commitmentMonths || undefined,
                    locationCount: values.locationCount || 1,
                    paymentMode: values.paymentMode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to onboard client');
            }

            const data = await response.json();
            setResult(data);
            setCurrentStep(3); // Success step
            message.success('Client onboarded successfully!');
        } catch (error: any) {
            message.error(error.message || 'Failed to onboard client');
        } finally {
            setLoading(false);
        }
    };

    const selectedTier = tiers.find(t => t.id === form.getFieldValue('pricingTier'));
    const paymentMode = form.getFieldValue('paymentMode');
    const commitmentMonths = form.getFieldValue('commitmentMonths');
    const billingInterval = form.getFieldValue('billingInterval');
    const locationCount = Number(form.getFieldValue('locationCount') || 1);

    const getDisplayAmount = () => {
        if (!selectedTier) return '';
        if (paymentMode === 'offline' && commitmentMonths) {
            const total = calculateOfflineAmount(selectedTier.id, commitmentMonths, locationCount);
            return `${formatInrPaise(total)} one-time prepaid (${commitmentMonths} months, ${locationCount} location${locationCount > 1 ? 's' : ''})`;
        }
        const quantitySuffix = locationCount > 1 ? ` × ${locationCount} locations` : '';
        if (billingInterval === 'YEAR') {
            return `${formatInrPaise(selectedTier.yearlyPriceINR * locationCount)}/year (recurring${quantitySuffix})`;
        }
        return `${formatInrPaise(selectedTier.monthlyPriceINR * locationCount)}/month (recurring${quantitySuffix})`;
    };

    // Step 1: Business Details
    const renderStep1 = () => (
        <div>
            <Form.Item name="businessName" label="Business Name" rules={[{ required: true, min: 2, message: 'Enter the business name' }]}>
                <Input placeholder="e.g., The Good Food Cafe" size="large" />
            </Form.Item>
            <Form.Item name="businessType" label="Business Type" rules={[{ required: true, message: 'Select business type' }]}>
                <Select placeholder="Select type" size="large" showSearch options={businessTypeOptions} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
            <Form.Item name="ownerDialCode" initialValue={getDialCodeForCountry(DEFAULT_PHONE_COUNTRY_CODE)} hidden>
                <Input />
            </Form.Item>
            <Row gutter={8}>
                <Col xs={24} md={8}>
                    <Form.Item name="ownerCountryCode" label="Country" initialValue={DEFAULT_PHONE_COUNTRY_CODE} rules={[{ required: true, message: 'Select country' }]}>
                        <Select
                            onChange={(value) => form.setFieldsValue({
                                ownerCountryCode: value,
                                ownerDialCode: getDialCodeForCountry(value),
                            })}
                            options={countryOptions}
                            placeholder="Country"
                            showSearch
                            size="large"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                    <Form.Item
                        name="ownerPhone"
                        label="Owner Phone"
                        rules={[
                            { required: true, message: 'Enter valid phone number' },
                            {
                                validator: async (_, value) => {
                                    const normalizedPhone = normalizePhoneNumberForStorage({
                                        countryCode: form.getFieldValue('ownerCountryCode'),
                                        dialCode: form.getFieldValue('ownerDialCode'),
                                        phoneNumber: value,
                                    });
                                    if (normalizedPhone.phoneUsername.length >= 10 && normalizedPhone.phoneUsername.length <= 15) return;
                                    throw new Error('Enter valid phone number');
                                },
                            },
                        ]}
                    >
                        <Input inputMode="tel" placeholder="e.g., 9876543210" size="large" type="tel" />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="ownerEmail" label="Owner Email (Optional)">
                <Input placeholder="e.g., owner@example.com" size="large" type="email" />
            </Form.Item>
            <Form.Item name="ownerPassword" label="Owner Login Password" rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}>
                <Input.Password placeholder="Create password to share with owner" size="large" />
            </Form.Item>
        </div>
    );

    // Step 2: Plan Setup
    const renderStep2 = () => (
        <div>
            <Form.Item name="pricingTier" label="Pricing Tier" rules={[{ required: true, message: 'Select a pricing tier' }]}>
                <Radio.Group size="large" style={{ width: '100%' }}>
                    <Row gutter={[12, 12]}>
                        {tiers.map(tier => (
                            <Col xs={24} sm={8} key={tier.id}>
                                <Radio.Button value={tier.id} style={{ width: '100%', height: 'auto', padding: 16, textAlign: 'center' }}>
                                    <Flex vertical align="center" gap={4}>
                                        <Text strong>{tier.name}</Text>
                                        <Text>{formatInrPaise(tier.monthlyPriceINR)}/mo</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{tier.description}</Text>
                                    </Flex>
                                </Radio.Button>
                            </Col>
                        ))}
                    </Row>
                </Radio.Group>
            </Form.Item>

            <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true, message: 'Select payment mode' }]}>
                <Radio.Group size="large">
                    <Radio.Button value="online">Online (Razorpay)</Radio.Button>
                    <Radio.Button value="offline">Offline (One-time Prepaid)</Radio.Button>
                </Radio.Group>
            </Form.Item>

            <Form.Item
                initialValue={1}
                label="Locations included"
                name="locationCount"
                rules={[{ required: true, message: 'Enter number of locations' }]}
            >
                <InputNumber min={1} max={30} size="large" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentMode !== cur.paymentMode}>
                {() => {
                    const mode = form.getFieldValue('paymentMode');
                    if (mode === 'online') {
                        return (
                            <>
                                <Form.Item name="billingInterval" label="Billing Interval" initialValue="MONTH">
                                    <Radio.Group size="large">
                                        <Radio.Button value="MONTH">Monthly</Radio.Button>
                                        <Radio.Button value="YEAR">Yearly</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                                <Form.Item name="commitmentMonths" label="Commitment Period (tracking only)">
                                    <Select placeholder="Optional" size="large" allowClear options={RESELLER_COMMITMENT_OPTIONS.map(m => ({ label: `${m} months`, value: m }))} />
                                </Form.Item>
                            </>
                        );
                    }
                    if (mode === 'offline') {
                        return (
                            <Form.Item name="commitmentMonths" label="One-time prepaid duration" rules={[{ required: true, message: 'Select duration' }]}>
                                <Radio.Group size="large">
                                    {RESELLER_COMMITMENT_OPTIONS.map(m => (
                                        <Radio.Button key={m} value={m}>{m} months</Radio.Button>
                                    ))}
                                </Radio.Group>
                            </Form.Item>
                        );
                    }
                    return null;
                }}
            </Form.Item>
        </div>
    );

    // Step 3: Confirm
    const renderStep3 = () => {
        const values = form.getFieldsValue(true);
        const normalizedOwnerPhone = normalizePhoneNumberForStorage({
            countryCode: values.ownerCountryCode,
            dialCode: values.ownerDialCode,
            phoneNumber: values.ownerPhone,
        });
        return (
            <Card>
                <Title level={4}>Confirm Onboarding</Title>
                <Divider />
                <Row gutter={[16, 8]}>
                    <Col span={8}><Text type="secondary">Business</Text></Col>
                    <Col span={16}><Text strong>{values.businessName}</Text></Col>
                    <Col span={8}><Text type="secondary">Type</Text></Col>
                    <Col span={16}><Text>{values.businessType}</Text></Col>
                    <Col span={8}><Text type="secondary">Phone</Text></Col>
                    <Col span={16}><Text>{normalizedOwnerPhone.displayNumber || values.ownerPhone}</Text></Col>
                    {values.ownerEmail && (
                        <>
                            <Col span={8}><Text type="secondary">Email</Text></Col>
                            <Col span={16}><Text>{values.ownerEmail}</Text></Col>
                        </>
                    )}
                    <Col span={8}><Text type="secondary">Username</Text></Col>
                    <Col span={16}><Text>{normalizedOwnerPhone.phoneUsername}</Text></Col>
                    <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>
                    <Col span={8}><Text type="secondary">Tier</Text></Col>
                    <Col span={16}><Text strong>{selectedTier?.name || values.pricingTier}</Text></Col>
                    <Col span={8}><Text type="secondary">Payment</Text></Col>
                    <Col span={16}><Text>{values.paymentMode === 'online' ? 'Online (Razorpay recurring)' : 'Offline (one-time prepaid)'}</Text></Col>
                    <Col span={8}><Text type="secondary">Locations</Text></Col>
                    <Col span={16}><Text>{values.locationCount || 1}</Text></Col>
                    <Col span={8}><Text type="secondary">Amount</Text></Col>
                    <Col span={16}><Text strong>{getDisplayAmount()}</Text></Col>
                </Row>
                <Divider />
                {values.paymentMode === 'offline' && (
                    <Paragraph type="warning" style={{ background: token.colorWarningBg, padding: 12, borderRadius: 8 }}>
                        By confirming, you declare that you have collected {getDisplayAmount()} from the client. The store will be activated immediately until the selected prepaid end date.
                    </Paragraph>
                )}
                {values.paymentMode === 'online' && (
                    <Paragraph type="secondary" style={{ background: token.colorInfoBg, padding: 12, borderRadius: 8 }}>
                        A Razorpay recurring checkout link will be generated. Share it with the client to complete payment. The store activates after payment.
                    </Paragraph>
                )}
            </Card>
        );
    };

    // Success Screen
    if (result) {
        return (
            <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto' }}>
                <Result
                    status="success"
                    title="Client Onboarded Successfully!"
                    subTitle={`Store ID: ${result.storeId} | Status: ${result.status}${result.locationCount ? ` | ${result.locationCount} location${result.locationCount > 1 ? 's' : ''}` : ''}`}
                    extra={[
                        result.shortUrl && (
                            <Card key="link" size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                                <Text type="secondary">Payment Link (share with client):</Text>
                                <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                                    <Input value={result.shortUrl} readOnly />
                                    <Button icon={<LuCopy />} onClick={() => {
                                        navigator.clipboard.writeText(result.shortUrl || '');
                                        message.success('Link copied!');
                                    }}>Copy</Button>
                                </Flex>
                            </Card>
                        ),
                        (result.loginEmail || result.ownerUsername) && (
                            <Card key="loginDetails" size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                                <Text type="secondary">Client login details:</Text>
                                <Flex vertical gap={8} style={{ marginTop: 8 }}>
                                    {result.ownerUsername && (
                                        <Flex align="center" gap={8}>
                                            <Input addonBefore="Username" value={result.ownerUsername} readOnly />
                                            <Button icon={<LuCopy />} onClick={() => {
                                                navigator.clipboard.writeText(result.ownerUsername || '');
                                                message.success('Username copied!');
                                            }}>Copy</Button>
                                        </Flex>
                                    )}
                                    {result.loginEmail && (
                                        <Flex align="center" gap={8}>
                                            <Input addonBefore="Login email" value={result.loginEmail} readOnly />
                                            <Button icon={<LuCopy />} onClick={() => {
                                                navigator.clipboard.writeText(result.loginEmail || '');
                                                message.success('Login email copied!');
                                            }}>Copy</Button>
                                        </Flex>
                                    )}
                                    <Flex align="center" gap={8}>
                                        <Input.Password addonBefore="Password" value={form.getFieldValue('ownerPassword') || ''} readOnly />
                                        <Button icon={<LuCopy />} onClick={() => {
                                            navigator.clipboard.writeText(form.getFieldValue('ownerPassword') || '');
                                            message.success('Password copied!');
                                        }}>Copy</Button>
                                    </Flex>
                                </Flex>
                            </Card>
                        ),
                        result.dashboardUrl && (
                            <Card key="dashboardLink" size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                                <Text type="secondary">Client dashboard link:</Text>
                                <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                                    <Input value={result.dashboardUrl} readOnly />
                                    <Button icon={<LuCopy />} onClick={() => {
                                        navigator.clipboard.writeText(result.dashboardUrl || '');
                                        message.success('Dashboard link copied!');
                                    }}>Copy</Button>
                                </Flex>
                            </Card>
                        ),
                        result.publicUrl && (
                            <Card key="publicLink" size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                                <Text type="secondary">Public menu link:</Text>
                                <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                                    <Input value={result.publicUrl} readOnly />
                                    <Button icon={<LuCopy />} onClick={() => {
                                        navigator.clipboard.writeText(result.publicUrl || '');
                                        message.success('Public link copied!');
                                    }}>Copy</Button>
                                </Flex>
                            </Card>
                        ),
                        <Button key="dashboard" type="primary" onClick={() => router.push('/reseller')}>
                            Back to Dashboard
                        </Button>,
                        <Button key="another" onClick={() => { setResult(null); setCurrentStep(0); form.resetFields(); }}>
                            Onboard Another
                        </Button>,
                    ].filter(Boolean)}
                />
            </div>
        );
    }

    const canProceed = () => {
        if (currentStep === 0) {
            const values = form.getFieldsValue();
            return values.businessName && values.businessType && values.ownerPhone && values.ownerPassword;
        }
        if (currentStep === 1) {
            const values = form.getFieldsValue();
            if (!values.pricingTier || !values.paymentMode) return false;
            if (values.paymentMode === 'offline' && !values.commitmentMonths) return false;
            return true;
        }
        return true;
    };

    return (
        <div style={{ padding: '24px', maxWidth: 700, margin: '0 auto' }}>
            <Flex align="center" gap={8} style={{ marginBottom: 24 }}>
                <Button icon={<LuArrowLeft />} onClick={() => router.push('/reseller')} type="text" />
                <Title level={3} style={{ margin: 0 }}>Onboard New Client</Title>
            </Flex>

            <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

            <Form form={form} layout="vertical" size="large" onValuesChange={() => form.validateFields().catch(() => {})}>
                {currentStep === 0 && renderStep1()}
                {currentStep === 1 && renderStep2()}
                {currentStep === 2 && renderStep3()}
            </Form>

            <Flex justify="space-between" style={{ marginTop: 24 }}>
                <Button disabled={currentStep === 0} onClick={() => setCurrentStep(s => s - 1)} icon={<LuArrowLeft />}>
                    Previous
                </Button>
                {currentStep < 2 ? (
                    <Button type="primary" onClick={handleNext} icon={<LuArrowRight />} iconPosition="end">
                        Next
                    </Button>
                ) : (
                    <Button type="primary" onClick={handleSubmit} loading={loading} icon={<LuCheck />}>
                        {paymentMode === 'offline' ? 'Confirm Prepaid Payment & Activate' : 'Create Recurring Payment Link'}
                    </Button>
                )}
            </Flex>
        </div>
    );
}

export default OnboardingWizard;
