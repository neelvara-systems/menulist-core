'use client'

import { calculateOfflineAmount, getActiveResellerTiers, RESELLER_COMMITMENT_OPTIONS } from '@config/resellerPricing';
import { BUSINESS_TYPES } from '@constant/common';
import { useMemo, useState } from 'react';
import { LuCheck, LuChevronRight, LuCopy, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, Input, Result, Select, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

type PaymentMode = 'online' | 'offline';
type BillingInterval = 'MONTH' | 'YEAR';

type OnboardDraft = {
    billingInterval: BillingInterval;
    businessName: string;
    businessType: string;
    commitmentMonths: string;
    locationCount: string;
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

const initialDraft: OnboardDraft = {
    billingInterval: 'MONTH',
    businessName: '',
    businessType: '',
    commitmentMonths: '',
    locationCount: '1',
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
    paymentMode: '',
    pricingTier: '',
};

function formatMoney(paise?: number) {
    return `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
}

export default function MobileResellerOnboardingScreen({ onBack }: { onBack: () => void }) {
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

    const updateDraft = (field: keyof OnboardDraft, value: string) => {
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const amountLabel = () => {
        if (!selectedTier) return 'Select a tier';
        const locationCount = Math.max(1, Number(draft.locationCount || 1));
        if (draft.paymentMode === 'offline' && draft.commitmentMonths) {
            return `${formatMoney(calculateOfflineAmount(selectedTier.id, Number(draft.commitmentMonths), locationCount))} one-time prepaid`;
        }
        if (draft.billingInterval === 'YEAR') {
            return `${formatMoney(selectedTier.yearlyPriceINR * locationCount)}/year recurring`;
        }
        return `${formatMoney(selectedTier.monthlyPriceINR * locationCount)}/month recurring`;
    };

    const validateStep = () => {
        if (step === 0) {
            if (!draft.businessName.trim() || !draft.businessType || draft.ownerPhone.trim().length < 10 || draft.ownerPassword.length < 6) {
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
        try {
            const response = await fetch('/api/reseller/onboard', {
                body: JSON.stringify({
                    billingInterval: draft.billingInterval,
                    businessName: draft.businessName.trim(),
                    businessType: draft.businessType,
                    commitmentMonths: draft.commitmentMonths ? Number(draft.commitmentMonths) : undefined,
                    ownerEmail: draft.ownerEmail.trim() || undefined,
                    ownerPassword: draft.ownerPassword,
                    ownerPhone: draft.ownerPhone.trim(),
                    paymentMode: draft.paymentMode,
                    pricingTier: draft.pricingTier,
                    locationCount: Math.max(1, Number(draft.locationCount || 1)),
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Could not onboard client');
            setResult(data);
            Toast.show({ content: 'Client onboarded successfully', duration: 1800, icon: 'success' });
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not onboard client', duration: 2600 });
        } finally {
            setLoading(false);
        }
    };

    const copyLink = async (link: string, label: string) => {
        await navigator.clipboard.writeText(link);
        Toast.show({ content: `${label} copied`, duration: 1600, icon: 'success' });
    };

    const shareLink = async (link: string, title: string) => {
        if (navigator.share) {
            await navigator.share({ text: link, title, url: link });
            return;
        }
        await copyLink(link, title);
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
                                <Text copyable>{result.shortUrl}</Text>
                                <Flex gap={10}>
                                    <Button block fill="outline" onClick={() => copyLink(result.shortUrl || '', 'Payment link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy</Flex></Button>
                                    <Button block onClick={() => shareLink(result.shortUrl || '', 'MenuList payment link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuShare2 size={16} /> Share</Flex></Button>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}
                    {(result.loginEmail || result.ownerUsername) ? (
                        <Card title="Client login">
                            <Flex gap={10} vertical>
                                {result.ownerUsername ? (
                                    <Flex gap={6} vertical>
                                        <Text type="secondary">Username</Text>
                                        <Text copyable>{result.ownerUsername}</Text>
                                    </Flex>
                                ) : null}
                                {result.loginEmail ? (
                                    <Flex gap={6} vertical>
                                        <Text type="secondary">Login email</Text>
                                        <Text copyable>{result.loginEmail}</Text>
                                    </Flex>
                                ) : null}
                                <Flex gap={6} vertical>
                                    <Text type="secondary">Password</Text>
                                    <Text copyable>{draft.ownerPassword}</Text>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}
                    {result.dashboardUrl ? (
                        <Card title="Client dashboard link">
                            <Flex gap={10} vertical>
                                <Text copyable>{result.dashboardUrl}</Text>
                                <Flex gap={10}>
                                    <Button block fill="outline" onClick={() => copyLink(result.dashboardUrl || '', 'Dashboard link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy</Flex></Button>
                                    <Button block onClick={() => shareLink(result.dashboardUrl || '', 'MenuList dashboard link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuShare2 size={16} /> Share</Flex></Button>
                                </Flex>
                            </Flex>
                        </Card>
                    ) : null}
                    {result.publicUrl ? (
                        <Card title="Public menu link">
                            <Flex gap={10} vertical>
                                <Text copyable>{result.publicUrl}</Text>
                                <Flex gap={10}>
                                    <Button block fill="outline" onClick={() => copyLink(result.publicUrl || '', 'Public link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy</Flex></Button>
                                    <Button block onClick={() => shareLink(result.publicUrl || '', 'MenuList public menu link')} style={{ minHeight: 44 }}><Flex align="center" gap={6} justify="center"><LuShare2 size={16} /> Share</Flex></Button>
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
                                        background: index <= step ? '#0054D0' : '#e5e7eb',
                                        borderRadius: 999,
                                        color: index <= step ? '#fff' : '#64748b',
                                        fontSize: 12,
                                        minHeight: 28,
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
                            <Input inputMode="tel" onChange={(value) => updateDraft('ownerPhone', value)} placeholder="Owner phone" value={draft.ownerPhone} />
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
                                            borderColor: draft.pricingTier === tier.id ? '#0054D0' : undefined,
                                            boxShadow: draft.pricingTier === tier.id ? '0 0 0 1px #0054D0' : undefined,
                                        }}
                                    >
                                        <Flex align="center" justify="space-between">
                                            <Flex gap={2} vertical>
                                                <Text strong>{tier.name}</Text>
                                                <Text type="secondary">{tier.description}</Text>
                                            </Flex>
                                            <Tag>{formatMoney(tier.monthlyPriceINR)}/mo</Tag>
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
                                    <Card key={mode.value} onClick={() => updateDraft('paymentMode', mode.value)} style={{ borderColor: draft.paymentMode === mode.value ? '#0054D0' : undefined }}>
                                        <Flex align="center" justify="space-between">
                                            <Flex gap={2} vertical>
                                                <Text strong>{mode.label}</Text>
                                                <Text type="secondary">{mode.desc}</Text>
                                            </Flex>
                                            {draft.paymentMode === mode.value ? <LuCheck color="#0054D0" size={18} /> : null}
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
                            <Flex justify="space-between"><Text type="secondary">Phone</Text><Text strong>{draft.ownerPhone}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Username</Text><Text strong>{draft.ownerPhone.replace(/[^0-9]/g, '')}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Tier</Text><Text strong>{selectedTier?.name || draft.pricingTier}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Payment</Text><Text strong>{draft.paymentMode === 'online' ? 'Online recurring' : 'Offline prepaid'}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Locations</Text><Text strong>{Math.max(1, Number(draft.locationCount || 1))}</Text></Flex>
                            {draft.commitmentMonths ? (
                                <Flex justify="space-between"><Text type="secondary">{draft.paymentMode === 'online' ? 'Commitment' : 'Duration'}</Text><Text strong>{draft.commitmentMonths} months</Text></Flex>
                            ) : null}
                            <Flex justify="space-between"><Text type="secondary">Amount</Text><Text strong>{amountLabel()}</Text></Flex>
                            <Card style={{ background: draft.paymentMode === 'offline' ? '#fff7e6' : '#eff6ff' }}>
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
