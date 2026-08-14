'use client';

import { FEATURE_FLAGS } from '@config/features';
import type { PlanType } from '@data/common';
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
import { LuArrowRight, LuBuilding2 } from 'react-icons/lu';
import { buildCurrentWebsiteSignInPath } from '@/lib/website/signInLinks';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (details: { businessName: string; businessIndustry: string; timeZone?: string; businessDayEndTime?: string; selfReportedDiscoveryChannel?: SelfReportedDiscoveryChannel }) => void;
    businessType: PlanType;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSubmit, businessType }) => {
    const t = useTranslations('Website');
    const { toast } = useToast();
    const [businessName, setBusinessName] = useState('');
    const [businessIndustry, setBusinessIndustry] = useState('');
    const [timeZone, setTimeZone] = useState('');
    const [selfReportedDiscoveryChannel, setSelfReportedDiscoveryChannel] = useState<SelfReportedDiscoveryChannel | ''>('');
    const { data: session } = useSession();

    useEffect(() => {
        try {
            setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        } catch {
            setTimeZone('');
        }
    }, []);

    const handleSubmit = () => {
        const normalizedName = businessName.trim();
        const normalizedIndustry = businessIndustry.trim();
        if (!normalizedName) {
            toast({ variant: 'destructive', title: t('Pricing.setupErrorTitle'), description: t('Pricing.businessNameRequired') });
            return;
        }
        if (!normalizedIndustry) {
            toast({ variant: 'destructive', title: t('Pricing.setupErrorTitle'), description: t('Pricing.businessIndustryRequired') });
            return;
        }

        onSubmit({
            businessName: normalizedName,
            businessIndustry: normalizedIndustry,
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
            <DialogContent className="max-w-lg">
                <DialogHeader className="text-left">
                    <div
                        aria-hidden="true"
                        className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                        <LuBuilding2 size={22} />
                    </div>
                    <DialogTitle className="text-2xl font-bold">{t('Pricing.setupModalTitle')}</DialogTitle>
                    <DialogDescription>{t('Pricing.setupModalBody')}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    <div className="grid w-full items-center gap-2">
                        <Label htmlFor="businessName">{t('Pricing.businessNameLabel')}</Label>
                        <Input
                            id="businessName"
                            autoComplete="organization"
                            value={businessName}
                            onChange={(event) => setBusinessName(event.target.value)}
                            placeholder={t('Pricing.businessNamePlaceholder')}
                        />
                    </div>

                    <div className="grid w-full items-center gap-2">
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
                    </div>

                    {FEATURE_FLAGS.ENABLE_MENULIST_SELF_REPORTED_DISCOVERY && (
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

                    <p className="text-sm text-muted-foreground">{t('Pricing.setupModalNote')}</p>

                    <Button onClick={handleSubmit} className="w-full text-base" size="lg">
                        {Boolean(session?.user) ? t('Pricing.continue') : t('Pricing.continueToSignIn')}
                        <LuArrowRight className="ml-2 h-5 w-5" />
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        {t('Pricing.haveAccount')}{' '}
                        <button
                            className="cursor-pointer border-0 bg-transparent p-0 text-primary underline-offset-4 hover:underline"
                            onClick={() => window.location.assign(buildCurrentWebsiteSignInPath())}
                            type="button"
                        >
                            {t('Pricing.signIn')}
                        </button>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingModal;
