'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LuBadgeCheck, LuFileText, LuGlobe, LuLayoutGrid, LuMonitor, LuQrCode, LuRefreshCw, LuShieldCheck, LuSmartphone } from 'react-icons/lu';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

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
        padding: 'var(--ws-space-24) var(--ws-space-6) var(--ws-space-20)',
        backgroundColor: 'var(--ws-bg-primary)',
      }}
    >
      <div className="ws-container">
        <div className="ws-hero-official__grid">
          <div className="ws-hero-official__copy">
            <p className="ws-hero-eyebrow">{t('Hero.eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              parts={[
                { text: t('Hero.titlePart1') },
                { text: t('Hero.titleHighlight'), highlight: true },
                { text: t('Hero.titlePart2') },
              ]}
            />

            <p className="ws-body" style={{ marginTop: 'var(--ws-space-6)', maxWidth: '620px' }}>
              {t('Hero.subtitle')}
            </p>

            <div className="ws-hero-official__actions">
              <WebsiteButton href="/create-menu">
                {t('Hero.cta')}
              </WebsiteButton>
              <WebsiteButton href="#public-proof" variant="ghost">
                {t('Hero.secondaryCta')}
              </WebsiteButton>
            </div>

            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-4)' }}>
              {t('Hero.caption')}
            </p>

            <div className="ws-hero-official__proof">
              {[LuBadgeCheck, LuShieldCheck, LuRefreshCw].map((Icon, index) => (
                <div key={index} className="ws-hero-proof-item">
                  <Icon size={16} />
                  <span>{t(`Hero.proof${index}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ws-hero-official__visual" aria-label={t('Hero.visualLabel')}>
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
          </div>
        </div>
      </div>
    </section>
  );
}
