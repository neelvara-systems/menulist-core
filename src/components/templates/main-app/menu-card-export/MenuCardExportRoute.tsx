'use client';

import useMenuCardExportController, {
    resolveMenuCardProjectName,
    type MenuCardExportNotice,
} from '@hook/useMenuCardExportController';
import { buildPrintableAssetsUrl } from '@lib/printable-asset-templates/navigation';
import { formatDateTime } from '@util/dateTime';
import { Alert, Button, Card, Empty, Flex, List, App, Modal, Segmented, Skeleton, Space, Switch, Tag, theme, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuDownload, LuHistory, LuPackage, LuPalette, LuPrinter, LuQrCode, LuShare2, LuSparkles } from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger } from '../../../shared/ProjectSelector';
import styles from './menu-card-export.module.scss';

const { Paragraph, Text, Title } = Typography;

export default function MenuCardExportRoute() {
    return <DesktopMenuCardExportRoute />;
}

function DesktopMenuCardExportRoute() {
    const { message: messageApi } = App.useApp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const notify = useCallback((notice: MenuCardExportNotice) => {
        if (notice.type === 'success') {
            messageApi.success(notice.content);
            return;
        }
        if (notice.type === 'warning') {
            messageApi.warning(notice.content);
            return;
        }
        if (notice.type === 'error') {
            messageApi.error(notice.content);
            return;
        }
        messageApi.info(notice.content);
    }, []);
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
        printableTheme,
        printableThemeSource,
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
        initialProjectId: searchParams?.get('projectId'),
        notify,
    });
    const documentLabel = businessProfile?.documentLabel || 'Menu';
    const documentLabelLower = documentLabel.toLowerCase();

    const handleSelectProject = (projectId: string) => {
        selectProject(projectId);
        setIsProjectSelectorOpen(false);
    };

    if (!isEnabled) {
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

    return (
        <div className={styles.route}>
            <Flex className={styles.header} justify="space-between" gap={16} wrap="wrap">
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Print {documentLabel}</Title>
                    <Text type="secondary">Create a PDF or print-shop packet from the current {documentLabelLower}.</Text>
                </div>
                <Space>
                    <Tag icon={<LuQrCode size={12} />} color="blue">QR to live {documentLabelLower}</Tag>
                    <Tag color="default">{preview.plan.pageCount} page{preview.plan.pageCount === 1 ? '' : 's'}</Tag>
                </Space>
            </Flex>

            <div className={styles.grid}>
                <Card className={styles.panel} title="Setup" styles={{ body: { display: 'grid', gap: 14 } }}>
                    <div>
                        <Text strong>{documentLabel}</Text>
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
                                        ? resolveMenuCardProjectName(
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
                        <Flex align="center" justify="space-between" gap={8}>
                            <div>
                                <Text strong>Brand look</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Applied to this menu and every matching print asset.
                                </Text>
                            </div>
                            <Button
                                icon={<LuPalette />}
                                onClick={() => router.push(buildPrintableAssetsUrl(selectedProject.projectId))}
                                size="small"
                            >
                                Change
                            </Button>
                        </Flex>
                        <Flex
                            align="center"
                            gap={8}
                            justify="space-between"
                            style={{
                                background: token.colorFillQuaternary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: token.borderRadiusLG,
                                marginTop: 8,
                                padding: '10px 12px',
                            }}
                        >
                            <Space size={8}>
                                <LuPalette color={token.colorPrimary} size={16} />
                                <Text strong>{printableTheme.label}</Text>
                            </Space>
                            <Tag color={printableThemeSource === 'recommended' ? 'default' : 'green'}>
                                {printableThemeSource === 'project-theme'
                                    ? 'This menu'
                                    : printableThemeSource === 'business-theme'
                                        ? 'All menus'
                                        : 'Recommended'}
                            </Tag>
                        </Flex>
                    </div>

                    <div>
                        <Flex align="center" justify="space-between" gap={8}>
                            <Text strong>Layout</Text>
                            {autoDesign && settings.styleId === autoDesign.settings.styleId ? <Tag color="green">Auto picked</Tag> : null}
                        </Flex>
                        <Segmented
                            block
                            style={{ marginTop: 8 }}
                            value={settings.styleId}
                            onChange={(value) => updateStyle(String(value))}
                            options={templates.map((template) => ({ label: template.name, value: template.id }))}
                        />
                    </div>

                    <div>
                        <Flex align="center" justify="space-between" gap={8}>
                            <Text strong>Density</Text>
                            {autoDesign && settings.density === autoDesign.settings.density ? <Tag color="green">{autoDesign.label}</Tag> : null}
                        </Flex>
                        <Segmented
                            block
                            style={{ marginTop: 8 }}
                            value={settings.density}
                            onChange={(value) => updateDensity(value as any)}
                            options={[
                                { label: 'Comfort', value: 'comfortable' },
                                { label: 'Balanced', value: 'balanced' },
                                { label: 'Compact', value: 'compact' },
                            ]}
                        />
                    </div>

                    {isAiAdvisorEnabled ? (
                        <div className={styles.advisorBox}>
                            <Flex align="flex-start" justify="space-between" gap={12} wrap="wrap">
                                <div className={styles.advisorCopy}>
                                    <Text strong><Space size={6}><LuSparkles size={15} /> Pro layout suggestion</Space></Text>
                                    <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                                        Available on Pro and Multi-location. Uses one enhancement only after a suggestion is ready.
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
                            <div>
                                <Text>Dedicated cover page</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>Logo, business name, live-menu QR, and available contact details.</Text>
                            </div>
                            <Switch aria-label="Include dedicated cover page" checked={settings.includeCoverPage === true} onChange={(checked) => updateToggle('includeCoverPage', checked)} />
                        </Flex>
                        <Flex align="center" justify="space-between" className={styles.toggleRow}>
                            <Text>Include descriptions</Text>
                            <Switch aria-label="Include descriptions" checked={settings.includeDescriptions} onChange={(checked) => updateToggle('includeDescriptions', checked)} />
                        </Flex>
                        <Flex align="center" justify="space-between" className={styles.toggleRow}>
                            <Text>Include QR</Text>
                            <Switch aria-label="Include QR" checked={settings.includeQr} onChange={(checked) => updateToggle('includeQr', checked)} />
                        </Flex>
                        <Flex align="center" justify="space-between" className={styles.toggleRow}>
                            <Text>Include contact block</Text>
                            <Switch aria-label="Include contact block" checked={settings.includeContactBlock} onChange={(checked) => updateToggle('includeContactBlock', checked)} />
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
                            <Tag icon={<LuPalette size={12} />}>{printableTheme.label}</Tag>
                            <Tag>Layout: {settings.styleId}</Tag>
                            <Tag>{preview.plan.mode.replace(/_/g, ' ')}</Tag>
                            {settings.includeCoverPage ? <Tag color="green">Cover page</Tag> : null}
                        </Space>
                        <List
                            size="small"
                            dataSource={preview.plan.pages}
                            renderItem={(page) => (
                                <List.Item>
                                    <Flex vertical gap={4} style={{ width: '100%' }}>
                                        <Text strong>{page.kind === 'cover'
                                            ? 'Cover page'
                                            : settings.includeCoverPage
                                                ? `Menu page ${page.pageNumber - 1}`
                                                : `Page ${page.pageNumber}`}</Text>
                                        <Text type="secondary">
                                            {page.kind === 'cover'
                                                ? 'Business identity, QR, and available contact details'
                                                : page.categories.map((category) => `${category.name} (${category.itemCount})`).join(', ') || 'No visible items'}
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
                        {isHistoryEnabled && reusableExport ? (
                            <Alert style={{ marginTop: 12 }} type="info" showIcon message="A matching export was created before. Creating again will reuse the same menu state." />
                        ) : null}
                        <Flex gap={8} style={{ marginTop: 16 }} wrap>
                            <Button
                                type="primary"
                                icon={<LuDownload />}
                                loading={rendering}
                                disabled={blockers.length > 0}
                                onClick={() => void createArtifact(false)}
                            >
                                {settings.preset === 'print_shop_packet' ? 'Create packet' : 'Create PDF'}
                            </Button>
                            <Button
                                icon={<LuShare2 />}
                                loading={rendering}
                                disabled={blockers.length > 0}
                                onClick={() => void createArtifact(true)}
                            >
                                Share
                            </Button>
                        </Flex>
                    </Card>

                    {isHistoryEnabled ? (
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
                                                    <Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(record.generatedAt, 'datetime', formatter)}</Text>
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
                            ? resolveMenuCardProjectName(
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
