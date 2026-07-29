'use client';

import PasteUpload, { PastedFile } from '@atoms/PasteUpload';
import TiptapEditor from '@atoms/TiptapEditor';
import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_GOVERNANCE_TABS,
    ANSWERLATTICE_ROUTES,
    getAnswerlatticeGovernanceRoute,
} from '@constant/answerlattice/navigations';
import { CHANGELOG_TAG_CONFIG, CHANGELOG_TAG_OPTIONS } from '@constant/changelog';
import { getEntities } from '@database/answerlattice/entities';
import {
    activateRelease,
    addRelease,
    AnswerlatticeReleaseClientError,
    previewReleaseImpact,
} from '@database/answerlattice/releases';
import { getProductSurfacesForSession, rebuildProductSurfaceContentSummaryWithDiagnostics } from '@database/answerlattice/productSurfaces';
import { addChangelogEntry, updateChangelogEntry } from '@database/changelog';
import { useAnswerlatticePublicContentRequestScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import {
    getAnswerlatticeAnswerContextRoute,
    getAnswerlatticeReleaseContextRoute,
} from '@lib/answerlattice/ownerDecisionNavigation';
import { normalizeAnswerlatticeVersionLabel } from '@lib/answerlattice/releaseContracts';
import { createRuntimeId } from '@lib/runtime/randomId';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { ChangelogEntry } from '@type/changelog';
import { getClockTimeInputFormat } from '@util/dateTime';
import { getBase64, getYouTubeID } from '@util/utils';
import {
    Alert,
    Button,
    DatePicker,
    Drawer,
    Flex,
    Form,
    Input,
    Modal,
    Select,
    Switch,
    TimePicker,
    Typography,
    Upload,
    message,
} from 'antd';
import { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuExternalLink } from 'react-icons/lu';
import KbTreeSelect from './KbTreeSelect';

const { Title } = Typography;

type ReleaseImpactPreview = Awaited<ReturnType<typeof previewReleaseImpact>>;

const getAnswerTestProofCopy = (proof: ReleaseImpactPreview['answerTestProof']): string => {
    switch (proof.state) {
        case 'ready':
            return `${proof.linkedCaseCount} linked Answer Tests have current passing proof.`;
        case 'review':
            return `${proof.failedCaseCount} linked Answer Tests need review before this release.`;
        case 'blocked':
            return `${proof.criticalFailureCount} critical Answer Tests are failing.`;
        case 'stale':
            return 'The latest linked Answer Tests proof is stale for the current suite or release.';
        case 'missing':
            return `${proof.linkedCaseCount} linked Answer Tests have not been run for this release.`;
        case 'no_linked_tests':
            return 'No active Answer Tests are linked directly to the changed product areas.';
        case 'permission_required':
            return 'Answer Tests proof is hidden because this role cannot manage governance.';
        default:
            return 'Answer Tests proof was not requested.';
    }
};

interface AddEditChangelogProps {
    open: boolean;
    onClose: () => void;
    onSave: (entry: any) => void;
    initialData?: ChangelogEntry | null;
}

const AddEditChangelog: React.FC<AddEditChangelogProps> = ({ open, onClose, onSave, initialData }) => {
    const [form] = Form.useForm();
    const timePickerFormat = getClockTimeInputFormat();
    const dispatch = useAppDispatch();
    const requestScope = useAnswerlatticePublicContentRequestScope();
    const requestScopeKey = requestScope ? `${requestScope.tId}:${requestScope.sId}` : null;
    const currentScopeKeyRef = useRef(requestScopeKey);
    currentScopeKeyRef.current = requestScopeKey;
    const [isSaving, setIsSaving] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);
    const isFormActive = useRef(false);
    const saveRequestSeedRef = useRef('');
    const impactModalRef = useRef<ReturnType<typeof Modal.confirm> | null>(null);
    const { cachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    const kbLookup = useMemo(() => {
        const lookup = new Map<string, { categoryId: string, sectionId?: string, articleId?: string }>();
        if (!cachedKBCategories?.kBCategories) return lookup;

        for (const cat of Object.values(cachedKBCategories.kBCategories.categories || {}) as any[]) {
            lookup.set(`cat-${cat.id}`, { categoryId: cat.id });
            for (const sec of cat.sections || []) {
                lookup.set(`sec-${sec.id}`, { categoryId: cat.id, sectionId: sec.id });
                for (const art of sec.articles || []) {
                    lookup.set(`art-${art.id}`, { categoryId: cat.id, sectionId: sec.id, articleId: art.id });
                }
            }
            for (const art of cat.articles || []) {
                if (!lookup.has(`art-${art.id}`)) { // Avoid overwriting article from a section
                    lookup.set(`art-${art.id}`, { categoryId: cat.id, articleId: art.id });
                }
            }
        }
        return lookup;
    }, [cachedKBCategories]);

    const [kbSources, setKbSources] = useState<{ categoryId: string, sectionId?: string, articleId?: string }[]>([]);
    const [youtubeLink, setYoutubeLink] = useState('');
    const [youtubeLinks, setYoutubeLinks] = useState<string[]>([]);
    const [surfaceOptions, setSurfaceOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [entityOptions, setEntityOptions] = useState<Array<{ label: string; value: string }>>([]);




    useEffect(() => {
        isFormActive.current = open;
        saveRequestSeedRef.current = open ? createRuntimeId('changelog_editor') : '';
        return () => {
            isFormActive.current = false;
            impactModalRef.current?.destroy();
            impactModalRef.current = null;
        };
    }, [initialData?.id, open, requestScopeKey]);

    useEffect(() => {
        if (!open) return;
        let mounted = true;
        const tId = Number(requestScope?.tId || 0);
        const sId = Number(requestScope?.sId || 0);
        Promise.all([
            FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES
                ? getProductSurfacesForSession()
                : Promise.resolve([]),
            tId > 0 && sId > 0 ? getEntities(tId, sId) : Promise.resolve([]),
        ])
            .then(([surfaces = [], entities = []]) => {
                if (!mounted) return;
                setSurfaceOptions(
                    surfaces
                        .filter(surface => surface.active !== false)
                        .map(surface => ({ label: surface.label, value: surface.key })),
                );
                setEntityOptions(
                    entities
                        .filter(entity => entity.status !== 'deprecated')
                        .map(entity => ({ label: `${entity.name} (${entity.type})`, value: entity.id })),
                );
            })
            .catch((error) => {
                logAnswerlatticeFailure('answerlattice_changelog_surface_options_load_failed', error);
            });
        return () => { mounted = false; };
    }, [open, requestScope?.sId, requestScope?.tId]);

    const handleAddYoutubeLink = () => {
        const trimmedLink = youtubeLink.trim();
        if (!trimmedLink) return;

        if (youtubeLinks.includes(trimmedLink)) {
            message.warning('This YouTube link has already been added.');
            return;
        }

        if (getYouTubeID(trimmedLink)) {
            setYoutubeLinks(prev => [...prev, trimmedLink]);
            setYoutubeLink(''); // Clear input after adding
        } else {
            message.error('Invalid YouTube link. Please check the URL and try again.');
        }
    };



    const handleKbSourceChange = (value: string[]) => {
        const sources = value.map(val => kbLookup.get(val))
            .filter(Boolean) as { categoryId: string, sectionId?: string, articleId?: string }[];
        setKbSources(sources);
    };

    const onPasteFiles = (pastedFiles: PastedFile[]) => {
        const acceptedFiles = pastedFiles.filter(file => (
            ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
            && file.size <= 5 * 1024 * 1024
        ));
        if (acceptedFiles.length !== pastedFiles.length) {
            message.error('Use a JPG, PNG, WebP, or GIF image up to 5 MB.');
        }
        setAttachments((prevAttachments) => {
            const existingFiles = new Set(prevAttachments.map(f => `${f.name}|${f.size}`));
            const uniqueNewFiles = acceptedFiles.filter(file => !existingFiles.has(`${file.name}|${file.size}`));

            if (prevAttachments.length + uniqueNewFiles.length > 4) {
                message.error('File Limit Exceeded, You can only upload a maximum of 4 files.');
                const remainingSlots = 4 - prevAttachments.length;
                return [...prevAttachments, ...uniqueNewFiles.slice(0, remainingSlots)];
            }

            return [...prevAttachments, ...uniqueNewFiles];
        });
    }

    useEffect(() => {
        if (open && initialData && initialData.id) {
            const releasedOnDate = dayjs(initialData.releasedOn.toDate());
            setAttachments(initialData.files || []);
            setYoutubeLinks((initialData.youtubeLinks || []).filter(link => getYouTubeID(link)));
            setKbSources(initialData.kbSources || []);

            form.setFieldsValue({
                title: initialData.title,
                description: initialData.description,
                tags: initialData.tags,
                published: initialData.published,
                releaseDate: releasedOnDate,
                releaseTime: releasedOnDate,
                version: initialData.version,
                contextKeys: initialData.contextKeys || [],
                entityChanges: initialData.entityChanges || [],
                // Set form values for TreeSelect
                kbSources: (initialData.kbSources || []).map(s => s.articleId ? `art-${s.articleId}` : s.sectionId ? `sec-${s.sectionId}` : `cat-${s.categoryId}`)
                // The above line is now correct as it's just for setting the initial form value.
            });
        } else {
            form.resetFields();
            setAttachments([]);
            setKbSources([]);
            setYoutubeLinks([]);
        }
    }, [initialData, form, open]);

    const confirmReleaseImpact = (impact: ReleaseImpactPreview): Promise<boolean> => (
        new Promise((resolve) => {
            let settled = false;
            const settle = (confirmed: boolean) => {
                if (settled) return;
                settled = true;
                impactModalRef.current = null;
                resolve(confirmed);
            };
            const proofIsBlocked = impact.answerTestProof.state === 'blocked';
            const previewRows = impact.affectedAnswers.slice(0, 6);
            impactModalRef.current = Modal.confirm({
                title: 'Review release support impact',
                width: 640,
                okText: proofIsBlocked ? 'Acknowledge and activate' : 'Activate and publish',
                cancelText: 'Keep as draft',
                okButtonProps: { danger: proofIsBlocked, style: { minHeight: 44 } },
                cancelButtonProps: { style: { minHeight: 44 } },
                content: (
                    <Flex vertical gap={12} style={{ marginTop: 16 }}>
                        <Typography.Text>
                            {impact.affectedAnswerCount === 0
                                ? 'No active approved answers are directly linked to the changed product areas.'
                                : `${impact.affectedAnswerCount} active approved ${impact.affectedAnswerCount === 1 ? 'answer is' : 'answers are'} directly linked. ${impact.reviewRequiredCount} will be marked for review.`}
                        </Typography.Text>
                        <Alert
                            type={proofIsBlocked ? 'error' : impact.answerTestProof.state === 'ready' ? 'success' : 'warning'}
                            showIcon
                            message={getAnswerTestProofCopy(impact.answerTestProof)}
                        />
                        {previewRows.length > 0 && (
                            <Flex vertical gap={8}>
                                {previewRows.map(answer => (
                                    <Flex
                                        key={answer.answerId}
                                        justify="space-between"
                                        align="flex-start"
                                        gap={12}
                                        wrap
                                        style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}
                                    >
                                        <Flex vertical gap={2}>
                                            <Typography.Text strong>
                                                {answer.title || answer.answerId}
                                            </Typography.Text>
                                            <Button
                                                href={getAnswerlatticeAnswerContextRoute(
                                                    getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS),
                                                    answer.answerId,
                                                )}
                                                icon={<LuExternalLink />}
                                                rel="noopener noreferrer"
                                                style={{ alignSelf: 'flex-start', minHeight: 44, paddingInline: 0 }}
                                                target="_blank"
                                                type="link"
                                            >
                                                Review answer
                                            </Button>
                                        </Flex>
                                        <Typography.Text type={answer.willRequireReview ? 'warning' : 'secondary'}>
                                            {answer.willRequireReview
                                                ? 'Will require review'
                                                : 'Already valid for this version'}
                                        </Typography.Text>
                                    </Flex>
                                ))}
                                {impact.affectedAnswers.length > previewRows.length && (
                                    <Typography.Text type="secondary">
                                        {impact.affectedAnswers.length - previewRows.length} more directly linked answers
                                    </Typography.Text>
                                )}
                            </Flex>
                        )}
                        {impact.answerTestProof.linkedCaseCount > 0
                            && impact.answerTestProof.state !== 'permission_required' ? (
                                <Button
                                    href={getAnswerlatticeReleaseContextRoute(
                                        ANSWERLATTICE_ROUTES.ANSWER_TESTS,
                                        impact.releaseId,
                                    )}
                                    icon={<LuExternalLink />}
                                    rel="noopener noreferrer"
                                    style={{ alignSelf: 'flex-start', minHeight: 44 }}
                                    target="_blank"
                                >
                                    Review linked Answer Tests
                                </Button>
                            ) : null}
                        <Typography.Text type="secondary">
                            Activation marks outdated linked answers for review. It does not approve or rewrite support knowledge.
                        </Typography.Text>
                    </Flex>
                ),
                onOk: () => settle(true),
                onCancel: () => settle(false),
                afterClose: () => settle(false),
            });
        })
    );

    const handleSave = async (values: any) => {
        const operationScope = requestScope;
        const operationScopeKey = requestScopeKey;
        if (!operationScope || !operationScopeKey) {
            message.error('Answerlattice workspace scope is required.');
            return;
        }
        const { title, description, tags, releaseDate, releaseTime, published, version, contextKeys, entityChanges } = values;
        const normalizedVersion = version ? normalizeAnswerlatticeVersionLabel(version) : null;
        if (version && !normalizedVersion) {
            message.error('Use a numeric version such as 1.0.0.');
            return;
        }

        const combinedDateTime = releaseDate
            .hour(releaseTime.hour())
            .minute(releaseTime.minute())
            .second(releaseTime.second());

        const files = [];
        for (const file of attachments) {
            if (file.originFileObj) {
                const base64 = await getBase64(file.originFileObj as RcFile);
                files.push({ name: file.name, size: file.size, type: file.type, url: base64, uid: file.uid });
            } else {
                files.push(file); // Keep existing files
            }
        }

        const entryPayload = {
            files,
            title,
            description: description || '',
            tags: tags || [],
            releasedOn: Timestamp.fromDate(combinedDateTime.toDate()),
            published: published || false,
            version: normalizedVersion?.label || null,
            contextKeys: contextKeys || [],
            entityChanges: entityChanges || [],
            kbSources: kbSources,
            youtubeLinks: youtubeLinks,
            releaseId: initialData?.releaseId || null,
        };

        dispatch(startLoader('Saving Changelog...'));
        setIsSaving(true);
        let stagedEntryId = '';
        let stagedEntryPayload: typeof entryPayload | null = null;
        try {
            const requestSeed = saveRequestSeedRef.current || createRuntimeId('changelog_editor');
            let savedEntryId = initialData?.id || '';
            let persistedPayload = entryPayload;
            const requiresReleaseLink = Boolean(entryPayload.published && normalizedVersion);
            const releaseScope = operationScope;
            if (requiresReleaseLink && (!releaseScope.tId || !releaseScope.sId)) {
                throw new Error('Answerlattice workspace scope is required for release publication');
            }

            if (requiresReleaseLink && !entryPayload.releaseId) {
                stagedEntryPayload = { ...entryPayload, published: false, releaseId: null };
                const stagedResult = initialData
                    ? await updateChangelogEntry(initialData.id, { ...stagedEntryPayload, requestId: `${requestSeed}:stage` }, operationScope)
                    : await addChangelogEntry({ ...stagedEntryPayload, requestId: `${requestSeed}:stage` }, operationScope);
                savedEntryId = initialData?.id || stagedResult?.entryId || '';
                stagedEntryId = savedEntryId;
                if (!savedEntryId) throw new Error('Changelog draft did not return an entry ID');

                const releaseRequestId = `changelog:${savedEntryId}:${normalizedVersion!.normalized}`;
                const release = await addRelease({
                    ...releaseScope,
                    versionLabel: normalizedVersion!.label,
                    versionNormalized: normalizedVersion!.normalized,
                    releasedAt: entryPayload.releasedOn,
                    entityChanges: entryPayload.entityChanges,
                    status: 'pending',
                    requestId: releaseRequestId,
                }, operationScope);
                if (release?.action !== 'create') throw new Error('Release registration failed');
                if (release.status !== 'active') {
                    const impact = await previewReleaseImpact(release.releaseId, operationScope);
                    if (currentScopeKeyRef.current !== operationScopeKey || !isFormActive.current) return;
                    const confirmed = await confirmReleaseImpact(impact);
                    if (currentScopeKeyRef.current !== operationScopeKey || !isFormActive.current) return;
                    if (!confirmed) {
                        if (initialData) {
                            onSave({
                                ...initialData,
                                ...stagedEntryPayload,
                                id: savedEntryId,
                                releasedOn: Timestamp.fromDate(stagedEntryPayload.releasedOn.toDate()),
                            });
                        } else {
                            onSave(null);
                        }
                        message.info('Draft saved. The release remains pending until you review and activate it.');
                        form.resetFields();
                        setAttachments([]);
                        setKbSources([]);
                        setYoutubeLinks([]);
                        onClose();
                        return;
                    }
                    await activateRelease(
                        release.releaseId,
                        `${releaseRequestId}:activate`,
                        impact.impactFingerprint,
                        operationScope,
                    );
                }
                persistedPayload = { ...entryPayload, releaseId: release.releaseId };
                await updateChangelogEntry(savedEntryId, { ...persistedPayload, requestId: `${requestSeed}:publish` }, operationScope);
            } else {
                const result = initialData
                    ? await updateChangelogEntry(initialData.id, { ...entryPayload, requestId: `${requestSeed}:save` }, operationScope)
                    : await addChangelogEntry({ ...entryPayload, requestId: `${requestSeed}:save` }, operationScope);
                savedEntryId = initialData?.id || result?.entryId || '';
                if (!savedEntryId) throw new Error('Changelog save did not return an entry ID');
            }

            if (currentScopeKeyRef.current !== operationScopeKey || !isFormActive.current) return;
            if (initialData) {
                onSave({
                    ...initialData,
                    ...persistedPayload,
                    id: savedEntryId,
                    releasedOn: Timestamp.fromDate(persistedPayload.releasedOn.toDate()),
                });
            } else {
                onSave(null);
            }

            let summaryRefreshSucceeded = true;
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) {
                summaryRefreshSucceeded = await rebuildProductSurfaceContentSummaryWithDiagnostics({
                    expectedScope: operationScope,
                    failureCode: initialData
                        ? 'answerlattice_changelog_summary_refresh_after_update_failed'
                        : 'answerlattice_changelog_summary_refresh_after_create_failed',
                    context: {
                        ...getBoundedAnswerlatticeStringContext('changelogEntryId', savedEntryId),
                        ...getBoundedAnswerlatticeStringContext('changelogTitle', title),
                        ...getBoundedAnswerlatticeStringContext('changelogVersion', persistedPayload.version),
                    },
                });
            }
            if (summaryRefreshSucceeded) {
                message.success(initialData ? 'Changelog entry updated successfully!' : 'Changelog entry saved successfully!');
            } else {
                message.warning('Changelog saved, but contextual help refresh failed. Try Refresh after checking product surfaces.');
            }
            form.resetFields();
            setAttachments([]);
            setKbSources([]);
            setYoutubeLinks([]);
            onClose();
        } catch (error) {
            const impactPreviewIsStale = error instanceof AnswerlatticeReleaseClientError
                && error.code === 'release_impact_preview_stale';
            logAnswerlatticeFailure('answerlattice_changelog_save_failed', error, {
                ...getBoundedAnswerlatticeStringContext('changelogEntryId', stagedEntryId || initialData?.id),
                ...getBoundedAnswerlatticeStringContext('changelogVersion', normalizedVersion?.label),
            });
            if (currentScopeKeyRef.current !== operationScopeKey || !isFormActive.current) return;
            if (stagedEntryId && stagedEntryPayload) {
                if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) {
                    await rebuildProductSurfaceContentSummaryWithDiagnostics({
                        expectedScope: operationScope,
                        failureCode: 'answerlattice_changelog_summary_refresh_after_release_failure_failed',
                        context: {
                            ...getBoundedAnswerlatticeStringContext('changelogEntryId', stagedEntryId),
                            ...getBoundedAnswerlatticeStringContext('changelogVersion', normalizedVersion?.label),
                        },
                    });
                }
                if (initialData) {
                    onSave({
                        ...initialData,
                        ...stagedEntryPayload,
                        id: stagedEntryId,
                        releasedOn: Timestamp.fromDate(stagedEntryPayload.releasedOn.toDate()),
                    });
                } else {
                    onSave(null);
                }
                message.warning(
                    impactPreviewIsStale
                        ? 'The release impact changed before activation. The entry remains a draft; reopen it to review the current impact.'
                        : 'The entry was saved as a draft because release propagation did not finish. Reopen it to retry publication.',
                );
                form.resetFields();
                setAttachments([]);
                setKbSources([]);
                setYoutubeLinks([]);
                onClose();
            } else {
                message.error('Failed to save changelog entry. Please try again.');
            }
        } finally {
            dispatch(stopLoader('Saving Changelog...'));
            setIsSaving(false);
        }
    };

    return (
        <Drawer
            title={<Title level={4}>{initialData ? 'Edit Changelog Entry' : 'Add New Changelog Entry'}</Title>}
            width={720}
            onClose={() => {
                if (!isSaving) onClose();
            }}
            open={open}
            closable={!isSaving}
            maskClosable={!isSaving}
            footer={
                <Flex justify='flex-end' gap={16} style={{ width: '100%' }}>
                    <Button onClick={onClose} disabled={isSaving} style={{ minHeight: 44 }}>Cancel</Button>
                    <Button onClick={() => form.submit()} type="primary" loading={isSaving} style={{ minHeight: 44 }}>Save</Button>
                </Flex>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ published: true }}>

                <Flex justify='space-between' gap={16} align='flex-end'>
                    <Form.Item style={{ flex: 1 }} name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
                        <Input size='large' placeholder="e.g., New Feature: Dark Mode" />
                    </Form.Item>
                    <Form.Item name="published" label="Published" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Flex>

                <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please provide a description' }]}>
                    <TiptapEditor
                        value={form.getFieldValue('description')}
                        onChange={(content) => form.setFieldsValue({ description: content })}
                        placeholder="Describe the change in detail..."
                    />
                </Form.Item>

                <Flex gap={16}>
                    <Form.Item name="tags" label="Tags" style={{ flex: 1 }}>
                        <Select
                            mode="multiple"
                            allowClear
                            placeholder="Select tags to categorize this entry"
                            style={{ width: '100%' }}
                        >
                            {CHANGELOG_TAG_OPTIONS.map(tag => {
                                const config = CHANGELOG_TAG_CONFIG[tag];
                                if (!config) return <Select.Option key={tag} value={tag}>{tag}</Select.Option>;
                                const Icon = config.icon;
                                return (
                                    <Select.Option key={tag} value={tag}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <Icon style={{ marginRight: 8 }} />
                                            {tag}
                                        </div>
                                    </Select.Option>
                                );
                            })}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="version"
                        label="Version (e.g., 1.0.0)"
                        rules={[{
                            validator: async (_, value) => {
                                if (value && !normalizeAnswerlatticeVersionLabel(value)) {
                                    throw new Error('Use a numeric version such as 1.0.0');
                                }
                            },
                        }]}
                    >
                        <Input
                            placeholder="Enter version"
                            disabled={Boolean(initialData?.version)}
                        />
                    </Form.Item>
                </Flex>

                <Flex gap={16}>
                    <Form.Item name="releaseDate" label="Release Date" rules={[{ required: true, message: 'Please select a date' }]} style={{ flex: 1 }}>
                        <DatePicker style={{ width: '100%' }} disabled={Boolean(initialData?.version)} />
                    </Form.Item>
                    <Form.Item name="releaseTime" label="Release Time" rules={[{ required: true, message: 'Please select a time' }]} style={{ flex: 1 }}>
                        <TimePicker style={{ width: '100%' }} format={timePickerFormat} disabled={Boolean(initialData?.version)} />
                    </Form.Item>
                </Flex>

                <Form.Item
                    name="entityChanges"
                    label="Changed Product Areas"
                    dependencies={['published', 'version']}
                    rules={[{
                        validator: async (_, selected) => {
                            const isVersionedRelease = form.getFieldValue('published') && form.getFieldValue('version');
                            if (isVersionedRelease && (!Array.isArray(selected) || selected.length === 0)) {
                                throw new Error('Select at least one changed product area');
                            }
                        },
                    }]}
                >
                    <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={entityOptions}
                        disabled={Boolean(initialData?.entityChanges?.length)}
                        placeholder="Select affected features, plans, workflows, or errors"
                    />
                </Form.Item>

                <Form.Item name="kbSources" label="Link to Knowledge Base Article">
                    <KbTreeSelect onChange={handleKbSourceChange} />
                </Form.Item>

                {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES && (
                    <Form.Item name="contextKeys" label="Product Surfaces">
                        <Select
                            mode="multiple"
                            allowClear
                            options={surfaceOptions}
                            placeholder="Show this release note on related pages"
                        />
                    </Form.Item>
                )}

                <Form.Item label="Embed YouTube Video">
                    <Flex vertical gap="middle">
                        <Flex gap="small">
                            <Input
                                placeholder="Paste YouTube link here"
                                value={youtubeLink}
                                onChange={(e) => setYoutubeLink(e.target.value)}
                                onPressEnter={(e) => { e.preventDefault(); handleAddYoutubeLink(); }}
                            />
                            <Button onClick={handleAddYoutubeLink}>Add Link</Button>
                        </Flex>
                        <Flex wrap gap="middle">
                            {youtubeLinks.map((link, index) => {
                                const videoId = getYouTubeID(link);
                                return (
                                    <div key={index} style={{ position: 'relative', width: 200, height: 150 }}>
                                        <iframe
                                            style={{
                                                border: '1px solid',
                                                borderRadius: '10px',
                                            }}
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${videoId}`}
                                            title="YouTube video player"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                        <Button
                                            danger
                                            size='small'
                                            onClick={() => setYoutubeLinks(prev => prev.filter(l => l !== link))}
                                            style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                );
                            })}
                        </Flex>
                    </Flex>
                </Form.Item>

                <Form.Item label="Attachments">
                    <PasteUpload
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        isPastingEnabled={isFormActive}
                        onPaste={onPasteFiles}
                        fileList={attachments}
                        onChange={({ fileList }) => setAttachments(fileList)}
                        onRemove={(file) => {
                            setAttachments((prev) => prev.filter((item) => item.uid !== file.uid));
                            return true;
                        }}
                        multiple
                        beforeUpload={(file) => {
                            const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
                            if (!allowed || file.size > 5 * 1024 * 1024) {
                                message.error('Use a JPG, PNG, WebP, or GIF image up to 5 MB.');
                                return Upload.LIST_IGNORE;
                            }
                            return false;
                        }}
                        listType='picture'
                    />
                </Form.Item>

            </Form>
        </Drawer>
    );
};

export default AddEditChangelog;
