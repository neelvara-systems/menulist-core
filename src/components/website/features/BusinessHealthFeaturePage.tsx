'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from 'react';
import {
  LuActivity,
  LuArrowRight,
  LuBarChart3,
  LuCheckCircle2,
  LuClock3,
  LuClipboardCheck,
  LuEye,
  LuMapPin,
  LuMousePointerClick,
  LuShieldCheck,
  LuSmartphone,
} from 'react-icons/lu';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import Link from '../shared/WebsiteLink';

const checks = [
  { icon: LuClipboardCheck, key: 'check0' },
  { icon: LuEye, key: 'check1' },
  { icon: LuBarChart3, key: 'check2' },
  { icon: LuMapPin, key: 'check3' },
];

const outcomes = [
  { icon: LuCheckCircle2, key: 'outcome0' },
  { icon: LuClock3, key: 'outcome1' },
  { icon: LuMousePointerClick, key: 'outcome2' },
];

const trustItems = [
  { icon: LuShieldCheck, key: 'trust0' },
  { icon: LuActivity, key: 'trust1' },
  { icon: LuSmartphone, key: 'trust2' },
];

const storySections = [
  {
    id: 'business-health-checks',
    navLabelKey: 'checksEyebrow',
    navSummaryKey: 'storyChecksSummary',
    eyebrowKey: 'checksEyebrow',
    titleKey: 'checksTitle',
    descriptionKey: 'checksSubtitle',
    items: checks,
    icon: LuClipboardCheck,
    variant: 'checks',
  },
  {
    id: 'business-health-outcomes',
    navLabelKey: 'outcomesEyebrow',
    navSummaryKey: 'storyOutcomesSummary',
    eyebrowKey: 'outcomesEyebrow',
    titleKey: 'outcomesTitle',
    descriptionKey: 'storyOutcomesDesc',
    items: outcomes,
    icon: LuCheckCircle2,
    variant: 'outcomes',
  },
  {
    id: 'business-health-trust',
    navLabelKey: 'trustEyebrow',
    navSummaryKey: 'storyTrustSummary',
    eyebrowKey: 'trustEyebrow',
    titleKey: 'trustTitle',
    descriptionKey: 'trustSubtitle',
    items: trustItems,
    icon: LuShieldCheck,
    variant: 'trust',
  },
] as const;

type BusinessHealthStorySectionId = typeof storySections[number]['id'];

function getDesktopStoryBounds(section: HTMLElement) {
  const pin = section.querySelector<HTMLElement>('.ws-business-health-feature-story__pin');
  const heading = section.querySelector<HTMLElement>('.ws-business-health-feature-story__heading');

  if (!pin || !heading) {
    return null;
  }

  const sectionStyle = window.getComputedStyle(section);
  const headingStyle = window.getComputedStyle(heading);
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  const sectionPaddingTop = Number.parseFloat(sectionStyle.paddingTop) || 0;
  const headingMarginBottom = Number.parseFloat(headingStyle.marginBottom) || 0;
  const stickyTop = Number.parseFloat(window.getComputedStyle(pin).top) || 0;
  const pinNormalTop = sectionTop + sectionPaddingTop + heading.getBoundingClientRect().height + headingMarginBottom;
  const sectionBottom = sectionTop + section.getBoundingClientRect().height;

  return {
    start: pinNormalTop - stickyTop,
    end: sectionBottom - window.innerHeight,
  };
}

function BusinessHealthPreview() {
  const t = useTranslations('Website.BusinessHealthFeature');

  return (
    <div className="ws-business-health-feature-preview" aria-label={t('previewLabel')} role="group">
      <div className="ws-business-health-feature-preview__bar">
        <span>{t('previewMeta')}</span>
        <span>{t('previewDate')}</span>
      </div>
      <div className="ws-business-health-feature-preview__status">
        <div>
          <span>{t('previewStatusLabel')}</span>
          <strong>{t('previewStatus')}</strong>
        </div>
        <span className="ws-business-health-feature-preview__badge">
          <LuCheckCircle2 size={15} />
          {t('previewBadge')}
        </span>
      </div>
      <p>{t('previewBody')}</p>
      <div className="ws-business-health-feature-preview__metrics">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <span>{t(`previewMetric${index}Label`)}</span>
            <strong>{t(`previewMetric${index}Value`)}</strong>
          </div>
        ))}
      </div>
      <div className="ws-business-health-feature-preview__answer">
        <span>{t('previewQuestionLabel')}</span>
        <p>{t('previewQuestion')}</p>
        <strong>{t('previewAnswer')}</strong>
      </div>
    </div>
  );
}

type BusinessHealthStoryNavProps = {
  activeId: BusinessHealthStorySectionId;
  onSelect: (event: MouseEvent<HTMLAnchorElement>, id: BusinessHealthStorySectionId) => void;
};

function BusinessHealthStoryNav({ activeId, onSelect }: BusinessHealthStoryNavProps) {
  const t = useTranslations('Website.BusinessHealthFeature');

  return (
    <nav className="ws-business-health-feature-story__nav" aria-label={t('storyNavLabel')}>
      {storySections.map((item) => {
        const active = activeId === item.id;

        return (
          <a
            key={item.id}
            className="ws-business-health-feature-story__step"
            href={`#${item.id}`}
            aria-current={active ? 'step' : undefined}
            data-active={active ? 'true' : undefined}
            onClick={(event) => onSelect(event, item.id)}
          >
            <span className="ws-business-health-feature-story__step-label">{t(item.navLabelKey)}</span>
            <span className="ws-business-health-feature-story__step-summary">{t(item.navSummaryKey)}</span>
          </a>
        );
      })}
    </nav>
  );
}

type BusinessHealthStoryMediaProps = {
  section: typeof storySections[number];
};

function BusinessHealthStoryMedia({ section }: BusinessHealthStoryMediaProps) {
  const t = useTranslations('Website.BusinessHealthFeature');

  if (section.variant === 'trust') {
    return (
      <div className="ws-business-health-feature-story__trust-list">
        {section.items.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.key} className="ws-business-health-feature-story__trust-item">
              <Icon size={20} aria-hidden="true" />
              <div>
                <h4>{t(`${item.key}Title`)}</h4>
                <p>{t(`${item.key}Desc`)}</p>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`ws-business-health-feature-story__media-grid ws-business-health-feature-story__media-grid--${section.variant}`}>
      {section.items.map((item, index) => {
        const Icon = item.icon;

        return (
          <article key={item.key} className="ws-business-health-feature-story__mini-card">
            {section.variant === 'outcomes' ? (
              <span className="ws-business-health-feature-story__mini-index">{index + 1}</span>
            ) : null}
            <Icon size={20} aria-hidden="true" />
            <h4>{t(`${item.key}Title`)}</h4>
            <p>{t(`${item.key}Desc`)}</p>
          </article>
        );
      })}
    </div>
  );
}

function BusinessHealthStorySection() {
  const t = useTranslations('Website.BusinessHealthFeature');
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const updateActiveItem = () => {
      const section = sectionRef.current;
      if (!section) {
        return;
      }

      if (window.matchMedia('(max-width: 980px)').matches) {
        const readingLine = Math.min(window.innerHeight * 0.58, 520);
        let nextIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;

        storySections.forEach((item, index) => {
          const element = document.getElementById(item.id);
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const isReading = rect.top <= readingLine && rect.bottom >= readingLine;
          const distance = Math.abs(rect.top - readingLine);

          if (isReading || distance < bestDistance) {
            bestDistance = distance;
            nextIndex = index;
          }
        });

        setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
        return;
      }

      const bounds = getDesktopStoryBounds(section);
      if (!bounds) return;

      const { start, end } = bounds;
      const progress = Math.min(Math.max((window.scrollY - start) / Math.max(end - start, 1), 0), 0.999);
      const nextIndex = Math.min(storySections.length - 1, Math.floor(progress * storySections.length));

      setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActiveItem);
    };

    updateActiveItem();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  const handleStorySelect = (event: MouseEvent<HTMLAnchorElement>, id: BusinessHealthStorySectionId) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    const nextIndex = storySections.findIndex((item) => item.id === id);
    if (nextIndex < 0) {
      return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    window.history.pushState(null, '', `#${id}`);

    const section = sectionRef.current;
    const target = document.getElementById(id);
    if (!section || !target) {
      return;
    }

    if (window.matchMedia('(max-width: 980px)').matches) {
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
      return;
    }

    const bounds = getDesktopStoryBounds(section);
    if (!bounds) return;

    const { start, end } = bounds;
    const step = Math.max((end - start) / storySections.length, 1);

    window.scrollTo({
      top: Math.max(start + step * nextIndex + 1, 0),
      behavior: 'auto',
    });
  };

  return (
    <section ref={sectionRef} className="ws-section ws-business-health-feature-story">
      <div className="ws-container">
        <AnimateOnScroll preset="card" className="ws-business-health-feature-story__heading">
          <p className="ws-page-hero__eyebrow">{t('storyEyebrow')}</p>
          <WebsiteHeadline as="h2" text={t('storyTitle')} />
          <p>{t('storySubtitle')}</p>
        </AnimateOnScroll>

        <div className="ws-business-health-feature-story__pin">
          <AnimateOnScroll
            preset="fade"
            delay={0.08}
            className="ws-business-health-feature-story__layout"
          >
            <div className="ws-business-health-feature-story__copy">
              <BusinessHealthStoryNav
                activeId={storySections[activeIndex].id}
                onSelect={handleStorySelect}
              />
            </div>

            <div className="ws-business-health-feature-story__screens">
              {storySections.map((section, index) => {
                const Icon = section.icon;
                const distance = Math.abs(index - activeIndex);
                const state = index === activeIndex ? 'active' : index < activeIndex ? 'before' : 'after';

                return (
                  <article
                    key={section.id}
                    id={section.id}
                    className="ws-business-health-feature-story__screen"
                    data-state={state}
                    data-distance={Math.min(distance, 2)}
                    style={{ '--ws-business-health-feature-story-layer': storySections.length - distance } as CSSProperties}
                  >
                    <div className="ws-business-health-feature-story__screen-copy">
                      <p>{t(section.eyebrowKey)}</p>
                      <span>
                        <Icon aria-hidden="true" size={18} />
                      </span>
                      <h3>{t(section.titleKey)}</h3>
                      <p>{t(section.descriptionKey)}</p>
                      <div>
                        {section.items.slice(0, 3).map((item) => (
                          <em key={item.key}>{t(`${item.key}Title`)}</em>
                        ))}
                      </div>
                    </div>
                    <div className="ws-business-health-feature-story__media">
                      <BusinessHealthStoryMedia section={section} />
                    </div>
                  </article>
                );
              })}
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}

export default function BusinessHealthFeaturePage() {
  const t = useTranslations('Website.BusinessHealthFeature');

  return (
    <main className="ws-business-health-feature">
      <section className="ws-business-health-feature-hero">
        <div className="ws-container ws-business-health-feature-hero__inner">
          <AnimateOnScroll preset="hero" className="ws-business-health-feature-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('heroEyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              text={t('heroTitle')}
              highlightedText={t('heroHighlight')}
            />
            <p className="ws-business-health-feature-hero__subtitle">{t('heroSubtitle')}</p>
            <div className="ws-business-health-feature-hero__actions">
              <WebsiteButton href="/create-menu">{t('primaryCta')}</WebsiteButton>
              <WebsiteButton href="/features" variant="ghost">{t('secondaryCta')}</WebsiteButton>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll preset="media" delay={0.1} className="ws-business-health-feature-hero__visual">
            <BusinessHealthPreview />
          </AnimateOnScroll>
        </div>
      </section>

      <BusinessHealthStorySection />

      <section className="ws-section ws-section--subtle">
        <AnimateOnScroll preset="footer" className="ws-container ws-business-health-feature-final">
          <p className="ws-page-hero__eyebrow">{t('finalEyebrow')}</p>
          <WebsiteHeadline as="h2" text={t('finalTitle')} highlightedText={t('finalHighlight')} />
          <p>{t('finalSubtitle')}</p>
          <div className="ws-business-health-feature-final__actions">
            <WebsiteButton href="/create-menu">{t('primaryCta')}</WebsiteButton>
            <Link href="/features" className="ws-business-health-feature-final__link">
              {t('finalLink')}
              <LuArrowRight size={16} />
            </Link>
          </div>
        </AnimateOnScroll>
      </section>
    </main>
  );
}
