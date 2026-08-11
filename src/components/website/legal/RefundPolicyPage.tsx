'use client';

import { LuCheck, LuCreditCard, LuFileText, LuRefreshCw, LuShield, LuX } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const policyFacts = [
    { label: 'Subscription fees', value: 'Generally final once a billing cycle starts, subject to applicable law and confirmed billing errors' },
    { label: 'Credit pack purchases', value: 'Generally non-refundable once credits are added or used, subject to applicable law and confirmed billing errors' },
    { label: 'Automatic renewals', value: 'Cancel before renewal to avoid the next charge' },
    { label: 'Cancellation', value: 'Cancel any time from account settings' },
    { label: 'Access after cancellation', value: 'Current paid plan continues until the end of its billing period' },
    { label: 'Data retention', value: 'Handled under the purpose-based retention terms in our Privacy Policy' },
];

const whyNoRefund = [
    {
        icon: LuCreditCard,
        title: 'Irreversible costs',
        desc: 'When you use content generation features (data extraction, image generation, descriptions), we incur non-recoverable costs from third-party providers.',
        points: [
            'Each generated image costs us real money paid to infrastructure providers',
            'Once generated, content cannot be "returned" for a cost reversal',
            'These costs are incurred immediately upon use',
        ],
    },
    {
        icon: LuShield,
        title: 'Immediate value delivery',
        desc: 'When payment is confirmed, the tools, limits, and credits included in the selected plan become available. The value starts as soon as access is granted.',
        points: [
            'Selected-plan access from the moment payment is confirmed',
            'Content generation credits available immediately',
            'Features and limits remain specific to the purchased plan',
        ],
    },
    {
        icon: LuFileText,
        title: 'Fair use and informed decisions',
        desc: 'Our pricing is designed to provide value upfront. We encourage testing with the Starter Plan before committing to larger plans.',
        points: [
            'Start with the low-cost Starter Plan to evaluate',
            'Review all features on the pricing page before subscribing',
            'Contact support with any questions before purchase',
        ],
    },
    {
        icon: LuRefreshCw,
        title: 'Preventing misuse',
        desc: 'This policy protects the platform from misuse — such as generating all necessary assets and then requesting a refund after obtaining value.',
        points: [
            'Protects fair pricing for all users',
            'Ensures sustainable service operation',
            'Allows us to keep prices accessible',
        ],
    },
];

const cancellationCards = [
    {
        icon: LuCheck,
        title: 'What happens when you cancel',
        desc: 'You retain the access and remaining credits included in your current paid plan until the end of its billing period.',
        points: [
            'Account remains active until billing period ends',
            'Current plan features continue through the paid cycle',
            'Your credits remain available',
            'No future charges after cancellation',
        ],
    },
    {
        icon: LuX,
        title: 'After your billing period ends',
        desc: 'Once your billing period expires, your account access changes.',
        points: [
            'Features that require the ended plan become inaccessible',
            'Account and business data follow the purpose-based retention terms in our Privacy Policy',
            'Deletion or anonymization may be limited by billing, security, dispute, or legal obligations',
            'You can choose a new plan later if the account remains available',
        ],
    },
];

export default function RefundPolicyPage() {
    const lastUpdated = 'July 16, 2026';

    return (
        <main className="ws-page">
            {/* Hero */}
            <section style={{ padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-16)', backgroundColor: 'var(--ws-bg-primary)', textAlign: 'center' }}>
                <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
                    <AnimateOnScroll>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--ws-brand-secondary)', marginBottom: 'var(--ws-space-4)' }}>
                            Refund Policy
                        </p>
                        <WebsiteHeadline
                            as="h1"
                            parts={[
                                { text: 'Cancellations and ' },
                                { text: 'refunds.', highlight: true },
                            ]}
                        />
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
                            Clear terms for subscription cancellations, refunds, and billing. Fees are generally final once value is delivered, except where applicable law requires otherwise or MenuList confirms a duplicate or incorrect charge.
                        </p>
                        <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
                            Last updated: {lastUpdated} · Questions? Contact us at{' '}
                            <a href="mailto:billing@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}>billing@menulist.ai</a>
                        </p>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* Policy at a glance */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Policy at a glance"
                        subtitle="The key facts about our refund and cancellation terms — plainly stated."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {policyFacts.map((fact, i) => (
                        <AnimateStaggerChild key={fact.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: 1 }}>{fact.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flex: '1.4 1 0', minWidth: 0, maxWidth: '280px', overflowWrap: 'anywhere' }}>{fact.value}</span>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </SectionWrapper>

            {/* Why No Refund */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Why we have a no-refund policy"
                        subtitle="Four reasons our fees are final once a billing cycle begins."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {whyNoRefund.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <AnimateStaggerChild key={item.title} index={i}>
                                <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'center' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={22} color="var(--ws-brand-secondary)" />
                                        </div>
                                        <div style={{ minWidth: 0, textAlign: 'left' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>{item.title}</h3>
                                            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                                        {item.points.map((point) => (
                                            <li key={point} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center' }}>
                                                <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </AnimateStaggerChild>
                        );
                    })}
                </div>
            </SectionWrapper>

            {/* Subscription Management */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Subscription management"
                        subtitle="How cancellation works and what to expect."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {cancellationCards.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <AnimateStaggerChild key={item.title} index={i}>
                                <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'center' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={22} color="var(--ws-brand-secondary)" />
                                        </div>
                                        <div style={{ minWidth: 0, textAlign: 'left' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>{item.title}</h3>
                                            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                                        {item.points.map((point) => (
                                            <li key={point} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center' }}>
                                                <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </AnimateStaggerChild>
                        );
                    })}
                </div>
            </SectionWrapper>

            {/* Billing Questions CTA */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
                        <WebsiteHeadline as="h2" text="Questions about billing?" />
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
                            Our support team can clarify billing, subscriptions, or this policy. Report a duplicate, incorrect, or unrecognized charge promptly so we can review the billing record.
                        </p>
                        <p style={{ marginTop: 'var(--ws-space-4)', fontSize: '0.9375rem', color: 'var(--ws-text-secondary)' }}>
                            Reach us at{' '}
                            <a href="mailto:billing@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}>
                                billing@menulist.ai
                            </a>
                        </p>
                        <div style={{ marginTop: 'var(--ws-space-8)' }}>
                            <WebsiteButton href="/pricing">View pricing plans</WebsiteButton>
                        </div>
                    </div>
                </AnimateOnScroll>
            </SectionWrapper>
        </main>
    );
}
