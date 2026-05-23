'use client';

import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

export default function FinalCtaSection() {
  const t = useTranslations('Website');

  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-narrow)', margin: '0 auto' }}>
          <WebsiteHeadline
            as="h2"
            parts={[
              { text: t('FinalCta.title') },
              { text: t('FinalCta.highlight'), highlight: true },
              { text: t('FinalCta.titleEnd') },
            ]}
          />

          <p
            className="ws-body"
            style={{
              marginTop: 'var(--ws-space-4)',
              lineHeight: 1.5,
            }}
          >
            {t('FinalCta.subtitle')}
          </p>

          <div style={{ marginTop: 'var(--ws-space-8)' }}>
            <WebsiteButton href="/create-menu">
              {t('FinalCta.cta')}
            </WebsiteButton>
          </div>

        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
