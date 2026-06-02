import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import PageProofStrip from '../components/PageProofStrip';
import {
    AnswerlatticeInstallDocKey,
    ANSWERLATTICE_INSTALL_DOCS,
    getAnswerlatticeInstallDoc,
    getAnswerlatticeInstallDocsForNavigation,
} from '@lib/answerlattice/installContract/contract';

const FALLBACK_INSTALL_DOC = ANSWERLATTICE_INSTALL_DOCS.find((doc) => doc.key === 'overview') || ANSWERLATTICE_INSTALL_DOCS[0]!;

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

function resolveDoc(key: AnswerlatticeInstallDocKey) {
    return getAnswerlatticeInstallDoc(key) || FALLBACK_INSTALL_DOC;
}

export default function AnswerlatticeInstallContractPage({ docKey }: { docKey: AnswerlatticeInstallDocKey }) {
    const doc = resolveDoc(docKey);
    const basePath = getBasePath();
    const navDocs = getAnswerlatticeInstallDocsForNavigation();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">AnswerLattice Agent Install Layer</p>
                        <div className="grid gap-8 lg:grid-cols-[0.8fr_0.2fr] lg:items-end">
                            <div>
                                <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl">
                                    {doc.title}
                                </h1>
                                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#a0a0c0]">
                                    {doc.description}
                                </p>
                                <PageProofStrip
                                    className="mt-8"
                                    items={[
                                        { label: 'Install target', value: 'One v1 widget script in the app shell' },
                                        { label: 'Safe context', value: 'Path, title, feature, workflow, role, locale' },
                                        { label: 'Verification', value: 'Loaded, origin allowed, route allowed, context received' },
                                    ]}
                                />
                            </div>
                            <div className="flex flex-wrap gap-3 lg:justify-end">
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/agents/answerlattice/answerlattice-agent-kit.zip"
                                    className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
                                >
                                    Download agent kit
                                </AnswerlatticeLink>
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href={doc.markdownPath}
                                    className="rounded-xl border border-white/[0.12] px-5 py-3 text-sm font-semibold text-[#d6d6ef] hover:border-white/[0.24]"
                                >
                                    View Markdown
                                </AnswerlatticeLink>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-8">
                    <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-2">
                        {navDocs.map((item) => (
                            <AnswerlatticeLink
                                key={item.key}
                                basePath={basePath}
                                href={item.path}
                                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${item.key === doc.key
                                    ? 'border-teal-300/40 bg-teal-500/10 text-teal-100'
                                    : 'border-white/[0.08] text-[#a0a0c0] hover:border-white/[0.18] hover:text-white'
                                }`}
                            >
                                {item.navTitle}
                            </AnswerlatticeLink>
                        ))}
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-6">
                        {doc.sections.map((section) => (
                            <article key={section.heading} className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                                <h2 className="text-2xl font-semibold text-white">{section.heading}</h2>
                                {section.body ? (
                                    <p className="mt-3 max-w-4xl text-base leading-relaxed text-[#a0a0c0]">{section.body}</p>
                                ) : null}
                                {section.bullets?.length ? (
                                    <ul className="mt-4 grid gap-2 text-sm leading-relaxed text-[#d6d6ef] md:grid-cols-2">
                                        {section.bullets.map((item) => (
                                            <li key={item} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                {section.code ? (
                                    <pre className="mt-5 max-h-[38rem] overflow-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                        <code>{section.code}</code>
                                    </pre>
                                ) : null}
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
