'use client';

import { Alert, Button, Card, Flex, Image, Modal, Popconfirm, Progress, Typography, theme } from 'antd';
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import { LuArrowRight, LuFileSearch, LuTrash, LuX } from 'react-icons/lu';

const { Text } = Typography;

import { ConvertedImageType } from './types';

interface PdfViewerProps {
    pdfPagesCount: number | null,
    pdfFiles: { images: ConvertedImageType[]; action: string } | null;
    onSave: (images: ConvertedImageType[], action: string) => void;
    onCancel: () => void;
    setPdfFiles: Dispatch<SetStateAction<{ images: ConvertedImageType[]; action: string } | null>>;
}

export const PdfViewer = ({ pdfPagesCount, pdfFiles, setPdfFiles, onSave, onCancel }: PdfViewerProps) => {
    const { token } = theme.useToken();
    const loadingCardRef = useRef<HTMLDivElement>(null);
    const [previewPage, setPreviewPage] = useState<{ url: string; index: number } | null>(null);
    const images = pdfFiles?.images ?? [];
    const totalPages = pdfPagesCount ?? 0;

    useEffect(() => {
        if (totalPages > images.length && loadingCardRef.current) {
            loadingCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [images.length, totalPages]);

    const onRemove = (pageUrl: string) => {
        setPdfFiles((previous) => previous
            ? {
                action: previous.action,
                images: previous.images.filter((page) => page.url !== pageUrl),
            }
            : null);
    }

    // Check if still loading pages (more pages expected)
    const isStillLoading = totalPages > images.length;

    return (
        <Modal
            centered
            maskClosable={false}
            title={
                <Flex vertical gap={4}>
                    <Text strong>Review PDF Pages</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                        {isStillLoading
                            ? `Converting pages... (${images.length} of ${totalPages})`
                            : `${images.length} pages ready to process`
                        }
                    </Text>
                </Flex>
            }
            open={pdfPagesCount !== null || Boolean(pdfFiles?.images?.length)}
            footer={[
                <Popconfirm
                    key="cancel-confirm"
                    title="Cancel PDF Processing?"
                    description={isStillLoading ? "This will stop processing remaining PDF files." : "Discard these pages?"}
                    onConfirm={onCancel}
                    okText="Yes, cancel"
                    cancelText="No, keep"
                    okButtonProps={{ danger: true }}
                >
                    <Button icon={<LuX />} danger={isStillLoading}>
                        {isStillLoading ? 'Cancel All' : 'Cancel'}
                    </Button>
                </Popconfirm>,
                <Button
                    icon={<LuArrowRight />}
                    key="save"
                    type="primary"
                    disabled={isStillLoading}
                    onClick={() => {
                        if (pdfFiles && images.length > 0) {
                            onSave(images, pdfFiles.action);
                        }
                    }}
                >
                    Process {images.length} Pages
                </Button>
            ]}
            onCancel={onCancel}
            width={700}
            closable={false}
        >
            <Flex vertical style={{ width: '100%' }} gap={16}>
                {isStillLoading && (
                    <Alert
                        type="info"
                        message="Converting PDF pages..."
                        description="Click 'Cancel All' to stop processing remaining PDF files. Any files in the queue will be skipped."
                        showIcon
                    />
                )}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    maxHeight: '60vh',
                    minHeight: '60vh',
                    overflowY: 'auto',
                    padding: '8px'
                }}>
                    {images.map((pageData, index) => (
                        <Card
                            key={index}
                            hoverable
                            className='animate__animated animate__fadeIn animate__faster'
                            cover={
                                <Image
                                    alt={`Page ${index + 1}`}
                                    src={pageData.url}
                                    style={{ width: '100%', height: '280px', objectFit: 'contain' }}
                                    preview={{
                                        visible: Boolean(pageData.url && previewPage?.url === pageData.url),
                                        onVisibleChange: (visible) => {
                                            if (!visible) setPreviewPage(null);
                                        }
                                    }}
                                    onClick={() => setPreviewPage({ url: pageData.url, index: index })}
                                />
                            }
                        >
                            <Flex justify='space-between' align='center' style={{ width: '100%' }}>
                                <Card.Meta title={`Page ${index + 1}`} />
                                <Popconfirm
                                    disabled={Boolean(isStillLoading)}
                                    title="Delete page"
                                    description="Are you sure you want to delete this page?"
                                    onConfirm={() => onRemove(pageData.url)}
                                    okText="Yes"
                                    cancelText="No"
                                    placement="left"
                                    okType='danger'
                                >
                                    <Button aria-label={`Delete page ${index + 1}`} shape='circle' icon={<LuTrash />} danger disabled={Boolean(isStillLoading)} />
                                </Popconfirm>
                            </Flex>
                        </Card>
                    ))}

                    {Boolean(isStillLoading) && <Card ref={loadingCardRef} className='animate__animated animate__fadeInLeft' key={"loading"}>
                        <Flex vertical justify='center' align='center' gap={16} style={{ width: '100%', height: '280px', objectFit: 'contain' }}>
                            <div className='animate__animated animate__pulse animate__infinite'>
                                <LuFileSearch size={48} style={{ color: token.colorPrimary }} />
                            </div>
                            <Flex vertical align="center" gap={8}>
                                <Text strong style={{ fontSize: 16 }}>
                                    Reading your PDF...
                                </Text>
                                <Text type="secondary" style={{ fontSize: 13, textAlign: 'center' }}>
                                    Converting pages to images
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Page {images.length} of {totalPages}
                                </Text>
                            </Flex>
                            <Progress
                                percent={Math.round((images.length / totalPages) * 100)}
                                strokeColor={token.colorPrimary}
                                style={{ width: '80%' }}
                            />
                        </Flex>
                    </Card>}

                </div>
            </Flex>
        </Modal>
    );
};
