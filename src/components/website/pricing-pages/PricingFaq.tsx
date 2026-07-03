
"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@shadcncomponents/accordion";
import { useState } from 'react';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import SectionHeading from '../shared/SectionHeading';

const pricingFaqData = [
    // == Getting Started ==
    {
        category: 'Getting Started',
        question: `How long does setup take?`,
        answer: (
            <p>Most businesses can prepare the first version quickly after upload and owner review.</p>
        )
    },
    {
        category: 'Getting Started',
        question: `Do I need technical knowledge?`,
        answer: (
            <p>No. Everything works without setup or coding.</p>
        )
    },
    {
        category: 'Getting Started',
        question: `What happens after I subscribe?`,
        answer: (
            <p>Your public menu link stays the same and becomes the permanent workspace for updates, QR, and customer sharing.</p>
        )
    },
    // == Understanding Plans ==
    {
        category: 'Understanding Plans',
        question: `Which plan should I choose?`,
        answer: (
            <div className="space-y-2">
                <p>Choose based on your stage:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                    <li><strong>Starter</strong>: keep one public menu live with QR and basic updates.</li>
                    <li><strong>Pro</strong>: improve presentation, languages, owner controls, and content enhancement capacity.</li>
                    <li><strong>Premium</strong>: manage multiple locations with central governance.</li>
                </ul>
            </div>
        )
    },
    {
        category: 'Understanding Plans',
        question: `Can I upgrade later?`,
        answer: (
            <p>Yes. Move from Starter to Pro or Premium anytime without losing data. Upgrades are handled through the billing flow with prorated billing where applicable.</p>
        )
    },
    {
        category: 'Understanding Plans',
        question: `What's included with every plan?`,
        answer: (
            <div className="space-y-2">
                <p>Every plan includes:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                    <li>QR menu, web menu, and shareable link</li>
                    <li>Official Business Page with hours, contact, and menu</li>
                    <li>Owner-approved menu updates from one source</li>
                    <li>Stable customer-facing URL after activation</li>
                    <li>Real-time updates across all surfaces</li>
                </ul>
            </div>
        )
    },
    {
        category: 'Understanding Plans',
        question: `What is your refund policy?`,
        answer: (
            <p>MenuList has a no-refund policy because processing costs are incurred immediately. You can cancel anytime to prevent future charges.</p>
        )
    },
    // == Content & Credits ==
    {
        category: 'Content & Credits',
        question: `How do credits work?`,
        answer: (
            <p>Credits are used for AI enhancement work such as generated images, descriptions, translations, and edits. Your core public menu, QR, and link do not depend on unlimited generation.</p>
        )
    },
    {
        category: 'Content & Credits',
        question: `What happens to unused credits?`,
        answer: (
            <p>Monthly credits reset each billing cycle. Purchased credit packs do not expire.</p>
        )
    },
    {
        category: 'Content & Credits',
        question: `Can I use my own domain?`,
        answer: (
            <p>Yes. Pro and Premium plans include custom domain support so customers see your brand, not ours.</p>
        )
    },
];

const PricingFaq = () => {
    const categories = new Set(pricingFaqData.map(item => item.category));
    const [activeFilter, setActiveFilter] = useState<string>(Array.from(categories)[0]);

    const filteredFaqs = pricingFaqData.filter(faq => faq.category === activeFilter);

    return (
        <section className="ws-section ws-section--subtle">
            <div className="ws-container">
                <AnimateOnScroll>
                    <div style={{ marginBottom: 'var(--ws-space-10)' }}>
                        <SectionHeading
                            title="Frequently Asked Questions"
                            subtitle="Here is a list of answers to the most common questions about our plans and pricing."
                            centered
                        />
                    </div>
                </AnimateOnScroll>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-2)', marginBottom: 'var(--ws-space-10)', flexWrap: 'wrap' }}>
                    {Array.from(categories).map((category, index) => (
                        <AnimateStaggerChild key={category} index={index}>
                            <button
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
                                {category}
                            </button>
                        </AnimateStaggerChild>
                    ))}
                </div>

                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <Accordion type="single" collapsible className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                        {filteredFaqs.map((faq, index) => (
                            <AnimateStaggerChild key={index} index={index}>
                                <AccordionItem
                                    value={`item-${index}`}
                                    style={{
                                        background: 'var(--ws-bg-primary)',
                                        border: '1px solid var(--ws-border-default)',
                                        borderRadius: 'var(--ws-radius-lg)',
                                        padding: '0 var(--ws-space-2)',
                                    }}
                                >
                                    <AccordionTrigger className="hover:no-underline py-4 px-4">
                                        <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--ws-text-primary)', textAlign: 'left' }}>
                                            {faq.question}
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4" style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--ws-text-secondary)' }}>
                                        {faq.answer}
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
