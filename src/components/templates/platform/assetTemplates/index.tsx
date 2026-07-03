'use client'

import { FEATURE_FLAGS } from '@config/features';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import {
    BUSINESS_CATEGORIES,
    BUSINESS_TYPES,
    FALLBACK_BUSINESS_CATEGORY,
    FALLBACK_BUSINESS_TYPE,
    normalizeBusinessCategory,
} from '@data/shared/businessTypes';
import {
    deleteCreativeEditorPlatformTemplate,
    getCreativeEditorTemplate,
    listCreativeEditorPlatformTemplateCatalog,
    saveCreativeEditorPlatformTemplate,
    updateCreativeEditorPlatformTemplateMetadata,
    type CreativeEditorTemplateContext,
} from '@lib/creative-editor/templateRegistryDal';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { PRINTABLE_ASSET_TYPES, getPrintableAssetType } from '@lib/printable-asset-templates/assetTypes';
import {
    buildPrintableAssetEditorDocument,
    isPrintableAssetEditorRenderable,
} from '@lib/printable-asset-templates/editorDocumentAdapter';
import { PRINTABLE_TEMPLATE_FAMILIES, getPrintableTemplateFamily } from '@lib/printable-asset-templates/templateFamilies';
import type { PrintableAssetRenderInput, PrintableAssetTypeId, PrintableTemplateFamilyId } from '@lib/printable-asset-templates/types';
import CreativeEditor from '@/modules/creative-editor/CreativeEditor';
import type { CreativeEditorDocument, CreativeEditorTemplateSaveRequest, CreativeEditorTemplateSummary } from '@/modules/creative-editor/types';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    Flex,
    Form,
    Input,
    Modal,
    Result,
    Row,
    Select,
    Space,
    Spin,
    Statistic,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuArchive,
    LuFileEdit,
    LuLayers,
    LuPlus,
    LuRefreshCw,
    LuSave,
    LuTrash,
    LuX,
} from 'react-icons/lu';
import styles from './styles.module.scss';

const { Text, Title } = Typography;

const PRODUCT_ID = 'menulist';
const SOURCE_SURFACE = 'printable-asset-templates';
const PLATFORM_TEMPLATE_DELETE_FAILED_MESSAGE = 'Platform template could not be deleted';
const PLATFORM_TEMPLATE_LOAD_FAILED_MESSAGE = 'Platform templates could not be loaded';
const PLATFORM_TEMPLATE_OPEN_FAILED_MESSAGE = 'Template could not be opened';
const PLATFORM_TEMPLATE_SAVE_FAILED_MESSAGE = 'Platform template could not be saved';
const PLATFORM_TEMPLATE_UPDATE_FAILED_MESSAGE = 'Platform template could not be updated';
const PLATFORM_CATEGORY_OPTIONS = [
    { label: 'Generic / shared', value: 'generic' },
    ...BUSINESS_CATEGORIES.map((category) => ({
        label: category.label,
        value: category.value,
    })),
];

const TEMPLATE_STATUS_OPTIONS = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
] as const;

type TemplateStatus = typeof TEMPLATE_STATUS_OPTIONS[number]['value'];

type EditorState = {
    assetTypeId: PrintableAssetTypeId;
    document: CreativeEditorDocument;
    mode: 'create' | 'edit';
    templateId?: string;
};

const getStatusColor = (status?: string) => {
    if (status === 'published') return 'green';
    if (status === 'archived') return 'default';
    return 'gold';
};

const normalizeStatus = (status?: string): TemplateStatus => {
    if (status === 'published' || status === 'archived') return status;
    return 'draft';
};

const makeDefaultTitle = (assetTypeId: PrintableAssetTypeId, templateFamilyId: PrintableTemplateFamilyId) => {
    const asset = getPrintableAssetType(assetTypeId);
    const family = getPrintableTemplateFamily(templateFamilyId);
    return `${asset.title} - ${family.label}`;
};

const resolvePreviewBusinessCategory = (businessCategory: string) => (
    businessCategory === 'generic'
        ? 'food'
        : normalizeBusinessCategory(businessCategory) || FALLBACK_BUSINESS_CATEGORY
);

const resolvePreviewBusinessType = (businessCategory: string) => {
    const previewCategory = resolvePreviewBusinessCategory(businessCategory);
    return BUSINESS_TYPES.find((type) => type.category === previewCategory)?.value || FALLBACK_BUSINESS_TYPE;
};

const buildSampleRenderInput = (
    assetTypeId: PrintableAssetTypeId,
    templateFamilyId: PrintableTemplateFamilyId,
    businessCategory: string,
): PrintableAssetRenderInput => {
    const previewBusinessCategory = resolvePreviewBusinessCategory(businessCategory);

    return {
        activePlanType: 'pro',
        assetTypeId,
        brandColor: '#2c7a67',
        businessCategory: previewBusinessCategory,
        businessType: resolvePreviewBusinessType(previewBusinessCategory),
        contactAddress: '12 Market Street, Ahmedabad',
        contactEmail: 'hello@greentable.example',
        contactName: 'Aarav Mehta',
        contactPhone: '+91 90000 11111',
        contactRole: 'Owner',
        feedbackUrl: 'https://demo.menulist.ai/feedback',
        lastPublishedAt: new Date(),
        logoUrl: null,
        menuUrl: 'https://demo.menulist.ai/menu',
        obpBaseUrl: 'https://demo.menulist.ai',
        outputFormat: 'png',
        projectId: 'platform-template-preview',
        shortLink: 'demo.menulist.ai/menu',
        socialHandle: '@greentablecafe',
        storeName: 'Green Table Cafe',
        templateFamilyId,
    };
};

const makeTemplateContext = (
    businessCategory: string,
    assetTypeId?: string,
): CreativeEditorTemplateContext => ({
    assetTypeId,
    businessCategory,
    productId: PRODUCT_ID,
    sourceSurface: SOURCE_SURFACE,
    templateType: 'platform',
});

const buildTemplateManagerLogContext = (
    action: string,
    metadata: {
        assetTypeId?: unknown;
        businessCategory?: unknown;
        templateFamilyId?: unknown;
        templateId?: unknown;
    } = {},
) => ({
    action,
    ...getBoundedRuntimeStringContext('assetTypeId', metadata.assetTypeId),
    ...getBoundedRuntimeStringContext('businessCategory', metadata.businessCategory),
    ...getBoundedRuntimeStringContext('templateFamilyId', metadata.templateFamilyId),
    ...getBoundedRuntimeStringContext('templateId', metadata.templateId),
});

function PlatformAssetTemplates() {
    const session = useClientAuthSession();
    const { token } = theme.useToken();
    const [messageApi, messageHolder] = message.useMessage();
    const [modal, modalHolder] = Modal.useModal();
    const [businessCategory, setBusinessCategory] = useState('generic');
    const [assetTypeId, setAssetTypeId] = useState<PrintableAssetTypeId>('single_table_card');
    const [templateFamilyId, setTemplateFamilyId] = useState<PrintableTemplateFamilyId>('modern-calm');
    const [status, setStatus] = useState<TemplateStatus>('draft');
    const [title, setTitle] = useState(makeDefaultTitle('single_table_card', 'modern-calm'));
    const [description, setDescription] = useState('');
    const [templates, setTemplates] = useState<CreativeEditorTemplateSummary[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<CreativeEditorTemplateSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [busyKey, setBusyKey] = useState('');
    const [editorState, setEditorState] = useState<EditorState | null>(null);

    const canManage = session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const canUseManager = FEATURE_FLAGS.ENABLE_PLATFORM_ASSET_TEMPLATE_MANAGER
        && FEATURE_FLAGS.ENABLE_CREATIVE_EDITOR_TEMPLATE_REGISTRY
        && FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER;
    const isRenderableAsset = isPrintableAssetEditorRenderable(assetTypeId);

    const filteredTemplates = useMemo(() => (
        templates.filter((template) => (
            template.productId === PRODUCT_ID
            && template.sourceSurface === SOURCE_SURFACE
            && template.assetTypeId === assetTypeId
        ))
    ), [assetTypeId, templates]);

    const categoryLabel = PLATFORM_CATEGORY_OPTIONS.find((item) => item.value === businessCategory)?.label || businessCategory;
    const assetLabel = getPrintableAssetType(assetTypeId).title;

    const loadTemplates = useCallback(async () => {
        if (!canUseManager || !canManage) return;
        setLoading(true);
        try {
            const result = await listCreativeEditorPlatformTemplateCatalog({
                businessCategory,
                includeArchived: true,
                limit: 200,
            });
            setTemplates(result);
            setSelectedTemplate((current) => current ? result.find((item) => item.id === current.id) || null : null);
        } catch (error) {
            logRuntimeFailure('platform_asset_templates_load_failed', error, buildTemplateManagerLogContext('load_templates', {
                assetTypeId,
                businessCategory,
            }));
            messageApi.error(PLATFORM_TEMPLATE_LOAD_FAILED_MESSAGE);
        } finally {
            setLoading(false);
        }
    }, [assetTypeId, businessCategory, canManage, canUseManager, messageApi]);

    useEffect(() => {
        void loadTemplates();
    }, [loadTemplates]);

    const selectTemplate = (template: CreativeEditorTemplateSummary) => {
        setSelectedTemplate(template);
        setAssetTypeId((template.assetTypeId || 'single_table_card') as PrintableAssetTypeId);
        setTemplateFamilyId((template.templateFamilyId || 'modern-calm') as PrintableTemplateFamilyId);
        setStatus(normalizeStatus(template.status));
        setTitle(template.title);
        setDescription(template.description || '');
    };

    const resetCreateForm = () => {
        setSelectedTemplate(null);
        setStatus('draft');
        setTitle(makeDefaultTitle(assetTypeId, templateFamilyId));
        setDescription('');
    };

    const updateTemplatesLocal = (template: CreativeEditorTemplateSummary) => {
        setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
        setSelectedTemplate(template);
    };

    const openCreateEditor = () => {
        if (!isRenderableAsset) {
            messageApi.warning('This asset type does not use the Fabric editor yet.');
            return;
        }
        const nextTitle = title.trim() || makeDefaultTitle(assetTypeId, templateFamilyId);
        const documentValue = {
            ...buildPrintableAssetEditorDocument(buildSampleRenderInput(assetTypeId, templateFamilyId, businessCategory)),
            title: nextTitle,
        };
        setEditorState({
            assetTypeId,
            document: documentValue,
            mode: 'create',
        });
    };

    const openExistingEditor = async (template: CreativeEditorTemplateSummary) => {
        const selectedAssetType = (template.assetTypeId || assetTypeId) as PrintableAssetTypeId;
        if (!isPrintableAssetEditorRenderable(selectedAssetType)) {
            messageApi.warning('This asset type does not use the Fabric editor yet.');
            return;
        }
        setBusyKey(`open:${template.id}`);
        try {
            const result = await getCreativeEditorTemplate({
                ...makeTemplateContext(businessCategory, selectedAssetType),
                includeUnpublished: true,
                templateId: template.id,
            });
            selectTemplate(template);
            setEditorState({
                assetTypeId: selectedAssetType,
                document: result.document,
                mode: 'edit',
                templateId: template.id,
            });
        } catch (error) {
            logRuntimeFailure('platform_asset_template_open_failed', error, buildTemplateManagerLogContext('open_template', {
                assetTypeId: selectedAssetType,
                businessCategory,
                templateId: template.id,
            }));
            messageApi.error(PLATFORM_TEMPLATE_OPEN_FAILED_MESSAGE);
        } finally {
            setBusyKey('');
        }
    };

    const saveMetadata = async () => {
        if (!selectedTemplate) {
            messageApi.warning('Select a platform template first.');
            return;
        }
        const nextTitle = title.trim();
        if (!nextTitle) {
            messageApi.warning('Template name is required.');
            return;
        }
        setBusyKey(`metadata:${selectedTemplate.id}`);
        try {
            const template = await updateCreativeEditorPlatformTemplateMetadata({
                ...makeTemplateContext(businessCategory, selectedTemplate.assetTypeId || assetTypeId),
                description: description.trim() || undefined,
                status,
                templateFamilyId,
                templateId: selectedTemplate.id,
                title: nextTitle,
            });
            updateTemplatesLocal(template);
            messageApi.success('Platform template updated');
        } catch (error) {
            logRuntimeFailure('platform_asset_template_metadata_update_failed', error, buildTemplateManagerLogContext('update_metadata', {
                assetTypeId: selectedTemplate.assetTypeId || assetTypeId,
                businessCategory,
                templateFamilyId,
                templateId: selectedTemplate.id,
            }));
            messageApi.error(PLATFORM_TEMPLATE_UPDATE_FAILED_MESSAGE);
        } finally {
            setBusyKey('');
        }
    };

    const deleteTemplate = (template: CreativeEditorTemplateSummary) => {
        modal.confirm({
            content: 'This removes the platform template from owner catalogs and deletes its stored editor document.',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                setBusyKey(`delete:${template.id}`);
                try {
                    await deleteCreativeEditorPlatformTemplate({
                        ...makeTemplateContext(businessCategory, template.assetTypeId || assetTypeId),
                        templateId: template.id,
                    });
                    setTemplates((current) => current.filter((item) => item.id !== template.id));
                    setSelectedTemplate((current) => current?.id === template.id ? null : current);
                    messageApi.success('Platform template deleted');
                } catch (error) {
                    logRuntimeFailure('platform_asset_template_delete_failed', error, buildTemplateManagerLogContext('delete_template', {
                        assetTypeId: template.assetTypeId || assetTypeId,
                        businessCategory,
                        templateId: template.id,
                    }));
                    messageApi.error(PLATFORM_TEMPLATE_DELETE_FAILED_MESSAGE);
                } finally {
                    setBusyKey('');
                }
            },
            title: `Delete "${template.title}"?`,
        });
    };

    const handleEditorSave = async ({ document, previewDataUrl }: CreativeEditorTemplateSaveRequest) => {
        const nextTitle = title.trim() || document.title || makeDefaultTitle(editorState?.assetTypeId || assetTypeId, templateFamilyId);
        if (!editorState) throw new Error('Editor is not ready');
        try {
            const template = await saveCreativeEditorPlatformTemplate({
                ...makeTemplateContext(businessCategory, editorState.assetTypeId),
                description: description.trim() || undefined,
                document,
                status,
                templateFamilyId,
                templateId: editorState.templateId,
                thumbnailDataUrl: previewDataUrl,
                title: nextTitle,
            });
            setEditorState((current) => current ? { ...current, mode: 'edit', templateId: template.id } : current);
            updateTemplatesLocal(template);
            messageApi.success('Platform template saved');
            return { notice: 'Platform template saved.', template };
        } catch (error) {
            logRuntimeFailure('platform_asset_template_save_failed', error, buildTemplateManagerLogContext('save_template', {
                assetTypeId: editorState.assetTypeId,
                businessCategory,
                templateFamilyId,
                templateId: editorState.templateId,
            }));
            throw new Error(PLATFORM_TEMPLATE_SAVE_FAILED_MESSAGE);
        }
    };

    if (!canUseManager) {
        return <Result
            status="warning"
            title="Platform template manager is disabled"
            subTitle="Enable the platform asset template manager and Creative Editor registry feature flags to manage platform templates."
        />;
    }

    if (!canManage) {
        return <Result
            status="403"
            title="Platform access required"
            subTitle="Only MenuList platform users can manage platform asset templates."
        />;
    }

    return (
        <Flex className={styles.managerWrap} vertical gap={16}>
            {messageHolder}
            {modalHolder}
            <Flex justify="space-between" align="flex-start" gap={16} wrap="wrap">
                <Flex vertical gap={4}>
                    <Title level={3} style={{ margin: 0 }}>Platform Asset Templates</Title>
                    <Text type="secondary">Manage MenuList print asset templates by business category. Owners read one category catalog and one store catalog.</Text>
                </Flex>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} loading={loading} onClick={() => void loadTemplates()}>Reload</Button>
                    <Button icon={<LuPlus />} onClick={resetCreateForm}>New metadata</Button>
                    <Button disabled={!isRenderableAsset} icon={<LuFileEdit />} onClick={openCreateEditor} type="primary">
                        Design template
                    </Button>
                </Space>
            </Flex>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={8} xl={7}>
                    <Flex vertical gap={16}>
                        <Card className={styles.toolbarCard} title="Catalog">
                            <Form layout="vertical">
                                <Form.Item label="Business category">
                                    <Select
                                        options={PLATFORM_CATEGORY_OPTIONS}
                                        value={businessCategory}
                                        onChange={(value) => {
                                            setBusinessCategory(value);
                                            setSelectedTemplate(null);
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item label="Asset type">
                                    <Select
                                        options={PRINTABLE_ASSET_TYPES.map((asset) => ({
                                            disabled: !isPrintableAssetEditorRenderable(asset.id),
                                            label: `${asset.title}${isPrintableAssetEditorRenderable(asset.id) ? '' : ' (not editor-ready)'}`,
                                            value: asset.id,
                                        }))}
                                        value={assetTypeId}
                                        onChange={(value) => {
                                            const nextAssetType = value as PrintableAssetTypeId;
                                            setAssetTypeId(nextAssetType);
                                            if (!selectedTemplate) {
                                                setTitle(makeDefaultTitle(nextAssetType, templateFamilyId));
                                            }
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item label="Template family">
                                    <Select
                                        options={PRINTABLE_TEMPLATE_FAMILIES.map((family) => ({
                                            label: family.label,
                                            value: family.id,
                                        }))}
                                        value={templateFamilyId}
                                        onChange={(value) => {
                                            const nextFamily = value as PrintableTemplateFamilyId;
                                            setTemplateFamilyId(nextFamily);
                                            if (!selectedTemplate) {
                                                setTitle(makeDefaultTitle(assetTypeId, nextFamily));
                                            }
                                        }}
                                    />
                                </Form.Item>
                            </Form>
                            <Alert
                                message={`${categoryLabel} catalog`}
                                description={`${filteredTemplates.length} ${assetLabel.toLowerCase()} template${filteredTemplates.length === 1 ? '' : 's'} in this view. Draft templates stay hidden from owner catalogs until published.`}
                                type="info"
                                showIcon
                            />
                        </Card>

                        <Card title={selectedTemplate ? 'Selected template' : 'New template'}>
                            <Form layout="vertical">
                                <Form.Item label="Template name" required>
                                    <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Counter Sticker - Local Bold" />
                                </Form.Item>
                                <Form.Item label="Description">
                                    <Input.TextArea
                                        autoSize={{ minRows: 3, maxRows: 5 }}
                                        maxLength={220}
                                        onChange={(event) => setDescription(event.target.value)}
                                        placeholder="Short internal note for platform operators."
                                        showCount
                                        value={description}
                                    />
                                </Form.Item>
                                <Form.Item label="Status">
                                    <Select
                                        options={TEMPLATE_STATUS_OPTIONS as unknown as { label: string; value: string }[]}
                                        value={status}
                                        onChange={(value) => setStatus(value as TemplateStatus)}
                                    />
                                </Form.Item>
                                <Flex gap={8} wrap="wrap">
                                    <Button
                                        disabled={!selectedTemplate}
                                        icon={<LuSave />}
                                        loading={busyKey === `metadata:${selectedTemplate?.id}`}
                                        onClick={() => void saveMetadata()}
                                        type="primary"
                                    >
                                        Save metadata
                                    </Button>
                                    {selectedTemplate ? (
                                        <Button
                                            icon={<LuFileEdit />}
                                            loading={busyKey === `open:${selectedTemplate.id}`}
                                            onClick={() => void openExistingEditor(selectedTemplate)}
                                        >
                                            Edit design
                                        </Button>
                                    ) : (
                                        <Button disabled={!isRenderableAsset} icon={<LuFileEdit />} onClick={openCreateEditor}>
                                            Start design
                                        </Button>
                                    )}
                                </Flex>
                            </Form>
                        </Card>
                    </Flex>
                </Col>

                <Col xs={24} lg={16} xl={17}>
                    <Spin spinning={loading}>
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            <Col xs={24} sm={8}>
                                <Card>
                                    <Statistic title="Category templates" value={templates.length} />
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Card>
                                    <Statistic title="Current asset" value={filteredTemplates.length} />
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Card>
                                    <Statistic title="Published" value={templates.filter((template) => (template.status || 'published') === 'published').length} />
                                </Card>
                            </Col>
                        </Row>

                        {filteredTemplates.length ? (
                            <div className={styles.templateGrid}>
                                {filteredTemplates.map((template) => {
                                    const selected = selectedTemplate?.id === template.id;
                                    const width = Math.min(118, Math.max(70, Math.round((template.width / Math.max(template.height, template.width)) * 118)));
                                    const height = Math.min(118, Math.max(70, Math.round((template.height / Math.max(template.height, template.width)) * 118)));
                                    return (
                                        <Card
                                            className={styles.templateCard}
                                            hoverable
                                            key={template.id}
                                            onClick={() => selectTemplate(template)}
                                            style={{ borderColor: selected ? token.colorPrimary : undefined }}
                                        >
                                            <Flex vertical gap={12}>
                                                <div className={styles.templatePreview}>
                                                    <div className={styles.templatePreviewInner} style={{ width, height }}>
                                                        {template.thumbnailUrl ? (
                                                            <img
                                                                alt={`${template.title} preview`}
                                                                className={styles.templatePreviewImage}
                                                                src={template.thumbnailUrl}
                                                            />
                                                        ) : (
                                                            `${template.width} x ${template.height}`
                                                        )}
                                                    </div>
                                                </div>
                                                <Flex justify="space-between" align="flex-start" gap={10}>
                                                    <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                                        <Text strong ellipsis>{template.title}</Text>
                                                        <Text type="secondary" ellipsis>{template.description || getPrintableTemplateFamily(template.templateFamilyId).label}</Text>
                                                    </Flex>
                                                    <Tag color={getStatusColor(template.status)}>{normalizeStatus(template.status)}</Tag>
                                                </Flex>
                                                <Flex justify="space-between" align="center" gap={8} wrap="wrap">
                                                    <span className={styles.mutedMetric}>v{template.version || 1} · {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'not dated'}</span>
                                                    <Space>
                                                        <Button
                                                            icon={<LuFileEdit />}
                                                            loading={busyKey === `open:${template.id}`}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void openExistingEditor(template);
                                                            }}
                                                            size="small"
                                                        />
                                                        <Button
                                                            danger
                                                            icon={<LuTrash />}
                                                            loading={busyKey === `delete:${template.id}`}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                deleteTemplate(template);
                                                            }}
                                                            size="small"
                                                        />
                                                    </Space>
                                                </Flex>
                                            </Flex>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card>
                                <Empty
                                    description={`No ${assetLabel.toLowerCase()} templates in ${categoryLabel}.`}
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                >
                                    <Button disabled={!isRenderableAsset} icon={<LuPlus />} onClick={openCreateEditor} type="primary">
                                        Create platform template
                                    </Button>
                                </Empty>
                            </Card>
                        )}
                    </Spin>
                </Col>
            </Row>

            {editorState ? (
                <div className={styles.editorOverlay}>
                    <div className={styles.editorShell}>
                        <CreativeEditor
                            allowDesignImport
                            allowNewDesign={false}
                            chromeMode="full"
                            headerActions={[
                                {
                                    icon: <LuArchive size={16} />,
                                    id: 'template-status',
                                    label: status === 'published' ? 'Published' : status === 'archived' ? 'Archived' : 'Draft',
                                    onClick: () => undefined,
                                },
                                {
                                    icon: <LuLayers size={16} />,
                                    id: 'template-category',
                                    label: `${categoryLabel} / ${getPrintableAssetType(editorState.assetTypeId).title}`,
                                    onClick: () => undefined,
                                },
                                {
                                    ariaLabel: 'Close editor',
                                    icon: <LuX size={16} />,
                                    id: 'close-template-editor',
                                    label: 'Close',
                                    onClick: () => setEditorState(null),
                                    tone: 'default',
                                },
                            ]}
                            initialDocument={editorState.document}
                            key={`${editorState.mode}:${editorState.templateId || editorState.document.id}`}
                            onTemplateSave={handleEditorSave}
                            productLabel="MenuList Platform"
                            sourceLabel="Platform asset templates"
                            templateSaveLabel="Save platform template"
                            templateSavePreview
                        />
                    </div>
                </div>
            ) : null}
        </Flex>
    );
}

export default PlatformAssetTemplates;
