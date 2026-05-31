'use client';

import { FEATURE_FLAGS } from '@config/features';
import { CANONICA_ROUTES } from '@constant/canonica/navigations';
import { useKnowledgeIntake } from '@hook/canonica/useKnowledgeIntake';
import {
    CANONICA_INTAKE_REVIEW_STATUS,
    CANONICA_INTAKE_REVIEW_TARGET,
    CANONICA_KNOWLEDGE_INTAKE_CONSTRAINTS,
    CANONICA_KNOWLEDGE_SOURCE_TYPE,
    type CanonicaIntakeReviewItem,
} from '@type/canonica';
import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Col,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    List,
    Modal,
    Row,
    Select,
    Space,
    Statistic,
    Steps,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
    LuArrowRight,
    LuBookOpen,
    LuCheck,
    LuFileInput,
    LuFileText,
    LuGlobe,
    LuHelpCircle,
    LuImage,
    LuLayers,
    LuLink,
    LuMic,
    LuRefreshCw,
    LuRocket,
    LuShieldCheck,
    LuSparkles,
    LuUpload,
    LuVideo,
    LuX,
} from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
const MAX_BROWSER_TEXT_FILE_BYTES = 8 * 1024 * 1024;

const TARGET_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    [CANONICA_INTAKE_REVIEW_TARGET.KB_ARTICLE]: { label: 'KB Article', color: 'blue', icon: LuBookOpen },
    [CANONICA_INTAKE_REVIEW_TARGET.FAQ]: { label: 'FAQ', color: 'cyan', icon: LuHelpCircle },
    [CANONICA_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL]: { label: 'Answer Proposal', color: 'purple', icon: LuShieldCheck },
    [CANONICA_INTAKE_REVIEW_TARGET.PRODUCT_SURFACE]: { label: 'Product Surface', color: 'geekblue', icon: LuLayers },
    [CANONICA_INTAKE_REVIEW_TARGET.CHANGELOG]: { label: 'Changelog', color: 'orange', icon: LuRocket },
};

const SOURCE_TYPE_OPTIONS = [
    { label: 'Product note', value: CANONICA_KNOWLEDGE_SOURCE_TYPE.PRODUCT_NOTE },
    { label: 'Help doc', value: CANONICA_KNOWLEDGE_SOURCE_TYPE.HELP_DOC },
    { label: 'FAQ', value: CANONICA_KNOWLEDGE_SOURCE_TYPE.FAQ },
    { label: 'Changelog', value: CANONICA_KNOWLEDGE_SOURCE_TYPE.CHANGELOG },
    { label: 'Ticket macro', value: CANONICA_KNOWLEDGE_SOURCE_TYPE.TICKET_MACRO },
    { label: 'Markdown', value: CANONICA_KNOWLEDGE_SOURCE_TYPE.MARKDOWN },
    { label: 'CSV', value: CANONICA_KNOWLEDGE_SOURCE_TYPE.CSV },
];

const MEDIA_EXTENSIONS = /\.(png|jpe?g|webp|gif|mp3|m4a|wav|webm|mp4|mov|ogg)$/i;
const FILE_UPLOAD_ACCEPT = [
    '.txt',
    '.md',
    '.markdown',
    '.csv',
    '.json',
    '.docx',
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.mp3',
    '.m4a',
    '.wav',
    '.webm',
    '.mp4',
    '.mov',
    '.ogg',
].join(',');

const splitTags = (value?: string) => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

async function extractTextFromFile(file: File): Promise<{ text: string; sourceType: string }> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.docx')) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const xml = await zip.file('word/document.xml')?.async('string');
        if (!xml) throw new Error('Could not read DOCX text.');
        const text = xml
            .replace(/<w:tab\/>/g, ' ')
            .replace(/<\/w:p>/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
        return { text, sourceType: CANONICA_KNOWLEDGE_SOURCE_TYPE.DOCX_TEXT };
    }

    if (name.endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableWorker: true } as any);
        const pdf = await loadingTask.promise;
        const pages: string[] = [];
        const pageCount = Math.min(pdf.numPages, 30);
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(content.items.map((item: any) => item.str).join(' '));
        }
        return { text: pages.join('\n\n'), sourceType: CANONICA_KNOWLEDGE_SOURCE_TYPE.PDF_TEXT };
    }

    const text = await file.text();
    if (name.endsWith('.csv')) return { text, sourceType: CANONICA_KNOWLEDGE_SOURCE_TYPE.CSV };
    if (name.endsWith('.md') || name.endsWith('.markdown')) return { text, sourceType: CANONICA_KNOWLEDGE_SOURCE_TYPE.MARKDOWN };
    return { text, sourceType: CANONICA_KNOWLEDGE_SOURCE_TYPE.FILE_TEXT };
}

function isMediaIntakeFile(file: File) {
    return file.type.startsWith('image/')
        || file.type.startsWith('audio/')
        || file.type.startsWith('video/')
        || MEDIA_EXTENSIONS.test(file.name);
}

function TargetTag({ target }: { target: string }) {
    const meta = TARGET_LABELS[target] || { label: target, color: 'default', icon: LuFileText };
    const Icon = meta.icon;
    return <Tag color={meta.color} icon={<Icon />}>{meta.label}</Tag>;
}

function ReviewItemCard({
    item,
    onAccept,
    onReject,
    onEdit,
    saving,
}: {
    item: CanonicaIntakeReviewItem;
    onAccept: (item: CanonicaIntakeReviewItem) => void;
    onReject: (item: CanonicaIntakeReviewItem) => void;
    onEdit: (item: CanonicaIntakeReviewItem) => void;
    saving: boolean;
}) {
    const { token } = theme.useToken();
    const isAccepted = item.status === CANONICA_INTAKE_REVIEW_STATUS.ACCEPTED;
    const isRejected = item.status === CANONICA_INTAKE_REVIEW_STATUS.REJECTED;
    const isPublished = item.status === CANONICA_INTAKE_REVIEW_STATUS.PUBLISHED;

    return (
        <Card size="small" style={{ borderRadius: 8, borderColor: isAccepted ? token.colorSuccessBorder : token.colorBorderSecondary }}>
            <Flex vertical gap={10}>
                <Flex justify="space-between" gap={12} align="flex-start" wrap="wrap">
                    <Space size={[6, 6]} wrap>
                        <TargetTag target={item.target} />
                        {item.contextKeys?.slice(0, 3).map(key => <Tag key={key}>{key}</Tag>)}
                        {item.entityIds?.length ? <Tag color="purple">entity linked</Tag> : null}
                    </Space>
                    <Badge
                        status={isPublished ? 'success' : isRejected ? 'default' : isAccepted ? 'processing' : 'warning'}
                        text={isPublished ? 'Published' : isRejected ? 'Rejected' : isAccepted ? 'Accepted' : 'Needs review'}
                    />
                </Flex>
                <Title level={5} style={{ margin: 0 }}>{item.title}</Title>
                {item.question ? <Text strong>{item.question}</Text> : null}
                <Paragraph ellipsis={{ rows: 4 }} style={{ color: token.colorTextSecondary, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {item.answer || item.body || item.routePath || 'No body text.'}
                </Paragraph>
                {item.reason ? <Text type="secondary">{item.reason}</Text> : null}
                <Flex justify="space-between" gap={8} wrap="wrap">
                    <Button size="small" onClick={() => onEdit(item)}>Edit</Button>
                    <Space>
                        <Button
                            size="small"
                            icon={<LuX />}
                            disabled={saving || isPublished || isRejected}
                            onClick={() => onReject(item)}
                        >
                            Reject
                        </Button>
                        <Button
                            type="primary"
                            size="small"
                            icon={<LuCheck />}
                            disabled={saving || isPublished || isAccepted}
                            onClick={() => onAccept(item)}
                        >
                            Accept
                        </Button>
                    </Space>
                </Flex>
            </Flex>
        </Card>
    );
}

export default function CanonicaKnowledgeIntake() {
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const { token } = theme.useToken();
    const [jobForm] = Form.useForm();
    const [textForm] = Form.useForm();
    const [urlForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [createOpen, setCreateOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CanonicaIntakeReviewItem | null>(null);
    const [discoveredLinks, setDiscoveredLinks] = useState<Array<{ url: string; title: string; role: string; reason: string }>>([]);
    const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
    const [discovering, setDiscovering] = useState(false);

    const {
        activeJob,
        activeJobId,
        addMediaSource,
        addSource,
        analyzeJob,
        bundle,
        counts,
        createJob,
        discoverLinks,
        enabled,
        error,
        jobs,
        loading,
        publishJob,
        saving,
        setActiveJobId,
        updateReviewItem,
    } = useKnowledgeIntake();

    const reviewGroups = useMemo(() => {
        const groups = new Map<string, CanonicaIntakeReviewItem[]>();
        bundle.reviewItems.forEach((item) => {
            const key = item.target;
            groups.set(key, [...(groups.get(key) || []), item]);
        });
        return Array.from(groups.entries());
    }, [bundle.reviewItems]);

    const currentStep = activeJob?.status === 'published'
        ? 3
        : bundle.reviewItems.length > 0
            ? 2
            : bundle.sources.length > 0
                ? 1
                : 0;

    const handleCreateJob = async () => {
        const values = await jobForm.validateFields();
        const job = await createJob(values);
        if (job) {
            setCreateOpen(false);
            jobForm.resetFields();
        }
    };

    const handleDiscover = async () => {
        const values = await urlForm.validateFields();
        setDiscovering(true);
        try {
            const links = await discoverLinks(values.url);
            setDiscoveredLinks(links);
            setSelectedLinks(links.slice(0, 5).map(link => link.url));
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Could not inspect URL.');
        } finally {
            setDiscovering(false);
        }
    };

    const handleAddSelectedLinks = async () => {
        if (!activeJobId) return;
        const links = discoveredLinks.filter(link => selectedLinks.includes(link.url));
        for (const link of links.slice(0, 10)) {
            await addSource(activeJobId, {
                type: CANONICA_KNOWLEDGE_SOURCE_TYPE.WEBSITE_PAGE,
                title: link.title,
                originUrl: link.url,
                tags: [link.role],
                metadata: { discoveryReason: link.reason },
            });
        }
        setDiscoveredLinks([]);
        setSelectedLinks([]);
    };

    const handleAddTextSource = async () => {
        if (!activeJobId) return;
        const values = await textForm.validateFields();
        const source = await addSource(activeJobId, {
            type: values.type,
            title: values.title,
            contentText: values.contentText,
            tags: splitTags(values.tags),
            contextKeys: splitTags(values.contextKeys),
            entityIds: splitTags(values.entityIds),
        });
        if (source) textForm.resetFields();
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || !activeJobId) return;
        for (const file of Array.from(files).slice(0, 8)) {
            try {
                if (isMediaIntakeFile(file)) {
                    if (!FEATURE_FLAGS.ENABLE_CANONICA_INTAKE_MEDIA_EXTRACTION) {
                        message.warning('Screenshot and media extraction is not enabled for this workspace.');
                        continue;
                    }
                    await addMediaSource(activeJobId, file, {
                        title: file.name.replace(/\.[^.]+$/, ''),
                    });
                    continue;
                }
                if (file.size > MAX_BROWSER_TEXT_FILE_BYTES) {
                    message.warning(`${file.name} is too large for browser-side text extraction. Paste the key section or upload a smaller export.`);
                    continue;
                }

                const extracted = await extractTextFromFile(file);
                if (!extracted.text.trim()) {
                    message.warning(`${file.name} did not contain readable text.`);
                    continue;
                }
                const contentText = extracted.text.slice(0, CANONICA_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_TEXT_CHARS);
                if (extracted.text.length > contentText.length) {
                    message.info(`${file.name} was capped to the first ${CANONICA_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_TEXT_CHARS.toLocaleString()} characters for this intake source.`);
                }
                await addSource(activeJobId, {
                    type: extracted.sourceType,
                    title: file.name.replace(/\.[^.]+$/, ''),
                    fileName: file.name,
                    mimeType: file.type,
                    contentText,
                });
            } catch (err) {
                message.error(`${file.name}: ${err instanceof Error ? err.message : 'Could not read file.'}`);
            }
        }
    };

    const handleEditSave = async () => {
        if (!editingItem || !activeJobId) return;
        const values = await editForm.validateFields();
        const ok = await updateReviewItem(activeJobId, editingItem.id, {
            ...values,
            tags: splitTags(values.tags),
            contextKeys: splitTags(values.contextKeys),
            entityIds: splitTags(values.entityIds),
        });
        if (ok) setEditingItem(null);
    };

    if (!enabled) {
        return (
            <Card>
                <Empty description="Canonica knowledge intake is not enabled for this workspace." />
            </Card>
        );
    }

    return (
        <Flex vertical gap={20} style={{ padding: isMobile ? 12 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} gap={12} vertical={isMobile}>
                <Flex vertical gap={4}>
                    <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>Teach Canonica</Title>
                    <Paragraph type="secondary" style={{ margin: 0, maxWidth: 780 }}>
                        Import URLs, docs, FAQs, release notes, ticket macros, setup notes, screenshots, and short support recordings. Canonica prepares review drafts; you approve what becomes support knowledge.
                    </Paragraph>
                </Flex>
                <Space wrap>
                    <Link href={CANONICA_ROUTES.KNOWLEDGE_BASE}>
                        <Button icon={<LuBookOpen />}>Knowledge Base</Button>
                    </Link>
                    <Button type="primary" icon={<LuFileInput />} onClick={() => setCreateOpen(true)}>New intake</Button>
                </Space>
            </Flex>

            {error ? <Alert type="error" showIcon message={error} /> : null}

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={7}>
                    <Card title="Intake jobs" loading={loading} style={{ borderRadius: 8 }}>
                        {jobs.length ? (
                            <List
                                dataSource={jobs}
                                renderItem={(job) => (
                                    <List.Item
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: 8,
                                            padding: 12,
                                            background: job.id === activeJobId ? token.colorPrimaryBg : undefined,
                                        }}
                                        onClick={() => setActiveJobId(job.id)}
                                    >
                                        <List.Item.Meta
                                            title={<Text strong>{job.title}</Text>}
                                            description={`${job.sourceCount || 0} sources · ${job.reviewItemCount || 0} drafts · ${job.status}`}
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty description="No intake job yet">
                                <Button type="primary" onClick={() => setCreateOpen(true)}>Create first intake</Button>
                            </Empty>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={17}>
                    <Flex vertical gap={16}>
                        <Card style={{ borderRadius: 8 }}>
                            <Steps
                                current={currentStep}
                                direction={isMobile ? 'vertical' : 'horizontal'}
                                items={[
                                    { title: 'Create intake', icon: <LuFileInput /> },
                                    { title: 'Add sources', icon: <LuUpload /> },
                                    { title: 'Review drafts', icon: <LuShieldCheck /> },
                                    { title: 'Publish', icon: <LuRocket /> },
                                ]}
                            />
                        </Card>

                        {activeJob ? (
                            <>
                                <Row gutter={[12, 12]}>
                                    <Col xs={12} md={6}><Card><Statistic title="Sources" value={bundle.sources.length} /></Card></Col>
                                    <Col xs={12} md={6}><Card><Statistic title="Ready" value={counts.sourcesReady} /></Card></Col>
                                    <Col xs={12} md={6}><Card><Statistic title="Accepted" value={counts.accepted} /></Card></Col>
                                    <Col xs={12} md={6}><Card><Statistic title="Published" value={counts.published} /></Card></Col>
                                    <Col xs={12} md={6}><Card><Statistic title="Credits used" value={activeJob.usageUnitsConsumed || 0} /></Card></Col>
                                </Row>

                                <Card
                                    title={<Space><LuGlobe /> Product and docs URLs</Space>}
                                    extra={<Button loading={discovering} icon={<LuRefreshCw />} onClick={handleDiscover}>Inspect URL</Button>}
                                    style={{ borderRadius: 8 }}
                                >
                                    <Form form={urlForm} layout={isMobile ? 'vertical' : 'inline'}>
                                        <Form.Item name="url" rules={[{ required: true, message: 'Enter a public URL.' }]} style={{ flex: 1, minWidth: isMobile ? '100%' : 420 }}>
                                            <Input prefix={<LuLink />} placeholder="https://yourapp.com or https://docs.yourapp.com" />
                                        </Form.Item>
                                    </Form>
                                    {discoveredLinks.length ? (
                                        <Flex vertical gap={12} style={{ marginTop: 16 }}>
                                            <Checkbox.Group value={selectedLinks} onChange={(values) => setSelectedLinks(values as string[])}>
                                                <Flex vertical gap={8}>
                                                    {discoveredLinks.map(link => (
                                                        <Checkbox key={link.url} value={link.url}>
                                                            <Space wrap>
                                                                <Text strong>{link.title}</Text>
                                                                <Tag>{link.role}</Tag>
                                                                <Text type="secondary">{link.url}</Text>
                                                            </Space>
                                                        </Checkbox>
                                                    ))}
                                                </Flex>
                                            </Checkbox.Group>
                                            <Button type="primary" icon={<LuArrowRight />} disabled={!selectedLinks.length || saving} onClick={handleAddSelectedLinks}>
                                                Add selected pages
                                            </Button>
                                        </Flex>
                                    ) : null}
                                </Card>

                                <Row gutter={[16, 16]}>
                                    <Col xs={24} xl={12}>
                                        <Card title={<Space><LuFileText /> Paste source content</Space>} style={{ borderRadius: 8 }}>
                                            <Form form={textForm} layout="vertical" initialValues={{ type: CANONICA_KNOWLEDGE_SOURCE_TYPE.PRODUCT_NOTE }}>
                                                <Form.Item name="type" label="Source type">
                                                    <Select options={SOURCE_TYPE_OPTIONS} />
                                                </Form.Item>
                                                <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Add a title.' }]}>
                                                    <Input placeholder="Billing policy, onboarding FAQ, release note..." />
                                                </Form.Item>
                                                <Form.Item name="contentText" label="Content" rules={[{ required: true, message: 'Paste content to import.' }]}>
                                                    <TextArea rows={8} placeholder="Paste docs, Q/A, release notes, setup steps, support macros..." />
                                                </Form.Item>
                                                <Form.Item name="tags" label="Tags">
                                                    <Input placeholder="billing, onboarding, release" />
                                                </Form.Item>
                                                <Form.Item name="contextKeys" label="Surface/context keys">
                                                    <Input placeholder="billing, onboarding, settings" />
                                                </Form.Item>
                                                <Form.Item name="entityIds" label="Entity IDs">
                                                    <Input placeholder="Optional: entity ids for canonical proposals" />
                                                </Form.Item>
                                                <Button type="primary" loading={saving} onClick={handleAddTextSource}>Add source</Button>
                                            </Form>
                                        </Card>
                                    </Col>
                                    <Col xs={24} xl={12}>
                                        <Card title={<Space><LuUpload /> Upload files</Space>} style={{ borderRadius: 8 }}>
                                            <Paragraph type="secondary">
                                                Text files are extracted in the browser for lower cost. Screenshots/images use OCR, and short audio/video files are transcribed into support-source text.
                                            </Paragraph>
                                            <Space size={[8, 8]} wrap style={{ marginBottom: 12 }}>
                                                <Tag icon={<LuFileText />}>TXT · Markdown · CSV · JSON · DOCX · PDF</Tag>
                                                <Tag icon={<LuImage />} color="cyan">Screenshots: 1 credit</Tag>
                                                <Tag icon={<LuMic />} color="purple">Audio: 2 credits</Tag>
                                                <Tag icon={<LuVideo />} color="geekblue">Video: 2 credits</Tag>
                                            </Space>
                                            <input
                                                type="file"
                                                multiple
                                                accept={FILE_UPLOAD_ACCEPT}
                                                onChange={(event) => {
                                                    handleFiles(event.target.files);
                                                    event.currentTarget.value = '';
                                                }}
                                            />
                                            <Alert
                                                type="info"
                                                showIcon
                                                style={{ marginTop: 16 }}
                                                message="Owner approval is required"
                                                description="Imported material creates review drafts first. Media files are not retained as raw artifacts; only extracted support text is stored for review. Nothing becomes authoritative until you accept and publish it."
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                <Card
                                    title={<Space><LuSparkles /> Review drafts</Space>}
                                    extra={(
                                        <Space wrap>
                                            <Button loading={saving} disabled={!counts.sourcesReady} icon={<LuSparkles />} onClick={() => activeJobId && analyzeJob(activeJobId)}>
                                                Generate review drafts
                                            </Button>
                                            <Button type="primary" loading={saving} disabled={!counts.accepted} icon={<LuRocket />} onClick={() => activeJobId && publishJob(activeJobId)}>
                                                Publish accepted
                                            </Button>
                                        </Space>
                                    )}
                                    style={{ borderRadius: 8 }}
                                >
                                    {reviewGroups.length ? (
                                        <Flex vertical gap={18}>
                                            {reviewGroups.map(([target, items]) => (
                                                <Flex key={target} vertical gap={10}>
                                                    <Space>
                                                        <TargetTag target={target} />
                                                        <Text type="secondary">{items.length} draft{items.length === 1 ? '' : 's'}</Text>
                                                    </Space>
                                                    <Row gutter={[12, 12]}>
                                                        {items.map(item => (
                                                            <Col key={item.id} xs={24} xl={12}>
                                                                <ReviewItemCard
                                                                    item={item}
                                                                    saving={saving}
                                                                    onEdit={(next) => {
                                                                        setEditingItem(next);
                                                                        editForm.setFieldsValue({
                                                                            ...next,
                                                                            tags: next.tags?.join(', '),
                                                                            contextKeys: next.contextKeys?.join(', '),
                                                                            entityIds: next.entityIds?.join(', '),
                                                                        });
                                                                    }}
                                                                    onAccept={(next) => activeJobId && updateReviewItem(activeJobId, next.id, { status: CANONICA_INTAKE_REVIEW_STATUS.ACCEPTED })}
                                                                    onReject={(next) => activeJobId && updateReviewItem(activeJobId, next.id, { status: CANONICA_INTAKE_REVIEW_STATUS.REJECTED })}
                                                                />
                                                            </Col>
                                                        ))}
                                                    </Row>
                                                </Flex>
                                            ))}
                                        </Flex>
                                    ) : (
                                        <Empty description="No review drafts yet">
                                            <Button disabled={!counts.sourcesReady} icon={<LuSparkles />} onClick={() => activeJobId && analyzeJob(activeJobId)}>
                                                Generate review drafts
                                            </Button>
                                        </Empty>
                                    )}
                                </Card>
                            </>
                        ) : (
                            <Card>
                                <Empty description="Create an intake job to start teaching Canonica." />
                            </Card>
                        )}
                    </Flex>
                </Col>
            </Row>

            <Modal
                title="Create knowledge intake"
                open={createOpen}
                onCancel={() => setCreateOpen(false)}
                onOk={handleCreateJob}
                okText="Create intake"
                confirmLoading={saving}
            >
                <Form form={jobForm} layout="vertical">
                    <Form.Item name="title" label="Name" rules={[{ required: true, message: 'Add an intake name.' }]}>
                        <Input placeholder="Initial product support setup" />
                    </Form.Item>
                    <Form.Item name="productWebsiteUrl" label="Product website">
                        <Input placeholder="https://yourapp.com" />
                    </Form.Item>
                    <Form.Item name="appUrl" label="App URL">
                        <Input placeholder="https://app.yourapp.com" />
                    </Form.Item>
                    <Form.Item name="description" label="What should Canonica learn?">
                        <TextArea rows={3} placeholder="Billing, onboarding, team settings, release changes..." />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Edit review draft"
                open={Boolean(editingItem)}
                onCancel={() => setEditingItem(null)}
                onOk={handleEditSave}
                okText="Save draft"
                confirmLoading={saving}
                width={760}
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item name="target" label="Publish as">
                        <Select
                            options={Object.entries(TARGET_LABELS).map(([value, meta]) => ({ value, label: meta.label }))}
                        />
                    </Form.Item>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required.' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="question" label="Question">
                        <Input />
                    </Form.Item>
                    <Form.Item name="answer" label="Short answer">
                        <TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="body" label="Article / detail body">
                        <TextArea rows={8} />
                    </Form.Item>
                    <Form.Item name="routePath" label="Route path">
                        <Input placeholder="/billing/invoices" />
                    </Form.Item>
                    <Form.Item name="tags" label="Tags">
                        <Input placeholder="billing, onboarding" />
                    </Form.Item>
                    <Form.Item name="contextKeys" label="Context keys">
                        <Input placeholder="billing, invoices" />
                    </Form.Item>
                    <Form.Item name="entityIds" label="Entity IDs">
                        <Input placeholder="Optional entity ids" />
                    </Form.Item>
                </Form>
            </Modal>
        </Flex>
    );
}
