import { Metadata } from 'next';
import { headers } from 'next/headers';
import {
    LuAlertTriangle,
    LuBookOpen,
    LuCheck,
    LuClipboardList,
    LuCode2,
    LuFileSearch,
    LuFolderTree,
    LuShieldCheck,
} from 'react-icons/lu';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import AnswerlatticeLink from '../../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../../components/PageStructuredData';
import PageProofStrip from '../../components/PageProofStrip';
import SectionHeader from '../../components/SectionHeader';
import AnswerlatticePreOnboardingPromptModal from '../PromptModal';

export const metadata: Metadata = {
    title: 'Pre-Onboarding Guide | Answerlattice',
    description:
        'End-to-end guide for using the Answerlattice pre-onboarding prompt with a product repo, docs, public website, owner notes, screenshots, and owner review.',
    alternates: { canonical: '/pre-onboarding/guide' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch {
        return '';
    }
}

const BEFORE_RUN = [
    'Product name, short slug, product stage, and source mode.',
    'Product website URL and production app URL, or NOT_AVAILABLE.',
    'Repo/docs path, website links, exported docs, or owner notes.',
    'Target product paths and excluded sister products when the repo contains multiple products.',
    'API specs, support exports, demo recordings, or screenshots if they are approved for review.',
    'Help center, pricing, legal, security, and contact links.',
    'Known product pages, user roles, plans, and integrations.',
    'Existing support FAQs, support macros, release notes, or onboarding docs.',
    'Screenshot and marketing approval status.',
];

const INTAKE_FIELDS = [
    'PRODUCT_NAME',
    'PRODUCT_SLUG',
    'PUBLIC_WEBSITE_URL',
    'PRODUCTION_APP_URL',
    'REPO_OR_DOCS_PATH',
    'TARGET_PRODUCT_PATHS',
    'EXCLUDED_PRODUCT_NAMES',
    'HELP_DOCS_URLS',
    'OPENAPI_OR_API_SPEC_PATHS',
    'SUPPORT_EXPORT_PATHS',
    'DEMO_RECORDING_OR_SCREENSHOT_PATHS',
    'WEBSITE_ASSET_REQUEST',
    'PRICING_URL',
    'PRIVACY_URL',
    'TERMS_URL',
    'REFUND_OR_CANCELLATION_URL',
    'SECURITY_TRUST_URL',
    'CONTACT_URL',
    'SUPPORT_EMAIL',
    'PRODUCT_STAGE',
    'SOURCE_MODE',
    'APPROVAL_STATUS',
    'SCREENSHOT_MARKETING_PERMISSION',
    'ANSWERLATTICE_WORKSPACE_STATUS',
    'OWNER_NOTES',
];

const RUN_MODES = [
    {
        title: 'Repo and website available',
        description: 'Best path. The agent checks code, docs, routes, public pages, policies, and source maps before creating the package.',
        icon: LuFolderTree,
    },
    {
        title: 'Multi-product repo',
        description: 'The agent maps all products first, targets only the named product, and excludes sister-product facts.',
        icon: LuFolderTree,
    },
    {
        title: 'Website and docs only',
        description: 'Use public pages, help docs, policy pages, and owner notes. Mark repo/code coverage as unavailable.',
        icon: LuFileSearch,
    },
    {
        title: 'Docs only',
        description: 'Use local or exported docs. Mark live website and production checks as pending unless links are provided.',
        icon: LuBookOpen,
    },
    {
        title: 'Owner notes only',
        description: 'Use product notes, role lists, screenshots, support email, and known policies. Mark unsupported facts as pending.',
        icon: LuClipboardList,
    },
    {
        title: 'Early product or private beta',
        description: 'Use README files, screenshots, user flows, release notes, and founder notes. Keep production claims pending.',
        icon: LuCode2,
    },
];

const MULTI_PRODUCT_RULES = [
    'Identify product folders, route groups, packages, domain configs, docs roots, and deployment targets before writing source files.',
    'Match the target using product name, slug, website URL, app URL, and target paths.',
    'Include shared auth, billing, roles, integrations, widget/runtime, and legal pages only when they affect the target product.',
    'Exclude sister-product features, claims, screenshots, support flows, and pricing unless explicitly shared.',
    'Document target paths and exclusions in the generated product-boundary file and source evidence map.',
];

const MARKET_PATTERN_RULES = [
    'Use repo and docs to explain product behavior, not internal implementation details.',
    'For website imports, record included and excluded URLs so unrelated marketing or sister-product pages stay out.',
    'Use OpenAPI or API specs only for public/customer-facing API support.',
    'Use support exports to seed FAQ and coverage gaps only after removing private conversations and identifiers.',
    'Turn recordings and screenshots into capture plans, walkthrough briefs, transcripts, and support-step maps.',
    'Keep demo, FAQ, and website outputs review-ready until the owner approves public use.',
];

const CAPABILITY_LIMITS = [
    'The prompt works only with sources the AI IDE can access in that session.',
    'Private repos, login-only apps, restricted websites, recordings, and local files may need owner-granted access or exported copies.',
    'If browsing, file reading, or media inspection is unavailable, the agent must mark that source as pending instead of claiming coverage.',
    'A weaker agent may miss context in a large or unusual codebase, so owner review is mandatory before upload.',
    'No prompt can guarantee perfect output for every product, AI model, IDE, private app, or source shape.',
];

const REVIEW_ITEMS = [
    'Remove secrets, tokens, cookies, API keys, service accounts, and raw logs.',
    'Remove private customer records, private support messages, payment data, and internal IDs.',
    'Check legal, refund, privacy, security, billing, and integration answers for approval.',
    'Check every public website claim against current product behavior.',
    'Confirm the generated support questions match real user language.',
    'Confirm screenshot slots use approved demo data and scrub rules.',
];

const LIVE_GATES = [
    'All required source files are uploaded.',
    'Generated drafts are reviewed and accepted or rejected.',
    'Risky answers are escalation-gated.',
    'Product surfaces are mapped.',
    'Widget key, allowed origins, and blocked routes are configured.',
    'Runtime widget context is seen in Answerlattice.',
    'Live support test questions pass.',
    'Owner signs off on screenshots and public asset use.',
];

export default function AnswerlatticePreOnboardingGuidePage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/pre-onboarding/guide" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="border-b border-white/[0.06] px-4 py-20 text-center sm:px-6 lg:py-24">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Pre-Onboarding Guide</p>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                        Use the prompt with the right source material, then review the package before Answerlattice intake.
                    </h1>
                    <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                        This guide is for product owners and the AI agents helping them. It explains what to prepare, how to run the prompt, what the agent should inspect, and what must be checked before live support.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticePreOnboardingPromptModal
                            basePath={basePath}
                            buttonClassName="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            buttonLabel="Copy the master prompt"
                        />
                        <AnswerlatticeLink basePath={basePath} href="/pre-onboarding/agent-guide.md" className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white">
                            Open agent guide
                        </AnswerlatticeLink>
                    </div>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-5xl text-left"
                        items={[
                            { label: 'Before run', value: 'Fill product, source, approval, and boundary placeholders' },
                            { label: 'During run', value: 'Inspect accessible sources and mark blocked ones pending' },
                            { label: 'Before live support', value: 'Owner reviews package, sources, widget context, tests, and assets' },
                        ]}
                    />
                </section>

                <section className="border-b border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="Prompt fields"
                            title="Fill the placeholders before the agent starts."
                            description="Use real links where they exist. Use NOT_AVAILABLE when a product does not have that source yet, and the agent must mark the gap instead of inventing it."
                        />
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {INTAKE_FIELDS.map((field) => (
                                <div key={field} className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 font-mono text-xs text-[#d6d6ef]">
                                    {field}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="Market patterns"
                            title="Handle repo-to-doc, FAQ, demo, and website requests safely."
                            description="Some teams expect the agent to turn product sources into support docs, FAQs, walkthroughs, or website asset briefs. Answerlattice keeps those outputs source-backed and review-gated."
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                            {MARKET_PATTERN_RULES.map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                    <LuClipboardList aria-hidden size={18} className="mt-0.5 flex-shrink-0 text-teal-200" />
                                    <p className="text-sm leading-relaxed text-[#d6d6ef]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Capability limits</p>
                            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">The agent can only cover what it can inspect.</h2>
                            <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                                Treat the generated package as a source-backed draft. If a source is blocked, private, missing, or unsupported by the AI IDE, the output must show that gap clearly.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {CAPABILITY_LIMITS.map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                    <LuAlertTriangle aria-hidden size={18} className="mt-0.5 flex-shrink-0 text-amber-200" />
                                    <p className="text-sm leading-relaxed text-[#d6d6ef]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Multi-product repos</p>
                            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Target one product before collecting source truth.</h2>
                            <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                                Some clients keep several products in one codebase. In that case, the agent must map the repo first, then prepare Answerlattice inputs only for the product named in the prompt.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {MULTI_PRODUCT_RULES.map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                    <LuShieldCheck aria-hidden size={18} className="mt-0.5 flex-shrink-0 text-teal-200" />
                                    <p className="text-sm leading-relaxed text-[#d6d6ef]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="Before running"
                            title="Give the agent enough source truth."
                            description="The prompt works best when the AI IDE can inspect product material, but it can also create a starter package from explicit links, exported docs, or owner notes."
                        />
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {BEFORE_RUN.map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                    <LuCheck aria-hidden size={18} className="mt-0.5 flex-shrink-0 text-emerald-300" />
                                    <p className="text-sm leading-relaxed text-[#d6d6ef]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="Run modes"
                            title="Use the best available source path."
                            description="Not every client has the same setup. The guide still works if the repo, website, docs, or production workspace is incomplete."
                        />
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {RUN_MODES.map((mode) => {
                                const Icon = mode.icon;
                                return (
                                    <article key={mode.title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-[#1eceff]">
                                            <Icon aria-hidden size={20} />
                                        </span>
                                        <h2 className="mt-5 text-lg font-bold text-white">{mode.title}</h2>
                                        <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{mode.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Owner review</p>
                            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Do not upload the folder blindly.</h2>
                            <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                                The AI agent prepares structure. The owner still reviews accuracy, privacy, support boundaries, and production facts before Answerlattice intake.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {REVIEW_ITEMS.map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                    <LuClipboardList aria-hidden size={18} className="mt-0.5 flex-shrink-0 text-teal-200" />
                                    <p className="text-sm leading-relaxed text-[#d6d6ef]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="For the AI agent"
                            title="What the agent needs to know before starting."
                            description="When the owner gives the AI IDE the Answerlattice link, the agent should follow the source-first operating contract and avoid unsupported certainty."
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                            {[
                                ['Read before writing', 'Inspect website pages, local docs, route files, policies, screenshots, and support material before producing the final package.'],
                                ['Separate truth from plans', 'Current production docs/code/public pages outrank archive, roadmap, strategy, and old AI review files.'],
                                ['Mark unavailable sources', 'If the repo, website, docs, owner approvals, or production account cannot be checked, mark that as pending instead of inventing coverage.'],
                                ['Validate like a package', 'Check JSON, JSONL, CSVs, manifest paths, source sizes, placeholders, and support coverage before final handoff.'],
                            ].map(([title, description]) => (
                                <article key={title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
                                    <LuBookOpen aria-hidden size={20} className="text-[#1eceff]" />
                                    <h2 className="mt-4 text-lg font-bold text-white">{title}</h2>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 py-20 sm:px-6">
                    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Live support gate</p>
                            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Prepared inputs are not the same as live readiness.</h2>
                            <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                                Use the generated package to start Answerlattice faster. Turn on live support only after the runtime checks and owner approvals are complete.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {LIVE_GATES.map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                    <LuShieldCheck aria-hidden size={18} className="mt-0.5 flex-shrink-0 text-emerald-300" />
                                    <p className="text-sm leading-relaxed text-[#d6d6ef]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mx-auto mt-10 max-w-5xl rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.055] p-5">
                        <div className="flex gap-3">
                            <LuAlertTriangle aria-hidden size={20} className="mt-0.5 flex-shrink-0 text-amber-200" />
                            <p className="text-sm leading-relaxed text-[#f5e7b8]">
                                A good agent may say the package is complete for available source coverage. That still does not confirm active feature flags, account entitlements, production host, billing state, widget runtime, or legal approval.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
