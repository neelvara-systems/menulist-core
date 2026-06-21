'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LuArrowRight, LuBot, LuFileText, LuGlobe, LuLayoutGrid, LuMonitor, LuQrCode, LuShieldCheck, LuSmartphone } from 'react-icons/lu';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import Link from '../shared/WebsiteLink';

const surfaceKeys = [
  { key: 'surfaceOfficialPage', icon: LuLayoutGrid },
  { key: 'surfaceQrMenu', icon: LuQrCode },
  { key: 'surfaceCustomerApp', icon: LuSmartphone },
  { key: 'surfaceDigitalScreen', icon: LuMonitor },
  { key: 'surfacePrintPdf', icon: LuFileText },
  { key: 'surfaceWebLink', icon: LuGlobe },
];

export default function HeroSection() {
  const t = useTranslations('Website');

  return (
    <section
      className="ws-hero-official"
      style={{
        padding: 'var(--ws-space-20) var(--ws-space-6) var(--ws-space-16)',
        backgroundColor: 'var(--ws-bg-primary)',
      }}
    >
      <div className="ws-container">
        <div className="ws-hero-official__grid">
          <AnimateOnScroll preset="hero" className="ws-hero-official__copy">
            <p className="ws-hero-eyebrow">{t('Hero.eyebrow')}</p>
            <Link href="/ai-menu-manager" className="ws-hero-amm-teaser">
              <LuBot size={16} aria-hidden="true" />
              <span>{t('Hero.aiTeaserLabel')}</span>
              <strong>{t('Hero.aiTeaserText')}</strong>
              <LuArrowRight size={15} aria-hidden="true" />
            </Link>
            <WebsiteHeadline as="h1" className="ws-hero-official__headline">
              <span className="ws-hero-official__phrase">{t('Hero.titlePart1')}</span>
              <br className="ws-hero-title-break" />
              {' '}
              <span className="ws-headline__highlight ws-hero-official__phrase ws-hero-official__phrase--highlight">{t('Hero.titleHighlight')}</span>
              <span className="ws-hero-official__phrase">{t('Hero.titlePart2')}</span>
            </WebsiteHeadline>

            <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '620px' }}>
              {t('Hero.subtitle')}
            </p>

            <div className="ws-hero-official__actions">
              <WebsiteButton href="/create-menu" ariaLabel={t('Hero.ctaAria')}>
                {t('Hero.cta')}
              </WebsiteButton>
              <WebsiteButton href="/ai-menu-manager" variant="ghost" ariaLabel={t('Hero.secondaryCtaAria')}>
                {t('Hero.secondaryCta')}
              </WebsiteButton>
            </div>

            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('Hero.caption')}
            </p>

            <div className="ws-hero-official__proof">
              {[LuShieldCheck, LuQrCode, LuSmartphone].map((Icon, index) => (
                <div key={index} className="ws-hero-proof-item">
                  <Icon size={16} />
                  <span>{t(`Hero.proof${index}`)}</span>
                </div>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll preset="media" delay={0.12} className="ws-hero-official__visual">
            <div className="ws-hero-product-stage ws-hero-product-stage--image">
              <Image
                src="/images/website/menulist-hero-official-source.webp"
                alt={t('Hero.visualLabel')}
                width={1600}
                height={1000}
                priority
                unoptimized
                sizes="(min-width: 1024px) 560px, 100vw"
                className="ws-draft-product-image"
              />
            </div>

            <div className="ws-hero-surfaces">
              {surfaceKeys.map((surface) => {
                const Icon = surface.icon;
                return (
                  <div key={surface.key} className="ws-hero-surface-pill">
                    <Icon size={15} />
                    <span>{t(`Hero.${surface.key}`)}</span>
                  </div>
                );
              })}
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
