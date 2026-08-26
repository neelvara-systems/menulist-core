'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { useKnowledgeIntake, type KnowledgeIntakeEntityOption } from '@hook/answerlattice/useKnowledgeIntake';
import { assertAnswerlatticeDocxEntryIsBounded } from '@lib/answerlattice/knowledgeIntakeFileSafety';
import { normalizeAnswerlatticeKnowledgeIntakePublicUrl } from '@lib/answerlattice/knowledgeIntakeDiscoveryContracts';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import {
    ANSWERLATTICE_RELEASE_EVIDENCE_MAX_TEXT_CHARS,
    storeAnswerlatticeReleaseEvidenceHandoff,
} from '@lib/answerlattice/releaseEvidenceHandoff';
import { normalizeAnswerlatticeVersionLabel } from '@lib/answerlattice/releaseContracts';
import {
    ANSWERLATTICE_INTAKE_REVIEW_STATUS,
    ANSWERLATTICE_INTAKE_REVIEW_TARGET,
    ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS,
    ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE,
    ANSWERLATTICE_SOURCE_ACCESS_SCOPE,
    ANSWERLATTICE_SOURCE_APPROVAL_STATUS,
    ANSWERLATTICE_SOURCE_AUTHORITY,
    ANSWERLATTICE_SOURCE_CITATION_ELIGIBILITY,
    type AnswerlatticeIntakeReviewItem,
    type AnswerlatticeKnowledgeSource,
} from '@type/answerlattice';
import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Col,
    DatePicker,
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
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { IconType } from 'react-icons';
import GitHubChangeIntakeCard from './GitHubChangeIntakeCard';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
const MAX_BROWSER_TEXT_FILE_BYTES = 8 * 1024 * 1024;
const MAX_BROWSER_EXTRACTED_TEXT_CHARS = ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_TEXT_CHARS + 1;
const ANSWERLATTICE_INTAKE_ENTITY_SEARCH_FAILED = 'Could not search Product Topics.';
const ANSWERLATTICE_INTAKE_URL_INSPECT_FAILED = 'Could not inspect URL.';

const TARGET_LABELS: Record<string, { label: string; color: string; icon: IconType }> = {
    [ANSWERLATTICE_INTAKE_REVIEW_TARGET.KB_ARTICLE]: { label: 'KB Article', color: 'blue', icon: LuBookOpen },
    [ANSWERLATTICE_INTAKE_REVIEW_TARGET.FAQ]: { label: 'FAQ', color: 'cyan', icon: LuHelpCircle },
    [ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL]: { label: 'Answer Proposal', color: 'purple', icon: LuShieldCheck },
    [ANSWERLATTICE_INTAKE_REVIEW_TARGET.PRODUCT_SURFACE]: { label: 'Product Surface', color: 'geekblue', icon: LuLayers },
    [ANSWERLATTICE_INTAKE_REVIEW_TARGET.CHANGELOG]: { label: 'Changelog (source only)', color: 'orange', icon: LuRocket },
};

const PUBLISH_TARGET_OPTIONS = Object.entries(TARGET_LABELS).map(([value, meta]) => ({
    value,
    label: meta.label,
    disabled: value === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CHANGELOG,
}));

const SOURCE_TYPE_OPTIONS = [
    { label: 'Product note', value: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.PRODUCT_NOTE },
    { label: 'Help doc', value: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.HELP_DOC },
    { label: 'FAQ', value: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.FAQ },
    { label: 'Changelog', value: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.CHANGELOG },
    { label: 'Ticket macro', value: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.TICKET_MACRO },
    { label: 'Markdown', value: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.MARKDOWN },
    { label: 'CSV', value: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.CSV },
];

const SOURCE_AUTHORITY_OPTIONS = [
    { label: 'Owner policy', value: ANSWERLATTICE_SOURCE_AUTHORITY.OWNER_POLICY },
    { label: 'Owner-confirmed fact', value: ANSWERLATTICE_SOURCE_AUTHORITY.OWNER_CONFIRMED_FACT },
    { label: 'Official documentation', value: ANSWERLATTICE_SOURCE_AUTHORITY.OFFICIAL_DOCUMENTATION },
    { label: 'Official release', value: ANSWERLATTICE_SOURCE_AUTHORITY.OFFICIAL_RELEASE },
    { label: 'Official website', value: ANSWERLATTICE_SOURCE_AUTHORITY.OFFICIAL_WEBSITE },
    { label: 'Product surface', value: ANSWERLATTICE_SOURCE_AUTHORITY.PRODUCT_SURFACE },
    { label: 'Approved support material', value: ANSWERLATTICE_SOURCE_AUTHORITY.APPROVED_SUPPORT_MATERIAL },
    { label: 'Support signal', value: ANSWERLATTICE_SOURCE_AUTHORITY.SUPPORT_SIGNAL },
    { label: 'Unverified reference', value: ANSWERLATTICE_SOURCE_AUTHORITY.UNVERIFIED_REFERENCE },
];

const SOURCE_APPROVAL_OPTIONS = [
    { label: 'Unreviewed', value: ANSWERLATTICE_SOURCE_APPROVAL_STATUS.UNREVIEWED },
    { label: 'Approved as evidence', value: ANSWERLATTICE_SOURCE_APPROVAL_STATUS.APPROVED },
    { label: 'Excluded', value: ANSWERLATTICE_SOURCE_APPROVAL_STATUS.EXCLUDED },
    { label: 'Superseded', value: ANSWERLATTICE_SOURCE_APPROVAL_STATUS.SUPERSEDED },
];

const SOURCE_ACCESS_OPTIONS = [
    { label: 'Public', value: ANSWERLATTICE_SOURCE_ACCESS_SCOPE.PUBLIC },
    { label: 'Workspace private', value: ANSWERLATTICE_SOURCE_ACCESS_SCOPE.WORKSPACE_PRIVATE },
    { label: 'Restricted', value: ANSWERLATTICE_SOURCE_ACCESS_SCOPE.RESTRICTED },
];

const SOURCE_CITATION_OPTIONS = [
    { label: 'Publicly citable', value: ANSWERLATTICE_SOURCE_CITATION_ELIGIBILITY.PUBLIC },
    { label: 'Internal citation only', value: ANSWERLATTICE_SOURCE_CITATION_ELIGIBILITY.INTERNAL_ONLY },
    { label: 'Not citable', value: ANSWERLATTICE_SOURCE_CITATION_ELIGIBILITY.NOT_CITABLE },
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
const normalizeEntitySelection = (value?: string | string[]) => Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : splitTags(value);

async function extractTextFromFile(file: File): Promise<{ text: string; sourceType: string }> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.docx')) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const documentEntry = zip.file('word/document.xml');
        if (!documentEntry) throw new Error('Could not read DOCX text.');
        const entryData = (documentEntry as unknown as {
            _data?: { compressedSize?: unknown; uncompressedSize?: unknown };
        })._data;
        assertAnswerlatticeDocxEntryIsBounded(entryData);
        const xml = await documentEntry.async('string');
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
        return {
            text: text.slice(0, MAX_BROWSER_EXTRACTED_TEXT_CHARS),
            sourceType: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.DOCX_TEXT,
        };
    }

    if (name.endsWith('.pdf')) {
        const [pdfjs] = await Promise.all([
            import('pdfjs-dist/legacy/build/pdf.mjs'),
            import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
        ]);
        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(await file.arrayBuffer()),
        });
        const pdf = await loadingTask.promise;
        const pages: string[] = [];
        const pageCount = Math.min(pdf.numPages, 30);
        let extractedChars = 0;
        try {
            for (let pageNumber = 1; pageNumber <= pageCount && extractedChars < MAX_BROWSER_EXTRACTED_TEXT_CHARS; pageNumber += 1) {
                const page = await pdf.getPage(pageNumber);
                try {
                    const content = await page.getTextContent();
                    const remainingChars = MAX_BROWSER_EXTRACTED_TEXT_CHARS - extractedChars;
                    const pageText = content.items
                        .flatMap((item: unknown) => (
                            item && typeof item === 'object' && !Array.isArray(item) && typeof (item as { str?: unknown }).str === 'string'
                                ? [(item as { str: string }).str]
                                : []
                        ))
                        .join(' ')
                        .slice(0, remainingChars);
                    pages.push(pageText);
                    extractedChars += pageText.length + 2;
                } finally {
                    page.cleanup?.();
                }
            }
        } finally {
            await pdf.destroy?.();
        }
        return {
            text: pages.join('\n\n').slice(0, MAX_BROWSER_EXTRACTED_TEXT_CHARS),
            sourceType: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.PDF_TEXT,
        };
    }

    const text = await file.text();
    const boundedText = text.slice(0, MAX_BROWSER_EXTRACTED_TEXT_CHARS);
    if (name.endsWith('.csv')) return { text: boundedText, sourceType: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.CSV };
    if (name.endsWith('.md') || name.endsWith('.markdown')) return { text: boundedText, sourceType: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.MARKDOWN };
    return { text: boundedText, sourceType: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.FILE_TEXT };
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

const getReviewItemSourceIds = (item: AnswerlatticeIntakeReviewItem): string[] => (
    Array.from(new Set([
        ...(item.sourceIds || []),
        ...(item.launchPack?.sourceIds || []),
        ...(item.sourceId ? [item.sourceId] : []),
    ].filter(Boolean))).slice(0, ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_REVIEW_SOURCE_IDS)
);

const getSafeHttpsSourceUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
        return parsed.toString();
    } catch {
        return null;
    }
};

function SourceGovernanceTags({ source }: { source: AnswerlatticeKnowledgeSource }) {
    const governance = source.governance;
    if (!governance) return <Tag color="warning">Governance unreviewed</Tag>;
    const approvalColor = governance.approvalStatus === ANSWERLATTICE_SOURCE_APPROVAL_STATUS.APPROVED
        ? 'green'
        : governance.approvalStatus === ANSWERLATTICE_SOURCE_APPROVAL_STATUS.UNREVIEWED
            ? 'warning'
            : 'default';
    return (
        <>
            <Tag color={approvalColor}>{governance.approvalStatus.replace(/_/g, ' ')}</Tag>
            <Tag>{governance.authority.replace(/_/g, ' ')}</Tag>
            <Tag>{governance.accessScope.replace(/_/g, ' ')}</Tag>
            <Tag>{governance.citationEligibility.replace(/_/g, ' ')}</Tag>
            {governance.conflictSourceIds.length ? (
                <Tag color="red">{governance.conflictSourceIds.length} unresolved conflict{governance.conflictSourceIds.length === 1 ? '' : 's'}</Tag>
            ) : null}
            {governance.reviewDate ? <Tag>Review {governance.reviewDate}</Tag> : null}
        </>
    );
}

function ReviewEvidence({ sources }: { sources: AnswerlatticeKnowledgeSource[] }) {
    const { token } = theme.useToken();
    if (!sources.length) {
        return <Text type="secondary">No linked source excerpt is available. Add evidence before approving material support truth.</Text>;
    }

    return (
        <Flex vertical gap={8}>
            <Text strong>Source evidence</Text>
            {sources.slice(0, 3).map(source => {
                const excerpt = String(source.contentExcerpt || source.contentText || '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 320);
                const safeOriginUrl = getSafeHttpsSourceUrl(source.originUrl);
                return (
                    <div
                        key={source.id}
                        style={{
                            borderInlineStart: `3px solid ${token.colorPrimaryBorder}`,
                            paddingInlineStart: 10,
                        }}
                    >
                        <Space size={[6, 6]} wrap>
                            <Text strong>{source.title}</Text>
                            <Tag>{source.type.replace(/_/g, ' ')}</Tag>
                            {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE ? (
                                <SourceGovernanceTags source={source} />
                            ) : null}
                            {safeOriginUrl ? (
                                <a href={safeOriginUrl} target="_blank" rel="noreferrer">Open source</a>
                            ) : null}
                        </Space>
                        <Paragraph type="secondary" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                            {excerpt || 'The source is linked, but it has no stored excerpt.'}
                        </Paragraph>
                    </div>
                );
            })}
        </Flex>
    );
}

function ReviewItemCard({
    item,
    onAccept,
    onReject,
    onEdit,
    evidenceSources,
    saving,
}: {
    item: AnswerlatticeIntakeReviewItem;
    onAccept: (item: AnswerlatticeIntakeReviewItem) => void;
    onReject: (item: AnswerlatticeIntakeReviewItem) => void;
    onEdit: (item: AnswerlatticeIntakeReviewItem) => void;
    evidenceSources: AnswerlatticeKnowledgeSource[];
    saving: boolean;
}) {
    const { token } = theme.useToken();
    const isAccepted = item.status === ANSWERLATTICE_INTAKE_REVIEW_STATUS.ACCEPTED;
    const isRejected = item.status === ANSWERLATTICE_INTAKE_REVIEW_STATUS.REJECTED;
    const isPublished = item.status === ANSWERLATTICE_INTAKE_REVIEW_STATUS.PUBLISHED;
    const isLegacyChangelog = item.target === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CHANGELOG;
    const isCanonicalProposal = item.target === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL;
    const requiresSafeFallback = isCanonicalProposal
        && Boolean(item.launchPack)
        && item.launchPack?.expectedSource !== 'canonical';
    const needsEntity = isCanonicalProposal && !item.entityIds?.length;
    const supportedAnswerText = item.launchPack ? item.answer : item.answer || item.body;
    const needsSupportedAnswer = isCanonicalProposal && String(supportedAnswerText || '').trim().length < 20;
    const needsEvidenceSource = evidenceSources.length === 0;
    const needsGovernedEvidence = isCanonicalProposal
        && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE
        && evidenceSources.some(source => (
            source.governance?.approvalStatus !== ANSWERLATTICE_SOURCE_APPROVAL_STATUS.APPROVED
            || Boolean(source.governance?.conflictSourceIds.length)
        ));
    const applicability = Object.entries(item.launchPack?.applicability || {})
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
        .slice(0, 6);

    return (
        <Card size="small" style={{ borderRadius: 8, borderColor: isAccepted ? token.colorSuccessBorder : token.colorBorderSecondary }}>
            <Flex vertical gap={10}>
                <Flex justify="space-between" gap={12} align="flex-start" wrap="wrap">
                    <Space size={[6, 6]} wrap>
                        <TargetTag target={item.target} />
                        {item.contextKeys?.slice(0, 3).map(key => <Tag key={key}>{key}</Tag>)}
                        {item.entityIds?.length ? <Tag color="purple">entity linked</Tag> : null}
                        {item.launchPack ? <Tag color="geekblue">First 10 #{item.launchPack.position}</Tag> : null}
                        {item.launchPack ? <Tag>{item.launchPack.sourceIds.length} source{item.launchPack.sourceIds.length === 1 ? '' : 's'}</Tag> : null}
                        {item.launchPack?.riskLevel === 'critical' ? <Tag color="red">Critical</Tag> : null}
                        {item.answerType === 'procedure' && item.procedure ? <Tag color="green">Guided procedure</Tag> : null}
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
                {item.answerType === 'procedure' && item.procedure ? (
                    <Flex vertical gap={4}>
                        <Text strong>Guided steps</Text>
                        {item.procedure.steps.slice(0, 4).map(step => (
                            <Text key={step.stepOrder} type="secondary">
                                {step.stepOrder}. {step.instruction}
                            </Text>
                        ))}
                    </Flex>
                ) : null}
                {item.reason ? <Text type="secondary">{item.reason}</Text> : null}
                {applicability.length ? (
                    <Space size={[6, 6]} wrap>
                        <Text type="secondary">Applies to</Text>
                        {applicability.map(([key, value]) => <Tag key={key}>{key}: {value}</Tag>)}
                    </Space>
                ) : null}
                <ReviewEvidence sources={evidenceSources} />
                {item.launchPack?.missingEvidence.length ? (
                    <Alert
                        type="warning"
                        showIcon
                        message="Evidence still needed"
                        description={item.launchPack.missingEvidence.join(' ')}
                    />
                ) : null}
                {requiresSafeFallback ? (
                    <Text type="warning">
                        This item is intentionally set to {item.launchPack?.expectedSource === 'escalation' ? 'escalation' : 'no answer'}. Add approved source evidence and refresh the product-specific set before turning it into a canonical proposal.
                    </Text>
                ) : null}
                {needsEntity || needsSupportedAnswer || needsEvidenceSource || needsGovernedEvidence ? (
                    <Text type="warning">
                        {[
                            needsEntity ? 'Link a product entity.' : '',
                            needsSupportedAnswer ? 'Add a source-supported answer.' : '',
                            needsEvidenceSource ? 'Recreate this draft from a linked source before accepting it.' : '',
                            needsGovernedEvidence ? 'Review every linked source and resolve its conflicts before accepting this canonical proposal.' : '',
                        ].filter(Boolean).join(' ')}
                    </Text>
                ) : null}
                <Flex justify="space-between" gap={8} wrap="wrap">
                    <Button style={{ minHeight: 44 }} onClick={() => onEdit(item)}>
                        {requiresSafeFallback || needsEntity || needsSupportedAnswer || item.launchPack?.missingEvidence.length ? 'Add evidence' : 'Review details'}
                    </Button>
                    <Space>
                        <Button
                            icon={<LuX />}
                            disabled={saving || isPublished || isRejected}
                            onClick={() => onReject(item)}
                            style={{ minHeight: 44 }}
                        >
                            Reject
                        </Button>
                        <Button
                            type="primary"
                            icon={<LuCheck />}
                            disabled={saving || isPublished || isAccepted || isLegacyChangelog || requiresSafeFallback || needsEntity || needsSupportedAnswer || needsEvidenceSource || needsGovernedEvidence}
                            onClick={() => onAccept(item)}
                            style={{ minHeight: 44 }}
                        >
                            Accept
                        </Button>
                    </Space>
                </Flex>
            </Flex>
        </Card>
    );
}

export default function AnswerlatticeKnowledgeIntake() {
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const { token } = theme.useToken();
    const [jobForm] = Form.useForm();
    const [replyForm] = Form.useForm();
    const [releaseForm] = Form.useForm();
    const [textForm] = Form.useForm();
    const [urlForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [governanceForm] = Form.useForm();
    const editingAnswerType = Form.useWatch('answerType', editForm);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AnswerlatticeIntakeReviewItem | null>(null);
    const [governingSource, setGoverningSource] = useState<AnswerlatticeKnowledgeSource | null>(null);
    const [discoveredLinks, setDiscoveredLinks] = useState<Array<{ url: string; title: string; role: string; reason: string }>>([]);
    const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
    const [discovering, setDiscovering] = useState(false);
    const [entityOptions, setEntityOptions] = useState<KnowledgeIntakeEntityOption[]>([]);
    const [entitySearching, setEntitySearching] = useState(false);
    const entitySearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const entitySearchSeqRef = useRef(0);
    const discoverySeqRef = useRef(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        refreshJobs,
        saving,
        searchEntityOptions,
        setActiveJobId,
        workspaceScopeKey,
        updateReviewItem,
        updateSourceGovernance,
    } = useKnowledgeIntake();

    const reviewGroups = useMemo(() => {
        const groups = new Map<string, AnswerlatticeIntakeReviewItem[]>();
        bundle.reviewItems.forEach((item) => {
            const key = item.target;
            groups.set(key, [...(groups.get(key) || []), item]);
        });
        return Array.from(groups.entries());
    }, [bundle.reviewItems]);

    const sourceById = useMemo(() => (
        new Map(bundle.sources.map(source => [source.id, source]))
    ), [bundle.sources]);
    const editingEvidenceSources = useMemo(() => (
        editingItem
            ? getReviewItemSourceIds(editingItem)
                .map(sourceId => sourceById.get(sourceId))
                .filter((source): source is AnswerlatticeKnowledgeSource => Boolean(source))
            : []
    ), [editingItem, sourceById]);

    const repeatedReplyEnabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT === true;
    const sourceGovernanceEnabled: boolean = Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE);
    const sourceGovernanceSummary = useMemo(() => {
        const today = dayjs().format('YYYY-MM-DD');
        return bundle.sources.reduce((summary, source) => {
            const governance = source.governance;
            if (!governance) summary.unreviewed += 1;
            if (governance?.approvalStatus === ANSWERLATTICE_SOURCE_APPROVAL_STATUS.APPROVED) {
                summary.approved += 1;
            }
            if (governance?.reviewDate && governance.reviewDate <= today) summary.reviewDue += 1;
            if (governance?.conflictSourceIds.length) summary.conflicts += 1;
            return summary;
        }, { approved: 0, conflicts: 0, reviewDue: 0, unreviewed: 0 });
    }, [bundle.sources]);
    const governanceConflictOptions = useMemo(() => (
        bundle.sources
            .filter(source => source.id !== governingSource?.id)
            .map(source => ({
                label: source.governance ? source.title : `${source.title} (review first)`,
                value: source.id,
                disabled: !source.governance,
            }))
    ), [bundle.sources, governingSource?.id]);

    const entitySelectOptions = useMemo(() => entityOptions.map(entity => ({
        value: entity.id,
        label: (
            <Space size={6} wrap>
                <Text strong>{entity.name}</Text>
                {entity.type ? <Tag>{entity.type}</Tag> : null}
            </Space>
        ),
    })), [entityOptions]);

    const handleEntitySearch = useCallback((queryText: string) => {
        const normalizedQuery = String(queryText || '').replace(/\s+/g, ' ').trim();
        if (entitySearchTimerRef.current) {
            clearTimeout(entitySearchTimerRef.current);
        }

        if (normalizedQuery.length < 3) {
            setEntitySearching(false);
            setEntityOptions([]);
            return;
        }

        const searchSeq = entitySearchSeqRef.current + 1;
        entitySearchSeqRef.current = searchSeq;
        setEntitySearching(true);
        entitySearchTimerRef.current = setTimeout(async () => {
            try {
                const options = await searchEntityOptions(normalizedQuery);
                if (entitySearchSeqRef.current === searchSeq) {
                    setEntityOptions(options);
                }
            } catch {
                if (entitySearchSeqRef.current === searchSeq) {
                    setEntityOptions([]);
                    message.error(ANSWERLATTICE_INTAKE_ENTITY_SEARCH_FAILED);
                }
            } finally {
                if (entitySearchSeqRef.current === searchSeq) {
                    setEntitySearching(false);
                }
            }
        }, 400);
    }, [searchEntityOptions]);

    useEffect(() => () => {
        if (entitySearchTimerRef.current) {
            clearTimeout(entitySearchTimerRef.current);
        }
    }, []);

    useEffect(() => {
        setCreateOpen(false);
        jobForm.resetFields();
    }, [jobForm, workspaceScopeKey]);

    useEffect(() => {
        discoverySeqRef.current += 1;
        entitySearchSeqRef.current += 1;
        if (entitySearchTimerRef.current) {
            clearTimeout(entitySearchTimerRef.current);
            entitySearchTimerRef.current = null;
        }
        setEditingItem(null);
        setGoverningSource(null);
        setDiscoveredLinks([]);
        setSelectedLinks([]);
        setDiscovering(false);
        setEntityOptions([]);
        setEntitySearching(false);
        if (!activeJob || activeJob.id !== activeJobId) return;
        replyForm.resetFields();
        releaseForm.resetFields();
        textForm.resetFields();
        urlForm.resetFields();
    }, [
        activeJob?.id,
        activeJobId,
        replyForm,
        releaseForm,
        textForm,
        urlForm,
        workspaceScopeKey,
    ]);

    const currentStep = activeJob?.status === 'published'
        ? 3
        : bundle.reviewItems.length > 0
            ? 2
            : bundle.sources.length > 0
                ? 1
                : 0;

    const openSourceGovernance = (source: AnswerlatticeKnowledgeSource) => {
        const governance = source.governance;
        setGoverningSource(source);
        governanceForm.setFieldsValue({
            authority: governance?.authority || ANSWERLATTICE_SOURCE_AUTHORITY.UNVERIFIED_REFERENCE,
            owner: governance?.owner || '',
            approvalStatus: governance?.approvalStatus || ANSWERLATTICE_SOURCE_APPROVAL_STATUS.UNREVIEWED,
            accessScope: governance?.accessScope || ANSWERLATTICE_SOURCE_ACCESS_SCOPE.WORKSPACE_PRIVATE,
            citationEligibility: governance?.citationEligibility || ANSWERLATTICE_SOURCE_CITATION_ELIGIBILITY.NOT_CITABLE,
            effectiveDate: governance?.effectiveDate || '',
            reviewDate: governance?.reviewDate || '',
            products: governance?.applicability.products.join(', ') || '',
            plans: governance?.applicability.plans.join(', ') || '',
            roles: governance?.applicability.roles.join(', ') || '',
            regions: governance?.applicability.regions.join(', ') || '',
            versions: governance?.applicability.versions.join(', ') || '',
            conflictSourceIds: governance?.conflictSourceIds || [],
            notes: governance?.notes || '',
        });
    };

    const handleSourceGovernanceSave = async () => {
        if (!activeJobId || !governingSource) return;
        const values = await governanceForm.validateFields();
        if (
            values.citationEligibility === ANSWERLATTICE_SOURCE_CITATION_ELIGIBILITY.PUBLIC
            && values.accessScope !== ANSWERLATTICE_SOURCE_ACCESS_SCOPE.PUBLIC
        ) {
            message.error('Only public sources can be publicly citable.');
            return;
        }
        if (
            (
                values.approvalStatus === ANSWERLATTICE_SOURCE_APPROVAL_STATUS.EXCLUDED
                || values.approvalStatus === ANSWERLATTICE_SOURCE_APPROVAL_STATUS.SUPERSEDED
            )
            && values.citationEligibility !== ANSWERLATTICE_SOURCE_CITATION_ELIGIBILITY.NOT_CITABLE
        ) {
            message.error('Excluded or superseded sources must not be citable.');
            return;
        }
        if (values.effectiveDate && values.reviewDate && values.reviewDate < values.effectiveDate) {
            message.error('The next review date cannot be before the effective date.');
            return;
        }
        const source = await updateSourceGovernance(activeJobId, governingSource.id, {
            authority: values.authority,
            owner: values.owner || null,
            approvalStatus: values.approvalStatus,
            accessScope: values.accessScope,
            citationEligibility: values.citationEligibility,
            effectiveDate: values.effectiveDate || null,
            reviewDate: values.reviewDate || null,
            applicability: {
                products: splitTags(values.products),
                plans: splitTags(values.plans),
                roles: splitTags(values.roles),
                regions: splitTags(values.regions),
                versions: splitTags(values.versions),
            },
            conflictSourceIds: values.conflictSourceIds || [],
            notes: values.notes || null,
        });
        if (source) {
            setGoverningSource(null);
            governanceForm.resetFields();
        }
    };

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
        const discoverySeq = discoverySeqRef.current + 1;
        discoverySeqRef.current = discoverySeq;
        setDiscovering(true);
        try {
            const links = await discoverLinks(values.url);
            if (discoverySeqRef.current !== discoverySeq) return;
            setDiscoveredLinks(links);
            setSelectedLinks(links.slice(0, 5).map(link => link.url));
        } catch {
            if (discoverySeqRef.current !== discoverySeq) return;
            message.error(ANSWERLATTICE_INTAKE_URL_INSPECT_FAILED);
        } finally {
            if (discoverySeqRef.current === discoverySeq) {
                setDiscovering(false);
            }
        }
    };

    const handleAddSelectedLinks = async () => {
        if (!activeJobId) return;
        const links = discoveredLinks.filter(link => selectedLinks.includes(link.url));
        for (const link of links.slice(0, 10)) {
            await addSource(activeJobId, {
                type: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.WEBSITE_PAGE,
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
            entityIds: normalizeEntitySelection(values.entityIds),
        });
        if (source) textForm.resetFields();
    };

    const handlePrepareReleaseEvidence = async () => {
        if (!activeJobId || !workspaceScopeKey) return;
        const values = await releaseForm.validateFields();
        const normalizedVersion = normalizeAnswerlatticeVersionLabel(values.versionLabel);
        const releaseTitle = String(values.title || '').replace(/\s+/g, ' ').trim();
        const releaseNotes = String(values.contentText || '').trim();
        if (
            !normalizedVersion
            || !dayjs.isDayjs(values.releasedAt)
            || !values.releasedAt.isValid()
            || !releaseTitle
            || !releaseNotes
        ) return;

        const entityIds = normalizeEntitySelection(values.entityIds);
        const requestedOriginUrl = String(values.originUrl || '').trim();
        const originUrl = requestedOriginUrl
            ? normalizeAnswerlatticeKnowledgeIntakePublicUrl(requestedOriginUrl)
            : null;
        if (requestedOriginUrl && !originUrl) return;
        let provider: 'github_export' | 'manual' = 'manual';
        if (originUrl) {
            try {
                const hostname = new URL(originUrl).hostname.toLowerCase();
                if (hostname === 'github.com' || hostname.endsWith('.github.com')) {
                    provider = 'github_export';
                }
            } catch {
                // The shared URL contract should keep this parseable; fail closed to manual provenance if it does not.
            }
        }

        const source = await addSource(activeJobId, {
            type: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.CHANGELOG,
            title: releaseTitle,
            contentText: releaseNotes,
            ...(originUrl ? { originUrl } : {}),
            tags: ['release'],
            entityIds,
            metadata: {
                inputMode: 'release_evidence_handoff',
                provider,
                versionLabel: normalizedVersion.label,
                releasedAt: values.releasedAt.toISOString(),
            },
        });
        if (!source?.contentText) return;

        const handoffStored = storeAnswerlatticeReleaseEvidenceHandoff({
            scopeKey: workspaceScopeKey,
            sourceJobId: source.jobId,
            sourceId: source.id,
            sourceTitle: source.title,
            provider,
            title: releaseTitle,
            contentText: source.contentText,
            versionLabel: normalizedVersion.label,
            releasedAt: values.releasedAt.toISOString(),
            entityIds,
            ...(source.originUrl ? { originUrl: source.originUrl } : {}),
        });
        if (!handoffStored) {
            message.warning('Release evidence was saved. Open Changelog manually to prepare the release note.');
            return;
        }

        releaseForm.resetFields();
        setEntityOptions([]);
        const changelogRoute = `${ANSWERLATTICE_ROUTES.CHANGELOG}?create=1&from=intake`;
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : null;
        router.push(toAnswerlatticeDashboardRoute(changelogRoute, currentHostname));
    };

    const handleAddRepeatedReply = async () => {
        if (!activeJobId) return;
        const values = await replyForm.validateFields();
        const question = String(values.question || '').replace(/\s+/g, ' ').trim();
        const answer = String(values.answer || '').trim();
        const source = await addSource(activeJobId, {
            type: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.REPEATED_REPLY,
            title: values.title || question,
            contentText: `Q: ${question}\nA: ${answer}`,
            tags: splitTags(values.tags),
            contextKeys: splitTags(values.contextKeys),
            entityIds: normalizeEntitySelection(values.entityIds),
            metadata: {
                inputMode: 'repeated_reply',
                replyQuestion: question,
                sourceLabel: 'owner_repeated_reply',
            },
        });
        if (source) {
            replyForm.resetFields();
            setEntityOptions([]);
        }
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || !activeJobId) return;
        for (const file of Array.from(files).slice(0, 8)) {
            try {
                if (isMediaIntakeFile(file)) {
                    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_MEDIA_EXTRACTION) {
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
                const contentText = extracted.text.slice(0, ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_TEXT_CHARS);
                if (extracted.text.length > contentText.length) {
                    message.info(`${file.name} was capped to the first ${ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_TEXT_CHARS.toLocaleString()} characters for this intake source.`);
                }
                await addSource(activeJobId, {
                    type: extracted.sourceType,
                    title: file.name.replace(/\.[^.]+$/, ''),
                    fileName: file.name,
                    mimeType: file.type,
                    contentText,
                });
            } catch {
                message.error(`${file.name}: Could not read file.`);
            }
        }
    };

    const handleEditSave = async () => {
        if (!editingItem || !activeJobId) return;
        const values = await editForm.validateFields();
        const { procedureJson, ...reviewValues } = values;
        let procedure = null;
        if (reviewValues.answerType === 'procedure') {
            let parsedProcedure: unknown;
            try {
                parsedProcedure = JSON.parse(String(procedureJson || ''));
            } catch {
                message.error('Guided procedure JSON is invalid.');
                return;
            }
            const procedureResult = AnswerlatticeProcedureSchema.safeParse(parsedProcedure);
            if (!procedureResult.success) {
                message.error('Complete every guided step with a valid action and instruction.');
                return;
            }
            procedure = procedureResult.data;
        }
        if (editingItem.target === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CHANGELOG && reviewValues.target === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CHANGELOG) {
            delete reviewValues.target;
        }
        const ok = await updateReviewItem(activeJobId, editingItem.id, {
            ...reviewValues,
            procedure,
            tags: splitTags(reviewValues.tags),
            contextKeys: splitTags(reviewValues.contextKeys),
            entityIds: normalizeEntitySelection(reviewValues.entityIds),
        });
        if (ok) setEditingItem(null);
    };

    if (!enabled) {
        return (
            <Card>
                <Empty description="Answerlattice knowledge intake is not enabled for this workspace." />
            </Card>
        );
    }

    return (
        <Flex vertical gap={20} style={{ padding: isMobile ? 12 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} gap={12} vertical={isMobile}>
                <Flex vertical gap={4}>
                    <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>Teach Answerlattice</Title>
                    <Paragraph type="secondary" style={{ margin: 0, maxWidth: 780 }}>
                        Import URLs, docs, FAQs, release notes, ticket macros, setup notes, screenshots, and short support recordings. Answerlattice prepares review drafts; you approve what becomes support knowledge.
                    </Paragraph>
                </Flex>
                <Space wrap>
                    <Link href={ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE}>
                        <Button icon={<LuBookOpen />}>Knowledge Base</Button>
                    </Link>
                    <Button type="primary" icon={<LuFileInput />} onClick={() => setCreateOpen(true)}>New intake</Button>
                </Space>
            </Flex>

            {error ? <Alert type="error" showIcon message={error} /> : null}

            {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS ? (
                <GitHubChangeIntakeCard
                    onOpenJob={async (jobId) => {
                        await refreshJobs();
                        setActiveJobId(jobId);
                    }}
                />
            ) : null}

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
                            <Empty
                                description="No intake job yet"
                                image={(
                                    <ContextualStateIllustration
                                        color={token.colorPrimary}
                                        size={isMobile ? 88 : 104}
                                        treatment="softHalo"
                                        variant="uploadContext"
                                    />
                                )}
                                styles={{ image: { height: isMobile ? 88 : 104 } }}
                            >
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

                                {sourceGovernanceEnabled && bundle.sources.length ? (
                                    <Card
                                        title={<Space><LuShieldCheck /> Source governance</Space>}
                                        extra={(
                                            <Space size={[4, 4]} wrap>
                                                <Tag>{sourceGovernanceSummary.approved}/{bundle.sources.length} approved</Tag>
                                                {sourceGovernanceSummary.reviewDue > 0 ? <Tag color="orange">{sourceGovernanceSummary.reviewDue} review due</Tag> : null}
                                                {sourceGovernanceSummary.conflicts > 0 ? <Tag color="red">{sourceGovernanceSummary.conflicts} with conflicts</Tag> : null}
                                                {sourceGovernanceSummary.unreviewed > 0 ? <Tag>{sourceGovernanceSummary.unreviewed} unreviewed</Tag> : null}
                                            </Space>
                                        )}
                                        style={{ borderRadius: 8 }}
                                    >
                                        <Paragraph type="secondary">
                                            Review which sources are suitable evidence before accepting a trusted-answer proposal. Approving evidence does not publish product truth.
                                        </Paragraph>
                                        <List
                                            dataSource={bundle.sources}
                                            pagination={bundle.sources.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
                                            renderItem={source => (
                                                <List.Item
                                                    actions={[
                                                        <Button
                                                            key="review-source-governance"
                                                            icon={<LuShieldCheck />}
                                                            onClick={() => openSourceGovernance(source)}
                                                            style={{ minHeight: 44 }}
                                                        >
                                                            Review
                                                        </Button>,
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        title={(
                                                            <Space size={[6, 6]} wrap>
                                                                <Text strong>{source.title}</Text>
                                                                <Tag>{source.type.replace(/_/g, ' ')}</Tag>
                                                            </Space>
                                                        )}
                                                        description={(
                                                            <Space size={[6, 6]} wrap>
                                                                <SourceGovernanceTags source={source} />
                                                            </Space>
                                                        )}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </Card>
                                ) : null}

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
                                            <Checkbox.Group
                                                value={selectedLinks}
                                                onChange={(values) => setSelectedLinks(
                                                    values.filter((value): value is string => typeof value === 'string'),
                                                )}
                                            >
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

                                <Card
                                    title={<Space><LuRocket /> Release evidence</Space>}
                                    extra={<Tag color="orange">Owner review required</Tag>}
                                    style={{ borderRadius: 8 }}
                                >
                                    <Paragraph type="secondary">
                                        Paste release notes or a GitHub Release export. Answerlattice saves the evidence, then prepares the existing governed Changelog review. It does not connect to or monitor a repository.
                                    </Paragraph>
                                    <Form form={releaseForm} layout="vertical" initialValues={{ releasedAt: dayjs() }}>
                                        <Row gutter={[12, 0]}>
                                            <Col xs={24} lg={12}>
                                                <Form.Item name="title" label="Release title" rules={[
                                                    { required: true, whitespace: true, message: 'Add the release title.' },
                                                    { max: 180, message: 'Keep the title under 180 characters.' },
                                                ]}>
                                                    <Input placeholder="Faster workspace imports" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} lg={6}>
                                                <Form.Item
                                                    name="versionLabel"
                                                    label="Version"
                                                    rules={[
                                                        { required: true, message: 'Add a numeric version.' },
                                                        {
                                                            validator: async (_, value) => {
                                                                if (value && !normalizeAnswerlatticeVersionLabel(value)) {
                                                                    throw new Error('Use a numeric version such as 2.4.1');
                                                                }
                                                            },
                                                        },
                                                    ]}
                                                >
                                                    <Input placeholder="2.4.1" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} lg={6}>
                                                <Form.Item name="releasedAt" label="Released at" rules={[{ required: true, message: 'Add the release time.' }]}>
                                                    <DatePicker showTime style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Form.Item
                                            name="originUrl"
                                            label="Public release URL"
                                            rules={[
                                                { type: 'url', message: 'Use a valid public URL.' },
                                                {
                                                    validator: async (_, value) => {
                                                        if (value && !normalizeAnswerlatticeKnowledgeIntakePublicUrl(value)) {
                                                            throw new Error('Use a public URL without credentials or sensitive query values.');
                                                        }
                                                    },
                                                },
                                            ]}
                                        >
                                            <Input prefix={<LuLink />} placeholder="Optional: https://github.com/org/repo/releases/tag/2.4.1" />
                                        </Form.Item>
                                        <Form.Item
                                            name="contentText"
                                            label="Release notes"
                                            rules={[
                                                { required: true, whitespace: true, message: 'Paste the release notes.' },
                                                { max: ANSWERLATTICE_RELEASE_EVIDENCE_MAX_TEXT_CHARS, message: 'Keep release notes under 40,000 characters.' },
                                            ]}
                                        >
                                            <TextArea rows={8} placeholder="Paste the customer-relevant changes, fixes, and migration notes." />
                                        </Form.Item>
                                        <Form.Item
                                            name="entityIds"
                                            label="Changed product areas"
                                            rules={[
                                                { required: true, message: 'Select at least one changed product area.' },
                                                { type: 'array', max: 25, message: 'Select no more than 25 product areas.' },
                                            ]}
                                        >
                                            <Select
                                                mode="multiple"
                                                showSearch
                                                filterOption={false}
                                                options={entitySelectOptions}
                                                loading={entitySearching}
                                                onSearch={handleEntitySearch}
                                                onClear={() => setEntityOptions([])}
                                                placeholder="Search feature, plan, workflow, or error"
                                                notFoundContent={entitySearching ? 'Searching...' : 'Type 3 characters to search'}
                                                maxTagCount="responsive"
                                                allowClear
                                            />
                                        </Form.Item>
                                        <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} gap={12} vertical={isMobile}>
                                            <Text type="secondary">
                                                The next screen is an editable draft. Release Impact Guard still runs before publication.
                                            </Text>
                                            <Button
                                                type="primary"
                                                icon={<LuArrowRight />}
                                                loading={saving}
                                                onClick={handlePrepareReleaseEvidence}
                                                style={{ minHeight: 44 }}
                                            >
                                                Prepare release review
                                            </Button>
                                        </Flex>
                                    </Form>
                                </Card>

                                {repeatedReplyEnabled ? (
                                    <Card
                                        title={<Space><LuHelpCircle /> Repeated reply</Space>}
                                        extra={<Tag color="purple">FAQ + answer proposal</Tag>}
                                        style={{ borderRadius: 8 }}
                                    >
                                        <Form form={replyForm} layout="vertical">
                                            <Form.Item name="title" label="Title">
                                                <Input placeholder="Optional: billing card update answer" />
                                            </Form.Item>
                                            <Row gutter={[12, 0]}>
                                                <Col xs={24} lg={10}>
                                                    <Form.Item name="question" label="Question users ask" rules={[
                                                        { required: true, message: 'Add the repeated question.' },
                                                        { min: 8, message: 'Use the reusable question users actually ask.' },
                                                    ]}>
                                                        <TextArea rows={5} placeholder="How do I change my billing card?" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} lg={14}>
                                                    <Form.Item name="answer" label="Reply you already send" rules={[
                                                        { required: true, message: 'Add the reply.' },
                                                        { min: 20, message: 'Add a reusable reply with at least 20 characters.' },
                                                    ]}>
                                                        <TextArea rows={5} placeholder="Paste the reusable answer. Remove customer-specific details first." />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Row gutter={[12, 0]}>
                                                <Col xs={24} md={8}>
                                                    <Form.Item name="tags" label="Tags">
                                                        <Input placeholder="billing, settings" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={8}>
                                                    <Form.Item name="contextKeys" label="Surface/context keys">
                                                        <Input placeholder="billing, account-settings" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={8}>
                                                    <Form.Item name="entityIds" label="Product Topics">
                                                        <Select
                                                            mode="multiple"
                                                            showSearch
                                                            filterOption={false}
                                                            options={entitySelectOptions}
                                                            loading={entitySearching}
                                                            onSearch={handleEntitySearch}
                                                            onClear={() => setEntityOptions([])}
                                                            placeholder="Search feature, plan, workflow..."
                                                            notFoundContent={entitySearching ? 'Searching...' : 'Type 3 characters to search'}
                                                            maxTagCount="responsive"
                                                            allowClear
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} gap={12} vertical={isMobile}>
                                                <Text type="secondary">
                                                    Creates review drafts only. Trusted Answer proposals still need a related Product Topic before approval.
                                                </Text>
                                                <Button type="primary" loading={saving} icon={<LuShieldCheck />} onClick={handleAddRepeatedReply}>
                                                    Add repeated reply
                                                </Button>
                                            </Flex>
                                        </Form>
                                    </Card>
                                ) : null}

                                <Row gutter={[16, 16]}>
                                    <Col xs={24} xl={12}>
                                        <Card title={<Space><LuFileText /> Paste source content</Space>} style={{ borderRadius: 8 }}>
                                            <Form form={textForm} layout="vertical" initialValues={{ type: ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE.PRODUCT_NOTE }}>
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
                                                <Form.Item name="entityIds" label="Product Topics">
                                                    <Select
                                                        mode="multiple"
                                                        showSearch
                                                        filterOption={false}
                                                        options={entitySelectOptions}
                                                        loading={entitySearching}
                                                        onSearch={handleEntitySearch}
                                                        onClear={() => setEntityOptions([])}
                                                        placeholder="Search feature, workflow, plan, or role"
                                                        notFoundContent={entitySearching ? 'Searching...' : 'Type 3 characters to search'}
                                                        maxTagCount="responsive"
                                                        allowClear
                                                    />
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
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept={FILE_UPLOAD_ACCEPT}
                                                style={{ display: 'none' }}
                                                onChange={(event) => {
                                                    handleFiles(event.target.files);
                                                    event.currentTarget.value = '';
                                                }}
                                            />
                                            <Flex align={isMobile ? 'stretch' : 'center'} gap={8} vertical={isMobile}>
                                                <Button
                                                    icon={<LuUpload />}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    style={{ minHeight: 44 }}
                                                >
                                                    Choose files
                                                </Button>
                                                <Text type="secondary">
                                                    Select up to 8 files at a time. Large docs are capped before review to control cost.
                                                </Text>
                                            </Flex>
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
                                                                    evidenceSources={getReviewItemSourceIds(item)
                                                                        .map(sourceId => sourceById.get(sourceId))
                                                                        .filter((source): source is AnswerlatticeKnowledgeSource => Boolean(source))}
                                                                    saving={saving}
                                                                    onEdit={(next) => {
                                                                        setEditingItem(next);
                                                                        editForm.setFieldsValue({
                                                                            ...next,
                                                                            answerType: next.answerType || (next.procedure ? 'procedure' : 'explanation'),
                                                                            procedureJson: next.procedure ? JSON.stringify(next.procedure, null, 2) : '',
                                                                            tags: next.tags?.join(', '),
                                                                            contextKeys: next.contextKeys?.join(', '),
                                                                            entityIds: next.entityIds || [],
                                                                        });
                                                                    }}
                                                                    onAccept={(next) => activeJobId && updateReviewItem(activeJobId, next.id, { status: ANSWERLATTICE_INTAKE_REVIEW_STATUS.ACCEPTED })}
                                                                    onReject={(next) => activeJobId && updateReviewItem(activeJobId, next.id, { status: ANSWERLATTICE_INTAKE_REVIEW_STATUS.REJECTED })}
                                                                />
                                                            </Col>
                                                        ))}
                                                    </Row>
                                                </Flex>
                                            ))}
                                        </Flex>
                                    ) : (
                                        <Empty description="No review drafts yet">
                                            <Space direction="vertical" size={8} align="center">
                                                {!counts.sourcesReady ? (
                                                    <Text type="secondary">
                                                        Add a URL, paste source content, or upload a file first.
                                                    </Text>
                                                ) : null}
                                                <Button disabled={!counts.sourcesReady} icon={<LuSparkles />} onClick={() => activeJobId && analyzeJob(activeJobId)}>
                                                    Generate review drafts
                                                </Button>
                                            </Space>
                                        </Empty>
                                    )}
                                </Card>
                            </>
                        ) : (
                            <Card>
                                <Empty description="Create an intake job to start teaching Answerlattice.">
                                    <Button type="primary" icon={<LuFileInput />} onClick={() => setCreateOpen(true)}>
                                        New intake
                                    </Button>
                                </Empty>
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
                forceRender
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
                    <Form.Item name="description" label="What should Answerlattice learn?">
                        <TextArea rows={3} placeholder="Billing, onboarding, team settings, release changes..." />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={governingSource ? `Review source: ${governingSource.title}` : 'Review source'}
                open={Boolean(governingSource)}
                onCancel={() => {
                    setGoverningSource(null);
                    governanceForm.resetFields();
                }}
                onOk={handleSourceGovernanceSave}
                okText="Save source review"
                confirmLoading={saving}
                width={760}
                okButtonProps={{ style: { minHeight: 44 } }}
                cancelButtonProps={{ style: { minHeight: 44 } }}
                forceRender
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Evidence review is not answer approval"
                    description="This decision records whether the source may support review. Canonical product truth still requires the separate Governance approval flow."
                />
                <Form form={governanceForm} layout="vertical">
                    <Row gutter={[12, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="authority" label="Source authority" rules={[{ required: true }]}>
                                <Select options={SOURCE_AUTHORITY_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="approvalStatus" label="Evidence status" rules={[{ required: true }]}>
                                <Select options={SOURCE_APPROVAL_OPTIONS} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="owner" label="Source owner">
                        <Input maxLength={160} placeholder="Product, Support, Legal, founder..." />
                    </Form.Item>
                    <Row gutter={[12, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="accessScope" label="Access" rules={[{ required: true }]}>
                                <Select options={SOURCE_ACCESS_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="citationEligibility" label="Citation" rules={[{ required: true }]}>
                                <Select options={SOURCE_CITATION_OPTIONS} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={[12, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="effectiveDate" label="Effective date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="reviewDate" label="Next review date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={[12, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item name="products" label="Products">
                                <Input placeholder="Core app, API" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="plans" label="Plans">
                                <Input placeholder="Starter, Pro" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="roles" label="Roles">
                                <Input placeholder="Owner, admin" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="regions" label="Regions">
                                <Input placeholder="US, EU, India" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="versions" label="Versions">
                        <Input placeholder="v2, 2026.07" />
                    </Form.Item>
                    <Form.Item
                        name="conflictSourceIds"
                        label="Unresolved conflicts"
                        extra="Link only sources that currently disagree. Remove the link after a reviewer resolves the difference."
                    >
                        <Select
                            mode="multiple"
                            options={governanceConflictOptions}
                            maxTagCount="responsive"
                            placeholder="Select reviewed conflicting sources"
                        />
                    </Form.Item>
                    <Form.Item name="notes" label="Reviewer note">
                        <TextArea
                            rows={4}
                            maxLength={ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_GOVERNANCE_NOTES_CHARS}
                            showCount
                            placeholder="Why this source is trusted, limited, excluded, or superseded"
                        />
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
                styles={{
                    body: {
                        maxHeight: 'calc(100dvh - 200px)',
                        overflowY: 'auto',
                        overscrollBehavior: 'contain',
                    },
                }}
                forceRender
            >
                {editingItem ? (
                    <Flex vertical gap={10} style={{ marginBottom: 16 }}>
                        {editingItem.launchPack?.missingEvidence.length ? (
                            <Alert
                                type="warning"
                                showIcon
                                message="Evidence still needed"
                                description={editingItem.launchPack.missingEvidence.join(' ')}
                            />
                        ) : null}
                        <ReviewEvidence sources={editingEvidenceSources} />
                    </Flex>
                ) : null}
                <Form form={editForm} layout="vertical">
                    <Form.Item name="target" label="Publish as">
                        <Select
                            options={PUBLISH_TARGET_OPTIONS}
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
                    {editingItem?.target === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL ? (
                        <Form.Item name="answerType" label="Answer format">
                            <Select options={[
                                { label: 'Explanation', value: 'explanation' },
                                { label: 'Navigation', value: 'navigation' },
                                { label: 'Guided procedure', value: 'procedure' },
                            ]} />
                        </Form.Item>
                    ) : null}
                    {editingItem?.target === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL && editingAnswerType === 'procedure' ? (
                        <Form.Item
                            name="procedureJson"
                            label="Guided procedure"
                            extra="Use semantic target and event IDs registered by the client product. This remains a review draft until governance approval."
                            rules={[{ required: true, message: 'Add the guided procedure.' }]}
                        >
                            <TextArea autoSize={{ minRows: 10, maxRows: 20 }} />
                        </Form.Item>
                    ) : null}
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
                    <Form.Item
                        name="entityIds"
                        label="Product Topics"
                        extra="Search for the product topics this answer is about."
                    >
                        <Select
                            mode="multiple"
                            showSearch
                            filterOption={false}
                            options={entitySelectOptions}
                            loading={entitySearching}
                            onSearch={handleEntitySearch}
                            onClear={() => setEntityOptions([])}
                            placeholder="Search feature, workflow, plan, or role"
                            notFoundContent={entitySearching ? 'Searching...' : 'Type 3 characters to search'}
                            maxTagCount="responsive"
                            allowClear
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Flex>
    );
}
