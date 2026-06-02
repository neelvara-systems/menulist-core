
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
import { LuBuilding2, LuCheck, LuInfo, LuStore, LuZap } from 'react-icons/lu';
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

const PLAN_TIER_ORDER: Record<string, number> = { starter: 1, pro: 2, premium: 3, custom: 4 };

const PlanCardComponent = ({
    action,
    plan,
    currency,
    onPurchase,
    currentPlanId,
    planTierOrder = PLAN_TIER_ORDER,
    renderFeatureItems,
}: {
    action: "upgrade" | "new";
    plan: Plan,
    currency: Currency,
    onPurchase: (plan: Plan) => void,
    currentPlanId?: string,
    planTierOrder?: Record<string, number>,
    renderFeatureItems?: (plan: Plan, currency: Currency) => any,
}) => {
    const { token } = theme.useToken();
    const style = plan.planId === 'starter'
        ? {
            color: token.colorSuccess,
            badgeColor: token.colorSuccess,
            buttonStyles: {
                background: token.colorSuccess,
                borderColor: token.colorSuccess,
                color: token.colorTextLightSolid,
            },
            icon: <LuZap size={20} color={token.colorSuccessText} />,
        }
        : plan.planId === 'pro'
            ? {
                color: token.colorWarning,
                badgeColor: token.colorWarning,
                buttonStyles: {
                    background: token.colorWarning,
                    borderColor: token.colorWarning,
                    color: token.colorTextLightSolid,
                },
                icon: <LuBuilding2 size={20} color={token.colorWarningText} />,
            }
            : plan.planId === 'premium'
                ? {
                    color: token.colorInfo,
                    badgeColor: token.colorInfo,
                    buttonStyles: {
                        background: token.colorInfo,
                        borderColor: token.colorInfo,
                        color: token.colorTextLightSolid,
                    },
                    icon: <LuStore size={20} color={token.colorInfoText} />,
                }
                : {
                    color: token.colorText,
                    badgeColor: token.colorTextSecondary,
                    buttonStyles: {
                        background: 'transparent',
                        borderColor: token.colorBorder,
                        color: token.colorText,
                    },
                    icon: <LuZap size={20} color={token.colorText} />,
                };
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

                    {renderFeatureItems ? renderFeatureItems(plan, currency) : plan.planId !== 'custom' && (
                        <List.Item style={ListItemStyle}>
                            <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
                            <Text>Unlimited Core Content Tools</Text>
                            <Tooltip title="Includes unlimited data extraction, description generation, and language translation.">
                                <LuInfo style={{ marginLeft: 8, color: token.colorInfoActive, cursor: 'pointer' }} />
                            </Tooltip>
                        </List.Item>
                    )}
                    {!renderFeatureItems && plan.planId !== 'custom' && (
                        <List.Item style={ListItemStyle}>
                            <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
                            <Text>{monthlyCreditAllowance} Monthly Credits</Text>
                            <Tooltip title={`Includes ${monthlyCreditAllowance} monthly credits.`}>
                                <LuInfo style={{ marginLeft: 8, color: token.colorInfoActive, cursor: 'pointer' }} />
                            </Tooltip>
                        </List.Item>
                    )}

                    {!renderFeatureItems && allPlatformFeatures.map((feature: Feature) => {
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
                                <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
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
                    icon={<LuZap />}
                >
                    {plan.planId === 'custom' ? 'Contact Us'
                        : action === 'upgrade'
                            ? (currentPlanId && (planTierOrder[plan.planId] || 0) < (planTierOrder[currentPlanId] || 0) ? 'Change Plan' : 'Upgrade')
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
    activeSubscription?: FirestoreSubscriptionDoc | null;
    plansOverride?: Plan[];
    currencyOverride?: Currency;
    modalTitle?: string;
    planTierOrder?: Record<string, number>;
    renderFeatureItems?: (plan: Plan, currency: Currency) => any;
    yearlyBadgeText?: string;
}

function PricingPlansModal({
    action,
    isOpen,
    onClose,
    activeSubscription,
    handleConfirmUpgrade,
    plansOverride,
    currencyOverride,
    modalTitle,
    planTierOrder,
    renderFeatureItems,
    yearlyBadgeText = 'Save up to 20%',
}: PricingPlansModalProps) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [billingInterval, setBillingInterval] = useState<'MONTH' | 'YEAR'>('YEAR');
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const [currency, setCurrency] = useState<Currency>(currencyOverride || (storeDetails?.currencyCode as Currency));
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState({ active: false, plan: null as Plan | null });
    const { token } = theme.useToken();

    useEffect(() => {
        let allPlans = plansOverride || getB2CPlansList();
        if (isOpen && activeSubscription) {
            if (action === "upgrade") {
                // Show all plans except the user's current plan (supports both upgrade AND downgrade)
                allPlans = allPlans.filter(plan => plan.planId !== activeSubscription.planId);
            }
        }
        setPlans(allPlans);

        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!currencyOverride && (userTimeZone === 'Asia/Kolkata' || userTimeZone === 'Asia/Calcutta')) {
            setCurrency('INR');
        }
    }, [isOpen, activeSubscription, plansOverride, currencyOverride]);

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
                        {modalTitle || (action === "upgrade" ? "Upgrade Your Plan" : "Choose Your New Plan")}
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
                                    color: billingInterval === 'YEAR' ? token.colorSuccess : token.colorTextSecondary,
                                    backgroundColor: billingInterval === 'YEAR' ? `${token.colorSuccess}20` : token.colorFillSecondary,
                                    borderColor: billingInterval === 'YEAR' ? token.colorSuccess : token.colorBorder,
                                }} count={yearlyBadgeText} />
                            </Flex>
                        </Flex>
                    </Col>
                </Row>
                <Row gutter={[24, 24]} justify="center">
                    {filteredPlans.map(plan => (
                        <Col xs={24} sm={24} md={12} lg={8} key={plan.name} style={{ maxWidth: "max-content" }}>
                            <PlanCardComponent
                                action={action}
                                plan={plan}
                                currency={currency}
                                onPurchase={onClickUpgrade}
                                currentPlanId={activeSubscription?.planId}
                                planTierOrder={planTierOrder}
                                renderFeatureItems={renderFeatureItems}
                            />
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
