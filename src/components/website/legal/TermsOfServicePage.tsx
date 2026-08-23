'use client';

import { LuCheck, LuFileText, LuGavel, LuGift, LuShield, LuUsers, LuX } from 'react-icons/lu';
import {
    MENULIST_OPERATOR_DISCLOSURE,
    MENULIST_PAYMENT_PROCESSOR_DISCLOSURE,
    MENULIST_TRADE_NAME_QUALIFIER,
} from '@constant/menulist/commercialIdentity';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const whatIsMenuList = [
    { label: 'Product', value: MENULIST_OPERATOR_DISCLOSURE },
    { label: 'Operating identity', value: MENULIST_TRADE_NAME_QUALIFIER },
    { label: 'Upload your content', value: 'Menus, price lists, images, and business documents' },
    { label: 'Structured content', value: 'Automatically extracted and organised menu data' },
    { label: 'Supported outputs', value: 'MenuList QR links, web pages, screens, and fresh downloadable assets from one approved source' },
    { label: 'Your business content', value: 'You retain the rights you hold in content you upload' },
];

const accountCards = [
    {
        icon: LuShield,
        title: 'Account security',
        desc: 'You are responsible for safeguarding owner and staff access and for activities under accounts you create or control.',
        points: [
            'Use a strong, unique password',
            'Share staff login details only with the intended staff member',
            'Notify us immediately of any unauthorized access',
        ],
    },
    {
        icon: LuUsers,
        title: 'Acceptable use',
        desc: 'You agree to use MenuList responsibly and in accordance with all applicable laws.',
        points: [
            'Business catalogs, menus, product images, and descriptions',
            'Restaurant, retail, or service business use',
            'Violation of these policies may result in immediate account suspension',
        ],
    },
    {
        icon: LuGift,
        title: 'Owner referral credits',
        desc: 'Eligible MenuList businesses may invite a business owner they know using the referral link provided inside MenuList.',
        points: [
            'The invitation must be attached before the invited business completes its first successful MenuList subscription payment',
            'The referring business receives 100 credits and the invited business receives 50 credits when both distinct direct MenuList subscription wallets are verified paid',
            'If one subscription is not currently paid, the referral remains pending without a reward deadline and credits are added when both subscriptions are verified paid',
            'There is no referral-count limit or additional publishing, sharing, usage, distribution, or waiting requirement after payment',
            'Plan tier, billing interval, ownership, business category, geography, and supported onboarding or payment source do not change the two-paid-wallet rule',
            'Referral credits have no cash value and are added to the existing non-expiring Pack balance',
            'One referred business can issue one reward pair; credits already issued are not reversed from a consumed or pooled balance',
            'MenuList may pause new invitation generation or investigate payment and account abuse without changing a valid issued reward',
        ],
    },
];

const staffAccessCards = [
    {
        icon: LuUsers,
        title: 'Staff and authorized users',
        desc: 'If you add staff to MenuList, you are responsible for choosing the right role, sharing login details safely, and removing access when it is no longer needed.',
        points: [
            'Assign roles that match what each staff member needs to do',
            'The Owner role grants operational access; assigning it does not transfer the business account, billing records, notification recipients, or existing subscriptions',
            'A business ownership transfer requires verified authority and support review before prior-owner access and account records are changed',
            'Keep staff phone numbers, emails, and store assignments accurate',
            'Reset passcodes, sign out sessions, deactivate, or remove staff when access should end',
        ],
    },
    {
        icon: LuShield,
        title: 'Staff use of business data',
        desc: 'Staff must use MenuList only for the business that gave them access and only within the role assigned by that business.',
        points: [
            'Do not use another business account without permission',
            'Do not share Staff ID, passcode, or account access with others',
            'Do not export, copy, or disclose business or customer data unless the business authorizes it',
        ],
    },
];

const ownershipCards = [
    {
        icon: LuCheck,
        title: 'Your content and permitted outputs',
        desc: 'You retain the rights you already hold in content you upload. MenuList does not claim ownership of that owner content.',
        points: [
            'You must have permission to upload and use your source content',
            'You grant MenuList a limited licence to process it to provide the service',
            'You may use generated outputs subject to applicable law, your input rights, and relevant provider terms',
            'You remain responsible for reviewing output accuracy and rights before publishing',
        ],
    },
    {
        icon: LuFileText,
        title: 'Our platform and IP',
        desc: 'The MenuList software, product design, templates, workflows, branding, and related platform materials remain MenuList intellectual property or licensed materials.',
        points: [
            'Protected by copyright, trademark, and other laws',
            'Generated content disclaimer: review all output for accuracy before use',
            'MenuList is not liable for damages from use of generated content',
        ],
    },
];

const billingFacts = [
    { label: 'Billing cycle', value: 'Monthly or annually — auto-renews unless cancelled' },
    { label: 'Payment handling', value: MENULIST_PAYMENT_PROCESSOR_DISCLOSURE },
    { label: 'Supplier identity', value: 'The verified legal supplier name, registered address, tax details, and document number appear on the applicable MenuList billing document.' },
    { label: 'Cancellation', value: 'Cancel any time from account settings' },
    { label: 'Refund policy', value: 'See our Refund Policy page for details' },
];

const terminationReasons = [
    {
        icon: LuGavel,
        title: 'Termination and suspension',
        desc: 'We may terminate or suspend your account, or specific staff access, immediately, without prior notice, for the following reasons.',
        points: [
            'Breach of these Terms of Service',
            'Non-payment of subscription fees',
            'Violation of acceptable use policies',
            'Fraudulent or illegal activity',
        ],
    },
    {
        icon: LuShield,
        title: 'Disclaimers',
        desc: 'The service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind.',
        points: [
            'We do not warrant uninterrupted, secure, or error-free service',
            'Not liable for indirect, incidental, or consequential damages',
            'Not liable for loss of profits, data, or business opportunities',
        ],
    },
];

export default function TermsOfServicePage() {
    const lastUpdated = 'August 22, 2026';

    return (
        <main className="ws-page">
            {/* Hero */}
            <section style={{ padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-16)', backgroundColor: 'var(--ws-bg-primary)', textAlign: 'center' }}>
                <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
                    <AnimateOnScroll>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--ws-brand-secondary)', marginBottom: 'var(--ws-space-4)' }}>
                            Terms of Service
                        </p>
                        <WebsiteHeadline
                            as="h1"
                            parts={[
                                { text: 'Terms governing your use of ' },
                                { text: 'MenuList.', highlight: true },
                            ]}
                        />
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
                            By accessing or using our services, you agree to be bound by these Terms of Service.
                        </p>
                        <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
                            Last updated: {lastUpdated} · Questions? Contact us at{' '}
                            <a href="mailto:legal@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}>legal@menulist.ai</a>
                        </p>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* What is MenuList */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="What is MenuList?"
                        subtitle="A platform that helps businesses manage their official menu from one place."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {whatIsMenuList.map((fact, i) => (
                        <AnimateStaggerChild key={fact.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: 1 }}>{fact.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flex: '1.4 1 0', minWidth: 0, maxWidth: '280px', overflowWrap: 'anywhere' }}>{fact.value}</span>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </SectionWrapper>

            {/* Account & Responsibilities */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Your account and responsibilities"
                        subtitle="What you agree to when you use MenuList."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {accountCards.map((item, i) => {
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

            {/* Staff Access */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Staff access and permissions"
                        subtitle="How team access works when a business adds staff to MenuList."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {staffAccessCards.map((item, i) => {
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

            {/* Content Ownership */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Content ownership and rights"
                        subtitle="What belongs to you and what belongs to us."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {ownershipCards.map((item, i) => {
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

            {/* Subscriptions & Payments */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Subscriptions and payments"
                        subtitle="How billing works on MenuList."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {billingFacts.map((fact, i) => (
                        <AnimateStaggerChild key={fact.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: 1 }}>{fact.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flex: '1.4 1 0', minWidth: 0, maxWidth: '280px', overflowWrap: 'anywhere' }}>{fact.value}</span>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </SectionWrapper>

            {/* Termination & Disclaimers */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Termination, suspension, and disclaimers"
                        subtitle="When and how accounts may be terminated, and our service disclaimers."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {terminationReasons.map((item, i) => {
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
                                                <LuX size={14} color="var(--ws-error)" style={{ flexShrink: 0 }} />
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

            {/* Governing Law */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
                        <WebsiteHeadline as="h2" text="Governed by Indian law." />
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
                            These Terms shall be governed by and construed in accordance with the laws of India. Any disputes will be subject to the exclusive jurisdiction of courts in India. We reserve the right to modify these Terms at any time.
                        </p>
                        <div style={{ marginTop: 'var(--ws-space-8)' }}>
                            <WebsiteButton href="/create-menu">Create customer link →</WebsiteButton>
                        </div>
                    </div>
                </AnimateOnScroll>
            </SectionWrapper>
        </main>
    );
}
