
"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@shadcncomponents/accordion";
import { useState } from 'react';
import SectionHeading from '../shared/SectionHeading';

const pricingFaqData = [
    // == Getting Started ==
    {
        category: 'Getting Started',
        question: `How long does setup take?`,
        answer: (
            <p>Go live in minutes.</p>
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
            <p>Upload your menu, review it, and publish instantly.</p>
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
                    <li><strong>Starter</strong> — getting your menu online quickly with one outlet.</li>
                    <li><strong>Pro</strong> — full presentation control, AI content, multi-language, and branding. Most restaurants choose this.</li>
                    <li><strong>Premium</strong> — central control across multiple outlets with consistent branding.</li>
                </ul>
            </div>
        )
    },
    {
        category: 'Understanding Plans',
        question: `Can I upgrade later?`,
        answer: (
            <p>Yes. Move from Starter to Pro or Premium anytime without losing data. Upgrades happen instantly with prorated billing.</p>
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
                    <li>AI data extraction from images, PDFs, or links</li>
                    <li>AI descriptions, translations, and image generation</li>
                    <li>Real-time updates across all surfaces</li>
                </ul>
            </div>
        )
    },
    {
        category: 'Understanding Plans',
        question: `What is your refund policy?`,
        answer: (
            <p>MenuList has a no-refund policy as AI processing costs are incurred immediately. You can cancel anytime to prevent future charges.</p>
        )
    },
    // == AI & Credits ==
    {
        category: 'AI & Credits',
        question: `How does AI usage work?`,
        answer: (
            <p>AI runs on credits. Core features like data extraction and descriptions are included. Credits are used for image generation and editing. Each plan includes a monthly allowance, and you can top up anytime.</p>
        )
    },
    {
        category: 'AI & Credits',
        question: `What happens to unused credits?`,
        answer: (
            <p>Monthly credits reset each billing cycle. Purchased credit packs do not expire.</p>
        )
    },
    {
        category: 'AI & Credits',
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
                <div style={{ marginBottom: 'var(--ws-space-10)' }}>
                    <SectionHeading
                        title="Frequently Asked Questions"
                        subtitle="Here is a list of answers to the most common questions about our plans and pricing."
                        centered
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-2)', marginBottom: 'var(--ws-space-10)', flexWrap: 'wrap' }}>
                    {Array.from(categories).map(category => (
                        <button
                            key={category}
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
                    ))}
                </div>

                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <Accordion type="single" collapsible className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
                        {filteredFaqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
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
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
};

export default PricingFaq;