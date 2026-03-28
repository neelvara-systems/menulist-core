import FileIcon from '@atoms/FileIcon';
import PasteUpload, { PastedFile } from '@atoms/PasteUpload';
import { addIngestionJob } from '@database/kb-generation/jobs';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { uploadFile } from '@lib/firebase/storage';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { Button, Image, List, message, Modal, Progress, Typography, Upload, UploadProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { LuTrash2, LuUploadCloud } from 'react-icons/lu';
import { v4 as uuidv4 } from 'uuid';

const { Dragger } = Upload;
const { Text } = Typography;

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const [fileList, setFileList] = useState<any[]>([]);
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
    if (fileList.length === 0) {
      message.error('Please upload at least one file.');
      return;
    }

    setIsUploading(true);
    dispatch(startLoader('Uploading files...'));

    const uploadPromises = fileList.map((file) => {
      const storagePath = `ingestion_source_files/${session.tId}/${session.sId}/${uuidv4()}-${file.name.replace(/\s/g, '_')}`;
      return uploadFile(storagePath, file.originFileObj, (progress) => {
        setUploadProgress((prev) => ({ ...prev, [file.uid]: progress }));
      });
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
        </Dragger>
      </PasteUpload>

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
