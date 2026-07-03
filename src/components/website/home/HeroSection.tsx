'use client';

import { useTranslations } from 'next-intl';
import { LuArrowRight, LuBot, LuFileText, LuGlobe, LuLayoutGrid, LuMonitor, LuQrCode, LuSearch, LuShieldCheck, LuSmartphone } from 'react-icons/lu';
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
        padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-18)',
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
              <WebsiteButton href="/features/official-business-page" variant="ghost" ariaLabel={t('Hero.secondaryCtaAria')}>
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
            <div className="ws-hero-product-stage" aria-label={t('Hero.visualLabel')}>
              <div className="ws-source-card">
                <p className="ws-source-card__label">{t('Hero.sourceLabel')}</p>
                <p className="ws-source-card__title">{t('Hero.sourceTitle')}</p>
                <div className="ws-source-card__row">
                  <span>{t('Hero.sourceMenu')}</span>
                  <strong>{t('Hero.sourceCurrent')}</strong>
                </div>
                <div className="ws-source-card__row">
                  <span>{t('Hero.officialBadge')}</span>
                  <strong>{t('Hero.sourceApproved')}</strong>
                </div>
                <div className="ws-source-card__row">
                  <span>{t('Hero.viewMenu')}</span>
                  <strong>{t('Hero.sourceStatus')}</strong>
                </div>
              </div>

              <div className="ws-obp-frame">
                <div className="ws-browser-bar">
                  <span />
                  <span />
                  <span />
                  <p>{t('Hero.obpUrl')}</p>
                </div>
                <div className="ws-obp-body">
                  <p className="ws-official-badge">
                    <LuShieldCheck size={15} aria-hidden="true" />
                    {t('Hero.officialBadge')}
                  </p>
                  <h2>{t('Hero.obpBusiness')}</h2>
                  <p>{t('Hero.obpMeta')}</p>
                  <div className="ws-obp-actions">
                    <span>{t('Hero.actionCall')}</span>
                    <span>{t('Hero.actionWhatsapp')}</span>
                    <span>{t('Hero.actionDirections')}</span>
                  </div>
                  <div className="ws-obp-menu-cta">{t('Hero.viewMenu')}</div>
                </div>
              </div>

              <div className="ws-menu-phone">
                <div className="ws-phone-top" />
                <div className="ws-menu-phone__content">
                  <p className="ws-menu-phone__status">{t('Hero.phoneStatus')}</p>
                  <div className="ws-phone-search">
                    <LuSearch size={14} aria-hidden="true" />
                    <span>{t('Hero.phoneSearch')}</span>
                  </div>
                  <div className="ws-phone-chips">
                    <span>{t('Hero.phoneChip0')}</span>
                    <span>{t('Hero.phoneChip1')}</span>
                  </div>
                  <div className="ws-phone-item">
                    <div />
                    <p>{t('Hero.phoneItem0')}</p>
                    <strong>{t('Hero.phonePrice0')}</strong>
                  </div>
                  <div className="ws-phone-item">
                    <div />
                    <p>{t('Hero.phoneItem1')}</p>
                    <strong>{t('Hero.phonePrice1')}</strong>
                  </div>
                </div>
              </div>
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
