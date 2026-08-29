import { useOfferingLabels } from '@hook/useOfferingLabels';
import { labelConfirmDialog } from '@lib/accessibility/antConfirmDialog';
import { Alert, Button, Card, Flex, Image, Modal, Progress, Tag, Tooltip, Typography, theme } from 'antd';
import { useState } from 'react';
import { LuCheckCircle, LuEye, LuFileText, LuSparkles, LuTrash, LuTrash2 } from 'react-icons/lu';
import { ProjectFileType } from './types';
const { Text } = Typography
const { useToken } = theme;

interface FileListProps {
    files: ProjectFileType[];
    onRemove: (uid: string) => void;
    onClearAll?: () => void;
    fileProcessingId: string | null;
}

export function FileList({ files, onRemove, onClearAll, fileProcessingId }: FileListProps) {

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [clearAllModalVisible, setClearAllModalVisible] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<ProjectFileType | null>(null);

    const { token } = useToken();
    const labels = useOfferingLabels();
    const [previewFile, setPreviewFile] = useState<ProjectFileType | null>(null);

    const handlePreview = async (file: ProjectFileType) => {
        if (!file.url) return;
        setPreviewFile(file);
    };

    // Count unprocessed files
    const unprocessedCount = files.filter(f => !f.extractedData).length;
    const processedCount = files.filter(f => f.extractedData).length;

    return (
        <>
            <div>
                {/* Header with file count and Clear All button */}
                {files.length > 0 && (
                    <Flex justify={unprocessedCount > 1 ? "space-between" : "center"} align="center" style={{ marginBottom: 20, padding: '8px 12px', background: token.colorBgContainer, borderRadius: 8 }}>
                        <Flex gap={8} align="center">
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {files.length} {files.length === 1 ? 'file' : 'files'} uploaded
                            </Text>
                            {processedCount > 0 && (
                                <Tag color="success" style={{ margin: 0 }}>
                                    {processedCount} processed
                                </Tag>
                            )}
                        </Flex>
                        {unprocessedCount > 1 && onClearAll && (
                            <Tooltip title={fileProcessingId ? "Wait for current file to finish processing" : ""}>
                                <Button
                                    size="small"
                                    danger
                                    type="text"
                                    icon={<LuTrash2 size={14} />}
                                    onClick={() => setClearAllModalVisible(true)}
                                    disabled={fileProcessingId !== null}
                                >
                                    Clear {unprocessedCount} files
                                </Button>
                            </Tooltip>
                        )}
                    </Flex>
                )}

                <Flex gap={20} wrap={"wrap"} justify='center'>
                    {files.map((file) => {
                        const isImage = file.type?.startsWith('image/');
                        const isProcessing = fileProcessingId !== null;
                        const processingSeconds = Number(file.processingTime || 0) / 1000;
                        return (
                            <Card key={file.uid} styles={{ body: { padding: 0 } }}
                                style={{
                                    cursor: isProcessing ? 'not-allowed' : 'default',
                                    width: 150,
                                    maxWidth: 150,
                                    position: 'relative',
                                    height: "max-content",
                                    opacity: isProcessing && file.uid !== fileProcessingId ? 0.6 : 1
                                }}
                                size="small"
                                cover={
                                    <>
                                        {(Boolean(file.extractedData) || (fileProcessingId === file.uid) || !isProcessing) && (
                                            <div className='animate__animated animate__fadeIn animate__faster'
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    background: token.colorBgMask,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                    zIndex: 1
                                                }}>
                                                {Boolean(file.extractedData) && (
                                                    <Tooltip title={`Processed in ${processingSeconds.toFixed(1)} seconds`}>
                                                        <Flex className='animate__animated animate__fadeInLeft animate__faster' vertical align='center' justify='center' gap={10}>
                                                            <LuCheckCircle size={32} style={{ color: token.colorSuccess }} />
                                                            <Tag color={token.colorSuccess}>{processingSeconds.toFixed(1)} s</Tag>
                                                            {/* <Tag color={token.colorPrimary}>{file.inputToken + file.inputToken} Tokens</Tag> */}
                                                        </Flex>
                                                    </Tooltip>
                                                )}
                                                {fileProcessingId === file.uid && (
                                                    <Flex vertical align="center" gap={12} className='animate__animated animate__fadeIn'>
                                                        <div className='animate__animated animate__pulse animate__infinite'>
                                                            <LuSparkles size={40} style={{ color: token.colorPrimary }} />
                                                        </div>
                                                        <Flex vertical align="center" gap={4}>
                                                            <Text strong style={{ color: token.colorTextLightSolid, fontSize: 14 }}>
                                                                Reading file...
                                                            </Text>
                                                            <Text type="secondary" style={{ color: token.colorTextLightSolid, fontSize: 12 }}>
                                                                Extracting {labels.itemsPlural}
                                                            </Text>
                                                        </Flex>
                                                        <Progress
                                                            type="circle"
                                                            percent={75}
                                                            size={60}
                                                            strokeColor={token.colorPrimary}
                                                            showInfo={false}
                                                            status="active"
                                                        />
                                                    </Flex>
                                                )}
                                                {!isProcessing && (
                                                    <Text
                                                        ellipsis={{ tooltip: file.name }}
                                                        style={{ color: token.colorTextLightSolid, maxWidth: 130 }}
                                                    >
                                                        {file.name}
                                                    </Text>
                                                )}
                                                {!isProcessing && (
                                                    <Flex align='center' justify='center' gap={10}>
                                                        {isImage && (
                                                            <Button
                                                                aria-label={`Preview ${file.name}`}
                                                                shape='circle'
                                                                className='animate__animated animate__fadeInLeft animate__faster'
                                                                icon={<LuEye style={{ fontSize: 18 }} />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePreview(file);
                                                                }}
                                                                disabled={isProcessing}
                                                            />
                                                        )}
                                                        <Button
                                                            aria-label={`Delete ${file.name}`}
                                                            shape='circle'
                                                            className='animate__animated animate__fadeInRight animate__faster'
                                                            danger
                                                            icon={<LuTrash style={{ fontSize: 18 }} />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!file.extractedData) {
                                                                    // Delete immediately if not processed
                                                                    onRemove(file.uid);
                                                                } else {
                                                                    // Show confirmation modal for processed files
                                                                    setFileToDelete(file);
                                                                    setDeleteModalVisible(true);
                                                                }
                                                            }}
                                                            disabled={isProcessing}
                                                        />
                                                    </Flex>
                                                )}
                                            </div>
                                        )}
                                        {isImage ? (
                                            <div style={{
                                                minHeight: "auto",
                                                maxHeight: '100%',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: token.colorFillAlter
                                            }}>
                                                <Image
                                                    alt={file.name}
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                        width: 'auto',
                                                        height: 'auto',
                                                        objectFit: 'cover'
                                                    }}
                                                    src={file.url}
                                                    preview={true}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{
                                                height: 140,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: token.colorFillAlter
                                            }}>
                                                <LuFileText style={{ fontSize: 48, color: token.colorPrimary }} />
                                            </div>
                                        )}
                                    </>
                                }
                            >
                            </Card>
                        );
                    })}
                </Flex>
            </div>
            {previewFile && (
                <Image
                    alt={previewFile.name}
                    src={previewFile.url}
                    style={{ display: "none" }}
                    preview={{
                        modalRender: labelConfirmDialog(`${previewFile.name || "Source file"} preview`),
                        onVisibleChange: (visible) => {
                            if (!visible) setPreviewFile(null)
                        },
                        visible: true,
                        src: previewFile.url,
                    }}
                />
            )}

            {/* Delete Single File Confirmation Modal */}
            <Modal
                title="Delete Processed File"
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setDeleteModalVisible(false)}>
                        No, keep it
                    </Button>,
                    <Button
                        key="delete"
                        danger
                        type="primary"
                        onClick={() => {
                            if (fileToDelete) {
                                onRemove(fileToDelete.uid);
                                setDeleteModalVisible(false);
                                setFileToDelete(null);
                            }
                        }}
                    >
                        Yes, delete
                    </Button>,
                ]}
            >
                <Alert
                    message="This action cannot be undone"
                    description="This file has already been processed. Re-uploading it later will repeat menu processing."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Flex vertical align='center' justify='center' gap={10}>
                    {fileToDelete?.url && fileToDelete?.type?.startsWith('image/') && (
                        <Image
                            src={fileToDelete.url}
                            alt={fileToDelete.name || ''}
                            style={{ maxHeight: 200, marginTop: 16 }}
                            preview={false}
                        />
                    )}
                </Flex>
            </Modal>

            {/* Clear All Unprocessed Files Modal */}
            <Modal
                title="Clear All Unprocessed Files?"
                open={clearAllModalVisible}
                onCancel={() => setClearAllModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setClearAllModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="clear"
                        danger
                        type="primary"
                        onClick={() => {
                            onClearAll?.();
                            setClearAllModalVisible(false);
                        }}
                    >
                        Clear All ({unprocessedCount})
                    </Button>,
                ]}
            >
                <Flex vertical gap={12}>
                    <Text>
                        This will remove all <Text strong>{unprocessedCount}</Text> unprocessed {unprocessedCount === 1 ? 'file' : 'files'} from the upload queue.
                    </Text>
                    <Alert
                        message="Processed files will be kept"
                        description={processedCount > 0 ? `Your ${processedCount} processed ${processedCount === 1 ? 'file' : 'files'} will not be affected.` : "No files have been processed yet."}
                        type="info"
                        showIcon
                    />
                </Flex>
            </Modal>
        </>
    );
}
