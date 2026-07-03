'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import type { FeatureDetailSlug } from './featureDetailConfig';

type FeatureScreenshot = {
  height: number;
  key: string;
  src: string;
  tone?: 'dark' | 'light';
  variant?: 'portrait' | 'wide';
  width: number;
};

type FeatureScreenshotGallery = {
  key: string;
  screenshots: FeatureScreenshot[];
};

const screenshotGalleries: Partial<Record<FeatureDetailSlug, FeatureScreenshotGallery>> = {
  'menu-import': {
    key: 'menuImport',
    screenshots: [
      {
        key: 'sourceMenu',
        src: '/images/website/features/menu-import/source-menu-link.webp',
        width: 330,
        height: 545,
        variant: 'portrait',
      },
    ],
  },
  'qr-menu-links': {
    key: 'qrMenuLinks',
    screenshots: [
      {
        key: 'shareKit',
        src: '/images/website/features/qr-menu-links/share-kit.webp',
        width: 1045,
        height: 690,
      },
      {
        key: 'publicMenu',
        src: '/images/website/features/qr-menu-links/public-menu.webp',
        width: 1220,
        height: 720,
      },
    ],
  },
  'customer-feedback-loop': {
    key: 'customerFeedbackLoop',
    screenshots: [
      {
        key: 'publicForm',
        src: '/images/website/features/customer-feedback-loop/public-feedback-form.webp',
        width: 745,
        height: 710,
        tone: 'dark',
      },
      {
        key: 'ownerInbox',
        src: '/images/website/features/customer-feedback-loop/owner-feedback-inbox.webp',
        width: 1135,
        height: 420,
        tone: 'dark',
        variant: 'wide',
      },
    ],
  },
  'public-discovery': {
    key: 'publicDiscovery',
    screenshots: [
      {
        key: 'presenceChecklist',
        src: '/images/website/features/public-discovery/presence-checklist.webp',
        width: 1045,
        height: 535,
        variant: 'wide',
      },
    ],
  },
};

type FeatureScreenshotProofGalleryProps = {
  slug: FeatureDetailSlug;
};

export default function FeatureScreenshotProofGallery({ slug }: FeatureScreenshotProofGalleryProps) {
  const gallery = screenshotGalleries[slug];
  const t = useTranslations('Website.FeatureDetailScreenshots');

  if (!gallery) {
    return null;
  }

  const sectionKey = gallery.key;

  return (
    <section className="ws-section ws-feature-screenshot-gallery" aria-label={t(`${sectionKey}.label`)}>
      <div className="ws-container ws-feature-screenshot-gallery__inner">
        <AnimateOnScroll preset="card" className="ws-feature-screenshot-gallery__copy">
          <p className="ws-page-hero__eyebrow">{t(`${sectionKey}.eyebrow`)}</p>
          <WebsiteHeadline
            as="h2"
            text={t(`${sectionKey}.title`)}
            highlightedText={t(`${sectionKey}.highlight`)}
          />
          <p>{t(`${sectionKey}.subtitle`)}</p>
        </AnimateOnScroll>

        <div
          className={`ws-feature-screenshot-gallery__grid ${
            gallery.screenshots.length === 1 ? 'ws-feature-screenshot-gallery__grid--single' : ''
          }`}
        >
          {gallery.screenshots.map((screenshot, index) => (
            <AnimateStaggerChild key={screenshot.key} index={index} preset="media">
              <article className="ws-feature-screenshot-gallery__card">
                <div className="ws-feature-screenshot-gallery__card-copy">
                  <span>{t(`${sectionKey}.${screenshot.key}.kicker`)}</span>
                  <h3>{t(`${sectionKey}.${screenshot.key}.title`)}</h3>
                  <p>{t(`${sectionKey}.${screenshot.key}.desc`)}</p>
                </div>
                <figure
                  className={`ws-feature-screenshot-gallery__screenshot ${
                    screenshot.tone === 'dark' ? 'ws-feature-screenshot-gallery__screenshot--dark' : ''
                  } ${
                    screenshot.variant === 'portrait' ? 'ws-feature-screenshot-gallery__screenshot--portrait' : ''
                  } ${
                    screenshot.variant === 'wide' ? 'ws-feature-screenshot-gallery__screenshot--wide' : ''
                  }`}
                >
                  <Image
                    src={screenshot.src}
                    alt={t(`${sectionKey}.${screenshot.key}.alt`)}
                    width={screenshot.width}
                    height={screenshot.height}
                    sizes={gallery.screenshots.length === 1 ? '(max-width: 1100px) 100vw, 65vw' : '(max-width: 1100px) 100vw, 50vw'}
                    priority={false}
                    unoptimized
                  />
                </figure>
              </article>
            </AnimateStaggerChild>
          ))}
        </div>
      </div>
    </section>
  );
}
