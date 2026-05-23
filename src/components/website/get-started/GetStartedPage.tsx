'use client';

import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LuCheckCircle, LuCreditCard, LuFileCheck, LuShieldCheck } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';
import WebsitePageHero from '../shared/WebsitePageHero';
import WebsiteProofStrip from '../shared/WebsiteProofStrip';
import WebsiteMobileSupportHint from '../shared/WebsiteMobileSupportHint';
import WebsiteOwnerApprovalHint from '../shared/WebsiteOwnerApprovalHint';

const setupIcons = [LuFileCheck, LuShieldCheck, LuCreditCard];

export default function GetStartedPage() {
  const t = useTranslations('Website');
  const { data: session, status } = useSession();
  const router = useRouter();
  const proofItems = Array.from({ length: 3 }, (_, i) => t(`GetStarted.proof${i}`));
  const steps = setupIcons.map((icon, i) => ({
    icon,
    title: t(`GetStarted.step${i}Title`),
    desc: t(`GetStarted.step${i}Desc`),
  }));

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  return (
    <main>
      <WebsitePageHero
        eyebrow={t('GetStarted.eyebrow')}
        title={t('GetStarted.title')}
        highlightedText={t('GetStarted.titleHighlight')}
        subtitle={t('GetStarted.subtitle')}
        primaryCta={t('GetStarted.uploadFirstCta')}
        primaryHref="/create-menu"
        secondaryCta={t('GetStarted.signInCta')}
        secondaryHref="#sign-in"
      >
        <WebsiteProofStrip items={proofItems} />
        <WebsiteMobileSupportHint />
        <WebsiteOwnerApprovalHint />
      </WebsitePageHero>

      <SectionWrapper id="sign-in" variant="subtle">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.95fr) minmax(320px, 1.05fr)', gap: 'var(--ws-space-10)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <div className="ws-card" style={{ padding: 'var(--ws-space-8)' }}>
              <h2 className="ws-h2">{t('GetStarted.signInTitle')}</h2>
              <p className="ws-body-sm" style={{ marginTop: 'var(--ws-space-3)' }}>
                {t('GetStarted.signInSubtitle')}
              </p>
              <div style={{ marginTop: 'var(--ws-space-8)' }}>
                <button
                  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--ws-space-3)',
                    width: '100%',
                    padding: '0.875rem 1.5rem',
                    backgroundColor: 'var(--ws-bg-primary)',
                    border: '1.5px solid var(--ws-border-default)',
                    borderRadius: 'var(--ws-radius-lg)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--ws-text-primary)',
                    transition: 'border-color var(--ws-transition-fast), box-shadow var(--ws-transition-fast)',
                    boxShadow: 'var(--ws-shadow-sm)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--ws-shadow-md)';
                    e.currentTarget.style.borderColor = 'var(--ws-brand-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--ws-shadow-sm)';
                    e.currentTarget.style.borderColor = 'var(--ws-border-default)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {t('GetStarted.googleCta')}
                </button>
              </div>
              <p style={{ marginTop: 'var(--ws-space-5)', fontSize: '0.875rem', color: 'var(--ws-text-muted)' }}>
                {t('GetStarted.loginPrefix')}{' '}
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                  style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--ws-brand-secondary)', cursor: 'pointer', font: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                >
                  {t('GetStarted.loginLink')}
                </button>
              </p>
            </div>
          </AnimateOnScroll>

          <div style={{ display: 'grid', gap: 'var(--ws-space-4)' }}>
            {steps.map(({ icon: Icon, title, desc }, index) => (
              <AnimateStaggerChild key={title} index={index}>
                <WebsiteFeatureCard
                  icon={Icon}
                  title={title}
                  description={desc}
                  compact
                />
              </AnimateStaggerChild>
            ))}
            <AnimateOnScroll delay={0.2}>
              <p className="ws-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
                <LuCheckCircle size={16} color="var(--ws-success)" />
                {t('GetStarted.bottomNote')}
              </p>
            </AnimateOnScroll>
          </div>
        </div>
      </SectionWrapper>
    </main>
  );
}
