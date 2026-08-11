import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeConceptIllustration from '../components/AnswerlatticeConceptIllustration';
import PageProofStrip from '../components/PageProofStrip';
import {
    AnswerlatticeInstallDocKey,
    ANSWERLATTICE_INSTALL_DOCS,
    getAnswerlatticeInstallDoc,
    getAnswerlatticeInstallDocsForNavigation,
} from '@lib/answerlattice/installContract/contract';

const FALLBACK_INSTALL_DOC = ANSWERLATTICE_INSTALL_DOCS.find((doc) => doc.key === 'overview') || ANSWERLATTICE_INSTALL_DOCS[0]!;

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

function resolveDoc(key: AnswerlatticeInstallDocKey) {
    return getAnswerlatticeInstallDoc(key) || FALLBACK_INSTALL_DOC;
}

export default async function AnswerlatticeInstallContractPage({ docKey }: { docKey: AnswerlatticeInstallDocKey }) {
    const doc = resolveDoc(docKey);
    const basePath = await getBasePath();
    const navDocs = getAnswerlatticeInstallDocsForNavigation();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="al-page-hero">
                    <div className="al-page-hero__inner">
                        <p className="al-page-hero__eyebrow">Install AnswerLattice</p>
                        <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
                            <div>
                                <h1 className="al-page-hero__title">
                                    {doc.title}
                                </h1>
                                <p className="al-page-hero__description">
                                    {doc.description}
                                </p>
                                <PageProofStrip
                                    className="al-page-hero__proof"
                                    items={[
                                        { label: 'Install target', value: 'One v1 widget script in the app shell' },
                                        { label: 'Safe context', value: 'Path, title, feature, workflow, role, locale' },
                                        { label: 'Verification', value: 'Loaded, origin allowed, route allowed, context received' },
                                    ]}
                                />
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <AnswerlatticeLink
                                        basePath={basePath}
                                        href="/agents/answerlattice/answerlattice-agent-kit.zip"
                                        className="al-page-hero__button al-page-hero__button--primary"
                                    >
                                        Download agent kit
                                    </AnswerlatticeLink>
                                    <AnswerlatticeLink
                                        basePath={basePath}
                                        href={doc.markdownPath}
                                        className="al-page-hero__button al-page-hero__button--secondary"
                                    >
                                        View Markdown
                                    </AnswerlatticeLink>
                                </div>
                            </div>
                            <AnswerlatticeConceptIllustration variant="install-verification" />
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
