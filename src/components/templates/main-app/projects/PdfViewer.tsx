'use client';

import { Alert, Button, Card, Flex, Image, Modal, Popconfirm, Progress, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { LuArrowRight, LuFileSearch, LuTrash, LuX } from 'react-icons/lu';

const { Text } = Typography;

import { ConvertedImageType } from './types';

interface PdfViewerProps {
    pdfPagesCount: any,
    pdfFiles: { images: ConvertedImageType[]; action: string } | null;
    onSave: (images: any[], action: string) => void;
    onCancel: () => void;
    setPdfFiles: any
}

export const PdfViewer = ({ pdfPagesCount, pdfFiles, setPdfFiles, onSave, onCancel }: PdfViewerProps) => {
    const loadingCardRef = useRef<HTMLDivElement>(null);
    const [previewPage, setPreviewPage] = useState<{ url: string; index: number } | null>(null);

    useEffect(() => {
        if (pdfPagesCount > pdfFiles?.images?.length && loadingCardRef.current) {
            loadingCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [pdfPagesCount, pdfFiles?.images?.length]);

    const onRemove = (pageUrl: string) => {
        setPdfFiles(prevPages => ({ images: prevPages?.images?.filter(page => page.url !== pageUrl), action: prevPages.action }));
    }

    // Check if still loading pages (more pages expected)
    const isStillLoading = pdfPagesCount && pdfPagesCount > (pdfFiles?.images?.length || 0);

    return (
        <Modal
            centered
            maskClosable={false}
            title={
                <Flex vertical gap={4}>
                    <Text strong>Review PDF Pages</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                        {isStillLoading
                            ? `Converting pages... (${pdfFiles?.images?.length || 0} of ${pdfPagesCount})`
                            : `${pdfFiles?.images?.length || 0} pages ready to process`
                        }
                    </Text>
                </Flex>
            }
            open={Boolean(pdfFiles?.images?.length)}
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
                        if (pdfFiles?.images?.length > 0) {
                            onSave(pdfFiles?.images, pdfFiles!.action);
                        }
                    }}
                >
                    Process {pdfFiles?.images?.length || 0} Pages
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
                    {pdfFiles?.images?.map((pageData, index) => (
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
                                        visible: pageData.url && previewPage?.url === pageData.url,
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
                                    title="Delete page"
                                    description="Are you sure you want to delete this page?"
                                    onConfirm={() => onRemove(pageData.url)}
                                    okText="Yes"
                                    cancelText="No"
                                    placement="left"
                                    okType='danger'
                                >
                                    <Button shape='circle' icon={<LuTrash />} danger />
                                </Popconfirm>
                            </Flex>
                        </Card>
                    ))}

                    {Boolean(pdfPagesCount) && <Card ref={loadingCardRef} className='animate__animated animate__fadeInLeft' key={"loading"}>
                        <Flex vertical justify='center' align='center' gap={16} style={{ width: '100%', height: '280px', objectFit: 'contain' }}>
                            <div className='animate__animated animate__pulse animate__infinite'>
                                <LuFileSearch size={48} style={{ color: '#1890ff' }} />
                            </div>
                            <Flex vertical align="center" gap={8}>
                                <Text strong style={{ fontSize: 16 }}>
                                    Reading your PDF...
                                </Text>
                                <Text type="secondary" style={{ fontSize: 13, textAlign: 'center' }}>
                                    Converting pages to images
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Page {pdfFiles?.images?.length || 0} of {pdfPagesCount}
                                </Text>
                            </Flex>
                            <Progress
                                percent={Math.round(((pdfFiles?.images?.length || 0) / pdfPagesCount) * 100)}
                                strokeColor="#1890ff"
                                style={{ width: '80%' }}
                            />
                        </Flex>
                    </Card>}

                </div>
            </Flex>
        </Modal>
    );
};
