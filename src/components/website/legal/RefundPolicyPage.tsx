'use client';

import { LuCheck, LuCreditCard, LuFileText, LuRefreshCw, LuShield, LuX } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const policyFacts = [
    { label: 'Subscription fees', value: 'Final and non-refundable once billing cycle starts' },
    { label: 'Credit pack purchases', value: 'Non-refundable once added to your account' },
    { label: 'Automatic renewals', value: 'Non-refundable — cancel before renewal date' },
    { label: 'Cancellation', value: 'Cancel any time from account settings' },
    { label: 'Access after cancellation', value: 'Continues until end of current billing period' },
    { label: 'Data retention', value: 'Preserved for 30 days after subscription expires' },
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
        desc: 'Upon subscribing, you receive immediate access to the complete platform — tools, templates, and resources. The value is delivered instantly.',
        points: [
            'Full platform access from the moment of subscription',
            'Content generation credits available immediately',
            'All features unlocked without delay',
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
        desc: 'You retain full access to all features and credits until the end of your current billing period.',
        points: [
            'Account remains active until billing period ends',
            'All features continue to work normally',
            'Your credits remain available',
            'No future charges after cancellation',
        ],
    },
    {
        icon: LuX,
        title: 'After your billing period ends',
        desc: 'Once your billing period expires, your account access changes.',
        points: [
            'Platform features become inaccessible',
            'Data preserved for 30 days',
            'After 30 days, data may be permanently deleted',
            'You can resubscribe at any time to restore access',
        ],
    },
];

export default function RefundPolicyPage() {
    const lastUpdated = 'November 5, 2025';

    return (
        <div className="ws-page">
            {/* Hero */}
            <section style={{ padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-16)', backgroundColor: 'var(--ws-bg-primary)', textAlign: 'center' }}>
                <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
                    <AnimateOnScroll>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ws-brand-secondary)', marginBottom: 'var(--ws-space-4)' }}>
                            Refund Policy
                        </p>
                        <h1 className="ws-h1">
                            Cancellations and{' '}
                            <span className="ws-highlight">refunds.</span>
                        </h1>
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
                            Clear terms for subscription cancellations, refunds, and billing. All fees are final and non-refundable.
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {policyFacts.map((fact, i) => (
                        <AnimateStaggerChild key={fact.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: 1 }}>{fact.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flexShrink: 0, maxWidth: '280px' }}>{fact.value}</span>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {whyNoRefund.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <AnimateStaggerChild key={item.title} index={i}>
                                <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={22} color="var(--ws-brand-secondary)" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{item.title}</h3>
                                            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                                        {item.points.map((point) => (
                                            <li key={point} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'flex-start' }}>
                                                <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0, marginTop: '3px' }} />
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {cancellationCards.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <AnimateStaggerChild key={item.title} index={i}>
                                <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={22} color="var(--ws-brand-secondary)" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{item.title}</h3>
                                            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                                        {item.points.map((point) => (
                                            <li key={point} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'flex-start' }}>
                                                <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0, marginTop: '3px' }} />
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
                        <h2 className="ws-h2">Questions about billing?</h2>
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
                            Our support team is here to help clarify any questions about billing, subscriptions, or this policy.
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
        </div>
    );
}
