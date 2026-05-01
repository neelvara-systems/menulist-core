'use client';

import { LuBarChart3, LuMousePointerClick, LuPhoneCall, LuShieldCheck, LuTags } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const analyticsSignals = [
  {
    icon: LuMousePointerClick,
    title: 'Menu sessions and intent',
    desc: 'MenuList counts anonymous sessions, engaged sessions, intent sessions, and action sessions without creating customer profiles.',
  },
  {
    icon: LuTags,
    title: 'Category and item interest',
    desc: 'Item views, item taps, category interest, searches, no-result searches, and unavailable-item taps stay visible to the owner.',
  },
  {
    icon: LuPhoneCall,
    title: 'Actions that show real intent',
    desc: 'Calls, WhatsApp, directions, reservations, order clicks, shares, and official-page CTA taps are recorded as final customer actions.',
  },
  {
    icon: LuBarChart3,
    title: 'Source quality, not vanity traffic',
    desc: 'The dashboard can show which source creates action: QR, WhatsApp, Instagram, Google, official page, shortcut, or direct visits.',
  },
];

const ownerVisibility = [
  'Today so far, plus settled daily, weekly, monthly, and lifetime views',
  'Engaged Sessions %, Intent Rate %, Action Rate %, and action rate by source',
  'Top items, top categories, searches, no-result searches, and unavailable interest',
  'Pro action summaries that turn the same metrics into a short owner action list',
];

const transparencyPoints = [
  'Cost-safe batching for passive events; final customer actions are recorded immediately',
  'Clear owner settings explain what is recorded by default',
  'No customer names, emails, payment details, scroll heatmaps, hover activity, or per-keystroke tracking',
  'Approximate location is optional and never stored as exact GPS coordinates in this analytics flow',
];

export default function AnalyticsInsightsSection() {
  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title="Your menu, understood after it goes live"
          subtitle="MenuList records the small set of customer signals that help an owner decide what to fix, promote, or share next — without heavy passive tracking."
        />
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
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
                    width: '48px',
                    height: '48px',
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
                  <h3 className="ws-h3" style={{ fontSize: '1.0625rem' }}>{signal.title}</h3>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <AnimateStaggerChild index={analyticsSignals.length}>
          <div className="ws-card" style={{ height: '100%' }}>
            <h3 className="ws-h3" style={{ fontSize: '1rem' }}>What the owner sees</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--ws-space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {ownerVisibility.map((item) => (
                <li key={item} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ws-brand-secondary)', marginTop: 7, flexShrink: 0 }} />
                  <span className="ws-body-sm" style={{ fontSize: '0.9375rem' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimateStaggerChild>

        <AnimateStaggerChild index={analyticsSignals.length + 1}>
          <div className="ws-card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--ws-radius-md)',
                  backgroundColor: 'var(--ws-bg-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LuShieldCheck size={20} color="var(--ws-brand-secondary)" />
              </div>
              <h3 className="ws-h3" style={{ fontSize: '1rem', margin: 0 }}>Private and cost-safe by default</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--ws-space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {transparencyPoints.map((point) => (
                <li key={point} className="ws-body-sm" style={{ fontSize: '0.9375rem' }}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </AnimateStaggerChild>
      </div>

      <AnimateOnScroll delay={0.15}>
        <p
          className="ws-caption"
          style={{
            textAlign: 'center',
            marginTop: 'var(--ws-space-10)',
            maxWidth: 'var(--ws-max-w-text)',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          The customer menu stays simple. The owner dashboard shows what customers noticed, what they wanted, and which source brought real action.
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
