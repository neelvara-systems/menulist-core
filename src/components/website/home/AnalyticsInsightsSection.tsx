'use client';

import { LuCircleOff, LuMapPin, LuPhoneCall, LuSearch, LuShieldCheck } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const analyticsSignals = [
  {
    icon: LuSearch,
    title: 'Searches and no-result searches',
    desc: 'MenuList records what customers search for and when the menu has no clear answer.',
  },
  {
    icon: LuCircleOff,
    title: 'Unavailable items still drawing attention',
    desc: 'When customers still tap an unavailable item, that interest stays visible instead of disappearing.',
  },
  {
    icon: LuPhoneCall,
    title: 'Final actions from the menu',
    desc: 'Calls, WhatsApp, directions, reservations, and order clicks are recorded as the menu is used.',
  },
  {
    icon: LuMapPin,
    title: 'Approximate location and timing',
    desc: 'MenuList can add coarse location and time patterns without relying on exact GPS or noisy passive tracking.',
  },
];

const ownerVisibility = [
  'Which dishes attract direct searches',
  'Which missing items customers keep looking for',
  'Which unavailable dishes still pull attention',
  'Which next step customers choose most often',
];

const transparencyPoints = [
  'Category-based owner controls instead of event-by-event switches',
  'Clear disclosure of what is recorded by default',
  'No customer names, emails, payment details, or exact GPS in this analytics flow',
  'Cost-safe signal capture instead of heavy passive tracking',
];

export default function AnalyticsInsightsSection() {
  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title="Your menu, understood by MenuList"
          subtitle="MenuList does not just publish your menu. It quietly records how customers move through it — what they search for, what they cannot find, what still draws attention, and which next step they choose."
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
          <div className="ws-card" style={{ height: '100%' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>What becomes visible</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--ws-space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
              {ownerVisibility.map((item) => (
                <li key={item} style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ws-brand-secondary)', marginTop: 7, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--ws-text-secondary)' }}>{item}</span>
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
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ws-text-primary)', margin: 0 }}>Quiet and limited by default</h3>
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

      <AnimateOnScroll delay={0.15}>
        <p
          className="ws-caption"
          style={{
            textAlign: 'center',
            marginTop: 'var(--ws-space-8)',
            maxWidth: 'var(--ws-max-w-text)',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          The menu stays simple for customers, while the owner sees what the public menu is quietly revealing over time.
        </p>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
