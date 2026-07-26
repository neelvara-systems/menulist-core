'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LuArrowRight, LuCamera, LuCheck, LuClock3, LuLink, LuShieldCheck } from 'react-icons/lu';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteButton from '../shared/WebsiteButton';

type SourceKey = 'photo' | 'link';

const sourceCards = [
  { key: 'photo', Icon: LuCamera },
  { key: 'link', Icon: LuLink },
] as const;

const previewSteps = ['previewStep0', 'previewStep1', 'previewStep2'];
const sampleRows = ['Sample0', 'Sample1', 'Sample2'];
const trustItems = [
  { key: 'trust0', Icon: LuShieldCheck },
  { key: 'trust1', Icon: LuCheck },
  { key: 'trust2', Icon: LuClock3 },
];

export default function CreateMenuPreviewSection() {
  const t = useTranslations('Website');
  const [activeSource, setActiveSource] = useState<SourceKey>('photo');
  const ActiveSourceIcon = activeSource === 'photo' ? LuCamera : LuLink;

  return (
    <SectionWrapper className="ws-create-preview-section" id="create-menu-preview">
      <div className="ws-create-preview">
        <AnimateOnScroll>
          <div className="ws-create-preview__copy">
            <p className="ws-create-preview__eyebrow">{t('CreateMenuPreview.eyebrow')}</p>
            <SectionHeading
              as="h2"
              centered={false}
              highlightedText={t('CreateMenuPreview.highlight')}
              subtitle={t('CreateMenuPreview.subtitle')}
              title={t('CreateMenuPreview.title')}
            />

            <div className="ws-create-preview__source-grid" aria-label={t('CreateMenuPreview.sourceLabel')}>
              {sourceCards.map(({ key, Icon }) => (
                <button
                  type="button"
                  aria-pressed={activeSource === key}
                  className="ws-create-preview__source-card"
                  data-active={activeSource === key ? 'true' : 'false'}
                  key={key}
                  onClick={() => setActiveSource(key)}
                >
                  <span className="ws-create-preview__source-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{t(`CreateMenuPreview.${key}Title`)}</h3>
                    <p>{t(`CreateMenuPreview.${key}Body`)}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="ws-create-preview__cta-row">
              <WebsiteButton href="/create-menu">
                <span>{t('CreateMenuPreview.cta')}</span>
                <LuArrowRight size={18} aria-hidden="true" />
              </WebsiteButton>
              <p>{t('CreateMenuPreview.note')}</p>
            </div>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1} preset="media">
          <div className="ws-create-preview__panel" aria-label={t('CreateMenuPreview.previewLabel')}>
            <div className="ws-create-preview__panel-top">
              <div>
                <span>{t('CreateMenuPreview.previewLabel')}</span>
                <strong>{t('CreateMenuPreview.previewUrl')}</strong>
              </div>
              <em>{t('CreateMenuPreview.previewStatus')}</em>
            </div>

            <div className="ws-create-preview__sheet">
              <div className="ws-create-preview__sheet-header">
                <span className="ws-create-preview__sheet-icon" aria-hidden="true">
                  <ActiveSourceIcon size={20} />
                </span>
                <div>
                  <span className="ws-create-preview__sheet-kicker">
                    {t(`CreateMenuPreview.${activeSource}PreviewKicker`)}
                  </span>
                  <strong className="ws-create-preview__sheet-title">
                    {t(`CreateMenuPreview.${activeSource}PreviewTitle`)}
                  </strong>
                </div>
              </div>

              <ul className="ws-create-preview__sample-list" aria-label={t('CreateMenuPreview.sampleLabel')}>
                {sampleRows.map((key) => (
                  <li className="ws-create-preview__sample-row" key={key}>
                    <LuCheck size={17} aria-hidden="true" />
                    <p>{t(`CreateMenuPreview.${activeSource}${key}`)}</p>
                  </li>
                ))}
              </ul>

              <ol className="ws-create-preview__preview-list">
                {previewSteps.map((key, index) => (
                  <li className="ws-create-preview__preview-step" key={key}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{t(`CreateMenuPreview.${key}`)}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="ws-create-preview__trust-row">
              {trustItems.map(({ key, Icon }) => (
                <div className="ws-create-preview__trust-item" key={key}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{t(`CreateMenuPreview.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </SectionWrapper>
  );
}
