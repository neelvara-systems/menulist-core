import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LuArrowRight, LuCheckCircle2 } from 'react-icons/lu';
import type { WebsiteIndustryPage } from '@/content/websiteIndustries';
import WebsiteButton from '../shared/WebsiteButton';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';

interface IndustryLandingPageProps {
    page: WebsiteIndustryPage;
}

export default function IndustryLandingPage({ page }: IndustryLandingPageProps) {
    const t = useTranslations('Website');

    return (
        <main className="ws-industry-page">
            <section className="ws-industry-hero">
                <div className="ws-container ws-industry-hero__inner">
                    <AnimateOnScroll preset="hero">
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
                    </AnimateOnScroll>
                </div>
            </section>

            <section className="ws-section">
                <div className="ws-container ws-industry-summary">
                    <AnimateOnScroll preset="card">
                        <p className="ws-page-hero__eyebrow">{t('Industry.bestFit')}</p>
                        <WebsiteHeadline as="h2" text={page.audience} />
                    </AnimateOnScroll>
                    <div className="ws-industry-proof-grid">
                        {page.proof.map((item, index) => (
                            <AnimateStaggerChild key={item} index={index} preset="card">
                              <div className="ws-industry-proof-item">
                                <LuCheckCircle2 size={18} />
                                <span>{item}</span>
                              </div>
                            </AnimateStaggerChild>
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section ws-section--subtle">
                <div className="ws-container">
                    <AnimateOnScroll preset="card" className="ws-industry-section-heading">
                        <p className="ws-page-hero__eyebrow">{t('Industry.howMenuListFits')}</p>
                        <WebsiteHeadline as="h2" text={t('Industry.fitSectionTitle')} />
                    </AnimateOnScroll>
                    <div className="ws-industry-fit-grid">
                        {page.fit.map((item, index) => (
                            <AnimateStaggerChild key={item} index={index} preset="card">
                              <div className="ws-industry-fit-card">
                                <span aria-hidden="true" />
                                <p>{item}</p>
                              </div>
                            </AnimateStaggerChild>
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section">
                <div className="ws-container ws-industry-resources">
                    <AnimateOnScroll preset="card">
                        <p className="ws-page-hero__eyebrow">{t('Industry.relatedResources')}</p>
                        <WebsiteHeadline as="h2" text={t('Industry.resourcesSectionTitle')} />
                    </AnimateOnScroll>
                    <div className="ws-industry-resource-links">
                        {page.resourceLinks.map((item, index) => (
                            <AnimateStaggerChild key={item.href} index={index} preset="card">
                              <Link href={item.href} className="ws-industry-resource-link">
                                {item.label}
                                <LuArrowRight size={16} />
                              </Link>
                            </AnimateStaggerChild>
                        ))}
                    </div>
                </div>
            </section>

            <section className="ws-section ws-section--subtle">
                <div className="ws-container">
                    <AnimateOnScroll preset="card" className="ws-industry-section-heading">
                        <WebsiteHeadline as="h2" text={t('Industry.questionsTitle')} />
                    </AnimateOnScroll>
                    <div className="ws-resource-faq__grid">
                        {page.faq.map((item, index) => (
                            <AnimateStaggerChild key={item.question} index={index} preset="card">
                              <div className="ws-resource-faq__item">
                                <h3>{item.question}</h3>
                                <p>{item.answer}</p>
                              </div>
                            </AnimateStaggerChild>
                        ))}
                    </div>
                    <AnimateOnScroll preset="footer" className="ws-industry-final-cta">
                        <WebsiteButton href={page.ctaPath}>{page.ctaLabel}</WebsiteButton>
                    </AnimateOnScroll>
                </div>
            </section>
        </main>
    );
}
