import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';
import { ANSWERLATTICE_DEVELOPER_DOCS } from '../publicContent';

export const metadata: Metadata = {
    title: 'Developers',
    description: 'AnswerLattice developer docs for widget install, safe page context, verification, framework quickstarts, and agent install packets.',
    alternates: { canonical: '/developers' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const DEVELOPER_START_LINKS = [
    { label: 'Install overview', href: '/install', description: 'Agent packet, manual install, framework docs, and widget contract.' },
    { label: 'Developer quickstarts', href: '/quickstarts', description: 'Next.js, React, Vue/Nuxt, and vanilla script examples.' },
    { label: 'AI agent packet', href: '/install/ai-agent', description: 'Copyable instructions for coding agents installing the widget.' },
    { label: 'Widget contract', href: '/install/contracts.md', description: 'Stable v1 script URL, browser API, safe context, and compatibility policy.' },
];

export default function AnswerlatticeDevelopersPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/developers" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Developers</p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        Install the AnswerLattice widget with one stable contract.
                    </h1>
                    <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0]">
                        Developer docs stay focused on the public v1 widget, safe page context, dashboard-owned route controls, and verification. They do not expose private workspace data or dashboard APIs.
                    </p>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'Script', value: 'Stable v1 public URL' },
                            { label: 'Context', value: 'Safe page fields only' },
                            { label: 'Controls', value: 'Origins and blocked routes owned by AnswerLattice' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            className="mb-8"
                            eyebrow="Start here"
                            title="Use the shortest path for your install."
                            description="Most teams should start with the dashboard packet, then use quickstarts only where framework-specific placement matters."
                        />
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {DEVELOPER_START_LINKS.map((item) => (
                                <AnswerlatticeLink
                                    key={item.href}
                                    basePath={basePath}
                                    href={item.href}
                                    data-answerlattice-event="developer_resource_clicked"
                                    data-answerlattice-label={item.label}
                                    className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.025] p-5 transition hover:border-teal-300/25 hover:bg-teal-400/[0.045]"
                                >
                                    <h2 className="text-lg font-semibold text-white">{item.label}</h2>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{item.description}</p>
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            className="mb-8"
                            eyebrow="Focused docs"
                            title="Read the parts that protect runtime safety."
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                            {ANSWERLATTICE_DEVELOPER_DOCS.map((doc) => (
                                <AnswerlatticeLink
                                    key={doc.path}
                                    basePath={basePath}
                                    href={doc.path}
                                    data-answerlattice-event="developer_doc_clicked"
                                    data-answerlattice-label={doc.title}
                                    className="rounded-[1.5rem] border border-white/[0.06] bg-[#09091a]/45 p-6 transition hover:border-teal-300/25 hover:bg-teal-400/[0.045]"
                                >
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-200">{doc.eyebrow}</p>
                                    <h2 className="text-2xl font-semibold text-white">{doc.title.replace(' | AnswerLattice Developers', '')}</h2>
                                    <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">{doc.metaDescription}</p>
                                    <span className="mt-6 inline-block text-sm font-semibold text-teal-200">Open doc</span>
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
