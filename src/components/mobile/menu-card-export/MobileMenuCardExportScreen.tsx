'use client';

import useMenuCardExportController, {
    resolveMenuCardProjectName,
    type MenuCardExportNotice,
} from '@hook/useMenuCardExportController';
import { formatDateTime } from '@util/dateTime';
import { theme } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuChevronDown, LuDownload, LuHistory, LuPackage, LuPrinter, LuQrCode, LuShare2, LuSparkles } from 'react-icons/lu';
import { Button, Card, DotLoading, Empty, Flex, List, MobileAntdAppBridge, NavBar, Popup, Switch, Tag, Text, Title, Toast } from '../antd';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

const DENSITY_OPTIONS = [
    { label: 'Comfort', value: 'comfortable' },
    { label: 'Balanced', value: 'balanced' },
    { label: 'Compact', value: 'compact' },
] as const;

function notifyMobile(notice: MenuCardExportNotice) {
    Toast.show({
        content: notice.content,
        duration: notice.type === 'error' ? 2200 : 1600,
        icon: notice.type === 'success' ? 'success' : undefined,
    });
}

function formatGeneratedAt(value: string) {
    const label = formatDateTime(value, 'datetime');
    return label === 'N/A' ? '' : label;
}

function WarningRow({ message, severity }: { message: string; severity: string }) {
    const { token } = theme.useToken();
    const isBlocker = severity === 'blocker';
    const isInfo = severity === 'info';

    return (
        <Flex
            gap={10}
            style={{
                background: isBlocker ? token.colorErrorBg : isInfo ? token.colorInfoBg : token.colorWarningBg,
                border: `1px solid ${isBlocker ? token.colorErrorBorder : isInfo ? token.colorInfoBorder : token.colorWarningBorder}`,
                borderRadius: 8,
                padding: 12,
            }}
        >
            {isBlocker ? <LuAlertTriangle color={token.colorError} size={18} /> : <LuAlertTriangle color={isInfo ? token.colorInfo : token.colorWarning} size={18} />}
            <Text style={{ flex: 1, fontSize: 13 }}>{message}</Text>
        </Flex>
    );
}

type MobileMenuCardExportScreenProps = {
    initialProjectId?: string | null;
    onBack?: () => void;
};

export default function MobileMenuCardExportScreen({ initialProjectId, onBack }: MobileMenuCardExportScreenProps = {}) {
    const { token } = theme.useToken();
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        isLoading: mobileProjectsLoading,
        projectsById,
        projectsList,
        refreshCachedProject,
        selectedProjectId: mobileSelectedProjectId,
    } = useMobileProjects();
    const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
    const notify = useCallback(notifyMobile, []);
    const shouldUseMobileProjectState = !mobileProjectsLoading || projectsList.length > 0;
    const resolvedInitialProjectId = initialProjectId || mobileSelectedProjectId || searchParams?.get('projectId');
    const handleBack = onBack || (() => router.back());
    const {
        adviceError,
        adviceLoading,
        applyDesignAdvice,
        autoDesign,
        businessProfile,
        blockers,
        createArtifact,
        designAdvice,
        getFreshnessState,
        history,
        isAiAdvisorEnabled,
        isEnabled,
        isHistoryEnabled,
        loading,
        preview,
        projects,
        rendering,
        requestDesignAdvice,
        reusableExport,
        selectProject,
        selectedProject,
        settings,
        source,
        sourceHash,
        templates,
        updateDensity,
        updatePreset,
        updateStyle,
        updateToggle,
        visiblePresets,
        warnings,
    } = useMenuCardExportController({
        initialProjectId: resolvedInitialProjectId,
        loadProjectData: shouldUseMobileProjectState ? refreshCachedProject : undefined,
        notify,
        projectDataById: shouldUseMobileProjectState ? projectsById : undefined,
        projectSummaries: shouldUseMobileProjectState ? projectsList : undefined,
    });

    const closeProjectSheet = () => setIsProjectSheetOpen(false);
    const handleSelectProject = (projectId: string) => {
        selectProject(projectId);
        closeProjectSheet();
    };
    const isBlocked = blockers.length > 0;
    const documentLabel = businessProfile?.documentLabel || 'Menu';
    const documentLabelLower = documentLabel.toLowerCase();

    if (!isEnabled) {
        return (
            <Flex style={{ background: token.colorBgLayout, minHeight: '100dvh' }} vertical>
                <MobileAntdAppBridge />
                <NavBar onBack={handleBack} titleAlign="left">Print {documentLabel}</NavBar>
                <Flex align="center" justify="center" style={{ flex: 1, padding: 20 }}>
                    <Empty description="Print menu is not enabled" />
                </Flex>
            </Flex>
        );
    }

    if (loading && !source) {
        return (
            <Flex style={{ background: token.colorBgLayout, minHeight: '100dvh' }} vertical>
                <MobileAntdAppBridge />
                <NavBar onBack={handleBack} titleAlign="left">Print {documentLabel}</NavBar>
                <Flex align="center" gap={10} justify="center" style={{ flex: 1 }} vertical>
                    <DotLoading color="primary" />
                    <Text type="secondary">Preparing print menu</Text>
                </Flex>
            </Flex>
        );
    }

    if (!selectedProject || !source || !preview) {
        return (
            <Flex style={{ background: token.colorBgLayout, minHeight: '100dvh' }} vertical>
                <MobileAntdAppBridge />
                <NavBar onBack={handleBack} titleAlign="left">Print {documentLabel}</NavBar>
                <Flex align="center" justify="center" style={{ flex: 1, padding: 20 }}>
                    <Empty description="Create a menu before exporting a print file" />
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ background: token.colorBgLayout, minHeight: '100dvh' }} vertical>
            <MobileAntdAppBridge />
            <NavBar onBack={handleBack} titleAlign="left">Print {documentLabel}</NavBar>

            <Flex gap={12} style={{ flex: 1, overflowY: 'auto', padding: 14, paddingBottom: 'calc(env(safe-area-inset-bottom) + 112px)' }} vertical>
                <Flex gap={6} vertical>
                    <Title level={4} style={{ margin: 0 }}>Create print file</Title>
                    <Text type="secondary">Use the current {documentLabelLower} for PDF, WhatsApp, or print shop.</Text>
                </Flex>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between" gap={12}>
                            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                <Text type="secondary" style={{ fontSize: 12 }}>{documentLabel}</Text>
                                <Text strong ellipsis>{resolveMenuCardProjectName(selectedProject.name, 'Menu')}</Text>
                            </Flex>
                            <Button
                                disabled={projects.length <= 1}
                                fill="outline"
                                icon={<LuChevronDown />}
                                onClick={() => setIsProjectSheetOpen(true)}
                                size="small"
                            >
                                Change
                            </Button>
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            <Tag color="primary">{preview.plan.pageCount} page{preview.plan.pageCount === 1 ? '' : 's'}</Tag>
                            <Tag>{settings.preset.replace(/_/g, ' ')}</Tag>
                            {settings.includeQr ? <Tag color="success">Live QR</Tag> : <Tag>QR off</Tag>}
                        </Flex>
                    </Flex>
                </Card>

                <Card title="Job">
                    <Flex gap={8} vertical>
                        {visiblePresets.map((preset) => {
                            const active = settings.preset === preset.id;
                            const icon = preset.id === 'print_shop_packet'
                                ? <LuPackage />
                                : preset.id === 'whatsapp'
                                    ? <LuShare2 />
                                    : <LuPrinter />;
                            return (
                                <Button
                                    block
                                    color={active ? 'primary' : undefined}
                                    fill={active ? 'solid' : 'outline'}
                                    icon={icon}
                                    key={preset.id}
                                    onClick={() => updatePreset(preset.id)}
                                    style={{ justifyContent: 'flex-start', minHeight: 58 }}
                                >
                                    <Flex gap={2} style={{ minWidth: 0, textAlign: 'left' }} vertical>
                                        <Text strong style={{ color: active ? token.colorTextLightSolid : undefined }}>{preset.label}</Text>
                                        <Text style={{ color: active ? 'rgba(255,255,255,0.76)' : token.colorTextSecondary, fontSize: 12 }} ellipsis>
                                            {preset.description}
                                        </Text>
                                    </Flex>
                                </Button>
                            );
                        })}
                    </Flex>
                </Card>

                <Card title="Style">
                    {autoDesign && settings.styleId === autoDesign.settings.styleId ? (
                        <Tag color="success" style={{ marginBottom: 10 }}>Auto picked</Tag>
                    ) : null}
                    <Flex gap={8} wrap="wrap">
                        {templates.map((template) => {
                            const active = settings.styleId === template.id;
                            return (
                                <Button
                                    color={active ? 'primary' : undefined}
                                    fill={active ? 'solid' : 'outline'}
                                    key={template.id}
                                    onClick={() => updateStyle(template.id)}
                                    style={{ minWidth: 96 }}
                                >
                                    {template.name}
                                </Button>
                            );
                        })}
                    </Flex>
                </Card>

                <Card title="Density">
                    {autoDesign && settings.density === autoDesign.settings.density ? (
                        <Tag color="success" style={{ marginBottom: 10 }}>{autoDesign.label}</Tag>
                    ) : null}
                    <Flex gap={8} wrap="wrap">
                        {DENSITY_OPTIONS.map((option) => {
                            const active = settings.density === option.value;
                            return (
                                <Button
                                    color={active ? 'primary' : undefined}
                                    fill={active ? 'solid' : 'outline'}
                                    key={option.value}
                                    onClick={() => updateDensity(option.value)}
                                    style={{ minWidth: 96 }}
                                >
                                    {option.label}
                                </Button>
                            );
                        })}
                    </Flex>
                </Card>

                {isAiAdvisorEnabled ? (
                    <Card title="Pro layout suggestion">
                        <Flex gap={10} vertical>
                            <Text type="secondary">Available on Pro and Premium. Uses one enhancement only after a suggestion is ready.</Text>
                            <Button
                                block
                                fill="outline"
                                icon={<LuSparkles />}
                                loading={adviceLoading}
                                onClick={() => void requestDesignAdvice()}
                            >
                                Suggest layout
                            </Button>
                            {adviceError ? <WarningRow message={adviceError} severity="warning" /> : null}
                            {designAdvice ? (
                                <Flex gap={10} style={{ background: token.colorInfoBg, border: `1px solid ${token.colorInfoBorder}`, borderRadius: 8, padding: 12 }} vertical>
                                    <Text strong>{designAdvice.ownerNote}</Text>
                                    <Text type="secondary">{designAdvice.reason}</Text>
                                    <Flex gap={6} wrap="wrap">
                                        <Tag>{designAdvice.preset.replace(/_/g, ' ')}</Tag>
                                        <Tag>{designAdvice.styleId}</Tag>
                                        <Tag>{designAdvice.density}</Tag>
                                    </Flex>
                                    <Button block onClick={applyDesignAdvice}>Apply suggestion</Button>
                                </Flex>
                            ) : null}
                        </Flex>
                    </Card>
                ) : null}

                <Card title="Options">
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between" gap={12}>
                            <Text>Include descriptions</Text>
                            <Switch checked={settings.includeDescriptions} onChange={(checked) => updateToggle('includeDescriptions', checked)} />
                        </Flex>
                        <Flex align="center" justify="space-between" gap={12}>
                            <Text>Include QR</Text>
                            <Switch checked={settings.includeQr} onChange={(checked) => updateToggle('includeQr', checked)} />
                        </Flex>
                        <Flex align="center" justify="space-between" gap={12}>
                            <Text>Include contact block</Text>
                            <Switch checked={settings.includeContactBlock} onChange={(checked) => updateToggle('includeContactBlock', checked)} />
                        </Flex>
                    </Flex>
                </Card>

                <Card title="Preview">
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between" gap={12}>
                            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                <Text strong ellipsis>{source.business.name}</Text>
                                <Text type="secondary" ellipsis>{source.menu.title}</Text>
                            </Flex>
                            {settings.includeQr ? <LuQrCode color={token.colorTextSecondary} size={34} /> : null}
                        </Flex>
                        <List>
                            {preview.plan.pages.map((page) => (
                                <List.Item
                                    key={page.pageNumber}
                                    title={`Page ${page.pageNumber}`}
                                    description={page.categories.map((category) => `${category.name} (${category.itemCount})`).join(', ') || 'No visible items'}
                                />
                            ))}
                        </List>
                    </Flex>
                </Card>

                <Card title="Preflight">
                    <Flex gap={8} vertical>
                        {blockers.length === 0 && warnings.length === 0 ? (
                            <Flex gap={8} style={{ background: token.colorSuccessBg, border: `1px solid ${token.colorSuccessBorder}`, borderRadius: 8, padding: 12 }}>
                                <LuCheck color={token.colorSuccess} size={18} />
                                <Text>Ready to export</Text>
                            </Flex>
                        ) : null}
                        {blockers.map((warning) => (
                            <WarningRow key={warning.code} message={warning.message} severity={warning.severity} />
                        ))}
                        {warnings.map((warning, index) => (
                            <WarningRow key={`${warning.code}-${index}`} message={warning.message} severity={warning.severity} />
                        ))}
                        {isHistoryEnabled && reusableExport ? (
                            <Flex gap={8} style={{ background: token.colorInfoBg, border: `1px solid ${token.colorInfoBorder}`, borderRadius: 8, padding: 12 }}>
                                <LuHistory color={token.colorInfo} size={18} />
                                <Text>A matching export was created before. Creating again uses the same menu state.</Text>
                            </Flex>
                        ) : null}
                    </Flex>
                </Card>

                {isHistoryEnabled ? (
                    <Card title="History">
                        {history.length === 0 ? (
                            <Text type="secondary">Exports created on this device appear here. No Firebase writes are used.</Text>
                        ) : (
                            <List>
                                {history.slice(0, 6).map((record) => (
                                    <List.Item
                                        key={record.id}
                                        title={record.fileName}
                                        description={formatGeneratedAt(record.generatedAt)}
                                        extra={(
                                            <Tag color={getFreshnessState(record, sourceHash) === 'Current' ? 'success' : 'warning'}>
                                                {getFreshnessState(record, sourceHash)}
                                            </Tag>
                                        )}
                                    />
                                ))}
                            </List>
                        )}
                    </Card>
                ) : null}
            </Flex>

            <Flex
                gap={8}
                style={{
                    background: token.colorBgContainer,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    bottom: 0,
                    left: 0,
                    padding: '10px 14px calc(env(safe-area-inset-bottom) + 10px)',
                    position: 'fixed',
                    right: 0,
                    zIndex: 30,
                }}
            >
                <Button
                    block
                    disabled={isBlocked}
                    icon={<LuDownload />}
                    loading={rendering}
                    onClick={() => void createArtifact(false)}
                >
                    {settings.preset === 'print_shop_packet' ? 'Create packet' : 'Create PDF'}
                </Button>
                <Button
                    block
                    disabled={isBlocked}
                    fill="outline"
                    icon={<LuShare2 />}
                    loading={rendering}
                    onClick={() => void createArtifact(true)}
                >
                    Share
                </Button>
            </Flex>

            <Popup
                bodyStyle={{ maxHeight: '80vh', padding: 0 }}
                destroyOnClose
                onMaskClick={closeProjectSheet}
                visible={isProjectSheetOpen}
            >
                <NavBar onBack={closeProjectSheet} titleAlign="left">Select Menu</NavBar>
                <Flex style={{ padding: 16, paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} vertical>
                    <List>
                        {projects.map((project) => (
                            <List.Item
                                arrow
                                key={project.projectId}
                                onClick={() => handleSelectProject(project.projectId)}
                                title={resolveMenuCardProjectName(project.name, 'Menu')}
                                description={project.url.replace(/^https?:\/\//, '')}
                                extra={project.projectId === selectedProject.projectId ? <Tag color="success">Selected</Tag> : null}
                            />
                        ))}
                    </List>
                </Flex>
            </Popup>
        </Flex>
    );
}
