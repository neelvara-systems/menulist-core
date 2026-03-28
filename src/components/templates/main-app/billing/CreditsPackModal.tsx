import { AIEnhancementPack } from "@data/common";
import { aiEnhancementPacksList } from "@data/PlatformPlansList";
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Col, Flex, Modal, Row, Typography } from "antd";
import CreditPackCard from "./CreditPackCard";
const { Text } = Typography;

interface CreditsPackModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleCreditsPurchase: (packId: string) => void;
    activeSubscription?: FirestoreSubscriptionDoc;
}

function CreditsPackModal({ isOpen, onClose, handleCreditsPurchase, activeSubscription }: CreditsPackModalProps) {
    const labels = useOfferingLabels();

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={"auto"}
            title={<Flex vertical>
                <Text strong >Get More AI Enhancements</Text>
                <Text type="secondary">{labels.creditsDesc}</Text>
            </Flex>}
            centered
        >
            <Row gutter={[24, 24]} justify="center" style={{ marginTop: '24px' }}>
                {aiEnhancementPacksList.map((pack: AIEnhancementPack) => (
                    <Col xs={24} sm={12} md={8} key={pack.packId}>
                        <CreditPackCard pack={pack} currency={activeSubscription?.currency || "INR"} handleCreditsPurchase={handleCreditsPurchase} />
                    </Col>
                ))}
            </Row>
        </Modal>
    )
}

export default CreditsPackModal