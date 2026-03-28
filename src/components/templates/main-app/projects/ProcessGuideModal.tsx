import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Flex, Modal, Steps, Typography, theme } from 'antd';
import { LuCheckCircle, LuFileText, LuPen, LuShare, LuSparkles, LuUpload } from 'react-icons/lu';

interface ProcessGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProcessGuideModal = ({ isOpen, onClose }: ProcessGuideModalProps) => {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={900}
            centered
            styles={{
                body: { padding: '32px 24px' }
            }}
        >
            <Flex vertical align="center" gap={24}>
                {/* Header */}
                <Flex vertical align="center" gap={12}>
                    <LuSparkles size={52} color={token.colorPrimary} />
                    <Typography.Title level={3} style={{ margin: 0, textAlign: 'center' }}>
                        How It Works
                    </Typography.Title>
                    <Typography.Text type="secondary" style={{ fontSize: '15px', textAlign: 'center', maxWidth: 600 }}>
                        Create {labels.digitalLabel} in 4 simple steps. We&apos;ll guide you through the entire process.
                    </Typography.Text>
                </Flex>

                {/* Process Steps */}
                <div style={{ width: '100%', maxWidth: 750 }}>
                    <Steps
                        direction="vertical"
                        current={-1}
                        items={[
                            {
                                title: <Typography.Text strong style={{ fontSize: '16px' }}>1. {labels.uploadLabel}</Typography.Text>,
                                description: (
                                    <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: token.colorTextSecondary }}>
                                        {labels.uploadDesc}
                                        <br />
                                        <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                                            ⏱️ Takes: ~1 minute
                                        </Typography.Text>
                                    </Typography.Paragraph>
                                ),
                                icon: <LuUpload size={24} style={{ color: token.colorPrimary }} />
                            },
                            {
                                title: <Typography.Text strong style={{ fontSize: '16px' }}>2. AI Extracts Your Items</Typography.Text>,
                                description: (
                                    <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: token.colorTextSecondary }}>
                                        {labels.aiExtractsDesc}
                                        <br />
                                        <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                                            ⏱️ Takes: ~2-5 minutes (we&apos;ll notify you when ready)
                                        </Typography.Text>
                                    </Typography.Paragraph>
                                ),
                                icon: <LuFileText size={24} style={{ color: token.colorSuccess }} />
                            },
                            {
                                title: <Typography.Text strong style={{ fontSize: '16px' }}>3. Review & Edit Items</Typography.Text>,
                                description: (
                                    <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: token.colorTextSecondary }}>
                                        Check the extracted items, fix any mistakes, add images, and organize categories.
                                        <br />
                                        <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                                            ⏱️ Takes: ~10-15 minutes (you can always come back later)
                                        </Typography.Text>
                                    </Typography.Paragraph>
                                ),
                                icon: <LuPen size={24} style={{ color: token.colorWarning }} />
                            },
                            {
                                title: <Typography.Text strong style={{ fontSize: '16px' }}>4. {labels.publishLabel}</Typography.Text>,
                                description: (
                                    <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: token.colorTextSecondary }}>
                                        Get a shareable link or QR code for {labels.digitalLabel}. Share it with customers!
                                        <br />
                                        <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                                            ⏱️ Takes: Instant
                                        </Typography.Text>
                                    </Typography.Paragraph>
                                ),
                                icon: <LuShare size={24} style={{ color: token.colorError }} />
                            },
                        ]}
                    />
                </div>

                {/* Quick Tips */}
                <Flex
                    vertical
                    gap={12}
                    style={{
                        width: '100%',
                        maxWidth: 750,
                        padding: '20px 24px',
                        background: token.colorInfoBg,
                        borderRadius: 12,
                        border: `1px solid ${token.colorInfoBorder}`
                    }}
                >
                    <Flex align="center" gap={8}>
                        <LuCheckCircle size={20} color={token.colorInfo} />
                        <Typography.Text strong style={{ color: token.colorInfoText, fontSize: '15px' }}>
                            Quick Tips
                        </Typography.Text>
                    </Flex>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px 24px',
                        paddingLeft: 28
                    }}>
                        <Typography.Text style={{ fontSize: '14px' }}>
                            • Upload clear photos for best AI accuracy
                        </Typography.Text>
                        <Typography.Text style={{ fontSize: '14px' }}>
                            • You can add multiple languages later
                        </Typography.Text>
                        <Typography.Text style={{ fontSize: '14px' }}>
                            • Auto-saves as you edit—no need to worry
                        </Typography.Text>
                        <Typography.Text style={{ fontSize: '14px' }}>
                            • Need help? Click (?) in bottom-right corner
                        </Typography.Text>
                    </div>
                </Flex>

                {/* Action Button */}
                <Button
                    type="primary"
                    size="large"
                    onClick={onClose}
                    style={{ minWidth: 180, height: 44 }}
                >
                    Got It, Let&apos;s Start!
                </Button>
            </Flex>
        </Modal>
    );
};
