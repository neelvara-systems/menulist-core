import { Plan } from '@data/common';
import { Currency, FirestoreSubscriptionDoc } from '@type/razorpay';
import { formatCurrency } from '@util/formatters';
import { Button, Divider, Flex, Modal, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { LuX, LuZap } from 'react-icons/lu';
import RemainingCreditNote from './RemainingCreditNote';

const { Title, Text, Paragraph } = Typography;

interface UpgradeConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    newPlan: Plan | null;
    activeSubscription?: FirestoreSubscriptionDoc | null;
    currency: Currency;
}

const UpgradeConfirmationModal = ({ isOpen, onClose, onConfirm, newPlan, activeSubscription, currency }: UpgradeConfirmationModalProps) => {
    const { token } = theme.useToken();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;
    if (!newPlan) return null;

    const isUpgrade = Boolean(activeSubscription);
    const price = newPlan?.[`price${currency}`].price;
    const billingIntervalText = newPlan?.billingInterval === 'MONTH' ? 'month' : 'year';
    if (price === null) return null;

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            title={<Title level={4}>Confirm {isUpgrade ? 'Your Upgrade' : 'Purchase'}</Title>}
            centered
            closable={false}
        >
            <Paragraph style={{ fontSize: token.fontSizeLG, margin: "16px 0 20px" }}>
                You are about to {isUpgrade ? "upgrade to the" : "purchase"} &nbsp;
                <Text strong style={{ fontSize: token.fontSizeHeading4, color: token.colorPrimaryTextActive }}>{newPlan.name}</Text>
                &nbsp; plan at <Text strong style={{ fontSize: token.fontSizeHeading4, color: token.colorText }}>{formatCurrency(price, currency)}/{billingIntervalText}</Text>.
            </Paragraph>
            <Paragraph style={{ fontSize: token.fontSizeLG }}>
                The displayed plan price is before applicable tax. Razorpay shows the final tax-inclusive total before payment, and credits apply after payment is verified.
            </Paragraph>

            <Divider style={{ margin: '16px 0' }} />

            {activeSubscription ? <RemainingCreditNote activeSubscription={activeSubscription} /> : null}

            <Flex justify="end" gap={8} style={{ marginTop: 24 }}>
                <Button icon={<LuX />} onClick={onClose}>Cancel</Button>
                <Button type="primary" icon={<LuZap />} onClick={onConfirm}>Confirm {isUpgrade ? "Upgrade" : "Purchase"}</Button>
            </Flex>
        </Modal>
    );
};

export default UpgradeConfirmationModal;
