'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { getActiveResellerTiers, RESELLER_COMMITMENT_OPTIONS, ResellerPricingTier } from "@config/resellerPricing";
import { BUSINESS_TYPES } from "@data/shared/businessTypes";
import { INDIAN_GST_STATES } from '@data/shared/indianGstStates';
import { DEFAULT_PHONE_COUNTRY_CODE, getDialCodeForCountry, getUniquePhoneCountries, normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import {
    isResellerOnboardingResponse,
    type ResellerOnboardingResponse,
} from "@lib/reseller/resellerOnboardingResponse";
import { formatInrPaise } from "@util/formatters";
import { Button, Card, Col, Divider, Flex, Form, Input, InputNumber, message, Radio, Result, Row, Select, Steps, Typography, theme } from "antd";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowLeft, LuArrowRight, LuCheck, LuCopy, LuStore } from "react-icons/lu";
import {
    copyResellerTextToClipboard,
    createResellerStatusError,
    getBoundedResellerStringContext,
    getOrCreateResellerOperationId,
    getResellerOperationIntentKey,
    clearResellerOperationId,
    hasResellerClipboardWrite,
    hasResellerCopyFallback,
    logResellerFailure,
    RESELLER_REQUEST_POLICY,
    type ResellerLogContext,
} from "./resellerDiagnostics";

const { Title, Text, Paragraph } = Typography;
const RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024;

type ResellerOnboardingCopyKind =
    | 'dashboard_link'
    | 'login_email'
    | 'owner_password'
    | 'owner_username'
    | 'payment_link'
    | 'public_link';

async function readOnboardResponse(
    response: Response,
    context: ResellerLogContext,
): Promise<unknown> {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logResellerFailure('desktop_reseller_onboard_response_parse_failed', error, {
            ...context,
            maxBytes: RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }
}

function OnboardingWizard() {
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const router = useRouter();
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResellerOnboardingResponse | null>(null);

    const tiers = getActiveResellerTiers();
    const businessTypeOptions = BUSINESS_TYPES.map((bt) => ({
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
        if (step === 0) return [
            'businessName', 'businessType', 'ownerPhone', 'ownerPassword',
            'billingLegalName', 'billingEmail', 'billingAddressLine1', 'billingCity',
            'billingIndianStateCode', 'billingPostalCode',
        ];
        if (step === 1) {
            return ['pricingTier', 'locationCount', 'billingInterval'];
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
                'billingLegalName',
                'billingEmail',
                'billingAddressLine1',
                'billingCity',
                'billingIndianStateCode',
                'billingPostalCode',
                'pricingTier',
                'locationCount',
                'billingInterval',
            ]);
            const values = form.getFieldsValue(true);
            const normalizedOwnerPhone = normalizePhoneNumberForStorage({
                countryCode: values.ownerCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
                dialCode: values.ownerDialCode || getDialCodeForCountry(values.ownerCountryCode || DEFAULT_PHONE_COUNTRY_CODE),
                phoneNumber: values.ownerPhone,
            });
            const operationIntentKey = getResellerOperationIntentKey('onboard-client', [
                values.billingInterval || 'MONTH',
                values.businessName,
                values.businessType,
                values.commitmentMonths || null,
                values.locationCount || 1,
                values.ownerEmail || '',
                values.ownerPassword,
                values.billingLegalName,
                values.billingEmail,
                values.billingAddressLine1,
                values.billingAddressLine2 || '',
                values.billingCity,
                values.billingIndianStateCode,
                values.billingPostalCode,
                values.billingGstin || '',
                normalizedOwnerPhone.countryCode,
                normalizedOwnerPhone.dialCode,
                normalizedOwnerPhone.phoneNumber,
                'online',
                values.pricingTier,
            ]);
            const operationId = getOrCreateResellerOperationId(operationIntentKey);
            const onboardLogContext: ResellerLogContext = {
                action: 'onboard_client',
                locationCount: Number(values?.locationCount || 0),
                ...getBoundedResellerStringContext('businessName', values?.businessName),
                ...getBoundedResellerStringContext('businessType', values?.businessType),
                paymentMode: 'online',
                ...getBoundedResellerStringContext('pricingTier', values?.pricingTier),
            };
            setLoading(true);

            const response = await fetch('/api/reseller/onboard', {
                ...RESELLER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operationId,
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
                    paymentMode: 'online',
                    billingProfile: {
                        legalName: values.billingLegalName,
                        email: values.billingEmail,
                        countryCode: 'IN',
                        addressLine1: values.billingAddressLine1,
                        addressLine2: values.billingAddressLine2 || undefined,
                        city: values.billingCity,
                        region: INDIAN_GST_STATES.find((state) => state.code === values.billingIndianStateCode)?.name || '',
                        indianStateCode: values.billingIndianStateCode,
                        postalCode: values.billingPostalCode,
                        taxId: values.billingGstin || undefined,
                        taxIdType: values.billingGstin ? 'GSTIN' : undefined,
                    },
                }),
            });

            const data = await readOnboardResponse(response, onboardLogContext);
            if (!response.ok) {
                throw createResellerStatusError('desktop_reseller_onboard_rejected', response.status);
            }

            if (!isResellerOnboardingResponse(data, operationId)) {
                const invalidResponseError = createResellerStatusError(
                    'desktop_reseller_onboard_response_invalid',
                    response.status,
                );
                logResellerFailure('desktop_reseller_onboard_response_invalid', invalidResponseError, {
                    ...onboardLogContext,
                    responseOk: response.ok,
                    responseStatus: response.status,
                });
                throw invalidResponseError;
            }
            clearResellerOperationId(operationIntentKey);
            setResult(data);
            setCurrentStep(3); // Success step
            message.success('Client onboarded successfully!');
        } catch (error) {
            const values = form.getFieldsValue(true);
            logResellerFailure('desktop_reseller_onboard_failed', error, {
                action: 'onboard_client',
                locationCount: Number(values?.locationCount || 0),
                ...getBoundedResellerStringContext('businessName', values?.businessName),
                ...getBoundedResellerStringContext('businessType', values?.businessType),
                paymentMode: 'online',
                ...getBoundedResellerStringContext('pricingTier', values?.pricingTier),
            });
            message.error('Failed to onboard client');
        } finally {
            setLoading(false);
        }
    };

    const buildOnboardingHandoffLogContext = (
        action: string,
        metadata: ResellerLogContext = {},
    ): ResellerLogContext => ({
        action,
        currentStep,
        hasResult: Boolean(result),
        ...getBoundedResellerStringContext('storeId', result?.storeId),
        ...getBoundedResellerStringContext('tenantId', result?.tenantId),
        ...getBoundedResellerStringContext('subscriptionId', result?.subscriptionId),
        ...metadata,
    });

    const handleCopyResultValue = async (
        value: string | number | null | undefined,
        copyKind: ResellerOnboardingCopyKind,
        successMessage: string,
    ) => {
        const copyValue = value === undefined || value === null ? '' : String(value);
        if (!copyValue) return;
        try {
            await copyResellerTextToClipboard(copyValue);
            message.success(successMessage);
        } catch (error) {
            logResellerFailure('desktop_reseller_onboarding_copy_failed', error, buildOnboardingHandoffLogContext('copy_result_value', {
                copyKind,
                ...getBoundedResellerStringContext('copyValue', copyValue),
                hasClipboardWrite: hasResellerClipboardWrite(),
                hasCopyFallback: hasResellerCopyFallback(),
            }));
            message.error('Could not copy.');
        }
    };

    const selectedTier = tiers.find(t => t.id === form.getFieldValue('pricingTier'));
    const billingInterval = form.getFieldValue('billingInterval');
    const locationCount = Number(form.getFieldValue('locationCount') || 1);

    const getDisplayAmount = () => {
        if (!selectedTier) return '';
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
            <Divider orientation="left">Billing details</Divider>
            <Form.Item name="billingLegalName" label="Customer or Business Legal Name" rules={[{ required: true, message: 'Enter the billing name' }]}>
                <Input autoComplete="organization" size="large" />
            </Form.Item>
            <Form.Item name="billingEmail" label="Invoice Email" rules={[{ required: true, type: 'email', message: 'Enter a valid invoice email' }]}>
                <Input autoComplete="email" size="large" type="email" />
            </Form.Item>
            <Form.Item name="billingAddressLine1" label="Billing Address" rules={[{ required: true, message: 'Enter the billing address' }]}>
                <Input autoComplete="address-line1" size="large" />
            </Form.Item>
            <Form.Item name="billingAddressLine2" label="Address Line 2 (Optional)">
                <Input autoComplete="address-line2" size="large" />
            </Form.Item>
            <Row gutter={12}>
                <Col xs={24} md={8}><Form.Item name="billingCity" label="City" rules={[{ required: true }]}><Input autoComplete="address-level2" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="billingIndianStateCode" label="State" rules={[{ required: true }]}><Select showSearch options={INDIAN_GST_STATES.map((state) => ({ label: state.name, value: state.code }))} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="billingPostalCode" label="Postal Code" rules={[{ required: true }]}><Input autoComplete="postal-code" /></Form.Item></Col>
            </Row>
            <Form.Item name="billingGstin" label="GSTIN (Optional)">
                <Input maxLength={15} placeholder="Enter only when registered for GST" />
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

            <Paragraph type="secondary">The customer pays through Razorpay. Access starts only after verified payment.</Paragraph>

            <Form.Item
                initialValue={1}
                label="Locations included"
                name="locationCount"
                rules={[{ required: true, message: 'Enter number of locations' }]}
            >
                <InputNumber min={1} max={30} size="large" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="billingInterval" label="Billing Interval" initialValue="MONTH">
                <Radio.Group size="large">
                    <Radio.Button value="MONTH">Monthly</Radio.Button>
                    <Radio.Button value="YEAR">Yearly</Radio.Button>
                </Radio.Group>
            </Form.Item>
            <Form.Item name="commitmentMonths" label="Commitment Period (tracking only)">
                <Select placeholder="Optional" size="large" allowClear options={RESELLER_COMMITMENT_OPTIONS.map(m => ({ label: `${m} months`, value: m }))} />
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
                    <Col span={16}><Text>Online (Razorpay recurring)</Text></Col>
                    <Col span={8}><Text type="secondary">Locations</Text></Col>
                    <Col span={16}><Text>{values.locationCount || 1}</Text></Col>
                    <Col span={8}><Text type="secondary">Amount</Text></Col>
                    <Col span={16}><Text strong>{getDisplayAmount()} before GST</Text></Col>
                    <Col span={8}><Text type="secondary">Invoice email</Text></Col>
                    <Col span={16}><Text>{values.billingEmail}</Text></Col>
                </Row>
                <Divider />
                <Paragraph type="secondary" style={{ background: token.colorInfoBg, padding: 12, borderRadius: 8 }}>
                    A Razorpay recurring checkout link will be generated. Share it with the client to complete payment. The store activates after payment.
                </Paragraph>
            </Card>
        );
    };

    // Success Screen
    if (result) {
        return (
            <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto' }}>
                <Result
                    icon={(
                        <ContextualStateIllustration
                            color={token.colorPrimary}
                            size={152}
                            treatment="softHalo"
                            variant="onboardingSuccessContext"
                        />
                    )}
                    status="success"
                    title="Client Onboarded Successfully!"
                    subTitle={`Store ID: ${result.storeId} | Status: ${result.status}${result.locationCount ? ` | ${result.locationCount} location${result.locationCount > 1 ? 's' : ''}` : ''}`}
                    extra={[
                        result.shortUrl && (
                            <Card key="link" size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                                <Text type="secondary">Payment Link (share with client):</Text>
                                <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                                    <Input value={result.shortUrl} readOnly />
                                    <Button icon={<LuCopy />} onClick={() => void handleCopyResultValue(result.shortUrl, 'payment_link', 'Link copied!')}>Copy</Button>
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
                                            <Button icon={<LuCopy />} onClick={() => void handleCopyResultValue(result.ownerUsername, 'owner_username', 'Username copied!')}>Copy</Button>
                                        </Flex>
                                    )}
                                    {result.loginEmail && (
                                        <Flex align="center" gap={8}>
                                            <Input addonBefore="Login email" value={result.loginEmail} readOnly />
                                            <Button icon={<LuCopy />} onClick={() => void handleCopyResultValue(result.loginEmail, 'login_email', 'Login email copied!')}>Copy</Button>
                                        </Flex>
                                    )}
                                    <Flex align="center" gap={8}>
                                        <Input.Password addonBefore="Password" value={form.getFieldValue('ownerPassword') || ''} readOnly />
                                        <Button icon={<LuCopy />} onClick={() => void handleCopyResultValue(form.getFieldValue('ownerPassword'), 'owner_password', 'Password copied!')}>Copy</Button>
                                    </Flex>
                                </Flex>
                            </Card>
                        ),
                        result.dashboardUrl && (
                            <Card key="dashboardLink" size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                                <Text type="secondary">Client dashboard link:</Text>
                                <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                                    <Input value={result.dashboardUrl} readOnly />
                                    <Button icon={<LuCopy />} onClick={() => void handleCopyResultValue(result.dashboardUrl, 'dashboard_link', 'Dashboard link copied!')}>Copy</Button>
                                </Flex>
                            </Card>
                        ),
                        result.publicUrl && (
                            <Card key="publicLink" size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                                <Text type="secondary">Public menu link:</Text>
                                <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                                    <Input value={result.publicUrl} readOnly />
                                    <Button icon={<LuCopy />} onClick={() => void handleCopyResultValue(result.publicUrl, 'public_link', 'Public link copied!')}>Copy</Button>
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
            return values.businessName && values.businessType && values.ownerPhone && values.ownerPassword
                && values.billingLegalName && values.billingEmail && values.billingAddressLine1
                && values.billingCity && values.billingIndianStateCode && values.billingPostalCode;
        }
        if (currentStep === 1) {
            const values = form.getFieldsValue();
            if (!values.pricingTier) return false;
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
                        Create Recurring Payment Link
                    </Button>
                )}
            </Flex>
        </div>
    );
}

export default OnboardingWizard;
