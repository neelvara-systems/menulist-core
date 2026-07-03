'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuArrowRight, LuChevronDown } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import Link from '../shared/WebsiteLink';

const HOME_FAQ_INDEXES = [0, 1, 7, 10, 11, 12];

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function FaqSection() {
  const t = useTranslations('Website');
  const faqs = HOME_FAQ_INDEXES.map((faqIndex) => ({
    q: t(`Faq.q${faqIndex}`),
    a: t(`Faq.a${faqIndex}`),
  }));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SectionWrapper variant="subtle" className="ws-home-faq">
      <AnimateOnScroll>
        <SectionHeading
          title={t('Faq.title')}
          highlightedText={t('Faq.highlight')}
          subtitle={t('Faq.homeSubtitle')}
          centered
        />
      </AnimateOnScroll>

      <div className="ws-home-faq__list">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <AnimateStaggerChild key={faq.q} index={i}>
              <div className="ws-home-faq__item" data-open={isOpen}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="ws-home-faq__trigger"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <LuChevronDown
                    size={18}
                    aria-hidden="true"
                  />
                </button>

                <div
                  className="ws-home-faq__answer-wrap"
                  data-open={isOpen}
                >
                  <div className="ws-home-faq__answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            </AnimateStaggerChild>
          );
        })}
      </div>

      <AnimateOnScroll className="ws-home-faq__more" delay={0.08}>
        <Link href="/faq">
          {t('Faq.viewAllCta')} <LuArrowRight size={16} />
        </Link>
      </AnimateOnScroll>

      {/* FAQ schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </SectionWrapper>
  );
}
