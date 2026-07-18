"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@shadcncomponents/accordion";
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';

const pricingFaqCategories = ['gettingStarted', 'plans', 'enhancements'] as const;

const pricingFaqItems = [
    { category: 'gettingStarted', key: 'setupTime' },
    { category: 'gettingStarted', key: 'technicalKnowledge' },
    { category: 'gettingStarted', key: 'afterSubscribe' },
    { category: 'gettingStarted', key: 'dayEight' },
    { category: 'plans', key: 'choosePlan' },
    { category: 'plans', key: 'upgrade' },
    { category: 'plans', key: 'included' },
    { category: 'plans', key: 'refund' },
    { category: 'enhancements', key: 'credits' },
    { category: 'enhancements', key: 'unusedCredits' },
    { category: 'enhancements', key: 'customDomain' },
] as const;

const PricingFaq = () => {
    const t = useTranslations('Website');
    const [activeFilter, setActiveFilter] = useState<(typeof pricingFaqCategories)[number]>('gettingStarted');
    const filteredFaqs = pricingFaqItems.filter((faq) => faq.category === activeFilter);

    return (
        <section className="ws-section ws-section--subtle">
            <div className="ws-container">
                <AnimateOnScroll>
                    <div style={{ marginBottom: 'var(--ws-space-10)' }}>
                        <SectionHeading
                            title={t('Pricing.faqTitle')}
                            subtitle={t('Pricing.faqSubtitle')}
                            centered
                        />
                    </div>
                </AnimateOnScroll>

                <div
                    role="group"
                    aria-label={t('Pricing.faqCategoryLabel')}
                    style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-2)', marginBottom: 'var(--ws-space-10)', flexWrap: 'wrap' }}
                >
                    {pricingFaqCategories.map((category, index) => (
                        <AnimateStaggerChild key={category} index={index}>
                            <button
                                type="button"
                                aria-pressed={activeFilter === category}
                                onClick={() => setActiveFilter(category)}
                                style={{
                                    padding: '6px 18px',
                                    borderRadius: '20px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    border: `1px solid ${activeFilter === category ? 'var(--ws-brand-secondary)' : 'var(--ws-border-default)'}`,
                                    backgroundColor: activeFilter === category ? 'var(--ws-brand-secondary)' : 'transparent',
                                    color: activeFilter === category ? '#fff' : 'var(--ws-text-secondary)',
                                    transition: 'all var(--ws-transition-fast)',
                                }}
                            >
                                {t(`Pricing.faqCategory${category[0].toUpperCase()}${category.slice(1)}`)}
                            </button>
                        </AnimateStaggerChild>
                    ))}
                </div>

                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <Accordion type="single" collapsible className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                        {filteredFaqs.map((faq, index) => (
                            <AnimateStaggerChild key={faq.key} index={index}>
                                <AccordionItem
                                    value={faq.key}
                                    style={{
                                        background: 'var(--ws-bg-primary)',
                                        border: '1px solid var(--ws-border-default)',
                                        borderRadius: 'var(--ws-radius-lg)',
                                        padding: '0 var(--ws-space-2)',
                                    }}
                                >
                                    <AccordionTrigger className="hover:no-underline py-4 px-4">
                                        <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--ws-text-primary)', textAlign: 'left' }}>
                                            {t(`Pricing.faq${faq.key[0].toUpperCase()}${faq.key.slice(1)}Question`)}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4" style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--ws-text-secondary)' }}>
                                        <p>{t(`Pricing.faq${faq.key[0].toUpperCase()}${faq.key.slice(1)}Answer`)}</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </AnimateStaggerChild>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
};

export default PricingFaq;
