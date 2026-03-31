
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
    // == Understanding Our Plans ==
    {
        category: 'Understanding Our Plans',
        question: `What's the difference between the Starter, Pro, and Premium plans?`,
        answer: (
            <div className="space-y-2">
                <p>Each plan is designed for a different stage of your business:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                    <li><strong>Starter</strong> gets your business online with one complete project, AI content generation, and your official business page.</li>
                    <li><strong>Pro</strong> is built for growing businesses — more projects, custom domains, full analytics, and higher AI usage limits.</li>
                    <li><strong>Premium</strong> is for businesses that need maximum creative power, with the highest credit allowance and access to all advanced features.</li>
                </ul>
            </div>
        )
    },
    {
        category: 'Understanding Our Plans',
        question: `What is a "Project"?`,
        answer: (
            <p>A Project is a complete digital catalog for your business. Each Project has its own items, categories, design, URL, and analytics. For example, a business might have separate projects for &quot;Food Menu&quot; and &quot;Bar Menu&quot;.</p>
        )
    },
    {
        category: 'Understanding Our Plans',
        question: `Do you offer a free trial?`,
        answer: (
            <p>Our Starter plan is priced to let you experience the full platform at minimal cost. You can also contact us for a live demo before subscribing.</p>
        )
    },
    {
        category: 'Understanding Our Plans',
        question: `Can I change my plan later?`,
        answer: (
            <p>Yes. You can upgrade or downgrade at any time from your billing settings. Upgrades happen instantly with prorated billing. Downgrades take effect at the end of your current billing cycle.</p>
        )
    },
    {
        category: 'Understanding Our Plans',
        question: `What is your refund policy?`,
        answer: (
            <div className="space-y-2">
                <p>MenuList has a no-refund policy for subscriptions and credit pack purchases, as AI processing costs are incurred immediately.</p>
                <p>We recommend starting with the Starter plan to experience the platform before upgrading. You can cancel at any time to prevent future charges.</p>
            </div>
        )
    },
    {
        category: 'Understanding Our Plans',
        question: `What's included with every plan?`,
        answer: (
            <div className="space-y-2">
                <p>Every plan includes:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                    <li>AI-powered data extraction from photos, PDFs, or typed input</li>
                    <li>AI descriptions, translations, and image generation</li>
                    <li>Official Business Page with your menu, hours, contact, and Google rating</li>
                    <li>QR menu, shareable link, digital screen display, and PDF export</li>
                    <li>Real-time open/closed status and live updates across all surfaces</li>
                </ul>
            </div>
        )
    },
    // == About AI Credits ==
    {
        category: 'About AI Credits',
        question: `What are AI Credits?`,
        answer: (
            <div className="space-y-2">
                <p>AI Credits are used for advanced creative operations like image generation and editing. Core features like data extraction, descriptions, and translations are included with your plan and do not use credits.</p>
                <p>Credits are consumed when you:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                    <li><strong>Generate images</strong> for your menu items</li>
                    <li><strong>Edit images</strong> with AI-powered tools</li>
                    <li><strong>Batch generate</strong> images across your entire catalog</li>
                </ul>
            </div>
        )
    },
    {
        category: 'About AI Credits',
        question: `What happens to unused credits?`,
        answer: (
            <p>Monthly credits reset at the start of each billing cycle and do not roll over. If you need more credits, you can purchase a Credit Pack from your dashboard — these top-up credits do not expire.</p>
        )
    },
    // == Your Business Page ==
    {
        category: 'Your Business Page',
        question: `What is the Official Business Page?`,
        answer: (
            <div className="space-y-2">
                <p>Your Official Business Page is a single link you share everywhere — WhatsApp, Instagram bio, Google Business, packaging, and QR codes. It shows your menu, hours, contact info, Google rating, and photos.</p>
                <p>It&apos;s auto-generated, always up to date, and included with every plan at no extra cost.</p>
            </div>
        )
    },
    {
        category: 'Your Business Page',
        question: `Can I use my own domain?`,
        answer: (
            <p>Yes. Pro and Premium plans include custom domain support. You can connect your own domain (e.g., joespizza.com) so customers see your brand, not ours.</p>
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