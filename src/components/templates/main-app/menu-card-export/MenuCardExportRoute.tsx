'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getExistingProjectsListWithoutLoader, getProjectDataWithoutLoader } from '@database/projects';
import { getStoreContextName } from '@lib/businessIdentity/names';
import {
    buildDefaultSettings,
    buildPrintShopPacket,
    buildPrintSource,
    buildPrintSourceHash,
    downloadMenuCardArtifact,
    exposedMenuCardTemplates,
    findReusableExport,
    getFreshnessState,
    listLocalMenuCardExports,
    menuCardPresetRegistry,
    renderPdf,
    renderPreviewModel,
    saveLocalMenuCardExport,
    shareMenuCardArtifact,
    type MenuCardExportPreset,
    type MenuCardExportSettings,
    type MenuCardLocalHistoryRecord,
    type MenuCardPrintSource,
    type MenuCardSafeOverrides,
} from '@lib/menu-card-export';
import type { MenuCardDesignAdvisorRecommendation } from '@lib/menu-card-export/ai/designAdvisor';
import type { MenuCardDesignAdvisorRequest } from '@lib/validation/apiSchemas';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { AICapacityError } from '@services/ai/capacityError';
import getMenuCardDesignAdviceViaAPI, { MenuCardDesignAdvisorPlanError } from '@services/ai/menuCardExport/getDesignAdviceViaAPI';
import { Alert, Button, Card, Empty, Flex, List, message, Modal, Segmented, Skeleton, Space, Switch, Tag, theme, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuDownload, LuHistory, LuPackage, LuPrinter, LuQrCode, LuShare2, LuSparkles } from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger } from '../../../shared/ProjectSelector';
import styles from './menu-card-export.module.scss';

const { Paragraph, Text, Title } = Typography;

type ProjectOption = {
    projectId: string;
    name: string | Record<string, string>;
    isDefault?: boolean;
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    projectImage?: string | null;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
    url: string;
};

function resolveName(name: string | Record<string, string> | undefined, fallback = 'Menu'): string {
    return getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback);
}

function buildMenuUrl(storeDetails: any, project: ProjectOption): string {
    return generateProjectUrl(
        storeDetails?.subdomain || '',
        storeDetails?.customDomain,
        resolveName(project.name, 'Menu'),
        false,
    );
}

function makeSettings(preset: MenuCardExportPreset, styleId: string): MenuCardExportSettings {
    return buildDefaultSettings(preset, styleId);
}

function isPresetAvailable(preset: MenuCardExportPreset): boolean {
    if (preset === 'print_shop_packet') {
        return FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_PRINT_SHOP;
    }
    return true;
}

export default function MenuCardExportRoute() {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(searchParams.get('projectId'));
    const [projectData, setProjectData] = useState<any | null>(null);
    const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [history, setHistory] = useState<MenuCardLocalHistoryRecord[]>([]);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [settings, setSettings] = useState<MenuCardExportSettings>(() => makeSettings('home_print', 'classic'));
    const [overrides] = useState<MenuCardSafeOverrides>({});
    const projectDataCacheRef = useRef<Record<string, any>>({});
    const adviceCacheRef = useRef<Record<string, MenuCardDesignAdvisorRecommendation>>({});
    const [designAdvice, setDesignAdvice] = useState<MenuCardDesignAdvisorRecommendation | null>(null);
    const [adviceLoading, setAdviceLoading] = useState(false);
    const [adviceError, setAdviceError] = useState<string | null>(null);

    const storeName = useMemo(() => getStoreContextName(storeDetails as any, 'Your Business'), [storeDetails]);
    const storeUrlContext = useMemo(() => ({
        subdomain: (storeDetails as any)?.subdomain || '',
        customDomain: (storeDetails as any)?.customDomain,
    }), [(storeDetails as any)?.subdomain, (storeDetails as any)?.customDomain]);
    const storeRouteKey = useMemo(() => {
        if (!storeDetails) return '';
        const tenantId = (storeDetails as any)?.tenantId || (storeDetails as any)?.tId || '';
        const storeId = (storeDetails as any)?.storeId || (storeDetails as any)?.sId || '';
        const subdomain = (storeDetails as any)?.subdomain || '';
        const customDomain = (storeDetails as any)?.customDomain || '';
        if (!tenantId && !storeId && !subdomain && !customDomain) return '';
        return [tenantId, storeId, subdomain, customDomain].join('|');
    }, [
        (storeDetails as any)?.tenantId,
        (storeDetails as any)?.tId,
        (storeDetails as any)?.storeId,
        (storeDetails as any)?.sId,
        (storeDetails as any)?.subdomain,
        (storeDetails as any)?.customDomain,
    ]);

    useEffect(() => {
        let mounted = true;

        async function loadProjects() {
            if (!FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT) {
                setLoading(false);
                return;
            }

            if (!storeRouteKey) {
                setLoading(false);
                return;
            }

            projectDataCacheRef.current = {};
            adviceCacheRef.current = {};
            setProjectData(null);
            setLoadedProjectId(null);
            setHistory([]);
            setDesignAdvice(null);
            setAdviceError(null);
            const result = await getExistingProjectsListWithoutLoader(true);
            if (!mounted) return;
            const list = (result?.projects || [])
                .filter((project: any) => project.deleted !== true && project.active !== false)
                .map((project: any) => ({
                    projectId: project.projectId,
                    name: project.name,
                    isDefault: project.isDefault,
                    active: project.active,
                    deleted: project.deleted,
                    isSpecialMenu: project.isSpecialMenu,
                    projectImage: project.projectImage || null,
                    specialMenuBaseProjectId: project.specialMenuBaseProjectId,
                    specialMenuEndsAt: project.specialMenuEndsAt,
                    specialMenuStatus: project.specialMenuStatus,
                    url: buildMenuUrl(storeUrlContext, project),
                }));
            setProjects(list);
            setSelectedProjectId((current) => {
                if (current && list.some((project) => project.projectId === current)) return current;
                return list.find((project) => project.isDefault)?.projectId || list[0]?.projectId || null;
            });
            setLoading(false);
        }

        loadProjects().catch(() => {
            if (mounted) {
                setProjects([]);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, [storeRouteKey, storeUrlContext]);

    const selectedProject = useMemo(
        () => projects.find((project) => project.projectId === selectedProjectId) || projects[0] || null,
        [projects, selectedProjectId],
    );
    const visiblePresets = useMemo(
        () => menuCardPresetRegistry.filter((preset) => preset.exposed && isPresetAvailable(preset.id)),
        [],
    );

    useEffect(() => {
        let mounted = true;

        async function loadProject() {
            if (!selectedProject?.projectId) {
                setProjectData(null);
                setLoadedProjectId(null);
                setHistory([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            setProjectData(null);
            setLoadedProjectId(null);
            const cachedProject = projectDataCacheRef.current[selectedProject.projectId];
            if (cachedProject) {
                setProjectData(cachedProject);
                setLoadedProjectId(selectedProject.projectId);
                setHistory(FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY
                    ? listLocalMenuCardExports(selectedProject.projectId)
                    : []);
                setLoading(false);
                return;
            }

            const data = await getProjectDataWithoutLoader(selectedProject.projectId);
            if (!mounted) return;
            projectDataCacheRef.current[selectedProject.projectId] = data;
            setProjectData(data);
            setLoadedProjectId(selectedProject.projectId);
            setHistory(FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY
                ? listLocalMenuCardExports(selectedProject.projectId)
                : []);
            setLoading(false);
        }

        loadProject().catch(() => {
            if (mounted) {
                setProjectData(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, [selectedProject?.projectId]);

    const source = useMemo<MenuCardPrintSource | null>(() => {
        if (!projectData || !selectedProject || !storeDetails) return null;
        if (loadedProjectId !== selectedProject.projectId) return null;
        return buildPrintSource({
            project: projectData,
            store: { ...storeDetails, name: storeName },
            menuUrl: selectedProject.url,
            settings,
        });
    }, [loadedProjectId, projectData, selectedProject, settings, storeDetails, storeName]);

    const preview = useMemo(() => {
        if (!source) return null;
        return renderPreviewModel(source, settings, overrides);
    }, [source, settings, overrides]);

    const sourceHash = useMemo(() => {
        if (!source) return '';
        return buildPrintSourceHash(source, settings, overrides);
    }, [source, settings, overrides]);

    const reusableExport = useMemo(
        () => FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY ? findReusableExport(history, sourceHash) : null,
        [history, sourceHash],
    );

    useEffect(() => {
        setDesignAdvice(null);
        setAdviceError(null);
    }, [sourceHash, selectedProject?.projectId]);

    const updatePreset = (preset: MenuCardExportPreset) => {
        if (!isPresetAvailable(preset)) return;
        setSettings(makeSettings(preset, settings.styleId));
    };

    const updateStyle = (styleId: string) => {
        setSettings((current) => ({ ...current, styleId }));
    };

    const updateToggle = (key: keyof MenuCardExportSettings, value: boolean) => {
        setSettings((current) => ({ ...current, [key]: value }));
    };

    const handleSelectProject = (projectId: string) => {
        setSelectedProjectId(projectId);
        setIsProjectSelectorOpen(false);
    };

    const buildDesignAdvisorPayload = useCallback((): MenuCardDesignAdvisorRequest | null => {
        if (!source || !preview || !selectedProject || !sourceHash) return null;
        const itemCount = source.menu.categories.reduce((total, category) => total + category.items.length, 0);

        return {
            projectId: selectedProject.projectId,
            sourceHash,
            currentSettings: {
                preset: settings.preset as any,
                styleId: settings.styleId as any,
                density: settings.density as any,
                includeDescriptions: settings.includeDescriptions,
                includeQr: settings.includeQr,
                includeContactBlock: settings.includeContactBlock,
            },
            sourceSummary: {
                businessName: source.business.name,
                menuTitle: source.menu.title,
                categoryCount: source.menu.categories.length,
                itemCount,
                pageCount: preview.plan.pageCount,
                hasDescriptions: source.flags.hasDescriptions,
                hasVariants: source.flags.hasVariants,
                hasDietaryTags: source.flags.hasDietaryTags,
                hasMissingPrices: source.flags.hasMissingPrices,
                categoryNames: source.menu.categories.map((category) => category.name).filter(Boolean).slice(0, 20),
            },
            preflightWarnings: preview.preflight.warnings.map((warning) => ({
                code: warning.code,
                severity: warning.severity,
                message: warning.message,
            })).slice(0, 20),
        };
    }, [preview, selectedProject, settings, source, sourceHash]);

    const requestDesignAdvice = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_AI_ADVISOR) {
            setAdviceError('Layout suggestions are not enabled.');
            return;
        }

        const payload = buildDesignAdvisorPayload();
        if (!payload) return;

        const cached = adviceCacheRef.current[payload.sourceHash];
        if (cached) {
            setDesignAdvice(cached);
            setAdviceError(null);
            return;
        }

        setAdviceLoading(true);
        setAdviceError(null);
        try {
            const response = await getMenuCardDesignAdviceViaAPI(payload);
            if (!response?.recommendation) {
                setAdviceError('Could not prepare a layout suggestion.');
                return;
            }
            adviceCacheRef.current[payload.sourceHash] = response.recommendation;
            setDesignAdvice(response.recommendation);
            message.success('Layout suggestion ready');
        } catch (error) {
            if (error instanceof MenuCardDesignAdvisorPlanError) {
                setAdviceError(error.message);
                return;
            }
            if (error instanceof AICapacityError) {
                setAdviceError(error.message);
                return;
            }
            setAdviceError('Could not prepare a layout suggestion.');
        } finally {
            setAdviceLoading(false);
        }
    }, [buildDesignAdvisorPayload]);

    const applyDesignAdvice = useCallback(() => {
        if (!designAdvice) return;
        const preset = isPresetAvailable(designAdvice.preset) ? designAdvice.preset : 'home_print';
        setSettings({
            ...makeSettings(preset, designAdvice.styleId),
            density: designAdvice.density,
            includeDescriptions: designAdvice.includeDescriptions,
            includeQr: designAdvice.includeQr,
            includeContactBlock: designAdvice.includeContactBlock,
        });
        message.success('Layout suggestion applied');
    }, [designAdvice]);

    const handleCreate = useCallback(async (share = false) => {
        if (!source || !selectedProject) return;
        if (!isPresetAvailable(settings.preset)) {
            message.error('This export option is not enabled');
            return;
        }
        if (preview?.preflight.status === 'blocked') {
            message.error('Fix the blocking warning before export');
            return;
        }

        setRendering(true);
        try {
            const artifact = settings.preset === 'print_shop_packet'
                ? await buildPrintShopPacket(source, settings, overrides)
                : await renderPdf(source, settings, overrides);

            if (share) {
                const shared = await shareMenuCardArtifact(artifact as any, 'Menu file');
                if (!shared) downloadMenuCardArtifact(artifact as any);
            } else {
                downloadMenuCardArtifact(artifact as any);
            }

            if (FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY) {
                const nextHistory = saveLocalMenuCardExport({
                    projectId: selectedProject.projectId,
                    projectName: resolveName(selectedProject.name, 'Menu'),
                    storeName,
                    preset: settings.preset,
                    styleId: settings.styleId,
                    artifact: artifact as any,
                });
                setHistory(nextHistory);
            }

            message.success(settings.preset === 'print_shop_packet' ? 'Print-shop packet created' : 'PDF created');
        } catch (error) {
            message.error('Could not create file');
        } finally {
            setRendering(false);
        }
    }, [overrides, preview?.preflight.status, selectedProject, settings, source, storeName]);

    if (!FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT) {
        return (
            <div className={styles.route}>
                <Empty description="Print menu is not enabled" />
            </div>
        );
    }

    if (loading && !source) {
        return (
            <div className={styles.route}>
                <Skeleton active paragraph={{ rows: 8 }} />
            </div>
        );
    }

    if (!selectedProject || !source || !preview) {
        return (
            <div className={styles.route}>
                <Empty description="Create a menu before exporting a print file" />
            </div>
        );
    }

    const blockers = preview.preflight.warnings.filter((warning) => warning.severity === 'blocker');
    const warnings = preview.preflight.warnings.filter((warning) => warning.severity !== 'blocker');

    return (
        <div className={styles.route}>
            <Flex className={styles.header} justify="space-between" gap={16} wrap="wrap">
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Print Menu</Title>
                    <Text type="secondary">Create a PDF or print-shop packet from the current menu.</Text>
                </div>
                <Space>
                    <Tag icon={<LuQrCode size={12} />} color="blue">QR to live menu</Tag>
                    <Tag color="default">{preview.plan.pageCount} page{preview.plan.pageCount === 1 ? '' : 's'}</Tag>
                </Space>
            </Flex>

            <div className={styles.grid}>
                <Card className={styles.panel} title="Setup" styles={{ body: { display: 'grid', gap: 14 } }}>
                    <div>
                        <Text strong>Menu</Text>
                        <div style={{ marginTop: 8 }}>
                            <ProjectSelectorTrigger
                                clickable={projects.length > 1}
                                currentProject={{
                                    active: selectedProject.active,
                                    deleted: selectedProject.deleted,
                                    id: selectedProject.projectId,
                                    isDefault: selectedProject.isDefault,
                                    isSpecialMenu: selectedProject.isSpecialMenu === true,
                                    name: selectedProject.name,
                                    projectImage: selectedProject.projectImage || null,
                                    specialMenuBaseProjectId: selectedProject.specialMenuBaseProjectId,
                                    specialMenuBaseProjectName: selectedProject.specialMenuBaseProjectId
                                        ? resolveName(
                                            projects.find((project) => project.projectId === selectedProject.specialMenuBaseProjectId)?.name,
                                            'Menu',
                                        )
                                        : undefined,
                                    specialMenuEndsAt: selectedProject.specialMenuEndsAt,
                                    specialMenuStatus: selectedProject.specialMenuStatus,
                                }}
                                helperText={projects.length > 1 ? 'Select menu' : undefined}
                                onClick={projects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                            />
                        </div>
                    </div>

                    <div>
                        <Text strong>Job</Text>
                        <Flex vertical gap={8} style={{ marginTop: 8 }}>
                            {visiblePresets.map((preset) => (
                                <Button
                                    className={styles.presetButton}
                                    icon={preset.id === 'print_shop_packet' ? <LuPackage /> : preset.id === 'whatsapp' ? <LuShare2 /> : <LuPrinter />}
                                    key={preset.id}
                                    onClick={() => updatePreset(preset.id)}
                                    type={settings.preset === preset.id ? 'primary' : 'default'}
                                >
                                    <Flex vertical gap={2}>
                                        <Text style={{ color: settings.preset === preset.id ? token.colorTextLightSolid : undefined }} strong>{preset.label}</Text>
                                        <Text style={{ color: settings.preset === preset.id ? 'rgba(255,255,255,0.76)' : token.colorTextSecondary, fontSize: 12 }}>{preset.description}</Text>
                                    </Flex>
                                </Button>
                            ))}
                        </Flex>
                    </div>

                    <div>
                        <Text strong>Style</Text>
                        <Segmented
                            block
                            style={{ marginTop: 8 }}
                            value={settings.styleId}
                            onChange={(value) => updateStyle(String(value))}
                            options={exposedMenuCardTemplates.map((template) => ({ label: template.name, value: template.id }))}
                        />
                    </div>

                    <div>
                        <Text strong>Density</Text>
                        <Segmented
                            block
                            style={{ marginTop: 8 }}
                            value={settings.density}
                            onChange={(value) => setSettings((current) => ({ ...current, density: value as any }))}
                            options={[
                                { label: 'Comfort', value: 'comfortable' },
                                { label: 'Balanced', value: 'balanced' },
                                { label: 'Compact', value: 'compact' },
                            ]}
                        />
                    </div>

                    {FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_AI_ADVISOR ? (
                        <div className={styles.advisorBox}>
                            <Flex align="flex-start" justify="space-between" gap={12} wrap="wrap">
                                <div className={styles.advisorCopy}>
                                    <Text strong><Space size={6}><LuSparkles size={15} /> Pro layout suggestion</Space></Text>
                                    <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                                        Available on Pro and Premium. Uses one enhancement only after a suggestion is ready.
                                    </Paragraph>
                                </div>
                                <Button
                                    icon={<LuSparkles />}
                                    loading={adviceLoading}
                                    onClick={() => void requestDesignAdvice()}
                                >
                                    Suggest layout
                                </Button>
                            </Flex>
                            {adviceError ? (
                                <Alert style={{ marginTop: 10 }} type="warning" showIcon message={adviceError} />
                            ) : null}
                            {designAdvice ? (
                                <Alert
                                    style={{ marginTop: 10 }}
                                    type="info"
                                    showIcon
                                    message={designAdvice.ownerNote}
                                    description={(
                                        <Flex vertical gap={8}>
                                            <Text type="secondary">{designAdvice.reason}</Text>
                                            <Space wrap>
                                                <Tag>{designAdvice.preset.replace(/_/g, ' ')}</Tag>
                                                <Tag>{designAdvice.styleId}</Tag>
                                                <Tag>{designAdvice.density}</Tag>
                                            </Space>
                                            <Button size="small" type="primary" onClick={applyDesignAdvice}>
                                                Apply suggestion
                                            </Button>
                                        </Flex>
                                    )}
                                />
                            ) : null}
                        </div>
                    ) : null}

                    <Flex vertical gap={8}>
                        <Flex align="center" justify="space-between" className={styles.toggleRow}>
                            <Text>Include descriptions</Text>
                            <Switch checked={settings.includeDescriptions} onChange={(checked) => updateToggle('includeDescriptions', checked)} />
                        </Flex>
                        <Flex align="center" justify="space-between" className={styles.toggleRow}>
                            <Text>Include QR</Text>
                            <Switch checked={settings.includeQr} onChange={(checked) => updateToggle('includeQr', checked)} />
                        </Flex>
                        <Flex align="center" justify="space-between" className={styles.toggleRow}>
                            <Text>Include contact block</Text>
                            <Switch checked={settings.includeContactBlock} onChange={(checked) => updateToggle('includeContactBlock', checked)} />
                        </Flex>
                    </Flex>
                </Card>

                <Card className={styles.panel} title="Preview">
                    <div className={styles.previewPage} style={{ '--menu-card-border': token.colorBorder } as any}>
                        <Flex justify="space-between" align="center">
                            <div>
                                <Text strong style={{ fontSize: 20 }}>{source.business.name}</Text>
                                <br />
                                <Text type="secondary">{source.menu.title}</Text>
                            </div>
                            {settings.includeQr ? <LuQrCode size={42} color={token.colorTextSecondary} /> : null}
                        </Flex>
                        <Space style={{ marginTop: 16, marginBottom: 16 }} wrap>
                            <Tag>{settings.preset.replace(/_/g, ' ')}</Tag>
                            <Tag>{settings.styleId}</Tag>
                            <Tag>{preview.plan.mode.replace(/_/g, ' ')}</Tag>
                        </Space>
                        <List
                            size="small"
                            dataSource={preview.plan.pages}
                            renderItem={(page) => (
                                <List.Item>
                                    <Flex vertical gap={4} style={{ width: '100%' }}>
                                        <Text strong>Page {page.pageNumber}</Text>
                                        <Text type="secondary">
                                            {page.categories.map((category) => `${category.name} (${category.itemCount})`).join(', ') || 'No visible items'}
                                        </Text>
                                    </Flex>
                                </List.Item>
                            )}
                        />
                    </div>
                </Card>

                <Flex vertical gap={16}>
                    <Card className={styles.panel} title="Preflight">
                        {blockers.length === 0 && warnings.length === 0 ? (
                            <Alert icon={<LuCheck />} type="success" showIcon message="Ready to export" />
                        ) : null}
                        <Flex vertical gap={8}>
                            {blockers.map((warning) => (
                                <Alert key={warning.code} type="error" showIcon icon={<LuAlertTriangle />} message={warning.message} />
                            ))}
                            {warnings.map((warning, index) => (
                                <Alert key={`${warning.code}-${index}`} type={warning.severity === 'info' ? 'info' : 'warning'} showIcon message={warning.message} />
                            ))}
                        </Flex>
                        {FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY && reusableExport ? (
                            <Alert style={{ marginTop: 12 }} type="info" showIcon message="A matching export was created before. Creating again will reuse the same menu state." />
                        ) : null}
                        <Flex gap={8} style={{ marginTop: 16 }} wrap>
                            <Button
                                type="primary"
                                icon={<LuDownload />}
                                loading={rendering}
                                disabled={blockers.length > 0}
                                onClick={() => void handleCreate(false)}
                            >
                                {settings.preset === 'print_shop_packet' ? 'Create packet' : 'Create PDF'}
                            </Button>
                            <Button
                                icon={<LuShare2 />}
                                loading={rendering}
                                disabled={blockers.length > 0}
                                onClick={() => void handleCreate(true)}
                            >
                                Share
                            </Button>
                        </Flex>
                    </Card>

                    {FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY ? (
                        <Card className={styles.panel} title={<Space><LuHistory /> History</Space>}>
                            {history.length === 0 ? (
                                <Paragraph type="secondary">Exports created on this device appear here. No Firebase writes are used.</Paragraph>
                            ) : (
                                <Flex vertical gap={8}>
                                    {history.slice(0, 6).map((record) => (
                                        <div className={styles.historyRow} key={record.id}>
                                            <Flex justify="space-between" gap={8}>
                                                <Flex vertical>
                                                    <Text strong>{record.fileName}</Text>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>{new Date(record.generatedAt).toLocaleString()}</Text>
                                                </Flex>
                                                <Tag color={getFreshnessState(record, sourceHash) === 'Current' ? 'green' : 'orange'}>
                                                    {getFreshnessState(record, sourceHash)}
                                                </Tag>
                                            </Flex>
                                        </div>
                                    ))}
                                </Flex>
                            )}
                        </Card>
                    ) : null}
                </Flex>
            </div>

            <Modal
                footer={null}
                onCancel={() => setIsProjectSelectorOpen(false)}
                open={isProjectSelectorOpen}
                title="Select Menu"
                width={560}
            >
                <ProjectSelectorList
                    currentProjectId={selectedProject.projectId}
                    onSelect={handleSelectProject}
                    projects={projects.map((project) => ({
                        active: project.active,
                        deleted: project.deleted,
                        id: project.projectId,
                        isDefault: project.isDefault,
                        isSpecialMenu: project.isSpecialMenu === true,
                        name: project.name,
                        projectImage: project.projectImage || null,
                        secondaryLabel: project.url.replace(/^https?:\/\//, ''),
                        specialMenuBaseProjectId: project.specialMenuBaseProjectId,
                        specialMenuBaseProjectName: project.specialMenuBaseProjectId
                            ? resolveName(
                                projects.find((candidate) => candidate.projectId === project.specialMenuBaseProjectId)?.name,
                                'Menu',
                            )
                            : undefined,
                        specialMenuEndsAt: project.specialMenuEndsAt,
                        specialMenuStatus: project.specialMenuStatus,
                    }))}
                />
            </Modal>
        </div>
    );
}
