'use client'

import { calculateOfflineAmount, getActiveResellerTiers, RESELLER_COMMITMENT_OPTIONS } from '@config/resellerPricing';
import { BUSINESS_TYPES } from '@data/shared/businessTypes';
import { DEFAULT_PHONE_COUNTRY_CODE, getDialCodeForCountry, getUniquePhoneCountries, normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { RESELLER_REQUEST_POLICY } from '@template/main-app/reseller/resellerDiagnostics';
import { formatInrPaise } from '@util/formatters';
import { theme } from 'antd';
import { useMemo, useState } from 'react';
import { LuCheck, LuChevronRight, LuCopy, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, Input, Result, Select, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { getBoundedMobileOwnerStringContext, logMobileOwnerFailure } from '../utils/mobileOwnerDiagnostics';

type PaymentMode = 'online' | 'offline';
type BillingInterval = 'MONTH' | 'YEAR';

type OnboardDraft = {
    billingInterval: BillingInterval;
    businessName: string;
    businessType: string;
    commitmentMonths: string;
    locationCount: string;
    ownerCountryCode: string;
    ownerDialCode: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerPhone: string;
    paymentMode: PaymentMode | '';
    pricingTier: string;
};

type OnboardResult = {
    dashboardUrl?: string;
    loginEmail?: string;
    locationCount?: number;
    ownerUsername?: string;
    passwordSet?: boolean;
    publicUrl?: string;
    shortUrl?: string;
    status: string;
    storeId: number;
    subdomain?: string;
    subscriptionId: string;
    tenantId: number;
};

type MobileResellerOnboardingHandoffKind =
    | 'dashboard_link'
    | 'login_email'
    | 'owner_password'
    | 'owner_username'
    | 'payment_link'
    | 'public_link';

const MOBILE_RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const MOBILE_RESELLER_ONBOARDING_COPY_UNAVAILABLE = 'mobile_reseller_onboarding_copy_unavailable';
const MOBILE_RESELLER_ONBOARDING_COPY_FALLBACK_FAILED = 'mobile_reseller_onboarding_copy_fallback_failed';

const hasMobileResellerOnboardingClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobileResellerOnboardingCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobileResellerOnboardingText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobileResellerOnboardingClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobileResellerOnboardingCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_RESELLER_ONBOARDING_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(MOBILE_RESELLER_ONBOARDING_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createMobileResellerOnboardStatusError(code: string, status?: number) {
    const error = new Error(code) as Error & { code?: string; status?: number };
    error.code = code;
    error.status = status;
    return error;
}

function isValidMobileOnboardResult(data: unknown): data is OnboardResult {
    if (!isRecord(data)) return false;
    const storeId = Number(data.storeId);
    const tenantId = Number(data.tenantId);
    return Number.isFinite(storeId)
        && Number.isFinite(tenantId)
        && typeof data.subscriptionId === 'string'
        && data.subscriptionId.length > 0
        && typeof data.status === 'string'
        && data.status.length > 0;
}

const initialDraft: OnboardDraft = {
    billingInterval: 'MONTH',
    businessName: '',
    businessType: '',
    commitmentMonths: '',
    locationCount: '1',
    ownerCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
    ownerDialCode: getDialCodeForCountry(DEFAULT_PHONE_COUNTRY_CODE),
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
    paymentMode: '',
    pricingTier: '',
};

export default function MobileResellerOnboardingScreen({ onBack }: { onBack: () => void }) {
    const { token } = theme.useToken();
    const tiers = useMemo(() => getActiveResellerTiers(), []);
    const businessTypeOptions = useMemo(() => BUSINESS_TYPES.map((businessType: any) => ({
        label: businessType.label || businessType.name || businessType.value,
        value: businessType.value,
    })), []);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<OnboardDraft>(initialDraft);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OnboardResult | null>(null);
    const selectedTier = tiers.find((tier) => tier.id === draft.pricingTier);
    const normalizedOwnerPhone = normalizePhoneNumberForStorage({
        countryCode: draft.ownerCountryCode,
        dialCode: draft.ownerDialCode,
        phoneNumber: draft.ownerPhone,
    });
    const buildResellerOnboardingLogContext = (flow: string, metadata: Record<string, boolean | number | string | null | undefined> = {}) => ({
        surface: 'mobile_reseller_onboarding',
        flow,
        step,
        hasResult: Boolean(result),
        requestedLocationCount: Math.max(1, Number(draft.locationCount || 1)),
        hasOwnerEmail: Boolean(draft.ownerEmail.trim()),
        hasOwnerPhone: Boolean(normalizedOwnerPhone.phoneNumber),
        ...getBoundedMobileOwnerStringContext('businessType', draft.businessType),
        ...getBoundedMobileOwnerStringContext('pricingTier', draft.pricingTier),
        ...getBoundedMobileOwnerStringContext('paymentMode', draft.paymentMode),
        ...metadata,
    });

    const readMobileOnboardResponse = async (
        response: Response,
        context: Record<string, boolean | number | string | null | undefined>,
    ): Promise<unknown> => {
        try {
            return await readJsonResponseWithLimit<unknown>(
                response,
                MOBILE_RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES,
            );
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_onboard_response_parse_failed', error, {
                ...context,
                maxBytes: MOBILE_RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES,
                responseOk: response.ok,
                responseStatus: response.status,
            });
            return null;
        }
    };

    const updateDraft = (field: keyof OnboardDraft, value: string) => {
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const amountLabel = () => {
        if (!selectedTier) return 'Select a tier';
        const locationCount = Math.max(1, Number(draft.locationCount || 1));
        if (draft.paymentMode === 'offline' && draft.commitmentMonths) {
            return `${formatInrPaise(calculateOfflineAmount(selectedTier.id, Number(draft.commitmentMonths), locationCount))} one-time prepaid`;
        }
        if (draft.billingInterval === 'YEAR') {
            return `${formatInrPaise(selectedTier.yearlyPriceINR * locationCount)}/year recurring`;
        }
        return `${formatInrPaise(selectedTier.monthlyPriceINR * locationCount)}/month recurring`;
    };

    const validateStep = () => {
        if (step === 0) {
            if (
                !draft.businessName.trim()
                || !draft.businessType
                || normalizedOwnerPhone.phoneUsername.length < 10
                || normalizedOwnerPhone.phoneUsername.length > 15
                || draft.ownerPassword.length < 6
            ) {
                Toast.show({ content: 'Business name, type, phone, and password are required.', duration: 2200 });
                return false;
            }
        }
        if (step === 1) {
            if (!draft.pricingTier || !draft.paymentMode) {
                Toast.show({ content: 'Select a pricing tier and payment mode.', duration: 2200 });
                return false;
            }
            if (Number(draft.locationCount || 1) < 1) {
                Toast.show({ content: 'Enter number of locations.', duration: 2200 });
                return false;
            }
            if (draft.paymentMode === 'offline' && !draft.commitmentMonths) {
                Toast.show({ content: 'Select a duration for offline payment.', duration: 2200 });
                return false;
            }
        }
        return true;
    };

    const next = () => {
        if (!validateStep()) return;
        setStep((current) => Math.min(current + 1, 2));
    };

    const submit = async () => {
        if (!validateStep()) return;
        setLoading(true);
        const onboardLogContext = buildResellerOnboardingLogContext('onboard_client', {
            billingInterval: draft.billingInterval,
        });
        try {
            const response = await fetch('/api/reseller/onboard', {
                ...RESELLER_REQUEST_POLICY,
                body: JSON.stringify({
                    billingInterval: draft.billingInterval,
                    businessName: draft.businessName.trim(),
                    businessType: draft.businessType,
                    commitmentMonths: draft.commitmentMonths ? Number(draft.commitmentMonths) : undefined,
                    ownerEmail: draft.ownerEmail.trim() || undefined,
                    ownerCountryCode: normalizedOwnerPhone.countryCode,
                    ownerDialCode: normalizedOwnerPhone.dialCode,
                    ownerPassword: draft.ownerPassword,
                    ownerPhone: normalizedOwnerPhone.phoneNumber,
                    paymentMode: draft.paymentMode,
                    pricingTier: draft.pricingTier,
                    locationCount: Math.max(1, Number(draft.locationCount || 1)),
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await readMobileOnboardResponse(response, onboardLogContext);
            if (!response.ok) {
                throw createMobileResellerOnboardStatusError('mobile_reseller_onboard_rejected', response.status);
            }
            if (!isValidMobileOnboardResult(data)) {
                const invalidResponseError = createMobileResellerOnboardStatusError(
                    'mobile_reseller_onboard_response_invalid',
                    response.status,
                );
                logMobileOwnerFailure('mobile_reseller_onboard_response_invalid', invalidResponseError, {
                    ...onboardLogContext,
                    responseOk: response.ok,
                    responseStatus: response.status,
                });
                throw invalidResponseError;
            }
            setResult(data);
            Toast.show({ content: 'Client onboarded successfully', duration: 1800, icon: 'success' });
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_onboard_failed', error, onboardLogContext);
            Toast.show({ content: 'Could not onboard client', duration: 2600 });
        } finally {
            setLoading(false);
        }
    };

    const copyLink = async (
        link: string,
        label: string,
        linkKind: MobileResellerOnboardingHandoffKind,
    ) => {
        if (!link) return;
        try {
            await copyMobileResellerOnboardingText(link);
            Toast.show({ content: `${label} copied`, duration: 1600, icon: 'success' });
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_onboarding_copy_failed', error, buildResellerOnboardingLogContext('copy_result_value', {
                linkKind,
                ...getBoundedMobileOwnerStringContext('copyValue', link),
                ...getBoundedMobileOwnerStringContext('storeId', result?.storeId),
                ...getBoundedMobileOwnerStringContext('tenantId', result?.tenantId),
                ...getBoundedMobileOwnerStringContext('subscriptionId', result?.subscriptionId),
                hasClipboardWrite: hasMobileResellerOnboardingClipboardWrite(),
                hasCopyFallback: hasMobileResellerOnboardingCopyFallback(),
            }));
            Toast.show({ content: `Could not copy ${label.toLowerCase()}`, duration: 2200 });
        }
    };

    const shareLink = async (
        link: string,
        title: string,
        linkKind: MobileResellerOnboardingHandoffKind,
    ) => {
        if (!link) return;
        if (navigator.share) {
            try {
                await navigator.share({ text: link, title, url: link });
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                logMobileOwnerFailure('mobile_reseller_onboarding_share_failed', error, buildResellerOnboardingLogContext('share_result_value', {
                    linkKind,
                    usedNativeShare: true,
                    ...getBoundedMobileOwnerStringContext('shareLink', link),
                    ...getBoundedMobileOwnerStringContext('shareTitle', title),
                    ...getBoundedMobileOwnerStringContext('storeId', result?.storeId),
                    ...getBoundedMobileOwnerStringContext('tenantId', result?.tenantId),
                    ...getBoundedMobileOwnerStringContext('subscriptionId', result?.subscriptionId),
                }));
                Toast.show({ content: 'Could not share link', duration: 2200 });
            }
            return;
        }
        await copyLink(link, title, linkKind);
    };

    if (result) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader description="The client account was created." onBack={onBack} title="Onboarding Complete" />
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card>
                        <Result
                            status="success"
                            title="Client onboarded"
                            subTitle={`Store ${result.storeId} · ${result.status}${result.locationCount ? ` · ${result.locationCount} location${result.locationCount > 1 ? 's' : ''}` : ''}`}
                        />
                    </Card>
                    {result.shortUrl ? (
                        <Card title="Payment link">
                            <Flex gap={10} vertical>
                                <Text style={{ wordBreak: 'break-word' }}>{result.shortUrl}</Text>
                                <Flex gap={10}>
                                    <Button block fill="outline" onClick={() => void copyLink(result.shortUrl || '', 'Payment link', 'payment_link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy</Flex></Button>
                                    <Button block onClick={() => void shareLink(result.shortUrl || '', 'MenuList payment link', 'payment_link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuShare2 size={16} /> Share</Flex></Button>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}
                    {(result.loginEmail || result.ownerUsername) ? (
                        <Card title="Client login">
                            <Flex gap={10} vertical>
                                {result.ownerUsername ? (
                                    <Flex align="center" justify="space-between" gap={10}>
                                        <Flex gap={6} style={{ minWidth: 0 }} vertical>
                                            <Text type="secondary">Username</Text>
                                            <Text style={{ wordBreak: 'break-word' }}>{result.ownerUsername}</Text>
                                        </Flex>
                                        <Button aria-label="Copy username" fill="outline" onClick={() => void copyLink(result.ownerUsername || '', 'Username', 'owner_username')} style={{ minHeight: 44, minWidth: 44, paddingInline: 12 }}><LuCopy size={16} /></Button>
                                    </Flex>
                                ) : null}
                                {result.loginEmail ? (
                                    <Flex align="center" justify="space-between" gap={10}>
                                        <Flex gap={6} style={{ minWidth: 0 }} vertical>
                                            <Text type="secondary">Login email</Text>
                                            <Text style={{ wordBreak: 'break-word' }}>{result.loginEmail}</Text>
                                        </Flex>
                                        <Button aria-label="Copy login email" fill="outline" onClick={() => void copyLink(result.loginEmail || '', 'Login email', 'login_email')} style={{ minHeight: 44, minWidth: 44, paddingInline: 12 }}><LuCopy size={16} /></Button>
                                    </Flex>
                                ) : null}
                                <Flex align="center" justify="space-between" gap={10}>
                                    <Flex gap={6} style={{ minWidth: 0 }} vertical>
                                        <Text type="secondary">Password</Text>
                                        <Text style={{ wordBreak: 'break-word' }}>{draft.ownerPassword}</Text>
                                    </Flex>
                                    <Button aria-label="Copy password" fill="outline" onClick={() => void copyLink(draft.ownerPassword, 'Password', 'owner_password')} style={{ minHeight: 44, minWidth: 44, paddingInline: 12 }}><LuCopy size={16} /></Button>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}
                    {result.dashboardUrl ? (
                        <Card title="Client dashboard link">
                            <Flex gap={10} vertical>
                                <Text style={{ wordBreak: 'break-word' }}>{result.dashboardUrl}</Text>
                                <Flex gap={10}>
                                    <Button block fill="outline" onClick={() => void copyLink(result.dashboardUrl || '', 'Dashboard link', 'dashboard_link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy</Flex></Button>
                                    <Button block onClick={() => void shareLink(result.dashboardUrl || '', 'MenuList dashboard link', 'dashboard_link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuShare2 size={16} /> Share</Flex></Button>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}
                    {result.publicUrl ? (
                        <Card title="Public menu link">
                            <Flex gap={10} vertical>
                                <Text style={{ wordBreak: 'break-word' }}>{result.publicUrl}</Text>
                                <Flex gap={10}>
                                    <Button block fill="outline" onClick={() => void copyLink(result.publicUrl || '', 'Public link', 'public_link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy</Flex></Button>
                                    <Button block onClick={() => void shareLink(result.publicUrl || '', 'MenuList public menu link', 'public_link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuShare2 size={16} /> Share</Flex></Button>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}
                    <Button block onClick={() => {
                        setDraft(initialDraft);
                        setResult(null);
                        setStep(0);
                    }} style={{ minHeight: 44 }}>Onboard Another Client</Button>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader description="Create a client account, select a plan, and activate payment." onBack={onBack} title="Onboard Client" />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">Step {step + 1} of 3</Text>
                        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                            {['Business', 'Plan', 'Confirm'].map((label, index) => (
                                <div
                                    key={label}
                                    style={{
                                        background: index <= step ? token.colorPrimary : token.colorFillSecondary,
                                        borderRadius: 999,
                                        color: index <= step ? token.colorTextLightSolid : token.colorTextSecondary,
                                        fontSize: 12,
                                        minHeight: 32,
                                        padding: '6px 8px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {label}
                                </div>
                            ))}
                        </div>
                    </Flex>
                </Card>

                {step === 0 ? (
                    <Card title="Business details">
                        <Flex gap={10} vertical>
                            <Input onChange={(value) => updateDraft('businessName', value)} placeholder="Business name" value={draft.businessName} />
                            <Select onChange={(value) => updateDraft('businessType', value)} options={businessTypeOptions} placeholder="Business type" value={draft.businessType} />
                            <Select
                                onChange={(value) => {
                                    updateDraft('ownerCountryCode', value);
                                    updateDraft('ownerDialCode', getDialCodeForCountry(value));
                                }}
                                options={getUniquePhoneCountries().map((country) => ({
                                    label: `${country.flag} ${country.code} (${country.dialCode})`,
                                    value: country.code,
                                }))}
                                placeholder="Country code"
                                value={draft.ownerCountryCode}
                            />
                            <Input inputMode="tel" onChange={(value) => updateDraft('ownerPhone', value)} placeholder="Owner phone" type="tel" value={draft.ownerPhone} />
                            <Input inputMode="email" onChange={(value) => updateDraft('ownerEmail', value)} placeholder="Owner email (optional)" type="email" value={draft.ownerEmail} />
                            <Input onChange={(value) => updateDraft('ownerPassword', value)} placeholder="Owner login password" type="password" value={draft.ownerPassword} />
                        </Flex>
                    </Card>
                ) : null}

                {step === 1 ? (
                    <Flex gap={12} vertical>
                        <Card title="Pricing tier">
                            <Flex gap={10} vertical>
                                {tiers.map((tier) => (
                                    <Card
                                        key={tier.id}
                                        onClick={() => updateDraft('pricingTier', tier.id)}
                                        style={{
                                            borderColor: draft.pricingTier === tier.id ? token.colorPrimary : undefined,
                                            boxShadow: draft.pricingTier === tier.id ? `0 0 0 1px ${token.colorPrimary}` : undefined,
                                        }}
                                    >
                                        <Flex align="center" justify="space-between">
                                            <Flex gap={2} vertical>
                                                <Text strong>{tier.name}</Text>
                                                <Text type="secondary">{tier.description}</Text>
                                            </Flex>
                                            <Tag>{formatInrPaise(tier.monthlyPriceINR)}/mo</Tag>
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>
                        </Card>

                        <Card title="Payment mode">
                            <Flex gap={10} vertical>
                                {[
                                    { label: 'Online', value: 'online', desc: 'Generate a Razorpay recurring link for the client.' },
                                    { label: 'Offline', value: 'offline', desc: 'One-time prepaid cash or UPI collected by reseller.' },
                                ].map((mode) => (
                                    <Card key={mode.value} onClick={() => updateDraft('paymentMode', mode.value)} style={{ borderColor: draft.paymentMode === mode.value ? token.colorPrimary : undefined }}>
                                        <Flex align="center" justify="space-between">
                                            <Flex gap={2} vertical>
                                                <Text strong>{mode.label}</Text>
                                                <Text type="secondary">{mode.desc}</Text>
                                            </Flex>
                                            {draft.paymentMode === mode.value ? <LuCheck color={token.colorPrimary} size={18} /> : null}
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>
                        </Card>

                        <Card title="Locations included">
                            <Flex gap={8} vertical>
                                <Input
                                    inputMode="numeric"
                                    onChange={(value) => updateDraft('locationCount', value.replace(/[^0-9]/g, ''))}
                                    placeholder="1"
                                    type="number"
                                    value={draft.locationCount}
                                />
                                <Text type="secondary">The client gets this many paid location seats. Add more later from the reseller dashboard.</Text>
                            </Flex>
                        </Card>

                        {draft.paymentMode === 'online' ? (
                            <>
                                <Card title="Billing interval">
                                    <Flex gap={10}>
                                        {(['MONTH', 'YEAR'] as BillingInterval[]).map((interval) => (
                                            <Button key={interval} block fill={draft.billingInterval === interval ? 'solid' : 'outline'} onClick={() => updateDraft('billingInterval', interval)} style={{ minHeight: 44 }}>
                                                {interval === 'MONTH' ? 'Monthly' : 'Yearly'}
                                            </Button>
                                        ))}
                                    </Flex>
                                </Card>
                                <Card title="Commitment period">
                                    <Flex gap={10} wrap="wrap">
                                        <Button fill={!draft.commitmentMonths ? 'solid' : 'outline'} onClick={() => updateDraft('commitmentMonths', '')} style={{ minHeight: 44 }}>
                                            Optional
                                        </Button>
                                        {RESELLER_COMMITMENT_OPTIONS.map((months) => (
                                            <Button key={months} fill={draft.commitmentMonths === String(months) ? 'solid' : 'outline'} onClick={() => updateDraft('commitmentMonths', String(months))} style={{ minHeight: 44 }}>
                                                {months} months
                                            </Button>
                                        ))}
                                    </Flex>
                                    <Text type="secondary">For online billing this is tracking only. Razorpay still charges on the selected recurring interval.</Text>
                                </Card>
                            </>
                        ) : null}

                        {draft.paymentMode === 'offline' ? (
                            <Card title="One-time prepaid duration">
                                <Flex gap={10} wrap="wrap">
                                    {RESELLER_COMMITMENT_OPTIONS.map((months) => (
                                        <Button key={months} fill={draft.commitmentMonths === String(months) ? 'solid' : 'outline'} onClick={() => updateDraft('commitmentMonths', String(months))} style={{ minHeight: 44 }}>
                                            {months} months
                                        </Button>
                                    ))}
                                </Flex>
                            </Card>
                        ) : null}
                    </Flex>
                ) : null}

                {step === 2 ? (
                    <Card title="Confirm onboarding">
                        <Flex gap={10} vertical>
                            <Flex justify="space-between"><Text type="secondary">Business</Text><Text strong>{draft.businessName}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Type</Text><Text strong>{draft.businessType}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Phone</Text><Text strong>{normalizedOwnerPhone.displayNumber || draft.ownerPhone}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Username</Text><Text strong>{normalizedOwnerPhone.phoneUsername}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Tier</Text><Text strong>{selectedTier?.name || draft.pricingTier}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Payment</Text><Text strong>{draft.paymentMode === 'online' ? 'Online recurring' : 'Offline prepaid'}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Locations</Text><Text strong>{Math.max(1, Number(draft.locationCount || 1))}</Text></Flex>
                            {draft.commitmentMonths ? (
                                <Flex justify="space-between"><Text type="secondary">{draft.paymentMode === 'online' ? 'Commitment' : 'Duration'}</Text><Text strong>{draft.commitmentMonths} months</Text></Flex>
                            ) : null}
                            <Flex justify="space-between"><Text type="secondary">Amount</Text><Text strong>{amountLabel()}</Text></Flex>
                            <Card style={{ background: draft.paymentMode === 'offline' ? token.colorWarningBg : token.colorPrimaryBg }}>
                                <Text>
                                    {draft.paymentMode === 'offline'
                                        ? `Confirm only after collecting ${amountLabel()} from the client. Access ends after the selected prepaid duration.`
                                        : 'A Razorpay recurring payment link will be created for the client.'}
                                </Text>
                            </Card>
                        </Flex>
                    </Card>
                ) : null}

                <Flex gap={10}>
                    <Button block disabled={step === 0} fill="outline" onClick={() => setStep((current) => Math.max(current - 1, 0))} style={{ minHeight: 44 }}>Back</Button>
                    {step < 2 ? (
                        <Button block onClick={next} style={{ minHeight: 44 }}>
                            <Flex align="center" gap={6} justify="center">Next <LuChevronRight size={16} /></Flex>
                        </Button>
                    ) : (
                        <Button block loading={loading} onClick={submit} style={{ minHeight: 44 }}>
                            {draft.paymentMode === 'offline' ? 'Confirm Prepaid' : 'Create Link'}
                        </Button>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
}
