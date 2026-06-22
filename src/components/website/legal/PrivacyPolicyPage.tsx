'use client';

import { LuCheck, LuDatabase, LuLock, LuShield, LuUserCheck, LuUsers } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const dataCollected = [
    {
        icon: LuUserCheck,
        title: 'Information you provide',
        desc: 'Data you voluntarily give us when you register and use our services.',
        points: [
            'Account information: Name, email address, and business details when you register',
            'Staff account information: Staff name, email or phone number, Staff ID alias, role, store assignment, and account status when a business adds team access',
            'Business content: Menus, price lists, images, and documents you upload',
            'Public media prepared by MenuList removes original image metadata before storage',
            'Payment information: Razorpay handles payment entry and payment method details; MenuList stores payment status and billing references needed for subscriptions',
        ],
    },
    {
        icon: LuDatabase,
        title: 'Generated and processed content',
        desc: 'When you use extraction, description, translation, or image features, MenuList processes the selected content for that product action.',
        points: [
            'Generated descriptions, translations, images, and extracted menu data may be stored with your account or project',
            'Model-backed features send the selected prompt, image, item, or menu content to the configured provider for that request',
            'You should review generated or extracted output before publishing it',
        ],
    },
    {
        icon: LuShield,
        title: 'Automatically collected information',
        desc: 'When you use our services, technical data may be processed for hosting, security, reliability, analytics, and support.',
        points: [
            'Technical request information such as IP address, browser type, and operating system',
            'Device information and product reliability signals',
            'Main MenuList website analytics only after you accept optional analytics',
            'Authentication and security events, including access checks, reset requests, and session revocation metadata',
            'Customer menu analytics are separate from the main website consent gate and do not ask visitors for names, emails, or payment details',
        ],
    },
];

const privacyHighlights = [
    { label: 'Core data only', value: 'MenuList uses account, business, billing, content, security, reliability, and product-operation data.' },
    { label: 'No data resale flow', value: 'The product does not include advertising-sale or data-broker resale flows.' },
    { label: 'Main website analytics with consent', value: 'Google Analytics and Microsoft Clarity load on the MenuList website only after analytics is accepted.' },
    { label: 'Customer menu identity', value: 'Public menu analytics do not ask visitors for names, emails, or payment details. Guest feedback may include details a visitor chooses to submit.' },
    { label: 'Owner requests', value: 'Owners can contact support@menulist.ai for account-data questions or requests.' },
    { label: 'Model-backed features', value: 'Selected inputs are sent to configured AI providers only when a product feature needs that processing.' },
];

const howWeUse = [
    { label: 'Provide services', value: 'Process your content and generate assets' },
    { label: 'Customer support', value: 'Manage your account and assist you' },
    { label: 'Communications', value: 'Send important updates and policy changes' },
    { label: 'Staff access control', value: 'Create staff access, apply roles, reset passcodes, and revoke sessions' },
    { label: 'Improve platform', value: 'Use consented analytics and reliability signals to improve public pages and product quality' },
    { label: 'Security', value: 'Detect and prevent fraud and abuse' },
    { label: 'Legal compliance', value: 'Comply with laws and regulations' },
];

const securityMeasures = [
    {
        icon: LuLock,
        title: 'Application security controls',
        desc: 'MenuList uses application-level checks around account, staff, store, and expensive product actions.',
        points: [
            'Protected API routes use session and role checks',
            'Sensitive staff and AI actions use rate limits and validation',
        ],
    },
    {
        icon: LuShield,
        title: 'Infrastructure security',
        desc: 'The product runs on managed infrastructure and keeps security-relevant application events visible to operators.',
        points: [
            'Security logging for authentication and critical access events',
            'Provider-backed hosting, database, storage, auth, and payment services',
        ],
    },
    {
        icon: LuUserCheck,
        title: 'Access controls',
        desc: 'Owner and staff access is controlled through roles, store assignments, account status, and session checks.',
        points: [
            'Owners can assign staff roles and store access',
            'Owners can reset staff passcodes or sign out staff sessions',
            'MenuList does not store plain-text staff passcodes',
        ],
    },
];

const privacyRights = [
    { label: 'Right to access', value: 'Request a copy of your personal data' },
    { label: 'Right to correction', value: 'Update inaccurate or incomplete data' },
    { label: 'Right to deletion', value: 'Request deletion of your personal data' },
    { label: 'Right to portability', value: 'Request portable data where applicable' },
    { label: 'Right to object', value: 'Object to certain data processing' },
    { label: 'Right to withdraw consent', value: 'Withdraw consent for data processing' },
];

const retentionFacts = [
    { label: 'Account data', value: 'Kept while the account is active or needed to provide support, security, and account recovery.' },
    { label: 'Billing records', value: 'Kept for legally required tax, accounting, and dispute-resolution periods.' },
    { label: 'Product logs and analytics', value: 'Kept only as long as needed for reliability, security, product reporting, and abuse prevention.' },
    { label: 'Support records', value: 'Kept while needed to resolve requests, maintain quality, and preserve an operational record.' },
    { label: 'Public media', value: 'Prepared public media is kept until replaced, unpublished, or deleted through the relevant product flow.' },
    { label: 'Deletion requests', value: 'Eligible data is deleted or anonymized unless account, billing, security, dispute, or legal obligations require retention.' },
];

export default function PrivacyPolicyPage() {
    const lastUpdated = 'June 5, 2026';

    return (
        <div className="ws-page">
            {/* Hero */}
            <section style={{ padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-16)', backgroundColor: 'var(--ws-bg-primary)', textAlign: 'center' }}>
                <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
                    <AnimateOnScroll>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, color: 'var(--ws-brand-secondary)', marginBottom: 'var(--ws-space-4)' }}>
                            Privacy Policy
                        </p>
                        <WebsiteHeadline
                            as="h1"
                            parts={[
                                { text: 'How we handle ' },
                                { text: 'your data.', highlight: true },
                            ]}
                        />
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
                            Your privacy matters. This policy explains what we collect, why, and how we protect it.
                        </p>
                        <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
                            Last updated: {lastUpdated} · Questions? Contact us at{' '}
                            <a href="mailto:support@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}>support@menulist.ai</a>
                        </p>
                    </AnimateOnScroll>
                </div>
            </section>

            {/* Short Version */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Privacy & data use — short version"
                        subtitle="The practical promises behind this policy."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {privacyHighlights.map((fact, i) => (
                        <AnimateStaggerChild key={fact.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: '1 1 0', minWidth: 0 }}>{fact.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flex: '1.4 1 0', minWidth: 0, maxWidth: '300px', overflowWrap: 'anywhere' }}>{fact.value}</span>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </SectionWrapper>

            {/* Information We Collect */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Information we collect"
                        subtitle="What data we gather and how it reaches us."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {dataCollected.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <AnimateStaggerChild key={item.title} index={i}>
                                <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)', height: '100%' }}>
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

            {/* How We Use */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <SectionHeading
                        title="How we use your information"
                        subtitle="The main purposes for account, product, security, support, and reliability data."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {howWeUse.map((fact, i) => (
                        <AnimateStaggerChild key={fact.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: '1 1 0', minWidth: 0 }}>{fact.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flex: '1.4 1 0', minWidth: 0, maxWidth: '260px', overflowWrap: 'anywhere' }}>{fact.value}</span>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </SectionWrapper>

            {/* Data Sharing */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="How we share your information"
                        subtitle="Who may access data for product, payment, hosting, analytics, support, security, or legal reasons."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    <AnimateStaggerChild index={0}>
                        <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                            <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'center' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <LuUserCheck size={22} color="var(--ws-brand-secondary)" />
                                </div>
                                <div style={{ minWidth: 0, textAlign: 'left' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>Service providers</h3>
                                    <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>We share data with trusted vendors who help us operate the platform.</p>
                                </div>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                                {['Payment processing (Razorpay) — payment method details are handled by Razorpay, not MenuList card-entry forms', 'Cloud hosting and infrastructure such as Vercel, Google Cloud, and Firebase', 'Main website analytics (Google Analytics and Microsoft Clarity) — only after analytics consent', 'Configured AI providers such as Google Gemini — when extraction, translation, description, or image features need model processing'].map((p) => (
                                <li key={p} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center' }}>
                                        <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </AnimateStaggerChild>
                    <AnimateStaggerChild index={1}>
                        <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                            <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'center' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <LuShield size={22} color="var(--ws-brand-secondary)" />
                                </div>
                                <div style={{ minWidth: 0, textAlign: 'left' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>Legal requirements</h3>
                                    <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>We may disclose your information when legally required to comply with court orders, subpoenas, or applicable law.</p>
                                </div>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                                {['We do not add product flows for selling personal data', 'Operational providers receive data only for the product, payment, hosting, analytics, support, security, or legal purpose they serve', 'Legal requests are reviewed against the account, business, and data involved'].map((p) => (
                                    <li key={p} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center' }}>
                                        <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </AnimateStaggerChild>
                    <AnimateStaggerChild index={2}>
                        <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                            <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'center' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <LuUsers size={22} color="var(--ws-brand-secondary)" />
                                </div>
                                <div style={{ minWidth: 0, textAlign: 'left' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>Authorized team access</h3>
                                    <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>Owners may give staff access to the business account. Staff can see only the areas their assigned role allows.</p>
                                </div>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                                {['Staff access is controlled by the business owner', 'Role and store assignments limit what staff can access', 'Owners should remove, deactivate, or sign out staff when access is no longer needed'].map((p) => (
                                    <li key={p} style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center' }}>
                                        <LuCheck size={14} color="var(--ws-success)" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </AnimateStaggerChild>
                </div>
            </SectionWrapper>

            {/* Retention */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Data retention"
                        subtitle="We keep personal data only while it has a product, security, support, billing, or legal purpose."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {retentionFacts.map((fact, i) => (
                        <AnimateStaggerChild key={fact.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: '1 1 0', minWidth: 0 }}>{fact.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flex: '1.4 1 0', minWidth: 0, maxWidth: '300px', overflowWrap: 'anywhere' }}>{fact.value}</span>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </SectionWrapper>

            {/* Data Security */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Data security"
                        subtitle="Application controls and provider-backed infrastructure used by the product."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {securityMeasures.map((item, i) => {
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

            {/* Privacy Rights */}
            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <SectionHeading
                        title="Your privacy rights"
                        subtitle="Depending on your location, you may have the following rights under applicable data protection laws."
                    />
                </AnimateOnScroll>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {privacyRights.map((right, i) => (
                        <AnimateStaggerChild key={right.label} index={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: '1 1 0', minWidth: 0 }}>{right.label}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flex: '1.4 1 0', minWidth: 0, maxWidth: '260px', overflowWrap: 'anywhere' }}>{right.value}</span>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
                <AnimateOnScroll>
                    <p style={{ textAlign: 'center', marginTop: 'var(--ws-space-8)', fontSize: '0.9375rem', color: 'var(--ws-text-secondary)' }}>
                        To exercise your rights, contact us at{' '}
                        <a href="mailto:support@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}>support@menulist.ai</a>
                    </p>
                </AnimateOnScroll>
            </SectionWrapper>

            {/* CTA */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
                        <WebsiteHeadline as="h2" text="Questions about your data?" />
                        <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
                            We keep public privacy claims tied to the product behavior we can verify.
                        </p>
                        <div style={{ marginTop: 'var(--ws-space-8)' }}>
                            <WebsiteButton href="/create-menu">Create customer link →</WebsiteButton>
                        </div>
                    </div>
                </AnimateOnScroll>
            </SectionWrapper>
        </div>
    );
}
