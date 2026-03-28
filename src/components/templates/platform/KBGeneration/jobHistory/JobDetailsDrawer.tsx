import DateTimeDisplay from '@atoms/DateTimeDisplay';
import KbSourceFile from '@atoms/KbSourceFile';
import { FILE_TYPE, IngestionJob, IngestionJobSourceFile } from '@type/knowledgeBase';
import { Button, Drawer, Flex, message, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import { LuClipboard, LuFileCheck2, LuFileClock, LuFileCog, LuFileQuestion, LuFileSearch, LuFileSignature, LuFileX } from 'react-icons/lu';
import GeneratedContentTree from './GeneratedContentTree';
import JobDetailItem from './JobDetailItem';
import JobDetailsSection from './JobDetailsSection';

const { Title, Text } = Typography;

interface JobDetailsDrawerProps {
    open: boolean;
    onClose: () => void;
    job: IngestionJob | null;
}

const statusConfig: { [key: string]: { color: string; icon?: React.ReactNode; label: string } } = {
    pending: { color: 'default', label: 'Pending' },
    processing: { color: 'blue', icon: <LuFileCog />, label: 'Processing' },
    reconciling: { color: 'cyan', icon: <LuFileSearch />, label: 'Reconciling' },
    needs_review: { color: 'orange', icon: <LuFileQuestion />, label: 'Needs Review' },
    approved: { color: 'lime', icon: <LuFileSignature />, label: 'Approved' },
    publishing: { color: 'purple', icon: <LuFileClock />, label: 'Publishing' },
    published: { color: 'green', icon: <LuFileCheck2 />, label: 'Published' },
    failed: { color: 'red', icon: <LuFileX />, label: 'Failed' },
};


const JobDetailsDrawer: React.FC<JobDetailsDrawerProps> = ({ open, onClose, job }) => {

    if (!job) return null;

    const config = statusConfig[job.status];

    const onClickDocument = (url: string) => {
        window.open(url, '_blank');
    };

    // --- DUMMY DATA FOR ICON REVIEW ---
    const dummySourceFiles: IngestionJobSourceFile[] = [
        { fileName: 'datasheet.pdf', type: FILE_TYPE.PDF, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'logo.png', type: FILE_TYPE.IMAGE, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'tutorial.mp4', type: FILE_TYPE.VIDEO, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'podcast.mp3', type: FILE_TYPE.AUDIO, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'report.docx', type: FILE_TYPE.DOCUMENT, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'menulist.ai', type: FILE_TYPE.WEBSITE, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'youtube.com/watch?v=xyz', type: FILE_TYPE.YOUTUBE, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'My Google Doc', type: FILE_TYPE.GOOGLE_DRIVE, downloadURL: '#', storagePath: '', gsUri: '' },
        { fileName: 'Pasted content', type: FILE_TYPE.COPIED_TEXT, downloadURL: '#', storagePath: '', gsUri: '' },
    ];
    // ---------------------------------

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
                                        onClick={() => {
                                            navigator.clipboard.writeText(job.id);
                                            message.success('Job ID copied to clipboard');
                                        }}
                                    />
                                </Tooltip>
                            </Flex>
                        </JobDetailItem>
                        <JobDetailItem label="Status">
                            <Tag icon={config.icon} color={config.color}>{config.label}</Tag>
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

                    {/* --- DUMMY SECTION FOR ICON REVIEW --- */}
                    {/* <JobDetailsSection title="File Icon Review (Temporary)">
                        <List
                            size="small"
                            dataSource={dummySourceFiles}
                            renderItem={(file) => (
                                <List.Item style={{ border: 'none', padding: '8px 0' }}>
                                    <Flex align="center"><FileIcon fileType={file.type} /><Text>{file.fileName}</Text></Flex>
                                </List.Item>
                            )}
                        />
                    </JobDetailsSection> */}
                    {/* --------------------------------------- */}

                    <JobDetailsSection title="Sources">
                        <Flex vertical align="flex-start" gap={8}>
                            {job.sourceFiles.map((file) => (
                                <KbSourceFile key={file.fileName} file={{ ...file, name: file.fileName }} onClickSource={() => onClickDocument(file.downloadURL)} />
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
