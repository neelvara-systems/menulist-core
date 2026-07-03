import DateTimeDisplay from '@atoms/DateTimeDisplay';
import KbSourceFile from '@atoms/KbSourceFile';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getIngestionJobStatusData, IngestionJob, IngestionJobSourceFile } from '@type/knowledgeBase';
import { Button, Drawer, Flex, message, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import { LuClipboard } from 'react-icons/lu';
import GeneratedContentTree from './GeneratedContentTree';
import JobDetailItem from './JobDetailItem';
import JobDetailsSection from './JobDetailsSection';

const { Title, Text } = Typography;
const ANSWERLATTICE_KB_JOB_ID_COPY_CLIPBOARD_UNAVAILABLE = 'answerlattice_kb_job_id_copy_clipboard_unavailable';
const ANSWERLATTICE_KB_JOB_ID_COPY_FALLBACK_FAILED = 'answerlattice_kb_job_id_copy_fallback_failed';

interface JobDetailsDrawerProps {
    open: boolean;
    onClose: () => void;
    job: IngestionJob | null;
}

const JobDetailsDrawer: React.FC<JobDetailsDrawerProps> = ({ open, onClose, job }) => {

    if (!job) return null;

    const statusConfig = getIngestionJobStatusData()[job.status] || {
        color: 'default',
        icon: null,
        label: 'Unknown',
    };
    const StatusIcon = statusConfig.icon;

    const onClickDocument = (url: string, file: IngestionJobSourceFile) => {
        try {
            const opened = window.open(url, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('answerlattice_kb_source_open_blocked');
            }
        } catch (error) {
            logRuntimeFailure('answerlattice_kb_source_open_failed', error, {
                surface: 'kb_generation_job_details',
                ...getBoundedRuntimeStringContext('jobId', job.id),
                ...getBoundedRuntimeStringContext('jobStatus', job.status),
                ...getBoundedRuntimeStringContext('sourceUrl', url),
                ...getBoundedRuntimeStringContext('sourceName', file.fileName),
                ...getBoundedRuntimeStringContext('sourceType', file.type),
            });
            message.error('Unable to open source');
        }
    };

    const handleCopyJobId = async () => {
        try {
            await copyAnswerlatticeSupportTextToClipboard(job.id, {
                unavailable: ANSWERLATTICE_KB_JOB_ID_COPY_CLIPBOARD_UNAVAILABLE,
                fallbackFailed: ANSWERLATTICE_KB_JOB_ID_COPY_FALLBACK_FAILED,
            });
            message.success('Job ID copied to clipboard');
        } catch (error) {
            logRuntimeFailure('answerlattice_kb_job_id_copy_failed', error, {
                surface: 'kb_generation_job_details',
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                ...getBoundedRuntimeStringContext('jobId', job.id),
                ...getBoundedRuntimeStringContext('jobStatus', job.status),
            });
            message.error('Unable to copy Job ID');
        }
    };

    let categoryCount = 0;
    let sectionCount = 0;
    let articleCount = 0;

    if (job.categories) {
        const cats = Object.values(job.categories);
        categoryCount = cats.length;
        cats.forEach(cat => {
            if (cat.sections) {
                sectionCount += cat.sections.length;
                cat.sections.forEach(sec => {
                    articleCount += sec.articles?.length || 0;
                });
            }
            articleCount += cat.articles?.length || 0;
        });
    }
    return (
        <>
            <Drawer
                title={`Job: ${job.id.substring(0, 8)}...`}
                placement="right"
                onClose={onClose}
                open={open}
                width={500}
                styles={{ body: { padding: '24px 32px' }, header: { borderBottom: 0 } }}
            >
                <Flex vertical>
                    <JobDetailsSection title="Job Summary">
                        <JobDetailItem label="Job ID">
                            <Flex align="center" gap={8}>
                                <Text >{job.id}</Text>
                                <Tooltip title="Copy ID">
                                    <Button
                                        type="text"
                                        shape="circle"
                                        icon={<LuClipboard />}
                                        onClick={() => { void handleCopyJobId(); }}
                                    />
                                </Tooltip>
                            </Flex>
                        </JobDetailItem>
                        <JobDetailItem label="Status">
                            <Tag icon={StatusIcon ? <StatusIcon /> : undefined} color={statusConfig.color}>{statusConfig.label}</Tag>
                        </JobDetailItem>
                        <JobDetailItem label="Created On">
                            <DateTimeDisplay value={job.createdOn} mode="datetime" />
                        </JobDetailItem>
                        <JobDetailItem label="Last Modified">
                            <DateTimeDisplay value={job.modifiedOn} mode="datetime" />
                        </JobDetailItem>
                        {job.publishedOn && (
                            <JobDetailItem label="Published On">
                                <DateTimeDisplay value={job.publishedOn} mode="datetime" />
                            </JobDetailItem>
                        )}
                    </JobDetailsSection>

                    <JobDetailsSection title="Sources">
                        <Flex vertical align="flex-start" gap={8}>
                            {job.sourceFiles.map((file) => (
                                <KbSourceFile key={file.fileName} file={{ ...file, name: file.fileName }} onClickSource={() => onClickDocument(file.downloadURL, file)} />
                            ))}
                        </Flex>
                    </JobDetailsSection>
                    <JobDetailsSection title="Outputs & Progress">
                        {job.categories && (
                            <>
                                <JobDetailItem label="Categories">
                                    <Text>{categoryCount}</Text>
                                </JobDetailItem>
                                <JobDetailItem label="Sections">
                                    <Text>{sectionCount}</Text>
                                </JobDetailItem>
                                <JobDetailItem label="Articles">
                                    <Text>{articleCount}</Text>
                                </JobDetailItem>
                            </>
                        )}
                    </JobDetailsSection>
                    {job.categories && (
                        <JobDetailsSection title="Generated Content">
                            <GeneratedContentTree categories={job.categories} />
                        </JobDetailsSection>
                    )}
                </Flex>
            </Drawer>
        </>
    );
};

export default JobDetailsDrawer;
