import Confetti from '@atoms/Confetti';
import { PurchaseIntent } from '@data/common';
import { Button } from '@shadcncomponents/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@shadcncomponents/dialog';
import SectionHeading from '@shadcncomponents/SectionHeading';
import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { LuCheckCircle } from 'react-icons/lu';
import SVGBg from './shared/data/SVGBg';

interface SubscriptionPayementSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseIntent: PurchaseIntent | null;
    paymentDetails: any; // Consider creating a specific type for this
}

const SubscriptionPayementSuccessModal: React.FC<SubscriptionPayementSuccessModalProps> = ({ isOpen, onClose, purchaseIntent, paymentDetails }) => {
    // if (!isOpen || !purchaseIntent) return null;
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setShowConfetti(true), 2000);
        } else {
            setShowConfetti(false);
        }
    }, [isOpen]);

    const handleDashboardRedirect = () => {
        window.open('https://dashboard.menulist.ai', '_blank');
        onClose();
    };

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
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-md w-full" hideCloseButton
                style={{
                    minWidth: '100vw',
                    height: '100%',
                    display: 'flex',
                    // justifyContent: 'center',
                    // alignItems: 'center',
                    flexDirection: 'column',
                    border: 'unset',
                }}
            >
                <DialogHeader className="items-center text-center p-[10%]">
                    <DialogTitle></DialogTitle>
                    <motion.div variants={pathVariants}>
                        <LuCheckCircle className="h-20 w-20 text-green-500 mb-4" />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <SectionHeading
                            text='Welcome Aboard! You’re All Set'
                            highlightedText='You’re All Set'
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <DialogDescription className="mb-5" style={{ textAlign: 'center' }}>
                            → Your payment for the Pro Plan was successful. You&apos;ve just
                            unlocked a powerful suite of tools designed to save you time,
                            eliminate manual work, and make your business look brilliant
                            online. We&apos;re thrilled to have you with us.
                            <br />
                            → You will receive an email confirmation with your invoice details shortly.
                            {/* <br /> */}
                            {/* → If you have any questions about your subscription, please contact our support team. */}
                        </DialogDescription>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-10 w-full mt-5 flex justify-center items-center gap-5 flex-col sm:flex-row">
                        <Button size="lg" className="flex items-center gap-2 z-999 " style={{ zIndex: 999 }} onClick={handleDashboardRedirect}>
                            Go to My Dashboard →
                        </Button>
                    </motion.div>
                </DialogHeader>
                <SVGBg />
                {showConfetti && (<>
                    <Confetti totalHeight={window.innerHeight} totalWidth={window.innerWidth} />
                    <Confetti totalHeight={window.innerHeight} totalWidth={window.innerWidth} />
                </>)}
            </DialogContent>
        </Dialog>
    );
};

export default SubscriptionPayementSuccessModal;
