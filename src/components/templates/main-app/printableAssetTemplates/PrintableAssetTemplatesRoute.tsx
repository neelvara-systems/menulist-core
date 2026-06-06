'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getProjectsList, getProjectData } from '@database/projects';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob } from '@lib/menu-kit/menuKitGenerator';
import { PRINTABLE_ASSET_TYPES, getPrintableAssetType, isPrintableAssetTypeId } from '@lib/printable-asset-templates/assetTypes';
import { renderPrintableAsset } from '@lib/printable-asset-templates/renderPrintableAsset';
import { PRINTABLE_TEMPLATE_FAMILIES, getPrintableTemplateFamily, isPrintableTemplateFamilyId } from '@lib/printable-asset-templates/templateFamilies';
import type { PrintableAssetRenderInput, PrintableAssetTypeId, PrintableTemplateFamilyId } from '@lib/printable-asset-templates/types';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import PrintableTemplatePreview from '@/components/shared/printableAssets/PrintableTemplatePreview';
import { Button, Card, Col, Empty, Flex, message, Modal, Row, Spin, Tag, theme, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuDownload, LuEye, LuFileText, LuPackage, LuPrinter, LuQrCode } from 'react-icons/lu';
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
    mimeType: string;
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
    const [selectedTemplateId, setSelectedTemplateId] = useState<PrintableTemplateFamilyId>(() => {
        const fromQuery = searchParams.get('template');
        return isPrintableTemplateFamilyId(fromQuery) ? fromQuery : getPrintableAssetType(selectedAssetId).defaultTemplateId;
    });
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [previewAsset, setPreviewAsset] = useState<PreviewAssetState | null>(null);
    const previewUrlRef = useRef<string | null>(null);

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
                const result = await getProjectsList(true);
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
        setSelectedTemplateId(getPrintableAssetType(assetId).defaultTemplateId);
    };

    const closePreviewAsset = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewAsset(null);
    };

    const handleSelectProject = (projectId: string) => {
        const project = data?.allProjects.find((item) => item.projectId === projectId);
        if (!project) return;
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

        const projectData = data.projectId ? await getProjectData(data.projectId) : null;
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

    const handleRender = async (templateFamilyId: PrintableTemplateFamilyId, mode: 'download' | 'preview') => {
        const busy = `${mode}:${selectedAssetId}:${templateFamilyId}`;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            const result = await renderPrintableAsset(input);
            if (mode === 'download') {
                downloadBlob(result.blob, result.filename);
                message.success(`${selectedAsset.title} downloaded`);
                return;
            }
            if (result.mimeType === 'application/zip') {
                message.info('Complete Menu Kit is a ZIP download. Choose Download to save it.');
                return;
            }
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
            const previewUrl = URL.createObjectURL(new Blob([result.blob], { type: result.mimeType }));
            previewUrlRef.current = previewUrl;
            setPreviewAsset({
                blob: result.blob,
                filename: result.filename,
                label: `${selectedAsset.title} - ${getPrintableTemplateFamily(templateFamilyId).label}`,
                mimeType: result.mimeType,
                url: previewUrl,
            });
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
                        {PRINTABLE_TEMPLATE_FAMILIES.map((family) => {
                            const selected = selectedTemplateId === family.id;
                            const isBusyDownload = busyKey === `download:${selectedAssetId}:${family.id}`;
                            const isBusyPreview = busyKey === `preview:${selectedAssetId}:${family.id}`;
                            return (
                                <Col xs={24} sm={12} xl={8} key={family.id}>
                                    <Card
                                        aria-label={`${family.label} template`}
                                        aria-pressed={selected}
                                        hoverable
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setSelectedTemplateId(family.id);
                                            }
                                        }}
                                        onClick={() => setSelectedTemplateId(family.id)}
                                        role="button"
                                        style={{
                                            borderColor: selected ? token.colorPrimary : token.colorBorder,
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
                                                {selected ? <Tag color="success"><LuCheck size={12} /> Selected</Tag> : <Tag>{family.tier}</Tag>}
                                            </Flex>
                                            <Text type="secondary" style={{ minHeight: 44 }}>{family.description}</Text>
                                            <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                                {selectedAsset.title} - {selectedAsset.size}
                                            </Text>
                                            <Flex gap={8}>
                                                <Button
                                                    block
                                                    icon={<LuDownload size={16} />}
                                                    loading={isBusyDownload}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setSelectedTemplateId(family.id);
                                                        void handleRender(family.id, 'download');
                                                    }}
                                                    type="primary"
                                                >
                                                    Download
                                                </Button>
                                                {selectedAsset.outputFormat !== 'zip' ? (
                                                    <Button
                                                        aria-label={`Preview ${family.label} ${selectedAsset.title}`}
                                                        icon={<LuEye size={16} />}
                                                        loading={isBusyPreview}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setSelectedTemplateId(family.id);
                                                            void handleRender(family.id, 'preview');
                                                        }}
                                                    />
                                                ) : null}
                                            </Flex>
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
                footer={[
                    <Button key="close" onClick={closePreviewAsset}>
                        Close
                    </Button>,
                    <Button
                        icon={<LuDownload size={16} />}
                        key="download"
                        onClick={() => previewAsset && downloadBlob(previewAsset.blob, previewAsset.filename)}
                        type="primary"
                    >
                        Download
                    </Button>,
                ]}
                onCancel={closePreviewAsset}
                open={Boolean(previewAsset)}
                title={previewAsset ? `Preview - ${previewAsset.label}` : 'Preview'}
                width={previewAsset?.mimeType === 'application/pdf' ? 920 : 680}
            >
                {previewAsset?.mimeType === 'application/pdf' ? (
                    <iframe
                        src={previewAsset.url}
                        style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            height: '72vh',
                            width: '100%',
                        }}
                        title={`${previewAsset.label} preview`}
                    />
                ) : previewAsset ? (
                    <img
                        alt={`${previewAsset.label} preview`}
                        src={previewAsset.url}
                        style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            display: 'block',
                            maxHeight: '72vh',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            width: '100%',
                        }}
                    />
                ) : null}
            </Modal>
        </div>
    );
}
