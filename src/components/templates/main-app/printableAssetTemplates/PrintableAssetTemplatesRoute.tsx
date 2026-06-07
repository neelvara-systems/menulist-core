'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getExistingProjectsListWithoutLoader, getProjectDataWithoutLoader } from '@database/projects';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob } from '@lib/menu-kit/menuKitGenerator';
import { PRINTABLE_ASSET_TYPES, getPrintableAssetType, isPrintableAssetTypeId } from '@lib/printable-asset-templates/assetTypes';
import { renderPrintableAsset } from '@lib/printable-asset-templates/renderPrintableAsset';
import { getPrintableTemplateFamiliesForAsset, getPrintableTemplateFamily } from '@lib/printable-asset-templates/templateFamilies';
import type { PrintableAssetOutputFormat, PrintableAssetRenderInput, PrintableAssetType, PrintableAssetTypeId, PrintableTemplateFamilyId } from '@lib/printable-asset-templates/types';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import PrintableTemplatePreview from '@/components/shared/printableAssets/PrintableTemplatePreview';
import { Button, Card, Col, Empty, Flex, message, Modal, Row, Spin, Tag, theme, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuDownload, LuFileText, LuPackage, LuPrinter, LuQrCode } from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../../shared/ProjectSelector';

const { Paragraph, Text, Title } = Typography;

type ProjectLink = {
    active?: boolean;
    deleted?: boolean;
    feedbackUrl: string;
    feedbackQrUrl: string;
    isDefault: boolean;
    isSpecialMenu?: boolean;
    menuModifiedOn?: unknown;
    name: string | Record<string, string>;
    projectImage?: string | null;
    projectId: string;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
    url: string;
};

type AssetsData = {
    allProjects: ProjectLink[];
    businessType: string;
    feedbackQrLink: string;
    hasFeedbackEnabled: boolean;
    menuLink: string;
    menuModifiedOn?: unknown;
    obpLink: string;
    projectId: string | null;
    projectName: string | null;
    storeLogo?: string | null;
    storeName: string;
};

type PageState = 'loading' | 'ready' | 'no_menu';

type PreviewAssetState = {
    blob: Blob;
    filename: string;
    label: string;
    outputFormat: PrintableAssetOutputFormat;
    url: string;
};

function getAssetIcon(assetId: PrintableAssetTypeId) {
    if (assetId === 'print_menu') return <LuFileText size={18} />;
    if (assetId === 'complete_menu_kit') return <LuPackage size={18} />;
    if (assetId === 'entrance_poster') return <LuPrinter size={18} />;
    return <LuQrCode size={18} />;
}

function parseTimestamp(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? undefined : new Date(parsed);
    }
    if (typeof value === 'object') {
        const record = value as { seconds?: number; toDate?: () => Date; toMillis?: () => number };
        if (typeof record.toDate === 'function') return record.toDate();
        if (typeof record.toMillis === 'function') return new Date(record.toMillis());
        if (typeof record.seconds === 'number') return new Date(record.seconds * 1000);
    }
    return undefined;
}

function getPrintableDownloadActionLabel(outputFormat: PrintableAssetOutputFormat, assetId?: PrintableAssetTypeId): string {
    if (outputFormat === 'pdf') return 'Download PDF';
    if (outputFormat === 'zip') return 'Download ZIP';
    if (assetId === 'print_menu') return 'Download first page image';
    return 'Download image';
}

function getPrintableActionFormats(asset: PrintableAssetType): PrintableAssetOutputFormat[] {
    return (asset.supportedOutputFormats || [asset.outputFormat]).filter((format) => format !== 'zip');
}

function getPrintablePreviewFormat(asset: PrintableAssetType): PrintableAssetOutputFormat | null {
    if (asset.outputFormat === 'zip') return null;
    return 'png';
}

function getPrintableActionModalWidth(assetId: PrintableAssetTypeId): number {
    if (assetId === 'table_tent') return 640;
    if (assetId === 'counter_sticker' || assetId === 'feedback_qr') return 500;
    return 540;
}

function getPrintableActionPreviewHeight(assetId: PrintableAssetTypeId): number {
    if (assetId === 'table_tent') return 360;
    if (assetId === 'counter_sticker' || assetId === 'feedback_qr') return 360;
    if (assetId === 'print_menu' || assetId === 'entrance_poster') return 520;
    return 520;
}

function buildExportData(projectData: any) {
    const extractedData = projectData?.extractedData || {};
    const fileItems = Array.isArray(projectData?.files)
        ? projectData.files.flatMap((file: any) => file?.extractedData?.data?.items || [])
        : [];
    const fileCategories = Array.isArray(projectData?.files)
        ? projectData.files.flatMap((file: any) => file?.extractedData?.data?.categories || [])
        : [];
    const items = Array.isArray(extractedData.items) && extractedData.items.length > 0
        ? extractedData.items
        : fileItems;
    const categories = Array.isArray(extractedData.categories) && extractedData.categories.length > 0
        ? extractedData.categories
        : fileCategories;
    return { categories, items };
}

export default function PrintableAssetTemplatesRoute() {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const projectIdQuery = searchParams.get('projectId') || '';
    const [pageState, setPageState] = useState<PageState>('loading');
    const [data, setData] = useState<AssetsData | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState<PrintableAssetTypeId>(() => {
        const fromQuery = searchParams.get('asset');
        return isPrintableAssetTypeId(fromQuery) ? fromQuery : 'single_table_card';
    });
    const [activeTemplateId, setActiveTemplateId] = useState<PrintableTemplateFamilyId | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [previewAsset, setPreviewAsset] = useState<PreviewAssetState | null>(null);
    const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const previewUrlRef = useRef<string | null>(null);
    const projectDataCacheRef = useRef<Record<string, any>>({});

    const labels = useMemo(
        () => getOfferingLabels(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory],
    );
    const storeDisplayName = useMemo(
        () => getStoreContextName(storeDetails as any, 'Your Business'),
        [storeDetails],
    );
    const storeBrandColor = useMemo(
        () => resolveStoreBrandColor(storeDetails as any),
        [storeDetails],
    );
    const selectedAsset = getPrintableAssetType(selectedAssetId);
    const selectedAssetActionFormats = getPrintableActionFormats(selectedAsset);
    const availableTemplateFamilies = useMemo(
        () => getPrintableTemplateFamiliesForAsset(selectedAssetId),
        [selectedAssetId],
    );
    const activeTemplateFamily = useMemo(
        () => activeTemplateId ? getPrintableTemplateFamily(activeTemplateId) : null,
        [activeTemplateId],
    );
    const previewActionLabel = selectedAssetId === 'feedback_qr'
        ? 'Feedback QR'
        : selectedAssetId === 'counter_sticker'
            ? labels.scanForUpper
            : labels.printCardTitle;
    const previewInstructionLabel = selectedAssetId === 'feedback_qr'
        ? 'Scan to leave feedback'
        : labels.scanToView;
    const activeProject = data?.allProjects.find((project) => project.projectId === data.projectId) || data?.allProjects[0] || null;
    const projectSelectorItems = useMemo<ProjectSelectorItem[]>(() => (
        data?.allProjects.map((project) => ({
            active: project.active,
            deleted: project.deleted,
            id: project.projectId,
            isDefault: project.isDefault,
            isSpecialMenu: project.isSpecialMenu,
            name: project.name,
            projectImage: project.projectImage,
            secondaryLabel: project.url.replace(/^https?:\/\//, ''),
            specialMenuBaseProjectId: project.specialMenuBaseProjectId,
            specialMenuEndsAt: project.specialMenuEndsAt,
            specialMenuStatus: project.specialMenuStatus,
        })) || []
    ), [data?.allProjects]);

    const resolveProjectName = useCallback(
        (name: string | Record<string, string> | undefined, fallback = labels.offeringTitle) => (
            getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback)
        ),
        [labels.offeringTitle],
    );

    useEffect(() => () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
    }, []);

    useEffect(() => {
        async function loadData() {
            if (!FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES || !storeDetails) {
                setPageState('loading');
                return;
            }

            try {
                projectDataCacheRef.current = {};
                const result = await getExistingProjectsListWithoutLoader(true);
                const projects = result?.projects || [];
                const defaultProject = projects.find((project: any) => project.projectId === projectIdQuery)
                    || projects.find((project: any) => project.isDefault)
                    || projects[0];

                if (!projects.length || !defaultProject) {
                    setPageState('no_menu');
                    return;
                }

                const subdomain = storeDetails.subdomain || '';
                const customDomain = storeDetails.customDomain;
                const obpLink = generateOBPUrl(subdomain, customDomain);
                const allProjects: ProjectLink[] = projects.map((project: any) => ({
                    active: project.active !== false,
                    deleted: project.deleted === true,
                    feedbackQrUrl: project.projectId ? getFeedbackUrl(project.projectId, 'feedback_qr', obpLink) : '',
                    feedbackUrl: project.projectId ? getFeedbackUrl(project.projectId, 'direct_link', obpLink) : '',
                    isDefault: project.isDefault || false,
                    isSpecialMenu: project.isSpecialMenu === true,
                    menuModifiedOn: project.modifiedOn || null,
                    name: project.name,
                    projectImage: project.projectImage || null,
                    projectId: project.projectId,
                    specialMenuBaseProjectId: project.specialMenuBaseProjectId,
                    specialMenuEndsAt: project.specialMenuEndsAt,
                    specialMenuStatus: project.specialMenuStatus,
                    url: generateProjectUrl(subdomain, customDomain, resolveProjectName(project.name), false),
                }));

                setData({
                    allProjects,
                    businessType: storeDetails.businessType || '',
                    feedbackQrLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'feedback_qr', obpLink) : '',
                    hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
                    menuLink: generateProjectUrl(subdomain, customDomain, resolveProjectName(defaultProject.name), false),
                    menuModifiedOn: defaultProject.modifiedOn || null,
                    obpLink,
                    projectId: defaultProject.projectId || null,
                    projectName: resolveProjectName(defaultProject.name),
                    storeLogo: storeDetails.logo || null,
                    storeName: storeDisplayName,
                });
                setPageState('ready');
            } catch {
                setPageState('no_menu');
            }
        }

        void loadData();
    }, [labels.offeringTitle, projectIdQuery, resolveProjectName, storeDetails, storeDisplayName]);

    const handleSelectAsset = (assetId: PrintableAssetTypeId) => {
        setSelectedAssetId(assetId);
        setActiveTemplateId(null);
        closePreviewAsset();
    };

    const closePreviewAsset = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewAsset(null);
        setPreviewState('idle');
    };

    const closeTemplateActions = () => {
        setActiveTemplateId(null);
        closePreviewAsset();
    };

    const handleSelectProject = (projectId: string) => {
        const project = data?.allProjects.find((item) => item.projectId === projectId);
        if (!project) return;
        closePreviewAsset();
        setData((current) => current ? {
            ...current,
            feedbackQrLink: project.feedbackQrUrl,
            menuModifiedOn: project.menuModifiedOn || null,
            menuLink: project.url,
            projectId: project.projectId,
            projectName: resolveProjectName(project.name),
        } : current);
        setIsProjectSelectorOpen(false);
    };

    const getCachedProjectData = async (projectId: string | null): Promise<any | null> => {
        if (!projectId) return null;
        const cachedProject = projectDataCacheRef.current[projectId];
        if (cachedProject) return cachedProject;
        const projectData = await getProjectDataWithoutLoader(projectId);
        projectDataCacheRef.current[projectId] = projectData;
        return projectData;
    };

    const buildRenderInput = async (templateFamilyId: PrintableTemplateFamilyId): Promise<PrintableAssetRenderInput | null> => {
        if (!data) return null;
        const baseInput: PrintableAssetRenderInput = {
            activePlanType: (storeDetails as any)?.activePlanType,
            assetTypeId: selectedAssetId,
            brandColor: storeBrandColor,
            businessCategory: (storeDetails as any)?.businessCategory,
            businessType: (storeDetails as any)?.businessType || data.businessType,
            feedbackUrl: data.feedbackQrLink,
            lastPublishedAt: parseTimestamp(data.menuModifiedOn),
            logoUrl: data.storeLogo || undefined,
            menuUrl: data.menuLink,
            obpBaseUrl: data.obpLink,
            projectId: data.projectId,
            shortLink: data.menuLink.replace(/^https?:\/\//, ''),
            storeName: data.storeName,
            templateFamilyId,
        };

        if (selectedAssetId !== 'print_menu') return baseInput;

        const projectData = await getCachedProjectData(data.projectId);
        const exportData = buildExportData(projectData as any);
        if (!exportData.items.length) {
            message.warning(`No ${labels.offeringLower} items to export`);
            return null;
        }

        return {
            ...baseInput,
            printMenuOptions: {
                activePlanType: (storeDetails as any)?.activePlanType,
                brandColor: storeBrandColor,
                businessCategory: (storeDetails as any)?.businessCategory,
                businessType: (storeDetails as any)?.businessType || data.businessType,
                categories: exportData.categories,
                currency: (storeDetails as any)?.currencySymbol || '',
                currencyCode: (storeDetails as any)?.currencyCode || (storeDetails as any)?.currency || undefined,
                items: exportData.items.filter((item: any) => item.active !== false),
                language: (projectData as any)?.defaultLanguage || (storeDetails as any)?.defaultLanguage || 'en',
                logoUrl: data.storeLogo || (storeDetails as any)?.logo || undefined,
                menuUrl: data.menuLink,
                projectData: projectData as any,
                projectId: data.projectId || undefined,
                projectName: data.projectName || labels.offeringTitle,
                showDescriptions: true,
                storeData: storeDetails as any,
                storeName: data.storeName,
            },
        };
    };

    const renderTemplatePreview = async (templateFamilyId: PrintableTemplateFamilyId) => {
        const previewFormat = getPrintablePreviewFormat(selectedAsset);
        closePreviewAsset();
        if (!previewFormat) {
            setPreviewState('ready');
            return;
        }

        const busy = `preview:${selectedAssetId}:${templateFamilyId}:${previewFormat}`;
        setBusyKey(busy);
        setPreviewState('loading');
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) {
                setPreviewState('idle');
                return;
            }
            const result = await renderPrintableAsset({ ...input, outputFormat: previewFormat });
            const previewUrl = URL.createObjectURL(new Blob([result.blob], { type: result.mimeType }));
            previewUrlRef.current = previewUrl;
            setPreviewAsset({
                blob: result.blob,
                filename: result.filename,
                label: `${selectedAsset.title} - ${getPrintableTemplateFamily(templateFamilyId).label}`,
                outputFormat: result.outputFormat,
                url: previewUrl,
            });
            setPreviewState('ready');
        } catch {
            setPreviewState('error');
        } finally {
            setBusyKey(null);
        }
    };

    const openTemplateActions = (templateFamilyId: PrintableTemplateFamilyId) => {
        setActiveTemplateId(templateFamilyId);
        void renderTemplatePreview(templateFamilyId);
    };

    const handleRender = async (templateFamilyId: PrintableTemplateFamilyId, outputFormat: PrintableAssetOutputFormat) => {
        const busy = `download:${selectedAssetId}:${templateFamilyId}:${outputFormat}`;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            const result = await renderPrintableAsset({ ...input, outputFormat });
            downloadBlob(result.blob, result.filename);
            message.success(`${selectedAsset.title} downloaded`);
        } catch {
            message.error(`Failed to generate ${selectedAsset.title}`);
        } finally {
            setBusyKey(null);
        }
    };

    if (pageState === 'loading') {
        return (
            <Flex align="center" justify="center" style={{ minHeight: 420 }}>
                <Spin size="large" />
            </Flex>
        );
    }

    if (pageState === 'no_menu' || !data) {
        return (
            <div style={{ padding: 32 }}>
                <Empty description="Create your first menu to download assets" />
            </div>
        );
    }

    return (
        <div style={{ margin: '0 auto', maxWidth: 1280, padding: '24px clamp(16px, 3vw, 34px)', width: '100%' }}>
            <Flex align="flex-start" gap={16} justify="space-between" wrap="wrap" style={{ marginBottom: 20 }}>
                <div>
                    <Text style={{ color: token.colorTextTertiary, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase' }}>
                        Assets
                    </Text>
                    <Title level={3} style={{ margin: '4px 0 4px' }}>Print and Download Assets</Title>
                    <Paragraph style={{ color: token.colorTextSecondary, margin: 0, maxWidth: 680 }}>
                        Pick a file type, choose a finished style, and download branded output from the current approved {labels.offeringLower}.
                    </Paragraph>
                </div>
                {activeProject ? (
                    <ProjectSelectorTrigger
                        clickable={data.allProjects.length > 1}
                        currentProject={{
                            active: activeProject.active,
                            deleted: activeProject.deleted,
                            id: activeProject.projectId,
                            isDefault: activeProject.isDefault,
                            isSpecialMenu: activeProject.isSpecialMenu,
                            name: activeProject.name,
                            projectImage: activeProject.projectImage,
                            specialMenuBaseProjectId: activeProject.specialMenuBaseProjectId,
                            specialMenuEndsAt: activeProject.specialMenuEndsAt,
                            specialMenuStatus: activeProject.specialMenuStatus,
                        }}
                        helperText={data.allProjects.length > 1 ? 'Select project' : undefined}
                        onClick={data.allProjects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                    />
                ) : null}
            </Flex>

            <Row gutter={[20, 20]}>
                <Col xs={24} lg={6}>
                    <Card size="small" styles={{ body: { padding: 10 } }}>
                        <Flex gap={8} vertical>
                            {PRINTABLE_ASSET_TYPES.map((asset) => {
                                const active = selectedAssetId === asset.id;
                                const disabled = asset.requiresFeedback && !data.hasFeedbackEnabled;
                                return (
                                    <button
                                        aria-label={`${asset.title}. ${disabled ? 'Turn on feedback first' : `Output format ${asset.outputFormat.toUpperCase()}`}`}
                                        aria-pressed={active}
                                        key={asset.id}
                                        disabled={disabled}
                                        onClick={() => !disabled && handleSelectAsset(asset.id)}
                                        style={{
                                            alignItems: 'center',
                                            background: active ? token.colorPrimaryBg : token.colorBgContainer,
                                            border: `1px solid ${active ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            color: disabled ? token.colorTextDisabled : token.colorText,
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            font: 'inherit',
                                            gap: 10,
                                            minHeight: 58,
                                            padding: '10px 12px',
                                            textAlign: 'left',
                                            width: '100%',
                                        }}
                                        type="button"
                                    >
                                        <span style={{ color: active ? token.colorPrimary : token.colorTextSecondary, display: 'inline-flex' }}>
                                            {getAssetIcon(asset.id)}
                                        </span>
                                        <span style={{ minWidth: 0 }}>
                                            <Text strong style={{ display: 'block' }}>{asset.title}</Text>
                                            <Text style={{ color: disabled ? token.colorTextDisabled : token.colorTextSecondary, fontSize: 12 }}>
                                                {disabled ? 'Turn on feedback first' : asset.size}
                                            </Text>
                                        </span>
                                    </button>
                                );
                            })}
                        </Flex>
                    </Card>
                </Col>

                <Col xs={24} lg={18}>
                    <Row gutter={[16, 16]}>
                        {availableTemplateFamilies.map((family) => {
                            return (
                                <Col xs={24} sm={12} xl={8} key={family.id}>
                                    <Card
                                        aria-haspopup="dialog"
                                        aria-label={`Open ${family.label} ${selectedAsset.title} download options`}
                                        hoverable
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openTemplateActions(family.id);
                                            }
                                        }}
                                        onClick={() => openTemplateActions(family.id)}
                                        role="button"
                                        style={{
                                            borderColor: token.colorBorder,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                        }}
                                        tabIndex={0}
                                        styles={{ body: { padding: 0 } }}
                                    >
                                        <div style={{ height: 238 }}>
                                            <PrintableTemplatePreview
                                                actionLabel={previewActionLabel}
                                                assetTypeId={selectedAssetId}
                                                brandColor={storeBrandColor}
                                                compact
                                                family={family}
                                                instructionLabel={previewInstructionLabel}
                                                shortLink={data.menuLink.replace(/^https?:\/\//, '')}
                                                storeLogo={data.storeLogo}
                                                storeName={data.storeName}
                                            />
                                        </div>
                                        <Flex gap={10} style={{ padding: 16 }} vertical>
                                            <Flex align="center" justify="space-between" gap={8}>
                                                <Text strong>{family.label}</Text>
                                                <Tag>{family.tier}</Tag>
                                            </Flex>
                                            <Text type="secondary" style={{ minHeight: 44 }}>{family.description}</Text>
                                            <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                                {selectedAsset.title} - {selectedAsset.size}
                                            </Text>
                                            <Text strong style={{ color: token.colorPrimary, fontSize: 13 }}>
                                                Open download options
                                            </Text>
                                        </Flex>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </Col>
            </Row>

            <Modal
                footer={null}
                onCancel={() => setIsProjectSelectorOpen(false)}
                open={isProjectSelectorOpen}
                title="Select Project"
                width={560}
            >
                <ProjectSelectorList
                    currentProjectId={data.projectId}
                    onSelect={handleSelectProject}
                    projects={projectSelectorItems}
                />
            </Modal>
            <Modal
                destroyOnHidden
                footer={null}
                onCancel={closeTemplateActions}
                open={Boolean(activeTemplateFamily)}
                title={activeTemplateFamily ? `${selectedAsset.title} - ${activeTemplateFamily.label}` : 'Download asset'}
                width={getPrintableActionModalWidth(selectedAssetId)}
            >
                {activeTemplateFamily ? (
                    <Flex gap={16} vertical>
                        <div
                            style={{
                                alignItems: 'center',
                                background: token.colorBgLayout,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 12,
                                display: 'flex',
                                height: getPrintableActionPreviewHeight(selectedAssetId),
                                justifyContent: 'center',
                                overflow: 'hidden',
                                padding: 12,
                            }}
                        >
                            {previewState === 'loading' ? (
                                <Flex align="center" gap={10} justify="center" vertical>
                                    <Spin />
                                    <Text type="secondary">Creating preview...</Text>
                                </Flex>
                            ) : previewAsset ? (
                                <img
                                    alt={`${previewAsset.label} preview`}
                                    src={previewAsset.url}
                                    style={{
                                        borderRadius: 8,
                                        display: 'block',
                                        maxHeight: '100%',
                                        maxWidth: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : selectedAsset.outputFormat === 'zip' ? (
                                <PrintableTemplatePreview
                                    actionLabel={previewActionLabel}
                                    assetTypeId={selectedAssetId}
                                    brandColor={storeBrandColor}
                                    family={activeTemplateFamily}
                                    instructionLabel={previewInstructionLabel}
                                    shortLink={data.menuLink.replace(/^https?:\/\//, '')}
                                    storeLogo={data.storeLogo}
                                    storeName={data.storeName}
                                />
                            ) : previewState === 'error' ? (
                                <Text type="secondary" style={{ textAlign: 'center' }}>
                                    Preview is unavailable. Download can still generate the file.
                                </Text>
                            ) : null}
                        </div>
                        <Flex gap={12} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{activeTemplateFamily.label}</Text>
                                <Text type="secondary">{activeTemplateFamily.description}</Text>
                                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                    {selectedAsset.size}
                                </Text>
                            </Flex>
                            {selectedAsset.outputFormat === 'zip' ? (
                                <Button
                                    block
                                    icon={<LuDownload size={16} />}
                                    loading={busyKey === `download:${selectedAssetId}:${activeTemplateFamily.id}:zip`}
                                    onClick={() => void handleRender(activeTemplateFamily.id, 'zip')}
                                    size="large"
                                    type="primary"
                                >
                                    Download ZIP
                                </Button>
                            ) : (
                                selectedAssetActionFormats.map((format, index) => (
                                    <Button
                                        block
                                        icon={<LuDownload size={16} />}
                                        key={format}
                                        loading={busyKey === `download:${selectedAssetId}:${activeTemplateFamily.id}:${format}`}
                                        onClick={() => void handleRender(activeTemplateFamily.id, format)}
                                        size="large"
                                        type={index === 0 ? 'primary' : 'default'}
                                    >
                                        {getPrintableDownloadActionLabel(format, selectedAssetId)}
                                    </Button>
                                ))
                            )}
                        </Flex>
                    </Flex>
                ) : null}
            </Modal>
        </div>
    );
}
