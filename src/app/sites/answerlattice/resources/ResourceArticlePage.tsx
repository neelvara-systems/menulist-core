import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeResourceAnalytics from '../components/AnswerlatticeResourceAnalytics';
import PageProofStrip from '../components/PageProofStrip';
import {
    getAnswerlatticeRelatedResourceArticles,
    getAnswerlatticeResourceArticle,
} from '@/content/answerlatticePublic';
import AnswerlatticeResourceStructuredData from './ResourceStructuredData';

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function AnswerlatticeResourceArticlePage({ articlePath }: { articlePath: string }) {
    const basePath = getBasePath();
    const article = getAnswerlatticeResourceArticle(articlePath);

    if (!article) {
        return null;
    }

    const relatedArticles = getAnswerlatticeRelatedResourceArticles(article);

    return (
        <>
            <AnswerlatticeResourceStructuredData type="article" article={article} />
            <AnswerlatticeResourceAnalytics
                cluster={article.cluster}
                pageType="article"
                slug={article.slug}
            />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-5xl">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/resources"
                            className="mb-8 inline-flex text-sm font-semibold text-teal-200 transition hover:text-teal-100"
                        >
                            Resources
                        </AnswerlatticeLink>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">
                            Resource
                        </p>
                        <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                            {article.title}
                        </h1>
                        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0]">
                            {article.description}
                        </p>
                        <PageProofStrip
                            className="mt-8 max-w-6xl"
                            items={[
                                { label: 'Reading time', value: article.readingTime },
                                { label: 'Updated', value: article.updatedAt },
                                { label: 'Action', value: article.primaryCta.label },
                            ]}
                        />
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href={article.primaryCta.href}
                                data-answerlattice-event="resource_article_primary_cta_clicked"
                                data-answerlattice-category={article.cluster}
                                data-answerlattice-label={article.title}
                                className="inline-flex justify-center rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            >
                                {article.primaryCta.label}
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/get-started"
                                data-answerlattice-event="resource_article_get_started_clicked"
                                data-answerlattice-category={article.cluster}
                                data-answerlattice-label={article.title}
                                className="inline-flex justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                Start setup
                            </AnswerlatticeLink>
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
                        <article className="space-y-8">
                            <section className="rounded-[1.5rem] border border-teal-300/20 bg-teal-400/[0.055] p-6">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-200">
                                    Quick answer
                                </p>
                                <p className="text-lg leading-relaxed text-[#d6d6ef]">
                                    {article.quickAnswer}
                                </p>
                            </section>

                            {article.sections.map((section) => (
                                <section
                                    key={section.id}
                                    id={section.id}
                                    className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-6"
                                >
                                    <h2 className="text-2xl font-semibold leading-tight text-white">
                                        {section.title}
                                    </h2>
                                    {section.body?.map((paragraph) => (
                                        <p key={paragraph} className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">
                                            {paragraph}
                                        </p>
                                    ))}
                                    {section.bullets?.length ? (
                                        <ul className="mt-5 grid gap-3 md:grid-cols-2">
                                            {section.bullets.map((item) => (
                                                <li key={item} className="rounded-xl border border-white/[0.06] bg-[#09091a]/45 p-4 text-sm leading-relaxed text-[#d6d6ef]">
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                    {section.checklist?.length ? (
                                        <ul className="mt-5 space-y-3">
                                            {section.checklist.map((item) => (
                                                <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#d6d6ef]">
                                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </section>
                            ))}

                            {article.faq?.length ? (
                                <section className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-6">
                                    <h2 className="text-2xl font-semibold text-white">FAQ</h2>
                                    <div className="mt-5 space-y-4">
                                        {article.faq.map((item) => (
                                            <div key={item.question} className="border-t border-white/[0.06] pt-4 first:border-t-0 first:pt-0">
                                                <h3 className="text-base font-semibold text-white">{item.question}</h3>
                                                <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{item.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                        </article>

                        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.025] p-4">
                                <h2 className="text-sm font-semibold uppercase tracking-widest text-[#a0a0c0]">
                                    On this page
                                </h2>
                                <div className="mt-4 space-y-2">
                                    {article.sections.map((section) => (
                                        <a
                                            key={section.id}
                                            href={`#${section.id}`}
                                            className="block text-sm leading-relaxed text-[#d6d6ef] transition hover:text-teal-200"
                                        >
                                            {section.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                            {relatedArticles.length ? (
                                <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.025] p-4">
                                    <h2 className="text-sm font-semibold uppercase tracking-widest text-[#a0a0c0]">
                                        Related
                                    </h2>
                                    <div className="mt-4 space-y-3">
                                        {relatedArticles.map((related) => (
                                            <AnswerlatticeLink
                                                key={related.path}
                                                basePath={basePath}
                                                href={related.path}
                                                data-answerlattice-event="resource_related_clicked"
                                                data-answerlattice-category={article.cluster}
                                                data-answerlattice-label={related.title}
                                                className="block rounded-xl border border-white/[0.06] bg-[#09091a]/45 p-3 transition hover:border-teal-300/25 hover:bg-teal-400/[0.045]"
                                            >
                                                <span className="text-sm font-semibold text-white">{related.title}</span>
                                                <span className="mt-2 block text-xs leading-relaxed text-[#808099]">{related.description}</span>
                                            </AnswerlatticeLink>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </aside>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}

