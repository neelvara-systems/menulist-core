import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import { CANONICA_PRODUCT_AREAS } from '../productAreas';

export const metadata: Metadata = {
    title: 'Resources',
    description: 'Canonica resources for launch setup, page-aware support, widget install, updates, security, and common buyer questions.',
    alternates: { canonical: '/resources' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const RESOURCE_GROUPS = [
    {
        title: 'Evaluate Canonica',
        items: [
            ['Static product demo', '/demo', 'Try page-aware support without creating an account.'],
            ['Pricing', '/pricing', 'See the current Starter, Growth, and Studio packaging.'],
            ['FAQ', '/faq', 'Answers for setup, widget context, fallback, pricing, and data handling.'],
        ],
    },
    {
        title: 'Understand the fit',
        items: [
            ['Use cases', '/use-cases', 'Map Canonica to billing, onboarding, settings, releases, and tickets.'],
            ['Page-aware support widget', '/page-aware-support-widget', 'See how product-page context changes the answer.'],
            ['Support widget for solo founders', '/support-widget-for-solo-founders', 'Launch support before hiring a support team.'],
        ],
    },
    {
        title: 'Plan the rollout',
        items: [
            ['Widget and hosted help', '/install', 'Understand the script, allowed origins, blocked routes, hosted help domains, runtime verification, and context passing.'],
            ['Hosted help center for SaaS', '/hosted-help-center-for-saas', 'Publish docs, FAQ, and changelog on a support domain.'],
            ['Security', '/security', 'Review tenant isolation, widget origin controls, and owner-approved authority.'],
        ],
    },
    {
        title: 'Track product movement',
        items: [
            ['Updates', '/updates', 'Read recent Canonica product and website changes.'],
            ['Get started', '/get-started', 'Create a workspace and land in the Activation Command Center.'],
            ['Contact', '/contact', 'Ask for setup help or partnership details.'],
        ],
    },
];

export default function CanonicaResourcesPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Resources</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Everything needed to evaluate and launch Canonica.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Start with the demo, review the launch model, then use the widget install and security pages to plan a clean rollout.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto mb-12 max-w-6xl rounded-[1.75rem] border border-indigo-500/20 bg-indigo-500/[0.055] p-6">
                        <div className="mb-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Product pages</p>
                                <h2 className="text-2xl font-bold text-white">Start with the part you need to evaluate.</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-[#d6d6ef]">
                                Canonica is split into product-area pages so setup, widget, support operations, and governance can each stand on their own.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {CANONICA_PRODUCT_AREAS.map((area) => (
                                <CanonicaLink
                                    key={area.href}
                                    basePath={basePath}
                                    href={area.href}
                                    className="rounded-xl border border-white/[0.08] bg-[#09091a]/45 p-4 transition hover:border-white/[0.18] hover:bg-[#09091a]/65"
                                >
                                    <div className="text-sm font-semibold text-white">{area.label}</div>
                                    <p className="mt-2 text-xs leading-relaxed text-[#a0a0c0]">{area.description}</p>
                                </CanonicaLink>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {RESOURCE_GROUPS.map((group) => (
                            <article key={group.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h2 className="mb-5 text-xl font-semibold text-white">{group.title}</h2>
                                <div className="space-y-4">
                                    {group.items.map(([label, href, description]) => (
                                        <CanonicaLink
                                            key={href}
                                            basePath={basePath}
                                            href={href}
                                            className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-indigo-500/30 hover:bg-white/[0.04]"
                                        >
                                            <div className="text-sm font-semibold text-[#d6d6ef]">{label}</div>
                                            <p className="mt-1 text-sm leading-relaxed text-[#808099]">{description}</p>
                                        </CanonicaLink>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
