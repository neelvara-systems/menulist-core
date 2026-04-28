'use client';

import { LuCircleOff, LuMapPin, LuPhoneCall, LuSearch, LuShieldCheck } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const analyticsSignals = [
  {
    icon: LuSearch,
    title: 'Search demand',
    desc: 'See what customers search for, including no-result searches, so you can rename dishes, add aliases, or publish what people are already asking for.',
  },
  {
    icon: LuCircleOff,
    title: 'Unavailable demand',
    desc: 'See which unavailable items still get tapped so you know what demand is being blocked and what should come back first.',
  },
  {
    icon: LuPhoneCall,
    title: 'Final action intent',
    desc: 'Measure the actions that matter: call, WhatsApp, directions, reserve, and order. Owners can see how customers prefer to move next.',
  },
  {
    icon: LuMapPin,
    title: 'Approximate location and timing',
    desc: 'Understand where interest comes from and when it happens without relying on exact GPS or heavy passive tracking.',
  },
];

const ownerDecisions = [
  'Which items need clearer naming or better placement',
  'Which missing items people are actively trying to find',
  'Which unavailable dishes are costing you demand',
  'Which customer action matters most for your business',
];

const transparencyPoints = [
  'Category-based owner controls instead of confusing event-level switches',
  'Clear disclosure of what is tracked by default',
  'No customer names, emails, payment details, or exact GPS in this analytics flow',
  'Cost-safe measurement focused on useful business signals, not noisy scroll tracking',
];

export default function AnalyticsInsightsSection() {
  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title="See what customers wanted, not just how many opened the menu"
          subtitle="MenuList gives owners decision-ready analytics: what customers searched for, what they could not find, which unavailable items still attract interest, and which final action they chose next."
        />
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--ws-space-4)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '1080px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {analyticsSignals.map((signal, index) => {
          const Icon = signal.icon;
          return (
            <AnimateStaggerChild key={signal.title} index={index}>
              <div
                className="ws-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--ws-space-4)',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--ws-radius-md)',
                    backgroundColor: 'var(--ws-bg-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} color="var(--ws-brand-secondary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{signal.title}</h3>
                  <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>{signal.desc}</p>
                </div>
              </div>
            </AnimateStaggerChild>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--ws-space-5)',
          marginTop: 'var(--ws-space-10)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <AnimateStaggerChild index={analyticsSignals.length}>
          <div
            style={{
              padding: 'var(--ws-space-6)',
              borderRadius: 'var(--ws-radius-lg)',
              backgroundColor: 'var(--ws-bg-primary)',
              border: '1px solid var(--ws-border-default)',
              height: '100%',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>What owners can decide next</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--ws-space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {ownerDecisions.map((decision) => (
                <li key={decision} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ws-brand-secondary)', marginTop: 7, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--ws-text-secondary)' }}>{decision}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimateStaggerChild>

        <AnimateStaggerChild index={analyticsSignals.length + 1}>
          <div
            style={{
              padding: 'var(--ws-space-6)',
              borderRadius: 'var(--ws-radius-lg)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.22)',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LuShieldCheck size={20} color="var(--ws-success)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>Transparent by default</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--ws-space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {transparencyPoints.map((point) => (
                <li key={point} style={{ fontSize: '0.9rem', color: 'var(--ws-text-secondary)' }}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </AnimateStaggerChild>
      </div>
    </SectionWrapper>
  );
}
