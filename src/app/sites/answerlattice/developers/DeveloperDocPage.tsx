import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';
import { getAnswerlatticeDeveloperDoc } from '../publicContent';

function getBasePath(): string {
    try {
        const h = headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function AnswerlatticeDeveloperDocPage({ docPath }: { docPath: string }) {
    const basePath = getBasePath();
    const doc = getAnswerlatticeDeveloperDoc(docPath);

    if (!doc) {
        return null;
    }

    return (
        <>
            <AnswerlatticePageStructuredData path={doc.path} />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">{doc.eyebrow}</p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">{doc.heroTitle}</h1>
                    <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0]">{doc.heroDescription}</p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/install"
                            data-answerlattice-event="developer_install_clicked"
                            data-answerlattice-label={doc.title}
                            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                        >
                            Open install guide
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/quickstarts"
                            data-answerlattice-event="developer_quickstarts_clicked"
                            data-answerlattice-label={doc.title}
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                        >
                            View quickstarts
                        </AnswerlatticeLink>
                    </div>
                    <PageProofStrip className="mx-auto mt-8 max-w-6xl text-left" items={doc.proof} />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-5xl">
                        <SectionHeader
                            className="mb-8"
                            eyebrow="Implementation notes"
                            title="Keep the install small and verifiable."
                            description="AnswerLattice developer docs focus on the v1 widget contract, dashboard-owned route settings, safe browser context, and verification."
                        />
                        <div className="space-y-5">
                            {doc.sections.map((section) => (
                                <article key={section.title} className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-6">
                                    <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{section.description}</p>
                                    <ul className="mt-5 grid gap-3 md:grid-cols-3">
                                        {section.bullets.map((item) => (
                                            <li key={item} className="rounded-xl border border-white/[0.06] bg-[#09091a]/45 p-4 text-sm leading-relaxed text-[#d6d6ef]">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
