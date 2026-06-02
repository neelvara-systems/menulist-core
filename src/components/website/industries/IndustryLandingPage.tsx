import Link from 'next/link';
import { LuArrowRight, LuCheckCircle2 } from 'react-icons/lu';
import type { WebsiteIndustryPage } from '@/content/websiteIndustries';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';

interface IndustryLandingPageProps {
    page: WebsiteIndustryPage;
}

export default function IndustryLandingPage({ page }: IndustryLandingPageProps) {
    return (
        <main className="ws-industry-page">
            <section className="ws-industry-hero">
                <div className="ws-container ws-industry-hero__inner">
                    <p className="ws-page-hero__eyebrow">{page.eyebrow}</p>
                    <WebsiteHeadline
                        as="h1"
                        text={page.title}
                        highlightedText={page.highlight}
                    />
                    <p className="ws-industry-hero__description">{page.description}</p>
                    <div className="ws-industry-hero__actions">
                        <WebsiteButton href={page.ctaPath}>{page.ctaLabel}</WebsiteButton>
                        <WebsiteButton href={page.secondaryCtaPath} variant="ghost">
                            {page.secondaryCtaLabel}
                        </WebsiteButton>
                    </div>
                </div>
            </section>

            <section className="ws-section">
                <div className="ws-container ws-industry-summary">
                    <div>
                        <p className="ws-page-hero__eyebrow">Best fit</p>
                        <WebsiteHeadline as="h2" text={page.audience} />
                    </div>
                    <div className="ws-industry-proof-grid">
                        {page.proof.map((item) => (
                            <div key={item} className="ws-industry-proof-item">
                                <LuCheckCircle2 size={18} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section ws-section--subtle">
                <div className="ws-container">
                    <div className="ws-industry-section-heading">
                        <p className="ws-page-hero__eyebrow">How MenuList fits</p>
                        <WebsiteHeadline as="h2" text="Keep the public menu current without adding another public source." />
                    </div>
                    <div className="ws-industry-fit-grid">
                        {page.fit.map((item) => (
                            <div key={item} className="ws-industry-fit-card">
                                <span aria-hidden="true" />
                                <p>{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section">
                <div className="ws-container ws-industry-resources">
                    <div>
                        <p className="ws-page-hero__eyebrow">Related resources</p>
                        <WebsiteHeadline as="h2" text="Read the guides that match this business type." />
                    </div>
                    <div className="ws-industry-resource-links">
                        {page.resourceLinks.map((item) => (
                            <Link key={item.href} href={item.href} className="ws-industry-resource-link">
                                {item.label}
                                <LuArrowRight size={16} />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section ws-section--subtle">
                <div className="ws-container">
                    <div className="ws-industry-section-heading">
                        <WebsiteHeadline as="h2" text="Questions owners ask" />
                    </div>
                    <div className="ws-resource-faq__grid">
                        {page.faq.map((item) => (
                            <div key={item.question} className="ws-resource-faq__item">
                                <h3>{item.question}</h3>
                                <p>{item.answer}</p>
                            </div>
                        ))}
                    </div>
                    <div className="ws-industry-final-cta">
                        <WebsiteButton href={page.ctaPath}>{page.ctaLabel}</WebsiteButton>
                    </div>
                </div>
            </section>
        </main>
    );
}
