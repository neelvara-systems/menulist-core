'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  LuBadgeCheck,
  LuFileText,
  LuPackage,
  LuPrinter,
  LuQrCode,
  LuSticker,
  LuTent,
} from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const assetTypes = [
  LuFileText,
  LuTent,
  LuBadgeCheck,
  LuSticker,
  LuPrinter,
  LuQrCode,
  LuPackage,
] as const;

export default function PrintReadyKitProofGallery() {
  const t = useTranslations('Website.FeatureDetail.printReadyKit');

  return (
    <section className="ws-section ws-print-kit-gallery" aria-label={t('galleryLabel')}>
      <div className="ws-container ws-print-kit-gallery__inner">
        <AnimateOnScroll preset="card" className="ws-print-kit-gallery__copy">
          <p className="ws-page-hero__eyebrow">{t('galleryEyebrow')}</p>
          <WebsiteHeadline as="h2" text={t('galleryTitle')} highlightedText={t('galleryHighlight')} />
          <p>{t('gallerySubtitle')}</p>
        </AnimateOnScroll>

        <ul className="ws-print-kit-gallery__asset-rail" aria-label={t('galleryAssetRailLabel')}>
          {assetTypes.map((Icon, index) => (
            <li key={index}>
              <Icon size={17} aria-hidden="true" />
              <span>
                <strong>{t(`galleryAsset${index}Title`)}</strong>
                <small>{t(`galleryAsset${index}Meta`)}</small>
              </span>
            </li>
          ))}
        </ul>

        <div className="ws-print-kit-gallery__grid">
          <AnimateStaggerChild index={0} preset="media">
            <article className="ws-print-kit-gallery__card">
              <div className="ws-print-kit-gallery__card-copy">
                <span>{t('galleryTemplateKicker')}</span>
                <h3>{t('galleryTemplateTitle')}</h3>
                <p>{t('galleryTemplateDesc')}</p>
              </div>
              <figure className="ws-print-kit-gallery__screenshot">
                <Image
                  src="/images/website/print-ready-kit/print-assets-dashboard.jpg"
                  alt={t('galleryDashboardAlt')}
                  width={1250}
                  height={900}
                  sizes="(max-width: 1100px) 100vw, 50vw"
                  priority={false}
                  unoptimized
                />
              </figure>
            </article>
          </AnimateStaggerChild>

          <AnimateStaggerChild index={1} preset="media">
            <article className="ws-print-kit-gallery__card">
              <div className="ws-print-kit-gallery__card-copy">
                <span>{t('galleryEditorKicker')}</span>
                <h3>{t('galleryEditorTitle')}</h3>
                <p>{t('galleryEditorDesc')}</p>
              </div>
              <figure className="ws-print-kit-gallery__screenshot">
                <Image
                  src="/images/website/print-ready-kit/print-assets-editor.jpg"
                  alt={t('galleryEditorAlt')}
                  width={1920}
                  height={993}
                  sizes="(max-width: 1100px) 100vw, 50vw"
                  priority={false}
                  unoptimized
                />
              </figure>
            </article>
          </AnimateStaggerChild>
        </div>
      </div>
    </section>
  );
}
