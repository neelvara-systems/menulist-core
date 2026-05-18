'use client';

import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import WebsiteMobileSupportHint from '../shared/WebsiteMobileSupportHint';
import WebsiteOwnerApprovalHint from '../shared/WebsiteOwnerApprovalHint';

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

          <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
            {t('FinalCta.caption')}
          </p>

          <WebsiteMobileSupportHint text={t('FinalCta.mobileSupport')} />
          <WebsiteOwnerApprovalHint />

          <p
            className="ws-body-sm"
            style={{
              marginTop: 'var(--ws-space-6)',
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
