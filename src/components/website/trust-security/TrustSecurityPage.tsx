'use client';

import { LuCheck, LuDatabase, LuGlobe, LuKey, LuLock, LuServer, LuShield, LuUserCheck } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const trustPillars = [
  {
    icon: LuLock,
    title: 'Your data, your ownership',
    desc: 'Your menu, your business information, and your customer-facing content belong to you. MenuList does not sell, share, or monetise your business data.',
    points: [
      'You can export your data at any time',
      'Deleting your account removes your data from our systems',
      'We do not sell data to third parties — ever',
    ],
  },
  {
    icon: LuDatabase,
    title: 'Isolated by design',
    desc: 'Every business on MenuList operates in a completely isolated environment. Your data is logically separated from every other business on the platform — at the database level.',
    points: [
      'Tenant ID and Store ID enforced on every database query',
      'No shared data between businesses',
      'Firestore security rules prevent cross-account access',
    ],
  },
  {
    icon: LuKey,
    title: 'Authentication without passwords',
    desc: 'MenuList uses industry-standard OAuth via Google Sign-In. We never store passwords — there are no passwords to breach.',
    points: [
      'Powered by NextAuth.js — industry standard',
      'Google OAuth — the same login billions of people trust daily',
      'Session tokens expire automatically',
    ],
  },
  {
    icon: LuGlobe,
    title: 'HTTPS everywhere',
    desc: 'Every connection to MenuList — your dashboard, your public menu pages, your official page — is encrypted in transit.',
    points: [
      'TLS/SSL on all endpoints',
      'Customer-facing menu pages served over HTTPS',
      'No unencrypted data in transit',
    ],
  },
  {
    icon: LuServer,
    title: 'Built on Google Cloud',
    desc: 'MenuList runs on Firebase and Google Cloud infrastructure — the same foundation trusted by millions of production applications worldwide.',
    points: [
      'Firebase Firestore for real-time, secure data storage',
      'Google Cloud infrastructure with 99.95% SLA',
      'Automated backups handled by Google infrastructure',
    ],
  },
  {
    icon: LuShield,
    title: 'Webhook security',
    desc: 'If you use integrations like POS Webhook Sync, every request is signed with HMAC-SHA256. Your endpoint can verify the request is genuinely from MenuList.',
    points: [
      'HMAC-SHA256 signatures on all outbound webhooks',
      'Secret keys stored securely, never exposed in UI',
      'Replay attack prevention built in',
    ],
  },
  {
    icon: LuUserCheck,
    title: 'Privacy-conscious analytics',
    desc: 'MenuList keeps menu and official-page activity visible without turning customers into profiles. The system records business signals, not personal identity.',
    points: [
      'No customer names, emails, payment details, scroll heatmaps, hover tracking, or per-keystroke tracking',
      'Menu sessions, category interest, searches, unavailable-item attention, source quality, and final actions remain visible',
      'Approximate location is optional and never stored as exact GPS coordinates in this analytics flow',
    ],
  },
  {
    icon: LuCheck,
    title: 'Menu data integrity',
    desc: 'Every menu save goes through automatic validation. Incomplete data, missing prices, or broken items are caught before they can reach your customers.',
    points: [
      'Client-side validation on every save',
      'Menu Correctness Engine runs automatically',
      'Published surfaces always reflect validated data',
    ],
  },
];

const securityFacts = [
  { label: 'Password breaches possible', value: 'Zero — we store no passwords' },
  { label: 'Data sold to third parties', value: 'Never' },
  { label: 'Cross-account data access', value: 'Impossible by design' },
  { label: 'Customer identities in analytics', value: 'Not collected' },
  { label: 'Infrastructure provider', value: 'Google Cloud / Firebase' },
  { label: 'Transit encryption', value: 'TLS/HTTPS everywhere' },
  { label: 'Webhook verification', value: 'HMAC-SHA256 signed' },
];

export default function TrustSecurityPage() {
  return (
    <div className="ws-page">
      {/* Hero */}
      <section style={{ padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-16)', backgroundColor: 'var(--ws-bg-primary)', textAlign: 'center' }}>
        <div className="ws-container" style={{ maxWidth: 'var(--ws-max-w-text)' }}>
          <AnimateOnScroll>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ws-brand-secondary)', marginBottom: 'var(--ws-space-4)' }}>
              Trust & Security
            </p>
            <h1 className="ws-h1">
              Your business data is{' '}
              <span className="ws-highlight">safe here.</span>
            </h1>
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
              We have built MenuList from the ground up with security and data integrity as non-negotiable foundations — not features. Here is exactly how we protect your business.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* At-a-glance facts */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <SectionHeading
            title="Security at a glance"
            subtitle="For technical owners and their teams — the facts, plainly stated."
          />
        </AnimateOnScroll>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-10)', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
          {securityFacts.map((fact, i) => (
            <AnimateStaggerChild key={fact.label} index={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--ws-space-4) var(--ws-space-5)', backgroundColor: 'var(--ws-bg-primary)', borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-default)', gap: 'var(--ws-space-4)' }}>
                <span style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', flex: 1 }}>{fact.label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', textAlign: 'right', flexShrink: 0, maxWidth: '180px' }}>{fact.value}</span>
              </div>
            </AnimateStaggerChild>
          ))}
        </div>
      </SectionWrapper>

      {/* Trust Pillars */}
      <SectionWrapper variant="default">
        <AnimateOnScroll>
          <SectionHeading
            title="How we protect your business"
            subtitle="Eight layers of security and data integrity built into the platform."
          />
        </AnimateOnScroll>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--ws-space-6)', marginTop: 'var(--ws-space-12)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto' }}>
          {trustPillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <AnimateStaggerChild key={pillar.title} index={i}>
                <div className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
                  <div style={{ display: 'flex', gap: 'var(--ws-space-4)', alignItems: 'flex-start' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--ws-radius-md)', backgroundColor: 'var(--ws-bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={22} color="var(--ws-brand-secondary)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{pillar.title}</h3>
                      <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{pillar.desc}</p>
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-2)', borderTop: '1px solid var(--ws-border-subtle)', paddingTop: 'var(--ws-space-3)' }}>
                    {pillar.points.map((point) => (
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

      {/* Responsible disclosure */}
      <SectionWrapper variant="subtle">
        <AnimateOnScroll>
          <div style={{ maxWidth: 'var(--ws-max-w-text)', margin: '0 auto', textAlign: 'center' }}>
            <h2 className="ws-h2">Found a security issue?</h2>
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
              We take security reports seriously. If you discover a vulnerability, please contact us directly before public disclosure so we can address it promptly.
            </p>
            <p style={{ marginTop: 'var(--ws-space-4)', fontSize: '0.9375rem', color: 'var(--ws-text-secondary)' }}>
              Reach us at{' '}
              <a href="mailto:security@menulist.ai" style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}>
                security@menulist.ai
              </a>
            </p>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper variant="default">
        <AnimateOnScroll>
          <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-text)', margin: '0 auto' }}>
            <h2 className="ws-h2">Built to be trusted.</h2>
            <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
              Security is not a feature we added — it is the foundation we built on.
            </p>
            <div style={{ marginTop: 'var(--ws-space-8)' }}>
              <WebsiteButton href="/get-started">Create your MenuList →</WebsiteButton>
            </div>
          </div>
        </AnimateOnScroll>
      </SectionWrapper>
    </div>
  );
}
