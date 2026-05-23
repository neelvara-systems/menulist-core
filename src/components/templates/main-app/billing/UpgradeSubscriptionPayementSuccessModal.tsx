import Confetti from '@atoms/Confetti';
import SectionHeading from '@shadcncomponents/SectionHeading';
import { Button, Card, Modal, theme } from 'antd';
import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { LuCheckCircle } from 'react-icons/lu';

interface UpgradeSubscriptionPayementSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentDetails: any; // Consider creating a specific type for this
}

const UpgradeSubscriptionPayementSuccessModal: React.FC<UpgradeSubscriptionPayementSuccessModalProps> = ({ isOpen, onClose, paymentDetails }) => {
    const { token } = theme.useToken();
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                setShowConfetti(true)
            }, 2000);
        }
    }, [isOpen]);

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const pathVariants = {
        hidden: {
            pathLength: 0,
            opacity: 0,
        },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
                duration: 0.8, // Controls the speed of the drawing
                ease: "easeInOut",
            },
        },
    };

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            centered
            width={600}
            style={{ padding: 0 }}
            styles={{
                body: {
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    textAlign: 'center',
                }
            }}
        >
            <Card
                style={{
                    background: `linear-gradient(135deg, ${token.colorInfoBg} 0%, ${token.colorBgContainer} 100%)`,
                    borderRadius: '16px',
                }}
            >
                <motion.div variants={pathVariants} initial="hidden" animate="visible">
                    <LuCheckCircle style={{
                        height: '5rem',
                        width: '5rem',
                        color: token.colorSuccess,
                        marginBottom: '1rem',
                    }} />
                </motion.div>

                <motion.div variants={itemVariants} initial="hidden" animate="visible">
                    <SectionHeading
                        text="Your subscription has been upgraded! You’re All Set"
                        highlightedText="You’re All Set"
                    />
                </motion.div>

                <motion.div variants={itemVariants} initial="hidden" animate="visible">
                    <p style={{ marginBottom: '20px' }}>
                        → Your payment for the <strong>{paymentDetails?.planName}</strong> Plan was successful.
                        You&apos;ve just unlocked a powerful suite of tools designed to save
                        you time, eliminate manual work, and make your business look brilliant
                        online. We&apos;re thrilled to have you with us.
                        <br />
                        → You will receive an email confirmation with your invoice details
                        shortly.
                    </p>
                    <Button type="primary" onClick={onClose} block>{'Continue'}</Button>
                </motion.div>
            </Card>

            {/* <SVGBg /> */}

            {showConfetti && (
                <>
                    <Confetti totalHeight={600} totalWidth={600} />
                    <Confetti totalHeight={600} totalWidth={600} />
                </>
            )}
        </Modal>
    );
};

export default UpgradeSubscriptionPayementSuccessModal;
