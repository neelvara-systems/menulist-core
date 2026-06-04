'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LuCheckCircle, LuCreditCard, LuFileCheck, LuLogIn, LuShieldCheck } from 'react-icons/lu';
import { buildWebsiteSignInPath } from '@/lib/website/signInLinks';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';
import WebsitePageHero from '../shared/WebsitePageHero';
import WebsiteProofStrip from '../shared/WebsiteProofStrip';

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
        secondaryHref={buildWebsiteSignInPath('/dashboard')}
      >
        <WebsiteProofStrip items={proofItems} />
      </WebsitePageHero>

      <SectionWrapper id="sign-in" variant="subtle">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'var(--ws-space-10)', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <div className="ws-card" style={{ padding: 'var(--ws-space-8)' }}>
              <h2 className="ws-h2">{t('GetStarted.signInTitle')}</h2>
              <p className="ws-body-sm" style={{ marginTop: 'var(--ws-space-3)' }}>
                {t('GetStarted.signInSubtitle')}
              </p>
              <div style={{ marginTop: 'var(--ws-space-8)' }}>
                <Link
                  href={buildWebsiteSignInPath('/dashboard')}
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
                    textDecoration: 'none',
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
                  <LuLogIn size={18} />
                  {t('GetStarted.signInOptionsCta')}
                </Link>
              </div>
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
