'use client';

import { FEATURE_FLAGS } from '@config/features';
import type { Currency, PlanType } from '@data/common';
import { normalizeBillingProfile, type BillingProfile } from '@data/shared/billingTaxPolicy';
import { INDIAN_GST_STATES } from '@data/shared/indianGstStates';
import countryData from '@atoms/phoneNumberInput/countryData';
import type { SelfReportedDiscoveryChannel } from '@data/shared/selfReportedDiscovery';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Button } from '@shadcncomponents/button';
import { Dialog, DialogContent, DialogHeader } from '@shadcncomponents/dialog';
import { Input } from '@shadcncomponents/input';
import { Label } from '@shadcncomponents/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcncomponents/select';
import { useToast } from '@shadcnhooks/use-toast';
import { resolveBusinessDayEndTime } from '@lib/analytics/businessDay';
import { IMAGE_VIEW_TYPES } from '@template/main-app/projects/editorView/AiImageGenerator/imageViewType';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuBuilding2 } from 'react-icons/lu';
import { buildCurrentWebsiteSignInPath } from '@/lib/website/signInLinks';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (details: { billingProfile: BillingProfile; businessName: string; businessIndustry: string; timeZone?: string; businessDayEndTime?: string; selfReportedDiscoveryChannel?: SelfReportedDiscoveryChannel }) => void;
    businessType: PlanType;
    currency: Currency;
    collectBusinessDetails?: boolean;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    businessType,
    currency,
    collectBusinessDetails = true,
}) => {
    const t = useTranslations('Website');
    const commonT = useTranslations('Common');
    const { toast } = useToast();
    const [businessName, setBusinessName] = useState('');
    const [businessIndustry, setBusinessIndustry] = useState('');
    const [timeZone, setTimeZone] = useState('');
    const [selfReportedDiscoveryChannel, setSelfReportedDiscoveryChannel] = useState<SelfReportedDiscoveryChannel | ''>('');
    const [step, setStep] = useState<'business' | 'billing'>(collectBusinessDetails ? 'business' : 'billing');
    const [billingProfile, setBillingProfile] = useState<BillingProfile>({
        legalName: '', email: '', countryCode: currency === 'INR' ? 'IN' : 'US', addressLine1: '',
        city: '', region: '', indianStateCode: currency === 'INR' ? '' : undefined, postalCode: '',
    });
    const { data: session } = useSession();

    useEffect(() => {
        try {
            setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        } catch {
            setTimeZone('');
        }
    }, []);

    useEffect(() => {
        setBillingProfile((current) => ({
            ...current,
            countryCode: currency === 'INR' ? 'IN' : (current.countryCode === 'IN' ? 'US' : current.countryCode),
            email: current.email || session?.user?.email || '',
            indianStateCode: currency === 'INR' ? current.indianStateCode || '' : undefined,
        }));
    }, [currency, session?.user?.email]);

    useEffect(() => {
        if (isOpen) setStep(collectBusinessDetails ? 'business' : 'billing');
    }, [collectBusinessDetails, isOpen]);

    const handleSubmit = () => {
        const normalizedName = businessName.trim();
        const normalizedIndustry = businessIndustry.trim();
        if (collectBusinessDetails && !normalizedName) {
            toast({ variant: 'destructive', title: t('Pricing.setupErrorTitle'), description: t('Pricing.businessNameRequired') });
            return;
        }
        if (collectBusinessDetails && !normalizedIndustry) {
            toast({ variant: 'destructive', title: t('Pricing.setupErrorTitle'), description: t('Pricing.businessIndustryRequired') });
            return;
        }

        if (collectBusinessDetails && step === 'business') {
            setStep('billing');
            return;
        }

        let normalizedBillingProfile: BillingProfile;
        try {
            normalizedBillingProfile = normalizeBillingProfile({
                ...billingProfile,
                legalName: billingProfile.legalName || normalizedName || session?.user?.name || '',
            });
        } catch {
            toast({
                variant: 'destructive',
                title: t('Pricing.setupErrorTitle'),
                description: t('Pricing.billingDetailsRequired'),
            });
            return;
        }

        onSubmit({
            billingProfile: normalizedBillingProfile,
            businessName: normalizedName || normalizedBillingProfile.legalName,
            businessIndustry: normalizedIndustry || 'Existing business',
            timeZone,
            businessDayEndTime: resolveBusinessDayEndTime(normalizedIndustry),
            selfReportedDiscoveryChannel: selfReportedDiscoveryChannel || undefined,
        });
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader className="text-left">
                    <div
                        aria-hidden="true"
                        className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                        <LuBuilding2 size={22} />
                    </div>
                    <DialogTitle className="text-2xl font-bold">
                        {step === 'business' ? t('Pricing.setupModalTitle') : t('Pricing.billingDetailsTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'business' ? t('Pricing.setupModalBody') : t('Pricing.billingDetailsBody')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    {step === 'business' ? <div className="grid w-full items-center gap-2">
                        <Label htmlFor="businessName">{t('Pricing.businessNameLabel')}</Label>
                        <Input
                            id="businessName"
                            autoComplete="organization"
                            value={businessName}
                            onChange={(event) => setBusinessName(event.target.value)}
                            placeholder={t('Pricing.businessNamePlaceholder')}
                        />
                    </div> : null}

                    {step === 'business' ? <div className="grid w-full items-center gap-2">
                        <Label htmlFor="businessIndustry">{t('Pricing.businessIndustryLabel')}</Label>
                        <Select onValueChange={setBusinessIndustry} value={businessIndustry}>
                            <SelectTrigger id="businessIndustry" className="industry-dropdown w-full justify-between">
                                <SelectValue placeholder={t('Pricing.businessIndustryPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {businessType === 'B2C' ? IMAGE_VIEW_TYPES.map((type) => (
                                    <SelectItem key={type.businessType} value={type.businessType}>
                                        {type.businessType}
                                    </SelectItem>
                                )) : (
                                    <>
                                        <SelectItem value="POS Software">{t('Pricing.industryPos')}</SelectItem>
                                        <SelectItem value="Marketing Agency">{t('Pricing.industryAgency')}</SelectItem>
                                        <SelectItem value="SaaS Company">{t('Pricing.industrySaas')}</SelectItem>
                                        <SelectItem value="Other">{t('Pricing.industryOther')}</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div> : null}

                    {step === 'business' && FEATURE_FLAGS.ENABLE_MENULIST_SELF_REPORTED_DISCOVERY && (
                        <div className="grid w-full items-center gap-2">
                            <Label htmlFor="selfReportedDiscoveryChannel">{t('Pricing.discoverySourceLabel')}</Label>
                            <Select
                                onValueChange={(value) => setSelfReportedDiscoveryChannel(value as SelfReportedDiscoveryChannel)}
                                value={selfReportedDiscoveryChannel}
                            >
                                <SelectTrigger id="selfReportedDiscoveryChannel" className="w-full justify-between">
                                    <SelectValue placeholder={t('Pricing.discoverySourcePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                                    <SelectItem value="claude">Claude</SelectItem>
                                    <SelectItem value="gemini">Gemini</SelectItem>
                                    <SelectItem value="microsoft_copilot">Microsoft Copilot</SelectItem>
                                    <SelectItem value="perplexity">Perplexity</SelectItem>
                                    <SelectItem value="search_engine">{t('Pricing.discoverySourceSearch')}</SelectItem>
                                    <SelectItem value="social_or_community">{t('Pricing.discoverySourceSocial')}</SelectItem>
                                    <SelectItem value="friend_or_colleague">{t('Pricing.discoverySourceReferral')}</SelectItem>
                                    <SelectItem value="other">{t('Pricing.discoverySourceOther')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {step === 'billing' ? <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="billingLegalName">{t('Pricing.billingLegalNameLabel')}</Label>
                            <Input id="billingLegalName" autoComplete="organization" value={billingProfile.legalName} onChange={(event) => setBillingProfile((current) => ({ ...current, legalName: event.target.value }))} placeholder={businessName || t('Pricing.billingLegalNamePlaceholder')} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="billingEmail">{t('Pricing.billingEmailLabel')}</Label>
                            <Input id="billingEmail" autoComplete="email" inputMode="email" value={billingProfile.email} onChange={(event) => setBillingProfile((current) => ({ ...current, email: event.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="billingCountry">{t('Pricing.billingCountryLabel')}</Label>
                            <Select value={billingProfile.countryCode} onValueChange={(countryCode) => setBillingProfile((current) => ({ ...current, countryCode: countryCode === 'UK' ? 'GB' : countryCode }))}>
                                <SelectTrigger id="billingCountry"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {countryData.filter((country) => currency === 'INR' ? country.code === 'IN' : country.code !== 'IN').map((country) => (
                                        <SelectItem key={country.code} value={country.code === 'UK' ? 'GB' : country.code}>{country.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="billingAddressLine1">{t('Pricing.billingAddressLabel')}</Label>
                            <Input id="billingAddressLine1" autoComplete="address-line1" value={billingProfile.addressLine1} onChange={(event) => setBillingProfile((current) => ({ ...current, addressLine1: event.target.value }))} />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="billingAddressLine2">{t('Pricing.billingAddress2Label')}</Label>
                            <Input id="billingAddressLine2" autoComplete="address-line2" value={billingProfile.addressLine2 || ''} onChange={(event) => setBillingProfile((current) => ({ ...current, addressLine2: event.target.value || undefined }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="billingCity">{t('Pricing.billingCityLabel')}</Label>
                            <Input id="billingCity" autoComplete="address-level2" value={billingProfile.city} onChange={(event) => setBillingProfile((current) => ({ ...current, city: event.target.value }))} />
                        </div>
                        {currency === 'INR' ? (
                            <div className="grid gap-2">
                                <Label htmlFor="billingState">{t('Pricing.billingStateLabel')}</Label>
                                <Select value={billingProfile.indianStateCode || ''} onValueChange={(indianStateCode) => setBillingProfile((current) => ({ ...current, indianStateCode, region: INDIAN_GST_STATES.find((state) => state.code === indianStateCode)?.name || '' }))}>
                                    <SelectTrigger id="billingState"><SelectValue placeholder={t('Pricing.billingStatePlaceholder')} /></SelectTrigger>
                                    <SelectContent>{INDIAN_GST_STATES.map((state) => <SelectItem key={state.code} value={state.code}>{state.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="billingRegion">{t('Pricing.billingRegionLabel')}</Label>
                                <Input id="billingRegion" autoComplete="address-level1" value={billingProfile.region} onChange={(event) => setBillingProfile((current) => ({ ...current, region: event.target.value }))} />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="billingPostalCode">{t('Pricing.billingPostalCodeLabel')}</Label>
                            <Input id="billingPostalCode" autoComplete="postal-code" value={billingProfile.postalCode} onChange={(event) => setBillingProfile((current) => ({ ...current, postalCode: event.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="billingTaxId">{currency === 'INR' ? t('Pricing.billingGstinLabel') : t('Pricing.billingTaxIdLabel')}</Label>
                            <Input id="billingTaxId" value={billingProfile.taxId || ''} onChange={(event) => setBillingProfile((current) => ({ ...current, taxId: event.target.value || undefined, taxIdType: event.target.value ? (currency === 'INR' ? 'GSTIN' : 'OTHER') : undefined }))} />
                        </div>
                    </div> : null}

                    <p className="text-sm text-muted-foreground">
                        {step === 'business' ? t('Pricing.setupModalNote') : t('Pricing.billingDetailsBody')}
                    </p>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        {collectBusinessDetails && step === 'billing' ? (
                            <Button className="sm:w-auto" onClick={() => setStep('business')} size="lg" type="button" variant="outline">
                                <LuArrowLeft className="mr-2 h-5 w-5" />
                                {commonT('back')}
                            </Button>
                        ) : null}
                        <Button onClick={handleSubmit} className="flex-1 text-base" size="lg">
                            {step === 'business'
                                ? t('Pricing.continue')
                                : Boolean(session?.user) ? t('Pricing.continue') : t('Pricing.continueToSignIn')}
                            <LuArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                    {!session?.user ? <p className="text-center text-sm text-muted-foreground">
                        {t('Pricing.haveAccount')}{' '}
                        <button
                            className="cursor-pointer border-0 bg-transparent p-0 text-primary underline-offset-4 hover:underline"
                            onClick={() => window.location.assign(buildCurrentWebsiteSignInPath())}
                            type="button"
                        >
                            {t('Pricing.signIn')}
                        </button>
                    </p> : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingModal;
