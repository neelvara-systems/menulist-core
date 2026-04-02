'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

export default function FinalCtaSection() {
  const t = useTranslations('Website');
  const { data: session, status } = useSession();

  const ctaHref = status === 'authenticated' && session ? '/pricing' : '/get-started';

  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-narrow)', margin: '0 auto' }}>
          <h2 className="ws-h2">{t('FinalCta.title')}<span className="ws-highlight">{t('FinalCta.highlight')}</span>{t('FinalCta.titleEnd')}</h2>

          <p
            style={{
              marginTop: 'var(--ws-space-4)',
              fontSize: '1.0625rem',
              color: 'var(--ws-text-secondary)',
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            {t('FinalCta.subtitle')}
          </p>

          <div style={{ marginTop: 'var(--ws-space-8)' }}>
            <WebsiteButton href={ctaHref}>
              {t('FinalCta.cta')}
            </WebsiteButton>
          </div>

          <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
            {t('FinalCta.caption')}
          </p>

          <p
            style={{
              marginTop: 'var(--ws-space-6)',
              fontSize: '0.9375rem',
              color: 'var(--ws-text-secondary)',
              fontWeight: 500,
            }}
          >
            {t('FinalCta.bottomText')}
          </p>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
