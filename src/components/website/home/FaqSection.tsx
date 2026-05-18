'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';

const FAQ_COUNT = 9;

export default function FaqSection() {
  const t = useTranslations('Website');
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`Faq.q${i}`),
    a: t(`Faq.a${i}`),
  }));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SectionWrapper variant="subtle">
      <AnimateOnScroll>
        <SectionHeading
          title={t('Faq.title')}
          highlightedText={t('Faq.highlight')}
          centered
        />
      </AnimateOnScroll>

      <div
        style={{
          maxWidth: '720px',
          margin: 'var(--ws-space-12) auto 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ws-space-3)',
        }}
      >
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <AnimateStaggerChild key={faq.q} index={i}>
              <div
                style={{
                  backgroundColor: isOpen ? 'var(--ws-bg-primary)' : 'var(--ws-bg-primary)',
                  border: '1px solid var(--ws-border-default)',
                  borderRadius: 'var(--ws-radius-lg)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease',
                  boxShadow: isOpen ? '0 2px 12px rgba(37,99,235,0.08)' : 'none',
                }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--ws-space-4)',
                    padding: 'var(--ws-space-5) var(--ws-space-6)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  aria-expanded={isOpen}
                >
                  <span
                    className="ws-body-sm"
                    style={{
                      fontWeight: 600,
                      color: isOpen ? 'var(--ws-brand-secondary)' : 'var(--ws-text-primary)',
                      lineHeight: 1.5,
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {faq.q}
                  </span>
                  <LuChevronDown
                    size={18}
                    color={isOpen ? 'var(--ws-brand-secondary)' : 'var(--ws-text-muted)'}
                    style={{
                      flexShrink: 0,
                      transition: 'transform 0.3s ease, color 0.2s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Smooth height animation via max-height transition */}
                <div
                  style={{
                    maxHeight: isOpen ? '400px' : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.35s ease',
                  }}
                >
                  <div
                    style={{
                      padding: 'var(--ws-space-4) var(--ws-space-6) var(--ws-space-6)',
                      borderTop: '1px solid var(--ws-border-subtle)',
                    }}
                  >
                    <p
                      className="ws-body-sm"
                      style={{
                        lineHeight: 1.7,
                      }}
                    >
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            </AnimateStaggerChild>
          );
        })}
      </div>

      {/* FAQ schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
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
