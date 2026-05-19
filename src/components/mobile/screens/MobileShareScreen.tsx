'use client'

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    LuBookOpen,
    LuCopy,
    LuExternalLink,
    LuLink2,
    LuMessageSquare,
    LuQrCode,
    LuShare2,
    LuShield,
    LuSmartphone,
} from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, Tag, Text, Title, Toast } from '../antd';
import MobileCommunicationKit from '../components/CommunicationKit';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import useViewportInfo from '../../../hooks/useViewportInfo';

type ProjectLink = {
    active?: boolean;
    deleted?: boolean;
    feedbackUrl: string;
    isDefault: boolean;
    isSpecialMenu?: boolean;
    name: string | Record<string, string>;
    projectImage?: string | null;
    projectId: string;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
    url: string;
};

type ShareData = {
    allProjects: ProjectLink[];
    businessType: string;
    feedbackLink: string;
    feedbackQrLink: string;
    hasFeedbackEnabled: boolean;
    hasPosSync: boolean;
    hasPublishedMenu: boolean;
    installAppLink: string | null;
    menuLink: string;
    obpLink: string;
    posSyncStatus: string | null;
    projectId: string | null;
    projectName: string | null;
    storeName: string;
};

type QrSheetState = {
    filename: string;
    helperText: string;
    title: string;
    url: string;
};

interface MobileShareScreenProps {
    onOpenDesignEditor?: () => void;
}

export default function MobileShareScreen({ onOpenDesignEditor }: MobileShareScreenProps) {
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const { storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const t = useTranslations('MobileShare');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const labels = useOfferingLabels();
    const { isLoading: loadingProjects, projectsList, selectedProjectId, selectProject } = useMobileProjects();
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [qrSheet, setQrSheet] = useState<QrSheetState | null>(null);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const resolveProjectName = useCallback(
        (name: string | Record<string, string> | undefined, fallback?: string) =>
            getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback || tProjectSelector('untitled')),
        [tProjectSelector]
    );
    const storeDisplayName = useMemo(
        () => getStoreContextName(storeDetails as any, t('yourBusiness')),
        [storeDetails, t]
    );
    const canManageSharing = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU]);

    const data = useMemo<ShareData | null>(() => {
        if (!storeDetails) return null;

        const projects = projectsList;
        const defaultProject = projects.find((project: any) => project.projectId === selectedProjectId) || null;

        if (!defaultProject) {
            return null;
        }

        const subdomain = storeDetails.subdomain || '';
        const customDomain = storeDetails.customDomain;
        const obpLink = generateOBPUrl(subdomain, customDomain);
        const installAppLink =
            FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
            && (storeDetails as any).pwaSettings?.enableInstallableApp !== false
                ? `${obpLink.replace(/\/$/, '')}/?pwa=install`
                : null;
        const menuLink = generateProjectUrl(
            subdomain,
            customDomain,
            resolveProjectName(defaultProject.name, labels.offeringTitle),
            false
        );

        const allProjects: ProjectLink[] = projects.map((project: any) => ({
            active: project.active !== false,
            deleted: project.deleted === true,
            feedbackUrl: project.projectId ? getFeedbackUrl(project.projectId, 'direct_link', obpLink) : '',
            isDefault: project.isDefault || false,
            name: project.name,
            projectImage: project.projectImage || null,
            projectId: project.projectId,
            url: generateProjectUrl(subdomain, customDomain, resolveProjectName(project.name, labels.offeringTitle), false),
        }));

        const posSync = storeDetails.posSync;
        const hasPosSync = FEATURE_FLAGS.ENABLE_POS_SYNC && !!posSync?.enabled;

        return {
            allProjects,
            businessType: storeDetails.businessType || '',
            feedbackLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'direct_link', obpLink) : '',
            feedbackQrLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'feedback_qr', obpLink) : '',
            hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
            hasPosSync,
            hasPublishedMenu: !!obpLink,
            installAppLink,
            menuLink,
            obpLink,
            posSyncStatus: hasPosSync ? (posSync?.status || 'disabled') : null,
            projectId: defaultProject.projectId || null,
            projectName: resolveProjectName(defaultProject.name, labels.offeringTitle),
            storeName: storeDisplayName,
        };
    }, [labels.offeringTitle, projectsList, resolveProjectName, selectedProjectId, storeDetails, storeDisplayName, t]);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const activeProject = useMemo(
        () => data?.allProjects.find((project) => project.projectId === data.projectId) || data?.allProjects[0] || null,
        [data]
    );

    const withSource = (url: string, src: 'copy' | 'direct' | 'qr' | 'share') => (
        withAnalyticsSource(
            url,
            src === 'copy' ? 'copy_link' : src === 'share' ? 'native_share' : src,
        )
    );

    const openInternalLink = (url: string) => {
        if (!url) return;
        window.location.assign(url);
    };

    const handleCopy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            Toast.show({ content: t('copiedLabel', { label }), duration: 1200 });
        } catch {
            Toast.show({ content: t('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    };

    const handleOpenQr = (qrConfig: QrSheetState) => {
        setQrSheet(qrConfig);
        setIsQrSheetOpen(true);
    };

    const handleNativeShare = async ({ label, text, url }: { label: string; text?: string; url: string }) => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({
                text,
                title: label,
                url,
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            Toast.show({ content: t('couldNotCopy'), duration: 1500 });
        }
    };

    if (!canManageSharing) {
        return (
            <Flex align="center" gap={12} justify="center" style={{ minHeight: '100%', padding: 24, textAlign: 'center' }} vertical>
                <LuShield color={token.colorTextQuaternary} size={36} />
                <Title level={4} style={{ margin: 0 }}>Sharing is not available for your role</Title>
                <Text type="secondary">Ask the owner to update your role if you need sharing or QR access.</Text>
            </Flex>
        );
    }

    if (loadingProjects && !data) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    if (!data) {
        return (
            <Flex align="center" gap={12} justify="center" style={{ minHeight: '100%', padding: 24 }} vertical>
                <LuBookOpen color={token.colorTextQuaternary} size={36} />
                <Title level={4} style={{ margin: 0 }}>{t('noMenuYet')}</Title>
                <Text type="secondary" style={{ textAlign: 'center' }}>
                    {t('noMenuYetDesc', { offering: labels.offeringLower })}
                </Text>
            </Flex>
        );
    }

    return (
        <Flex gap={isCompactHandheld ? 14 : 18} style={{ padding: isCompactHandheld ? 12 : 16 }} vertical>
            {activeProject && data.allProjects.length > 1 ? (
                <ProjectSelectorTrigger
                    clickable
                    currentProject={{
                        active: activeProject.active !== false,
                        deleted: activeProject.deleted === true,
                        id: activeProject.projectId,
                        isDefault: activeProject.isDefault,
                        isSpecialMenu: activeProject.isSpecialMenu === true,
                        name: activeProject.name,
                        projectImage: activeProject.projectImage || null,
                        specialMenuBaseProjectId: (activeProject as any).specialMenuBaseProjectId,
                        specialMenuBaseProjectName: (activeProject as any).specialMenuBaseProjectId
                            ? resolveProjectName(
                                data.allProjects.find((project: any) => project.projectId === (activeProject as any).specialMenuBaseProjectId)?.name,
                                labels.offeringTitle,
                            )
                            : undefined,
                        specialMenuEndsAt: activeProject.specialMenuEndsAt,
                        specialMenuStatus: activeProject.specialMenuStatus,
                    }}
                    onClick={() => setIsProjectSelectorOpen(true)}
                />
            ) : null}

            <MobileLinkCard
                compact={isCompactHandheld}
                description={t('obpShareHint')}
                icon={<LuExternalLink color={token.colorText} size={18} />}
                isPrimary
                label={t('officialBusinessLink')}
                onCopy={() => void handleCopy(withSource(data.obpLink, 'copy'), t('officialBusinessLink'))}
                onOpen={() => openInternalLink(withSource(data.obpLink, 'direct'))}
                onShare={supportsNativeShare ? () => void handleNativeShare({
                    label: t('officialBusinessLink'),
                    text: t('obpShareHint'),
                    url: withSource(data.obpLink, 'share'),
                }) : undefined}
                onShowQr={() => handleOpenQr({
                    filename: buildQrCodeFilename(`${data.storeName}-official-page`, 'qr'),
                    helperText: t('obpShareHint'),
                    title: t('officialBusinessLink'),
                    url: withSource(data.obpLink, 'qr'),
                })}
                value={data.obpLink}
            />

            <SectionHeader
                compact={isCompactHandheld}
                subtitle={`Share a direct link to the selected ${labels.offeringLower}.`}
                title={t('directOfferingLink', { offering: labels.offeringTitle })}
            />

            <MobileLinkCard
                compact={isCompactHandheld}
                description={t('directOfferingLinkDesc', { offering: labels.offeringLower })}
                icon={<LuLink2 color={token.colorText} size={18} />}
                label={t('directOfferingLink', { offering: labels.offeringTitle })}
                onCopy={() => void handleCopy(withSource(data.menuLink, 'copy'), t('directOfferingLinkCopyLabel', { offering: labels.offeringLower }))}
                onOpen={() => openInternalLink(withSource(data.menuLink, 'direct'))}
                onShare={supportsNativeShare ? () => void handleNativeShare({
                    label: t('directOfferingLink', { offering: labels.offeringTitle }),
                    text: t('directOfferingLinkDesc', { offering: labels.offeringLower }),
                    url: withSource(data.menuLink, 'share'),
                }) : undefined}
                onShowQr={() => handleOpenQr({
                    filename: buildQrCodeFilename(`${data.storeName}-${labels.offeringLower}-direct-link`, 'qr'),
                    helperText: t('directOfferingLinkDesc', { offering: labels.offeringLower }),
                    title: t('directOfferingLink', { offering: labels.offeringTitle }),
                    url: withSource(data.menuLink, 'qr'),
                })}
                value={data.menuLink}
            />

            {data.installAppLink ? (
                <MobileLinkCard
                    compact={isCompactHandheld}
                    description="Share this when customers should install your business app directly on their phone."
                    icon={<LuSmartphone color={token.colorText} size={18} />}
                    label="Customer App install link"
                    onCopy={() => void handleCopy(withSource(data.installAppLink as string, 'copy'), 'Customer App install link')}
                    onOpen={() => openInternalLink(withSource(data.installAppLink as string, 'direct'))}
                    onShare={supportsNativeShare ? () => void handleNativeShare({
                        label: 'Customer App install link',
                        text: 'Share this when customers should install your business app directly on their phone.',
                        url: withSource(data.installAppLink as string, 'share'),
                    }) : undefined}
                    onShowQr={() => handleOpenQr({
                        filename: buildQrCodeFilename(`${data.storeName}-customer-app-install`, 'qr'),
                        helperText: 'Customers can scan this QR to install your business app.',
                        title: 'Customer App install link',
                        url: withSource(data.installAppLink as string, 'qr'),
                    })}
                    value={data.installAppLink}
                />
            ) : null}

            {data.hasFeedbackEnabled && data.feedbackLink ? (
                <MobileLinkCard
                    compact={isCompactHandheld}
                    description={t('feedbackLinkDesc')}
                    icon={<LuMessageSquare color={token.colorText} size={18} />}
                    label={t('feedbackLink')}
                    onCopy={() => void handleCopy(data.feedbackLink, t('feedbackLink'))}
                    onOpen={() => openInternalLink(data.feedbackLink)}
                    onShare={supportsNativeShare ? () => void handleNativeShare({
                        label: t('feedbackLink'),
                        text: t('feedbackLinkDesc'),
                        url: data.feedbackLink,
                    }) : undefined}
                    onShowQr={() => handleOpenQr({
                        filename: buildQrCodeFilename(`${data.storeName}-feedback`, 'qr'),
                        helperText: t('feedbackLinkDesc'),
                        title: t('feedbackLink'),
                        url: data.feedbackQrLink,
                    })}
                    value={data.feedbackLink}
                />
            ) : null}

            {FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT ? (
                <Flex gap={12} style={{ marginTop: 6 }} vertical>
                    <MobileCommunicationKit
                        activeProjects={data.allProjects
                            .filter((project) => project.active !== false && project.deleted !== true)
                            .map((project) => ({
                                name: resolveProjectName(project.name, labels.offeringTitle),
                                url: project.url,
                            }))}
                        address={buildStoreAddress(storeDetails)}
                        businessType={data.businessType}
                        menuLink={data.menuLink}
                        obpLink={data.obpLink}
                        phone={storeDetails?.phoneNumber || undefined}
                        projectName={data.allProjects.length > 1 ? resolveProjectName(activeProject?.name, data.projectName || undefined) : undefined}
                        storeName={data.storeName}
                        timeZone={storeDetails?.timeZone}
                        workingHours={storeDetails?.workingHours}
                    />
                </Flex>
            ) : null}

            {data.hasPosSync ? (
                <Card style={{ borderRadius: 24 }}>
                    <Flex gap={8} vertical>
                        <SectionHeader compact={isCompactHandheld} subtitle={t('posSyncDesc', { offering: labels.offeringLower })} title={t('posSync')} />
                        <Flex align="center" gap={8} wrap="wrap">
                            <LuShield color={token.colorTextSecondary} size={18} />
                            <Text strong>{t('posIntegration')}</Text>
                            <Tag color={data.posSyncStatus === 'healthy' ? 'success' : data.posSyncStatus === 'connection_issue' ? 'warning' : 'default'}>
                                {data.posSyncStatus || t('active')}
                            </Tag>
                        </Flex>
                    </Flex>
                </Card>
            ) : null}

            <MobileProjectSelectorSheet
                currentProjectId={data.projectId}
                currentProjectName={resolveProjectName(activeProject?.name, data.projectName || undefined)}
                onClose={() => setIsProjectSelectorOpen(false)}
                onOpenDesignEditor={onOpenDesignEditor}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />

            <MobileQrCodeSheet
                copyErrorMessage={t('couldNotCopy')}
                copySuccessMessage={t('linkCopied')}
                downloadSuccessMessage={t('qrDownloaded')}
                filename={qrSheet?.filename || buildQrCodeFilename(data.storeName || 'menu', 'qr')}
                generatingLabel={t('generatingQr')}
                helperText={qrSheet?.helperText}
                imageAlt={qrSheet?.title || t('showQr')}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={t('qrFailed')}
                title={qrSheet?.title || t('showQr')}
                url={qrSheet?.url || ''}
                visible={isQrSheetOpen}
            />
        </Flex>
    );
}


function SectionHeader({ compact, subtitle, title }: { compact?: boolean; subtitle?: string; title: string }) {
    const { token } = theme.useToken();

    return (
        <Flex gap={4} vertical>
            <Text strong style={{ color: token.colorText, fontSize: compact ? 14 : 15 }}>
                {title}
            </Text>
            {subtitle ? <Text style={{ color: token.colorTextSecondary, fontSize: compact ? 11 : 12 }}>{subtitle}</Text> : null}
        </Flex>
    );
}

function buildStoreAddress(storeDetails: any) {
    if (!storeDetails) return undefined;
    const parts = [
        storeDetails.addressLine || storeDetails.address,
        storeDetails.city,
        storeDetails.state,
        storeDetails.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
}
