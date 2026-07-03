'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuArrowRight, LuChevronDown } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import Link from '../shared/WebsiteLink';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

const FAQ_COUNT = 16;

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function FaqPage() {
  const t = useTranslations('Website');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`Faq.q${i}`),
    a: t(`Faq.a${i}`),
  }));

  return (
    <main className="ws-faq-page">
      <section className="ws-faq-page-hero">
        <div className="ws-container ws-faq-page-hero__inner">
          <AnimateOnScroll preset="hero" className="ws-faq-page-hero__copy">
            <p className="ws-page-hero__eyebrow">{t('FaqPage.eyebrow')}</p>
            <WebsiteHeadline
              as="h1"
              text={t('FaqPage.title')}
              highlightedText={t('FaqPage.highlight')}
            />
            <p className="ws-faq-page-hero__subtitle">{t('FaqPage.subtitle')}</p>
            <div className="ws-faq-page-hero__actions">
              <WebsiteButton href="/create-menu">{t('FaqPage.primaryCta')}</WebsiteButton>
              <Link href="/pricing" className="ws-faq-page-hero__secondary">
                {t('FaqPage.secondaryCta')} <LuArrowRight size={16} />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="ws-section ws-section--subtle">
        <div className="ws-container">
          <AnimateOnScroll className="ws-faq-page__heading">
            <h2>{t('FaqPage.sectionTitle')}</h2>
            <p>{t('FaqPage.sectionSubtitle')}</p>
          </AnimateOnScroll>

          <div className="ws-faq-page__list">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <AnimateStaggerChild key={faq.q} index={index} className="ws-faq-page__item">
                  <button
                    type="button"
                    className="ws-faq-page__trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span>{faq.q}</span>
                    <LuChevronDown size={18} aria-hidden="true" />
                  </button>

                  <div className="ws-faq-page__answer-wrap" data-open={isOpen}>
                    <div className="ws-faq-page__answer">
                      <p>{faq.a}</p>
                    </div>
                  </div>
                </AnimateStaggerChild>
              );
            })}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </main>
  );
}
