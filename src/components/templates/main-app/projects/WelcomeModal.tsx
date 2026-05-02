import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Flex, Modal, Steps, Typography, theme } from 'antd';
import { LuFileText, LuPen, LuShare, LuSparkles, LuUpload } from 'react-icons/lu';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: () => void;
}

export const WelcomeModal = ({ isOpen, onClose, onStart }: WelcomeModalProps) => {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={600}
            centered
            maskClosable={false}
        >
            <Flex vertical align="center" gap={24} style={{ padding: '20px 0' }}>
                <Flex vertical align="center" gap={8}>
                    <LuSparkles size={48} color={token.colorPrimary} />
                    <Typography.Title level={3} style={{ margin: 0 }}>Welcome to Your {offeringName}</Typography.Title>
                    <Typography.Text type="secondary">Get started with {labels.digitalLabel} in 4 easy steps</Typography.Text>
                </Flex>

                <div style={{ width: '100%', maxWidth: 480 }}>
                    <Steps
                        current={-1}
                        direction="vertical"
                        style={{
                            padding: '0 20px'
                        }}
                        items={[
                            {
                                title: 'Upload',
                                description: `Upload your ${labels.offeringLower} images or PDFs.`,
                                icon: <LuUpload size={20} />
                            },
                            {
                                title: 'Review',
                                description: 'We extract your data automatically.',
                                icon: <LuFileText size={20} />
                            },
                            {
                                title: 'Edit',
                                description: `Customize and organize your ${labels.offeringLower}.`,
                                icon: <LuPen size={20} />
                            },
                            {
                                title: 'Publish',
                                description: `Export and share your ${labels.offeringLower}.`,
                                icon: <LuShare size={20} />
                            },
                        ]}
                    />
                </div>

                <Flex gap={12} style={{ width: '100%', marginTop: 12 }} justify="center">
                    <Button size="large" onClick={onClose}>
                        Skip
                    </Button>
                    <Button type="primary" size="large" onClick={onStart}>
                        Get Started
                    </Button>
                </Flex>
            </Flex>
        </Modal>
    );
};
