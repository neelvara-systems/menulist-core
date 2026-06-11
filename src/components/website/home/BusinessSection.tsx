import Image from 'next/image';
import { useTranslations } from 'next-intl';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

const POINT_COUNT = 6;

export default function BusinessSection() {
  const t = useTranslations('Website');
  const points = Array.from({ length: POINT_COUNT }, (_, i) => ({
    title: t(`Business.point${i}Title`),
    desc: t(`Business.point${i}Desc`),
  }));
  return (
    <SectionWrapper>
      <AnimateOnScroll>
        <SectionHeading
          title={t('Business.title')}
          highlightedText={t('Business.highlight')}
        />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <div className="ws-draft-visual-frame ws-draft-visual-frame--wide">
          <Image
            src="/images/website/menulist-obp-browser.webp"
            alt={t('Business.title')}
            width={1400}
            height={900}
            loading="eager"
            unoptimized
            sizes="(min-width: 1024px) 880px, 100vw"
            className="ws-draft-product-image"
          />
        </div>
      </AnimateOnScroll>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: 'var(--ws-space-6)',
          marginTop: 'var(--ws-space-12)',
          maxWidth: '900px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {points.map((point) => (
          <div key={point.title} style={{ display: 'flex', gap: 'var(--ws-space-3)' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--ws-brand-secondary)',
                marginTop: '8px',
                flexShrink: 0,
              }}
            />
            <p className="ws-body-sm" style={{ lineHeight: 1.6 }}>
              <strong style={{ fontWeight: 600, color: 'var(--ws-text-primary)' }}>{point.title}.</strong>{' '}
              {point.desc}
            </p>
          </div>
        ))}
      </div>

      <AnimateOnScroll delay={0.15}>
        <div style={{ textAlign: 'center', marginTop: 'var(--ws-space-8)' }}>
          <WebsiteButton href="/multi-location" variant="ghost">
            {t('Business.learnMultiLocation')}
          </WebsiteButton>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
