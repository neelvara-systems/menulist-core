'use client';

import AnimateOnScroll from './AnimateOnScroll';
import WebsiteButton from './WebsiteButton';
import WebsiteHeadline from './WebsiteHeadline';

type HeadlinePart = {
  text: string;
  highlight?: boolean;
};

interface WebsitePageHeroProps {
  eyebrow?: string;
  title?: string;
  highlightedText?: string;
  parts?: HeadlinePart[];
  subtitle?: string;
  primaryCta?: string;
  primaryHref?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function WebsitePageHero({
  eyebrow,
  title,
  highlightedText,
  parts,
  subtitle,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  children,
  className = '',
}: WebsitePageHeroProps) {
  return (
    <section className={`ws-page-hero ${className}`}>
      <div className="ws-container ws-page-hero__inner">
        <AnimateOnScroll>
          {eyebrow && <p className="ws-page-hero__eyebrow">{eyebrow}</p>}
          <WebsiteHeadline
            as="h1"
            parts={parts}
            text={title}
            highlightedText={highlightedText}
          />
          {subtitle && <p className="ws-page-hero__subtitle">{subtitle}</p>}
          {(primaryCta && primaryHref) || (secondaryCta && secondaryHref) ? (
            <div className="ws-page-hero__actions">
              {primaryCta && primaryHref && (
                <WebsiteButton href={primaryHref}>{primaryCta}</WebsiteButton>
              )}
              {secondaryCta && secondaryHref && (
                <WebsiteButton href={secondaryHref} variant="ghost">{secondaryCta}</WebsiteButton>
              )}
            </div>
          ) : null}
        </AnimateOnScroll>
        {children}
      </div>
    </section>
  );
}
