import FileIcon from '@atoms/FileIcon';
import PasteUpload, { PastedFile } from '@atoms/PasteUpload';
import { addIngestionJob, assertIngestionJobWriteSucceeded } from '@database/kb-generation/jobs';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { uploadFile } from '@lib/firebase/storage';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { answerlatticeStorage } from '@lib/firebase/answerlatticeFirebaseClient';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { Alert, Button, Card, Image, Input, List, message, Modal, Progress, Space, Tag, Typography, Upload, UploadProps } from 'antd';
import type { UploadMetadata } from 'firebase/storage';
import React, { useMemo, useState } from 'react';
import { LuTrash2, LuUploadCloud } from 'react-icons/lu';
import { v4 as uuidv4 } from 'uuid';

const { Dragger } = Upload;
const { Text } = Typography;
const KNOWLEDGE_SOURCE_RETENTION_POLICY = 'delete_on_job_delete';
const KNOWLEDGE_SOURCE_USE = 'knowledge_generation_only';
const MAX_KNOWLEDGE_SOURCE_FILES = 8;
const MAX_KNOWLEDGE_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_KNOWLEDGE_SOURCE_TOTAL_BYTES = 40 * 1024 * 1024;
const ALLOWED_KNOWLEDGE_SOURCE_MIME_TYPES = new Set([
  'application/json',
  'application/msword',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/xml',
  'text/csv',
  'text/html',
  'text/markdown',
  'text/plain',
  'text/xml',
]);
const KNOWLEDGE_SOURCE_MIME_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  htm: 'text/html',
  html: 'text/html',
  json: 'application/json',
  md: 'text/markdown',
  pdf: 'application/pdf',
  txt: 'text/plain',
  xml: 'application/xml',
};

const IMPORT_STARTER_PACKS = [
  {
    key: 'markdown-docs',
    label: 'Markdown docs',
    tag: '.md',
    content: [
      '# Billing and invoices',
      '',
      '## What users ask',
      '- Why did my invoice fail?',
      '- How do I update my payment method?',
      '',
      '## Approved source notes',
      'Add the exact owner-reviewed answer here before generation.',
    ].join('\n'),
  },
  {
    key: 'faq-csv',
    label: 'FAQ CSV',
    tag: '.csv',
    content: [
      'question,answer,surface,tags',
      '"How do I update billing?","Open Billing, update payment method, then retry the invoice.","billing_invoices","billing,invoice"',
      '"Why did my import stop?","Check file format and retry. If processing fails again, open a ticket from Import.","onboarding_import","onboarding,import"',
    ].join('\n'),
  },
  {
    key: 'changelog',
    label: 'Changelog entry',
    tag: 'release',
    content: [
      '# Release note',
      '',
      'Title: Usage limit update',
      'Affected surfaces: release_changes, billing_invoices',
      'What changed: Describe the shipped change.',
      'Support review: Which approved answers or FAQs should be checked?',
    ].join('\n'),
  },
  {
    key: 'ticket-macros',
    label: 'Ticket macros',
    tag: 'macro',
    content: [
      '# Support macros',
      '',
      'Macro: Failed invoice',
      'Surface: billing_invoices',
      'Owner-reviewed answer: Add the exact answer users should receive.',
      '',
      'Macro: Import failed',
      'Surface: onboarding_import',
      'Owner-reviewed answer: Add expected file formats and retry steps.',
    ].join('\n'),
  },
];

function sanitizeKnowledgeSourceFileName(fileName: string): string {
  const lastSegment = fileName.split(/[\\/]/).pop() || 'source-file';
  const safeName = lastSegment
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);

  return safeName || 'source-file';
}

function getKnowledgeSourceUploadMetadata(file: File): UploadMetadata {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const inferredContentType = extension
    ? KNOWLEDGE_SOURCE_MIME_BY_EXTENSION[extension] || 'application/octet-stream'
    : 'application/octet-stream';
  return {
    cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
    contentType: file.type || inferredContentType,
    customMetadata: {
      retentionPolicy: KNOWLEDGE_SOURCE_RETENTION_POLICY,
      sourceMetadataPolicy: file.type.startsWith('image/')
        ? 'source_file_may_include_image_metadata'
        : 'source_fidelity_preserved',
      sourceUse: KNOWLEDGE_SOURCE_USE,
      uploadedVia: 'answerlattice_kb_generation',
    },
  };
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const [fileList, setFileList] = useState<any[]>([]);
  const [sourceUrls, setSourceUrls] = useState('');
  const [starterAnswers, setStarterAnswers] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const session = useClientAuthSession();

  const handleFileChange = (info: any) => {
    setFileList(info.fileList);
  };

  const onPasteFiles = (pastedFiles: PastedFile[]) => {
    setFileList((prevAttachments) => {
      const existingFiles = new Set(prevAttachments.map(f => `${f.name}|${f.size}`));
      const uniqueNewFiles = pastedFiles.filter(file => !existingFiles.has(`${file.name}|${file.size}`));
      return [...prevAttachments, ...uniqueNewFiles];
    });
  };

  const handleRemoveFile = (fileToRemove: any) => {
    setFileList((prevAttachments) => prevAttachments.filter((file) => file.uid !== fileToRemove.uid));
  };

  const appendStarterPack = (content: string) => {
    setStarterAnswers((prev) => [prev.trim(), content].filter(Boolean).join('\n\n---\n\n'));
  };

  const handleStartGeneration = async () => {
    const hasTextSource = Boolean(sourceUrls.trim() || starterAnswers.trim());
    if (fileList.length === 0 && !hasTextSource) {
      message.error('Upload a file or add starter URLs/answers.');
      return;
    }

    const tId = Number(session?.tId);
    const sId = Number(session?.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
      message.error('Workspace scope is not available yet.');
      return;
    }

    const textSourceFiles = [
      sourceUrls.trim()
        ? {
          uid: 'source-urls',
          name: 'product-doc-urls.txt',
          originFileObj: new File(
            [`Product documentation URLs:\n${sourceUrls.trim()}\n`],
            'product-doc-urls.txt',
            { type: 'text/plain' },
          ),
        }
        : null,
      starterAnswers.trim()
        ? {
          uid: 'starter-answers',
          name: 'starter-support-answers.txt',
          originFileObj: new File(
            [`Starter support answers and known FAQs:\n${starterAnswers.trim()}\n`],
            'starter-support-answers.txt',
            { type: 'text/plain' },
          ),
        }
        : null,
    ].filter(Boolean) as Array<{ uid: string; name: string; originFileObj: File }>;

    const uploadSources = [...fileList, ...textSourceFiles];
    if (uploadSources.length > MAX_KNOWLEDGE_SOURCE_FILES) {
      message.error(`Use up to ${MAX_KNOWLEDGE_SOURCE_FILES} source files per generation job.`);
      return;
    }
    const sourceFiles = uploadSources.map(file => file.originFileObj).filter((file): file is File => file instanceof File);
    const totalBytes = sourceFiles.reduce((sum, file) => sum + file.size, 0);
    const unsupportedFile = sourceFiles.find((file) => {
      const metadata = getKnowledgeSourceUploadMetadata(file);
      const mimeType = String(metadata.contentType || '').toLowerCase();
      return file.size <= 0
        || file.size > MAX_KNOWLEDGE_SOURCE_FILE_BYTES
        || !(
          ALLOWED_KNOWLEDGE_SOURCE_MIME_TYPES.has(mimeType)
          || mimeType.startsWith('image/')
          || mimeType.startsWith('audio/')
          || mimeType.startsWith('video/')
        );
    });
    if (unsupportedFile || totalBytes > MAX_KNOWLEDGE_SOURCE_TOTAL_BYTES) {
      message.error('Use supported source files up to 10 MB each and 40 MB total.');
      return;
    }

    setIsUploading(true);
    dispatch(startLoader('Uploading files...'));
    const uploadPromises = uploadSources.map((file) => {
      const storagePath = `ingestion_source_files/${tId}/${sId}/${uuidv4()}-${sanitizeKnowledgeSourceFileName(file.name)}`;
      return uploadFile(storagePath, file.originFileObj, (progress) => {
        setUploadProgress((prev) => ({ ...prev, [file.uid]: progress }));
      }, answerlatticeStorage, getKnowledgeSourceUploadMetadata(file.originFileObj));
    });

    let uploadedFiles: Awaited<ReturnType<typeof uploadFile>>[] = [];
    let jobCreated = false;
    try {
      const uploadResults = await Promise.allSettled(uploadPromises);
      uploadedFiles = uploadResults
        .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadFile>>> => result.status === 'fulfilled')
        .map(result => result.value);
      if (uploadResults.some(result => result.status === 'rejected')) {
        throw new Error('knowledge_source_upload_failed');
      }
      dispatch(stopLoader('Uploading files...'));
      dispatch(startLoader('Creating generation job...'));

      const newJobData: Partial<IngestionJob> = {
        sourceFiles: uploadedFiles as any,
        status: INGESTION_JOB_STATUS.PENDING,
        categories: null
      };

      const newJob = await addIngestionJob(newJobData);
      assertIngestionJobWriteSucceeded(
        newJob,
        newJob.id,
        'kb_generation_upload_job_create_rejected',
      );
      jobCreated = true;
      message.success('New generation job created successfully!');
      handleClose();
    } catch (error) {
      if (!jobCreated && uploadedFiles.length > 0) {
        await Promise.allSettled(uploadedFiles.map(file => deleteFileByUrl(file.downloadURL, answerlatticeStorage)));
      }
      message.error('Failed to create generation job.');
    } finally {
      setIsUploading(false);
      dispatch(stopLoader('Uploading files...'));
      dispatch(stopLoader('Creating generation job...'));
    }
  };

  const handleClose = () => {
    setFileList([]);
    setSourceUrls('');
    setStarterAnswers('');
    setUploadProgress({});
    setIsUploading(false);
    onClose();
  };

  const props: UploadProps = useMemo(() => ({
    multiple: true,
    maxCount: MAX_KNOWLEDGE_SOURCE_FILES,
    accept: '.csv,.doc,.docx,.html,.json,.md,.pdf,.txt,.xml,audio/*,image/*,video/*',
    beforeUpload: (file) => {
      if (file.size > MAX_KNOWLEDGE_SOURCE_FILE_BYTES) {
        message.error('Each knowledge source file must be 10 MB or smaller.');
        return Upload.LIST_IGNORE;
      }
      return false; // Prevent auto-upload
    },
    onChange: handleFileChange,
    fileList: fileList,
    disabled: isUploading,
    showUploadList: false,
  }), [fileList, isUploading]);

  return (
    <Modal
      title="Upload New Content"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="back" onClick={handleClose} disabled={isUploading}>Cancel</Button>,
        <Button key="submit" type="primary" loading={isUploading} onClick={handleStartGeneration}>{isUploading ? 'Uploading...' : 'Start Generation'}</Button>,
      ]}
      styles={{
        content: {
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 17,
        },
        body: {
          width: '100%',
        }
      }}
    >
      <PasteUpload {...props} onPaste={onPasteFiles} isPastingEnabled={{ current: Boolean(open) }}>
        <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <LuUploadCloud />
          </p>
          <p className="ant-upload-text">Click or drag files to this area to upload</p>
          <p className="ant-upload-hint">
            Support for PDF, Markdown, CSV, text, screenshots, and other source file types for the knowledge base.
          </p>
          <p className="ant-upload-hint">
            Source files stay with this generation job until the job is deleted.
          </p>
          <p className="ant-upload-hint">
            Images and screenshots can include hidden location or device details. Remove private customer data before upload.
          </p>
        </Dragger>
      </PasteUpload>

      <Alert
        type="info"
        showIcon
        message="Importer starter pack"
        description="Start with files, pasted docs URLs, FAQ CSV/Markdown, release notes, or support macros. URL crawling is not automatic here; pasted URLs are kept as source material for the generation job."
      />

      <Card size="small" title="Add a starter template" style={{ width: '100%' }}>
        <Space size={[8, 8]} wrap>
          {IMPORT_STARTER_PACKS.map((pack) => (
            <Button key={pack.key} size="small" onClick={() => appendStarterPack(pack.content)}>
              {pack.label} <Tag style={{ marginLeft: 6 }}>{pack.tag}</Tag>
            </Button>
          ))}
        </Space>
      </Card>

      <Input.TextArea
        value={sourceUrls}
        onChange={(event) => setSourceUrls(event.target.value)}
        rows={4}
        maxLength={6000}
        showCount
        disabled={isUploading}
        placeholder={'Paste docs/help URLs, one per line.\nhttps://app.example.com/docs/billing\nhttps://app.example.com/docs/onboarding'}
      />

      <Input.TextArea
        value={starterAnswers}
        onChange={(event) => setStarterAnswers(event.target.value)}
        rows={5}
        maxLength={10000}
        showCount
        disabled={isUploading}
        placeholder={'Paste starter answers or known FAQs.\nQ: How do I update billing?\nA: Open Billing, update payment method, then retry the invoice.'}
      />

      {fileList.length > 0 && (
        <List
          header={<div>Files to Upload</div>}
          bordered
          dataSource={fileList}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key={`remove-${item.uid}`} icon={<LuTrash2 />} onClick={() => handleRemoveFile(item)} type="text" danger />,
              ]}
            >
              <List.Item.Meta
                avatar={item.type.startsWith('image') ? (
                  <Image
                    width={48}
                    height={48}
                    alt={item.name}
                    src={item.thumbUrl || URL.createObjectURL(item.originFileObj)}
                    style={{ objectFit: 'cover' }}
                  // preview={false}
                  />
                ) : <FileIcon fileType={item.type} />}
                title={<Text>{item.name}</Text>}
                description={uploadProgress[item.uid] ? <Progress percent={Math.round(uploadProgress[item.uid])} /> : 'Pending'}
              />
            </List.Item>
          )}
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default UploadModal;
