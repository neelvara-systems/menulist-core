'use client';

import { useTranslations } from 'next-intl';
import {
  LuArrowRight,
  LuAlertTriangle,
  LuBadgeCheck,
  LuCheckCircle2,
  LuFileText,
  LuLanguages,
  LuLink,
  LuMessageSquare,
  LuQrCode,
  LuRefreshCw,
  LuSearch,
  LuSmartphone,
} from 'react-icons/lu';
import type { FeatureDetailConfig } from './featureDetailConfig';

type FeatureDetailVisualProps = {
  config: FeatureDetailConfig;
};

const pillIndexes = [0, 1, 2] as const;
const stripIndexes = [0, 1, 2, 3, 4] as const;

function QrPattern() {
  return (
    <span className="ws-feature-visual__qr" aria-hidden="true">
      {Array.from({ length: 25 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export default function FeatureDetailVisual({ config }: FeatureDetailVisualProps) {
  const t = useTranslations('Website.FeatureDetail');
  const HeroIcon = config.heroIcon;
  const key = config.key;

  const previewPills = pillIndexes.map((index) => t(`${key}.previewPill${index}`));
  const stripItems = stripIndexes.map((index) => {
    const Icon = config.stripIcons[index];

    return {
      Icon,
      label: t(`${key}.strip${index}`),
    };
  });

  const journeyCards = [0, 1, 2].map((index) => {
    const Icon = config.journeyCardIcons[0][index];

    return {
      Icon,
      title: t(`${key}.journey0Card${index}Title`),
      desc: t(`${key}.journey0Card${index}Desc`),
    };
  });

  const renderPrimaryVisual = () => {
    switch (config.slug) {
      case 'menu-import':
        return (
          <div className="ws-feature-visual__source-flow">
            <div className="ws-feature-visual__source-stack">
              {stripItems.slice(0, 3).map(({ Icon, label }) => (
                <span key={label}>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
            <div className="ws-feature-visual__flow-core">
              <HeroIcon size={24} aria-hidden="true" />
              <strong>{t(`${key}.previewStatus`)}</strong>
              <small>{previewPills.join(' + ')}</small>
            </div>
            <div className="ws-feature-visual__draft-card">
              <div>
                <span />
                <span />
              </div>
              <strong>{t(`${key}.journey1Title`)}</strong>
              <p>{t(`${key}.journey1Pill0`)}</p>
              <p>{t(`${key}.journey1Pill1`)}</p>
              <p>{t(`${key}.journey1Pill2`)}</p>
            </div>
          </div>
        );

      case 'menu-content-prep':
        return (
          <div className="ws-feature-visual__content-board">
            <article className="ws-feature-visual__item-card">
              <span className="ws-feature-visual__image-tile" />
              <div>
                <strong>{t(`${key}.journey0Card0Title`)}</strong>
                <p>{t(`${key}.journey0Card0Desc`)}</p>
              </div>
            </article>
            <div className="ws-feature-visual__content-rail">
              {previewPills.map((label, index) => {
                const Icon = [LuFileText, HeroIcon, LuLanguages][index] || HeroIcon;

                return (
                  <span key={label}>
                    <Icon size={15} aria-hidden="true" />
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        );

      case 'featured-choices':
        return (
          <div className="ws-feature-visual__phone-shell">
            <div className="ws-feature-visual__phone-top" />
            <div className="ws-feature-visual__choice-stack">
              {previewPills.map((label, index) => (
                <article key={label}>
                  <span />
                  <div>
                    <strong>{label}</strong>
                    <small>{t(`${key}.journey0Card${index}Title`)}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );

      case 'official-business-page':
        return (
          <div className="ws-feature-visual__browser">
            <div className="ws-feature-visual__browser-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="ws-feature-visual__business-header">
              <span>
                <HeroIcon size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>{t(`${key}.journey0Card0Title`)}</strong>
                <p>{t(`${key}.journey0Card0Desc`)}</p>
              </div>
            </div>
            <div className="ws-feature-visual__surface-grid">
              {stripItems.slice(0, 4).map(({ Icon, label }) => (
                <span key={label}>
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        );

      case 'qr-menu-links':
        return (
          <div className="ws-feature-visual__qr-layout">
            <div className="ws-feature-visual__qr-card">
              <QrPattern />
              <strong>{t(`${key}.previewPill0`)}</strong>
            </div>
            <div className="ws-feature-visual__link-stack">
              {stripItems.slice(1, 5).map(({ Icon, label }) => (
                <span key={label}>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        );

      case 'print-ready-kit':
        return (
          <div className="ws-feature-visual__print-workspace">
            <div className="ws-feature-visual__print-template-panel">
              <div className="ws-feature-visual__print-panel-top">
                <strong>{t(`${key}.journey1Nav`)}</strong>
                <span>{t(`${key}.journey1Summary`)}</span>
              </div>
              <div className="ws-feature-visual__print-template-list">
                {[0, 1, 2].map((index) => (
                  <span key={index}>
                    {t(`${key}.journey1Pill${index}`)}
                  </span>
                ))}
              </div>
            </div>
            <div className="ws-feature-visual__print-editor-card">
              <div className="ws-feature-visual__print-editor-top">
                <span>{t(`${key}.previewPill1`)}</span>
                <span>{t(`${key}.previewPill2`)}</span>
              </div>
              <div className="ws-feature-visual__print-artboard">
                <strong>{t(`${key}.journey0Card0Title`)}</strong>
                <QrPattern />
                <small>{t(`${key}.journey3Card0Title`)}</small>
              </div>
              <div className="ws-feature-visual__print-editor-actions">
                {stripItems.slice(2, 5).map(({ Icon, label }) => (
                  <span key={label}>
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="ws-feature-visual__print-output-strip">
              {previewPills.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        );

      case 'owner-phone-dashboard':
        return (
          <div className="ws-feature-visual__phone-shell ws-feature-visual__phone-shell--dashboard">
            <div className="ws-feature-visual__phone-top" />
            <div className="ws-feature-visual__status-panel">
              <strong>{t(`${key}.journey0Title`)}</strong>
              <p>{t(`${key}.journey0Desc`)}</p>
              {previewPills.map((label) => (
                <span key={label}>
                  <LuCheckCircle2 size={14} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        );

      case 'menu-quality-validation':
        return (
          <div className="ws-feature-visual__quality-list">
            {previewPills.map((label, index) => {
              const Icon = index === 0 ? LuAlertTriangle : index === 1 ? LuFileText : HeroIcon;

              return (
                <article key={label}>
                  <Icon size={18} aria-hidden="true" />
                  <div>
                    <strong>{label}</strong>
                    <p>{t(`${key}.journey0Card${index}Title`)}</p>
                  </div>
                  <LuArrowRight size={15} aria-hidden="true" />
                </article>
              );
            })}
          </div>
        );

      case 'customer-feedback-loop':
        return (
          <div className="ws-feature-visual__feedback-flow">
            {[LuQrCode, LuMessageSquare, LuSmartphone, LuRefreshCw].map((Icon, index) => (
              <article key={index}>
                <Icon size={18} aria-hidden="true" />
                <strong>{t(`${key}.journey${index}Nav`)}</strong>
                <small>{t(`${key}.journey${index}Summary`)}</small>
              </article>
            ))}
          </div>
        );

      case 'public-discovery':
        return (
          <div className="ws-feature-visual__discovery-card">
            <div className="ws-feature-visual__document">
              <LuBadgeCheck size={18} aria-hidden="true" />
              <strong>{t(`${key}.journey0Title`)}</strong>
              <p>{t(`${key}.journey0Desc`)}</p>
            </div>
            <div className="ws-feature-visual__discovery-sources">
              {[LuSearch, LuLink, HeroIcon].map((Icon, index) => (
                <span key={index}>
                  <Icon size={15} aria-hidden="true" />
                  {t(`${key}.previewPill${index}`)}
                </span>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="ws-feature-visual__mini-grid">
            {journeyCards.map(({ Icon, title, desc }) => (
              <article key={title}>
                <Icon size={18} aria-hidden="true" />
                <strong>{title}</strong>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        );
    }
  };

  return (
    <div className={`ws-feature-visual ws-feature-visual--${config.slug}`} aria-label={t(`${key}.previewLabel`)} role="group">
      <div className="ws-feature-visual__bar">
        <span>{t(`${key}.previewMeta`)}</span>
        <span>{t(`${key}.previewStatus`)}</span>
      </div>
      <div className="ws-feature-visual__hero">
        <span className="ws-feature-visual__hero-icon">
          <HeroIcon size={24} aria-hidden="true" />
        </span>
        <div>
          <h2>{t(`${key}.previewTitle`)}</h2>
          <p>{t(`${key}.previewBody`)}</p>
        </div>
      </div>
      <div className="ws-feature-visual__stage">
        {renderPrimaryVisual()}
      </div>
    </div>
  );
}
