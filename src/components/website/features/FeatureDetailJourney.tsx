'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from 'react';
import AnimateOnScroll from '../shared/AnimateOnScroll';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import type { FeatureDetailConfig } from './featureDetailConfig';

type FeatureDetailJourneyProps = {
  config: FeatureDetailConfig;
};

const journeyIndexes = [0, 1, 2, 3] as const;
type JourneyIndex = typeof journeyIndexes[number];

function getStickyBounds(section: HTMLElement) {
  const pin = section.querySelector<HTMLElement>('.ws-feature-journey__pin');
  const heading = section.querySelector<HTMLElement>('.ws-feature-journey__heading');

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

export default function FeatureDetailJourney({ config }: FeatureDetailJourneyProps) {
  const t = useTranslations('Website.FeatureDetail');
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<JourneyIndex>(0);

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

        journeyIndexes.forEach((index) => {
          const element = document.getElementById(`${config.slug}-journey-${index}`);
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const isReading = rect.top <= readingLine && rect.bottom >= readingLine;
          const distance = Math.abs(rect.top - readingLine);

          if (isReading || distance < bestDistance) {
            bestDistance = distance;
            nextIndex = index;
          }
        });

        setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex as JourneyIndex));
        return;
      }

      const bounds = getStickyBounds(section);
      if (!bounds) return;

      const { start, end } = bounds;
      const progress = Math.min(Math.max((window.scrollY - start) / Math.max(end - start, 1), 0), 0.999);
      const nextIndex = Math.min(journeyIndexes.length - 1, Math.floor(progress * journeyIndexes.length)) as JourneyIndex;

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
  }, [config.slug]);

  const handleStorySelect = (event: MouseEvent<HTMLAnchorElement>, index: JourneyIndex) => {
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

    event.preventDefault();
    setActiveIndex(index);
    window.history.pushState(null, '', `#${config.slug}-journey-${index}`);

    const section = sectionRef.current;
    const target = document.getElementById(`${config.slug}-journey-${index}`);
    if (!section || !target) {
      return;
    }

    if (window.matchMedia('(max-width: 980px)').matches) {
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
      return;
    }

    const bounds = getStickyBounds(section);
    if (!bounds) return;

    const { start, end } = bounds;
    const step = Math.max((end - start) / journeyIndexes.length, 1);

    window.scrollTo({
      top: Math.max(start + step * index + 1, 0),
      behavior: 'auto',
    });
  };

  return (
    <section ref={sectionRef} className="ws-section ws-feature-journey">
      <div className="ws-container">
        <AnimateOnScroll preset="card" className="ws-feature-journey__heading">
          <p className="ws-page-hero__eyebrow">{t(`${config.key}.journeyEyebrow`)}</p>
          <WebsiteHeadline
            as="h2"
            text={t(`${config.key}.journeyTitle`)}
            highlightedText={t(`${config.key}.journeyHighlight`)}
          />
          <p>{t(`${config.key}.journeySubtitle`)}</p>
        </AnimateOnScroll>

        <div className="ws-feature-journey__pin">
          <AnimateOnScroll preset="fade" delay={0.08} className="ws-feature-journey__layout">
            <nav className="ws-feature-journey__nav" aria-label={t(`${config.key}.journeyNavLabel`)}>
              {journeyIndexes.map((index) => {
                const active = activeIndex === index;
                const NavIcon = config.journeyIcons[index];

                return (
                  <a
                    key={index}
                    href={`#${config.slug}-journey-${index}`}
                    className="ws-feature-journey__step"
                    aria-current={active ? 'step' : undefined}
                    data-active={active ? 'true' : undefined}
                    onClick={(event) => handleStorySelect(event, index)}
                  >
                    <NavIcon size={16} aria-hidden="true" />
                    <span>
                      <strong>{t(`${config.key}.journey${index}Nav`)}</strong>
                      <small>{t(`${config.key}.journey${index}Summary`)}</small>
                    </span>
                  </a>
                );
              })}
            </nav>

            <div className="ws-feature-journey__screens">
              {journeyIndexes.map((index) => {
                const distance = Math.abs(index - activeIndex);
                const state = index === activeIndex ? 'active' : index < activeIndex ? 'before' : 'after';
                const MainIcon = config.journeyIcons[index];

                return (
                  <article
                    key={index}
                    id={`${config.slug}-journey-${index}`}
                    className="ws-feature-journey__screen"
                    data-state={state}
                    data-distance={Math.min(distance, 2)}
                    style={{ '--ws-feature-journey-layer': journeyIndexes.length - distance } as CSSProperties}
                  >
                    <div className="ws-feature-journey__screen-copy">
                      <p>{t(`${config.key}.journey${index}Eyebrow`)}</p>
                      <span>
                        <MainIcon aria-hidden="true" size={18} />
                      </span>
                      <h3>{t(`${config.key}.journey${index}Title`)}</h3>
                      <p>{t(`${config.key}.journey${index}Desc`)}</p>
                      <div>
                        {[0, 1, 2].map((pillIndex) => (
                          <em key={pillIndex}>{t(`${config.key}.journey${index}Pill${pillIndex}`)}</em>
                        ))}
                      </div>
                    </div>
                    <div className="ws-feature-journey__media">
                      <div className="ws-feature-journey__media-grid">
                        {[0, 1, 2].map((cardIndex) => {
                          const CardIcon = config.journeyCardIcons[index][cardIndex];

                          return (
                            <article key={cardIndex} className="ws-feature-journey__mini-card">
                              <CardIcon size={20} aria-hidden="true" />
                              <h4>{t(`${config.key}.journey${index}Card${cardIndex}Title`)}</h4>
                              <p>{t(`${config.key}.journey${index}Card${cardIndex}Desc`)}</p>
                            </article>
                          );
                        })}
                      </div>
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
