import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import OnboardingForm from './OnboardingForm';

export const metadata: Metadata = {
    title: 'Get Started',
    description: 'Create your Canonica workspace, configure a widget, publish a branded help domain, and launch page-aware support for your SaaS product.',
    alternates: { canonical: '/get-started' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const CRITERIA = [
    { label: 'One live or near-live SaaS product', description: 'A product with real users, billing, onboarding, settings, or release notes.' },
    { label: 'Small team or solo founder', description: 'You need support to work before you build a full support team.' },
    { label: 'Existing help content', description: 'Docs, FAQs, tickets, changelogs, or starter answers Canonica can learn from.' },
    { label: 'Known product pages', description: 'Billing, onboarding, settings, account, team, connected app, or release pages where users ask questions.' },
    { label: 'Owner-reviewed answers', description: 'You want approved answers before fallback automation becomes authoritative.' },
    { label: 'Widget and help domain access', description: 'You can add a script, pass safe page context, and connect a support domain such as help.yourapp.com.' },
];

const FIRST_SESSION = [
    'Sign in with Google',
    'Add company and product name',
    'Choose 2-5 support-heavy product pages',
    'Import docs, FAQs, release notes, or common answers',
    'Copy the one-time widget key',
    'Verify the install and hosted help domain',
    'Review first approved answer drafts',
];

export default function CanonicaGetStartedPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/get-started" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto w-full max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Get Started</p>
                        <h1 className="mb-4 max-w-full text-4xl font-bold sm:text-5xl">
                            Launch your Canonica workspace in 10 minutes
                        </h1>
                        <p className="mb-12 max-w-full text-lg leading-relaxed text-[#a0a0c0]">
                            Sign in with Google, add your product details, choose the pages users ask about, and create the beta workspace with a one-time widget key and branded help-domain setup.
                        </p>

                        <div className="grid w-full gap-8 md:grid-cols-2">
                            {/* Left: criteria */}
                            <div>
                                <h2 className="mb-6 text-xl font-semibold">Best fit</h2>
                                <div className="space-y-4">
                                    {CRITERIA.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] text-indigo-400">
                                                {i + 1}
                                            </span>
                                            <div>
                                                <div className="text-sm font-medium text-white">{item.label}</div>
                                                <div className="text-xs text-[#6b6b8a]">{item.description}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Self-service signup form */}
                            <OnboardingForm />
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-3xl">
                        <h2 className="mb-3 text-xl font-semibold">What you need before signup</h2>
                        <p className="mb-6 text-sm leading-relaxed text-[#a0a0c0]">
                            A live or near-live product, a few high-friction pages, and any starter support knowledge you already have. A full docs site is not required.
                        </p>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-400">First session checklist</div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {FIRST_SESSION.map((item, index) => (
                                    <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#101028] p-3">
                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-300">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm leading-relaxed text-[#d6d6ef]">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <p className="text-sm text-[#6b6b8a]">
                        Not ready to apply?{' '}
                        <CanonicaLink basePath={basePath} href="/product" className="text-indigo-400 hover:text-indigo-300">
                            Learn more about how Canonica works
                        </CanonicaLink>
                    </p>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
