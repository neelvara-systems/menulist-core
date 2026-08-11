import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getAnswerlatticePlans } from '@data/answerlattice/plans';
import { ANSWERLATTICE_CREDIT_PACKS_LIST } from '@lib/billing/productBillingPlans';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';

export const metadata: Metadata = {
    title: 'Pricing',
    description: 'Clear INR and USD pricing, paid setup, support credits, intake media processing, and AnswerLattice plans for founder-led SaaS teams.',
    alternates: { canonical: '/pricing' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const PLAN_BULLETS: Record<string, string[]> = {
    answerlattice_starter: [
        'One founder-led SaaS workspace',
        'Team access and role permissions',
        'Knowledge intake from selected links, docs, and supported files',
        'Widget and help center',
        'Basic approved-answer coverage tracking',
        'Product page mapping for in-app support',
    ],
    answerlattice_growth: [
        'Expanded team and custom role controls',
        'Higher intake, answer, and support-gap capacity',
        'Support-gap review queue',
        'Release-aware answer review',
        'Weekly support review digest',
        'Higher feedback, product-page, and support-content limits',
    ],
    answerlattice_studio: [
        'Up to 5 client workspaces',
        'Reusable install and setup patterns',
        'Intake-ready launch workflow for multiple products',
        'Higher feedback and support-content limits',
        'Built for agencies and dev studios',
    ],
};

const PLAN_GUIDANCE: Record<string, string> = {
    answerlattice_starter: 'For one SaaS app with early users and repeated setup, billing, or onboarding questions.',
    answerlattice_growth: 'For active SaaS apps that need weekly review, support-gap tracking, and higher answer capacity.',
    answerlattice_studio: 'For builders, agencies, or studios launching multiple SaaS products.',
};

const formatPrice = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
const formatUsdPrice = (cents: number) => `US$${Math.round(cents / 100).toLocaleString('en-US')}`;

const publicPlans = getAnswerlatticePlans()
    .filter((plan) => plan.billingInterval === 'MONTH')
    .sort((left, right) => left.priceINR.price - right.priceINR.price);

const SHARED_INCLUDED = [
    'Approved answers before fallback',
    'Safe page context for the widget',
    'Hosted help center',
    'Owner reset and force sign-out',
    'Product area mapping',
    'Owner review before publishing',
];

const supportCreditPack = ANSWERLATTICE_CREDIT_PACKS_LIST[0];

const CREDIT_EXAMPLES = [
    {
        title: 'Starter setup month',
        description: 'Use credits for the source-backed first-ten starter-answer run, full-runtime answer tests, and selected screenshot or recording extraction. Draft review, normal widget loading, and help browsing stay outside credit usage.',
    },
    {
        title: 'Launch week spike',
        description: 'When onboarding, billing, and setup questions arrive together, credits keep provider-backed fallback answers bounded without changing the plan immediately.',
    },
    {
        title: 'Media-heavy intake',
        description: 'If your best product knowledge lives inside screenshots, short recordings, or messy notes, credits cover the paid extraction work that turns those sources into reviewed support knowledge.',
    },
];

export default async function AnswerlatticePricingPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/pricing" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Pricing</p>
                    <h1 className="text-4xl font-bold sm:text-5xl">Choose capacity when support volume is real.</h1>
                    <p className="mx-auto mt-4 max-w-lg text-lg text-[#a0a0c0]">
                        Choose a paid plan, create the workspace, install the widget, and prove the support loop with bounded capacity.
                    </p>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'Setup path', value: 'Create the workspace and verify support before users depend on it' },
                            { label: 'Paid capacity', value: 'Plans add monthly support credits and higher support volume' },
                            { label: 'Credit use', value: 'Provider fallback, full-runtime tests, starter generation, OCR, and transcription' },
                            { label: 'Not charged for', value: 'Approved widget answers, draft review, selected text import, and help browsing' },
                        ]}
                    />
                </section>

                <section className="px-6 pb-10">
                    <div className="mx-auto max-w-6xl rounded-2xl border border-teal-500/25 bg-teal-500/[0.07] p-6">
                        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-200">Paid setup</p>
                                <h2 className="text-2xl font-bold text-white">Start with Starter. Upgrade when support volume is real.</h2>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                                    Workspace setup creates your AnswerLattice account, chosen monthly subscription, selected product pages, and one-time widget key. Manage plans and top-ups from AnswerLattice Billing through Razorpay.
                                </p>
                            </div>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/get-started"
                                data-answerlattice-event="pricing_paid_setup_clicked"
                                data-answerlattice-label="starter_setup_banner"
                                className="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-800"
                            >
                                Create workspace
                            </AnswerlatticeLink>
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-12">
                    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
                        {publicPlans.map((plan) => (
                            <div
                                key={plan.planId}
                                className={`rounded-2xl border p-6 ${
                                    plan.isRecommended
                                        ? 'border-teal-500/40 bg-teal-500/[0.08]'
                                        : 'border-white/[0.06] bg-white/[0.03]'
                                }`}
                            >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-2xl font-bold text-white">{plan.name}</div>
                                        <p className="mt-1 text-sm leading-relaxed text-[#808099]">{plan.description}</p>
                                    </div>
                                    {plan.isRecommended && (
                                        <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200">
                                            Recommended
                                        </span>
                                    )}
                                </div>
                                <div className="mb-1 text-4xl font-bold">{formatPrice(plan.priceINR.price)}</div>
                                <p className="mb-1 text-sm text-[#b7b7d2]">or {formatUsdPrice(plan.priceUSD.price)} per month</p>
                                <p className="mb-1 text-xs text-[#6b6b8a]">Choose INR or USD during workspace setup.</p>
                                <p className="mb-6 text-sm text-[#808099]">{plan.priceINR.monthlyCredits} support credits / month</p>
                                <div className="mb-5 rounded-xl border border-white/[0.06] bg-black/10 p-3 text-sm leading-relaxed text-[#d6d6ef]">
                                    {PLAN_GUIDANCE[plan.planId]}
                                </div>
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href={`/get-started?plan=${encodeURIComponent(plan.planId)}`}
                                    data-answerlattice-event="pricing_plan_cta_clicked"
                                    data-answerlattice-label={plan.planId}
                                    className={`mb-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                                        plan.isRecommended
                                            ? 'bg-teal-700 text-white hover:bg-teal-800'
                                            : 'border border-white/[0.12] bg-white/[0.03] text-[#d6d6ef] hover:border-white/[0.24]'
                                    }`}
                                >
                                    Create workspace
                                </AnswerlatticeLink>

                                <ul className="space-y-3">
                                    {[...(PLAN_BULLETS[plan.planId] || []), ...SHARED_INCLUDED].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm text-[#a0a0c0]">
                                            <span className="mt-0.5 text-teal-300">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="border-y border-white/[0.06] bg-white/[0.01] px-6 py-14">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            eyebrow="Support credits"
                            title="Credits keep support capacity predictable."
                            description="Provider-backed fallback answers, full-runtime answer tests, the source-backed first-ten starter-answer run, screenshot OCR, and short recording transcription use support credits. Approved or cached widget answers, deterministic checks, draft review, selected text import, publishing infrastructure, and public help browsing do not use credits."
                        >
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#808099]">
                                Top-ups are for launch spikes, media-heavy intake, or heavy review periods without forcing a plan change.
                            </p>
                            <div className="mt-5 flex flex-wrap justify-center gap-3">
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/roi-calculator"
                                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.12] px-5 py-2.5 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.24]"
                                >
                                    Estimate support ROI
                                </AnswerlatticeLink>
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/proof"
                                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.12] px-5 py-2.5 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.24]"
                                >
                                    Review proof pack
                                </AnswerlatticeLink>
                            </div>
                        </SectionHeader>
                        <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                            <div className="text-lg font-semibold text-white">{supportCreditPack.name}</div>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">{supportCreditPack.description}</p>
                            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.06] pt-5">
                                <div>
                                    <div className="text-3xl font-bold text-white">
                                        {supportCreditPack.priceINR.price === null
                                            ? 'Price unavailable'
                                            : formatPrice(supportCreditPack.priceINR.price)}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-[#b7b7d2]">
                                        {supportCreditPack.priceUSD.price === null
                                            ? 'USD price unavailable'
                                            : `or ${formatUsdPrice(supportCreditPack.priceUSD.price)}`}
                                    </div>
                                    <div className="text-sm text-[#6b6b8a]">{supportCreditPack.creditAmount} credits, one-time purchase</div>
                                </div>
                                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-[#a0a0c0]">
                                    Bought inside AnswerLattice Billing
                                </span>
                            </div>
                        </div>
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            {CREDIT_EXAMPLES.map((example) => (
                                <article key={example.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                    <h3 className="text-base font-semibold text-white">{example.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{example.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                    <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-[#6b6b8a]">
                        Public packaging stays monthly with INR and USD checkout. Usage limits protect infrastructure, but AnswerLattice is not priced as a punishment for successful support deflection.
                    </p>
                </section>
                <section className="border-b border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold">Not sure which plan fits?</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-[#a0a0c0]">
                        Start with the setup path before launch or early support volume. Upgrade when users, pages, and support questions grow.
                    </p>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/get-started"
                        data-answerlattice-event="pricing_final_cta_clicked"
                        data-answerlattice-label="create_workspace"
                        className="mt-8 inline-block rounded-xl bg-teal-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-800"
                    >
                        Create workspace
                    </AnswerlatticeLink>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
