
import { Currency, Feature, Plan } from '@data/common';
import PlatformFeaturesList, {
    CustomPlanFeaturesList,
    PremiumPlanFeaturesList,
    ProPlanFeaturesList,
    StarterPlanFeaturesList
} from '@data/PlatformFeaturesList';
import { getB2CPlansList } from '@data/PlatformPlansList';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { Badge, Button, Card, Col, Flex, List, Modal, Row, Switch, theme, Tooltip, Typography } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { FaBolt } from 'react-icons/fa';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import { LuCheck, LuInfo, LuStore, LuZap } from 'react-icons/lu';
import RemainingCreditNote from './RemainingCreditNote';
import UpgradeConfirmationModal from './UpgradeConfirmationModal';

const { Title, Text, Paragraph } = Typography;

// Helper to format currency
const formatCurrency = (price: number, currency: Currency) => {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price / 100); // Assuming price is in cents
};

const getPlanfeaturesLable = (plan: Plan) => {
    let label = "";
    if (plan.planId === "pro") {
        label = "Everything in Starter, plus:";
    } else if (plan.planId === "premium") {
        label = "Everything in Pro, plus:";
    }
    return label;
}

const planStyles: any = {
    starter: {
        icon: <LuStore style={{ fontSize: 32, color: '#722ED1' }} />,
        color: '#722ED1',
        buttonStyles: {
            borderColor: 'rgb(126, 34, 206, 0.3)',
            backgroundImage: 'linear-gradient(to bottom, rgba(168, 85, 247, 0.1), transparent)',
        },
    },
    pro: {
        icon: <HiOutlineOfficeBuilding style={{ fontSize: 32, color: '#52C41A' }} />,
        color: '#52C41A',
        buttonStyles: {
            borderColor: 'rgb(82, 196, 26, 0.3)',
            backgroundImage: 'linear-gradient(to bottom, rgba(82, 196, 26, 0.1), transparent)',
        },
    },
    premium: {
        icon: <LuZap style={{ fontSize: 32, color: '#FAAD14' }} />,
        color: '#FAAD14',
        buttonStyles: {
            borderColor: 'rgb(250, 173, 20, 0.3)',
            backgroundImage: 'linear-gradient(to bottom, rgba(250, 173, 20, 0.1), transparent)',
        },
    },
    custom: {
        icon: <LuZap style={{ fontSize: 32, color: '#1890FF' }} />,
        color: '#1890FF',
        buttonStyles: {
            borderColor: 'rgb(24, 144, 255, 0.3)',
            backgroundImage: 'linear-gradient(to bottom, rgba(24, 144, 255, 0.1), transparent)',
        },
    },
};

const PLAN_TIER_ORDER: Record<string, number> = { starter: 1, pro: 2, premium: 3, custom: 4 };

const PlanCardComponent = ({ action, plan, currency, onPurchase, currentPlanId }: { action: "upgrade" | "new"; plan: Plan, currency: Currency, onPurchase: (plan: Plan) => void, currentPlanId?: string }) => {
    const { token } = theme.useToken();
    const style = planStyles[plan.planId as keyof typeof planStyles];
    const price = plan[`price${currency}`].price;
    const monthlyCreditAllowance = plan[`price${currency}`].monthlyCredits || "Custom";
    const allPlatformFeatures = PlatformFeaturesList.B2C;

    const featuresListIds = plan.planId === 'starter' ?
        StarterPlanFeaturesList : plan.planId === 'pro' ?
            ProPlanFeaturesList : plan.planId === 'premium' ?
                PremiumPlanFeaturesList : CustomPlanFeaturesList;

    const ListItemStyle = { borderBlockEnd: 'none', padding: '6px 0', justifyContent: "flex-start", gap: 8 }

    const cardContent = (
        <Card
            hoverable
            style={{ minWidth: "max-content", borderColor: style.buttonStyles.borderColor, height: '100%', display: 'flex', flexDirection: 'column', borderWidth: plan.isRecommended ? 2 : 1 }}
            styles={{
                body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', width: '100%' }
            }}
        >
            <div style={{ textAlign: 'center' }}>
                <Row justify="center" align="middle" gutter={16}>
                    <Col>{style.icon}</Col>
                    <Col>
                        <Title level={4} style={{ marginBottom: 0 }}>{plan.name.replace(` (Yearly)`, '').replace(` (Monthly)`, '')}</Title>
                    </Col>
                </Row>

                <div style={{ margin: '16px 0' }}>
                    {plan.planId !== 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                            <Title level={2} style={{ margin: 0 }}>{price !== null ? formatCurrency(price, currency) : 'N/A'}</Title>
                            <Text type="secondary">/ {plan.billingInterval === 'MONTH' ? 'mo' : 'yr'}</Text>
                        </div>
                    )}
                    <Paragraph type="secondary" style={{ marginTop: 8 }}>{plan.description}</Paragraph>
                </div>
            </div>


            <div style={{ flexGrow: 1 }}>
                <List size="small" style={{ padding: '0 16px' }}>
                    {getPlanfeaturesLable(plan) && (
                        <List.Item style={ListItemStyle}>
                            <Text strong>{getPlanfeaturesLable(plan)}</Text>
                        </List.Item>
                    )}

                    {plan.planId !== 'custom' && (
                        <List.Item style={ListItemStyle}>
                            <LuCheck style={{ color: '#52C41A', marginRight: 8 }} />
                            <Text>Unlimited Core Content Tools</Text>
                            <Tooltip title="Includes unlimited data extraction, description generation, and language translation.">
                                <LuInfo style={{ marginLeft: 8, color: token.colorInfoActive, cursor: 'pointer' }} />
                            </Tooltip>
                        </List.Item>
                    )}
                    {plan.planId !== 'custom' && (
                        <List.Item style={ListItemStyle}>
                            <LuCheck style={{ color: '#52C41A', marginRight: 8 }} />
                            <Text>{monthlyCreditAllowance} Monthly Credits</Text>
                            <Tooltip title={`Includes ${monthlyCreditAllowance} monthly credits.`}>
                                <LuInfo style={{ marginLeft: 8, color: token.colorInfoActive, cursor: 'pointer' }} />
                            </Tooltip>
                        </List.Item>
                    )}

                    {allPlatformFeatures.map((feature: Feature) => {
                        if (!featuresListIds.includes(feature.id) || (!feature.values[plan.planId] && plan.planId !== 'custom')) return null;

                        const featureValue = feature.values[plan.planId];
                        let featureText = feature.valueLabel.replace('{value}', String(featureValue)).replace('{name}', feature.name);

                        if (typeof featureValue === 'boolean') {
                            if (featureValue) {
                                featureText = feature.name;
                            } else {
                                return null;
                            }
                        }

                        return (
                            <List.Item key={feature.id} style={ListItemStyle}>
                                <LuCheck style={{ color: '#52C41A', marginRight: 8 }} />
                                <Text>{featureText}</Text>
                            </List.Item>
                        );
                    })}
                </List>
            </div>

            <div style={{ marginTop: '24px' }}>
                <Button
                    shape='round'
                    size="large"
                    type={plan.isRecommended ? 'primary' : 'default'}
                    block
                    ghost={plan.isRecommended}
                    onClick={() => onPurchase(plan)}
                    style={{ ...style.buttonStyles, color: style.color }}
                    icon={<FaBolt />}
                >
                    {plan.planId === 'custom' ? 'Contact Us'
                        : action === 'upgrade'
                            ? (currentPlanId && (PLAN_TIER_ORDER[plan.planId] || 0) < (PLAN_TIER_ORDER[currentPlanId] || 0) ? 'Change Plan' : 'Upgrade')
                            : 'Get Started'}
                </Button>
            </div>
        </Card>
    );

    if (plan.isRecommended) {
        return <Badge.Ribbon text="Most Popular" color={style.color}>{cardContent}</Badge.Ribbon>;
    }

    return cardContent;
};

interface PricingPlansModalProps {
    action: "upgrade" | "new";
    handleConfirmUpgrade: (plan: Plan, currency: Currency) => void;
    isOpen: boolean;
    onClose: () => void;
    activeSubscription: FirestoreSubscriptionDoc;
}

function PricingPlansModal({ action, isOpen, onClose, activeSubscription, handleConfirmUpgrade }: PricingPlansModalProps) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [billingInterval, setBillingInterval] = useState<'MONTH' | 'YEAR'>('YEAR');
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const [currency, setCurrency] = useState<Currency>(storeDetails?.currencyCode as Currency);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState({ active: false, plan: null as Plan | null });
    const { token } = theme.useToken();

    useEffect(() => {
        let allPlans = getB2CPlansList();
        if (isOpen && activeSubscription) {
            if (action === "upgrade") {
                // Show all plans except the user's current plan (supports both upgrade AND downgrade)
                allPlans = allPlans.filter(plan => plan.planId !== activeSubscription.planId);
            }
        }
        setPlans(allPlans);

        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (userTimeZone === 'Asia/Kolkata' || userTimeZone === 'Asia/Calcutta') {
            setCurrency('INR');
        }
    }, [isOpen, activeSubscription]);

    if (!isOpen) return null;

    const onClickUpgrade = (plan: Plan) => {
        setIsUpgradeModalOpen({ active: true, plan });
    };

    const filteredPlans = plans.filter(p => p.billingInterval === billingInterval);

    return (
        <Modal
            title={<>
                <Flex vertical gap={4} align="flex-start" justify="flex-start">
                    <Text strong style={{ fontSize: token.fontSizeHeading4 }}>
                        {action === "upgrade" ? "Upgrade Your Plan" : "Choose Your New Plan"}
                    </Text>
                    {Boolean(activeSubscription) && <RemainingCreditNote activeSubscription={activeSubscription} />}
                </Flex>
            </>}
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={"auto"}
            centered
        >
            <div style={{ padding: '24px' }}>
                <Row justify="center" style={{ marginBottom: 24 }}>
                    <Col>
                        <Flex justify='center' align='center' gap={8}>
                            <Switch
                                className='pricing-switch'
                                style={{ margin: '0 8px' }}
                                checked={billingInterval === 'YEAR'}
                                onChange={(checked) => setBillingInterval(checked ? 'YEAR' : 'MONTH')}
                            />
                            <Flex align='center' gap={8}>
                                <Text>Yearly</Text>
                                <Badge style={{
                                    color: billingInterval === 'YEAR' ? 'green' : 'gray',
                                    backgroundColor: billingInterval === 'YEAR' ? 'rgba(0, 128, 0, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                    borderColor: billingInterval === 'YEAR' ? 'green' : 'gray',
                                }} count="Save up to 20%" />
                            </Flex>
                        </Flex>
                    </Col>
                </Row>
                <Row gutter={[24, 24]} justify="center">
                    {filteredPlans.map(plan => (
                        <Col xs={24} sm={24} md={12} lg={8} key={plan.name} style={{ maxWidth: "max-content" }}>
                            <PlanCardComponent action={action} plan={plan} currency={currency} onPurchase={onClickUpgrade} currentPlanId={activeSubscription?.planId} />
                        </Col>
                    ))}
                </Row>
            </div>
            <UpgradeConfirmationModal
                isOpen={isUpgradeModalOpen.active}
                onClose={() => setIsUpgradeModalOpen({ active: false, plan: null })}
                onConfirm={() => {
                    handleConfirmUpgrade(isUpgradeModalOpen.plan, currency);
                    setIsUpgradeModalOpen({ active: false, plan: null });
                }}
                newPlan={isUpgradeModalOpen.plan}
                activeSubscription={activeSubscription}
                currency={currency}
            />
        </Modal>
    );
}

export default PricingPlansModal;
