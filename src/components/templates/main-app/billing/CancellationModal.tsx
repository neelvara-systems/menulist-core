import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { Button, Checkbox, Flex, Form, Input, Modal, Radio, Space, Typography, theme } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuBan, LuX } from 'react-icons/lu';

const { Title, Text } = Typography;

const CANCELLATION_REASONS = [
    'No longer need a website',
    'Lack of functionality',
    'Too expensive',
    'Found another tool',
    'Purchased accidentally',
    'Other (Please specify)',
];

interface CancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, otherReason: string | undefined, consent: boolean) => void;
    subscriptionEndDate: Timestamp; // Expects a pre-formatted date string
}

const stepVariants = {
    hidden: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? '50%' : '-50%',
    }),
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.3, ease: 'easeInOut' },
    },
    exit: (direction: number) => ({
        opacity: 0,
        x: direction < 0 ? '50%' : '-50%',
        transition: { duration: 0.3, ease: 'easeInOut' },
    }),
};

const CancellationModal = ({ isOpen, onClose, onConfirm, subscriptionEndDate }: CancellationModalProps) => {
    const { token } = theme.useToken();
    const [step, setStep] = useState(1);
    const [reason, setReason] = useState<string | null>(null);
    const [otherReason, setOtherReason] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [direction, setDirection] = useState(1);

    // Reset state when the modal is closed
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setReason(null);
                setOtherReason('');
                setIsConfirmed(false);
            }, 300); // Delay to allow exit animation
        }
    }, [isOpen]);

    const handleNext = () => {
        setDirection(1);
        setStep(2);
    };

    const handleBack = () => {
        setDirection(-1);
        setStep(1);
    };

    const handleConfirm = () => {
        onConfirm(reason!, reason === 'Other (Please specify)' ? otherReason : undefined, isConfirmed);
    };

    const isNextDisabled = !reason || (reason === 'Other (Please specify)' && !otherReason.trim());

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            title={null}
            width={500}
            centered
        >
            <div style={{ minHeight: reason === 'Other (Please specify)' ? '450px' : '350px', position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence initial={false} custom={direction}>
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            custom={direction}
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                        >
                            <Space direction="vertical" size="large" style={{ width: '100%', height: '100%' }}>
                                <Space direction="vertical" size="small">
                                    <Title level={3} style={{ textAlign: 'center', width: '100%' }}>We&apos;re sorry to see you go</Title>
                                    <Text type="secondary" style={{ textAlign: 'center', width: '100%' }}>Thank you for choosing MenuList. We&apos;re sorry to see you go. Before you cancel, please specify your reason for cancellation below.</Text>
                                </Space>
                                <Form layout="vertical">
                                    <Radio.Group onChange={(e) => setReason(e.target.value)} value={reason}>
                                        <Space direction="vertical">
                                            {CANCELLATION_REASONS.map((r) => (
                                                <Radio key={r} value={r}>{r}</Radio>
                                            ))}
                                        </Space>
                                    </Radio.Group>
                                    {reason === 'Other (Please specify)' && (
                                        <Form.Item style={{ marginTop: 16 }}>
                                            <Input.TextArea
                                                rows={3}
                                                value={otherReason}
                                                onChange={(e) => setOtherReason(e.target.value)}
                                                placeholder="Reason for cancellation..."
                                            />
                                        </Form.Item>
                                    )}
                                </Form>
                                <Flex gap="small" justify="center" style={{ width: '100%', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                                    <Button icon={<LuX />} block onClick={onClose}>Dismiss</Button>
                                    <Button icon={<LuArrowRight />} block type="primary" onClick={handleNext} disabled={isNextDisabled}>Next</Button>
                                </Flex>
                            </Space>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            custom={direction}
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                        >
                            <Space direction="vertical" size="large" style={{ width: '100%', height: '100%' }}>
                                <Space direction="vertical" size="small">
                                    <Title level={3} style={{ textAlign: 'center', width: '100%' }}>Confirm Cancellation</Title>
                                    <Text type="secondary">
                                        Your plan will remain active until the end of your billing period on <DateTimeDisplay value={subscriptionEndDate} mode='date' />.
                                    </Text>
                                </Space>
                                <Checkbox checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)}>
                                    I understand that my subscription will be cancelled, but I can use my current plan until the end of the billing cycle.
                                </Checkbox>
                                <Flex gap="small" justify="center" style={{ width: '100%', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                                    <Button block icon={<LuArrowLeft />} onClick={handleBack}>Back</Button>
                                    <Button
                                        block
                                        type="primary"
                                        danger
                                        icon={<LuBan color={isConfirmed ? token.colorTextLightSolid : token.colorTextSecondary} />}
                                        onClick={handleConfirm}
                                        disabled={!isConfirmed}
                                    >
                                        Confirm Cancellation
                                    </Button>
                                </Flex>
                            </Space>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};

export default CancellationModal;
