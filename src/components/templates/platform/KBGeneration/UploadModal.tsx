import FileIcon from '@atoms/FileIcon';
import PasteUpload, { PastedFile } from '@atoms/PasteUpload';
import { addIngestionJob } from '@database/kb-generation/jobs';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { uploadFile } from '@lib/firebase/storage';
import { canonicaStorage } from '@lib/firebase/canonicaFirebaseClient';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { Button, Image, Input, List, message, Modal, Progress, Typography, Upload, UploadProps } from 'antd';
import type { UploadMetadata } from 'firebase/storage';
import React, { useMemo, useState } from 'react';
import { LuTrash2, LuUploadCloud } from 'react-icons/lu';
import { v4 as uuidv4 } from 'uuid';

const { Dragger } = Upload;
const { Text } = Typography;
const KNOWLEDGE_SOURCE_RETENTION_POLICY = 'delete_on_job_delete';
const KNOWLEDGE_SOURCE_USE = 'knowledge_generation_only';

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
  return {
    cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      retentionPolicy: KNOWLEDGE_SOURCE_RETENTION_POLICY,
      sourceMetadataPolicy: file.type.startsWith('image/')
        ? 'source_file_may_include_image_metadata'
        : 'source_fidelity_preserved',
      sourceUse: KNOWLEDGE_SOURCE_USE,
      uploadedVia: 'canonica_kb_generation',
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

    setIsUploading(true);
    dispatch(startLoader('Uploading files...'));

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
    const uploadPromises = uploadSources.map((file) => {
      const storagePath = `ingestion_source_files/${tId}/${sId}/${uuidv4()}-${sanitizeKnowledgeSourceFileName(file.name)}`;
      return uploadFile(storagePath, file.originFileObj, (progress) => {
        setUploadProgress((prev) => ({ ...prev, [file.uid]: progress }));
      }, canonicaStorage, getKnowledgeSourceUploadMetadata(file.originFileObj));
    });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      dispatch(stopLoader('Uploading files...'));
      dispatch(startLoader('Creating generation job...'));

      const newJobData: Partial<IngestionJob> = {
        sourceFiles: uploadedFiles as any,
        status: INGESTION_JOB_STATUS.PENDING,
        categories: null
      };

      const newJob = await addIngestionJob(newJobData);
      message.success('New generation job created successfully!');
      handleClose();
    } catch (error) {
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
    beforeUpload: () => false, // Prevent auto-upload
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
            Support for PDF, video, and other source file types for the knowledge base.
          </p>
          <p className="ant-upload-hint">
            Source files stay with this generation job until the job is deleted.
          </p>
          <p className="ant-upload-hint">
            Images and screenshots can include hidden location or device details. Remove private customer data before upload.
          </p>
        </Dragger>
      </PasteUpload>

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
