import AnswerlatticeLink from './AnswerlatticeLink';
import SectionHeader from './SectionHeader';

type DayOneLaunchPackSectionProps = {
    basePath?: string;
    context?: 'home' | 'product';
};

type LaunchPackItem = {
    label: string;
    title: string;
    description: string;
    href: string;
    cta: string;
    featured?: boolean;
    secondaryHref?: string;
    secondaryCta?: string;
};

const PACK_ITEMS: LaunchPackItem[] = [
    {
        label: 'Developer handoff',
        title: 'Framework quickstarts and agent packet',
        description:
            'Next.js, React, Vue/Nuxt, and vanilla script examples give developers a clean install path using the stable AnswerLattice v1 widget contract.',
        href: '/quickstarts',
        cta: 'View quickstarts',
        featured: true,
    },
    {
        label: 'First product pages',
        title: 'Starter surfaces for common SaaS screens',
        description:
            'Seed billing, onboarding, team settings, releases, integrations, and common-error surfaces so in-app support starts with real product areas.',
        href: '/product/launch-setup',
        cta: 'See setup',
    },
    {
        label: 'Knowledge intake',
        title: 'Teach AnswerLattice from links, docs, files, and media',
        description:
            'Start with selected product pages, supported files, screenshots, short recordings, release notes, setup notes, support macros, and repeated replies. Generate a source-backed first-ten set, then review every answer draft before publishing.',
        href: '/product/knowledge-intake',
        cta: 'See intake',
    },
    {
        label: 'Install proof',
        title: 'Verify widget, origin, route, context, and image boundary',
        description:
            'The Widget screen checks that the key exists, script loaded, origin is allowed, route is not blocked, page context arrived, and screenshot input remains user-initiated.',
        href: '/install',
        cta: 'View install verifier',
        featured: true,
    },
    {
        label: 'Buyer proof',
        title: 'Plan ROI and review example workloads',
        description:
            'Use the static calculator and proof pack to estimate repeated-question load, founder time saved, and the first support areas worth mapping.',
        href: '/roi-calculator',
        secondaryHref: '/proof',
        cta: 'Estimate ROI',
        secondaryCta: 'View proof pack',
    },
    {
        label: 'Safety handoff',
        title: 'Share the security and ops one-pager',
        description:
            'Give buyers or developers the concise version of allowed origins, blocked routes, safe context, manual screenshot input, hashed keys, owner approval, and rate limits.',
        href: '/security-one-pager',
        cta: 'Open one-pager',
    },
];

export default function DayOneLaunchPackSection({
    basePath = '',
    context = 'home',
}: DayOneLaunchPackSectionProps) {
    const isProduct = context === 'product';

    return (
        <section className={`al-primary-radial-launch ${isProduct ? 'border-t' : 'border-y'} border-white/[0.06] px-6 py-20 sm:px-6`}>
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Day-one launch pack"
                    title={isProduct
                        ? 'The practical setup layer behind the product.'
                        : 'Everything needed to prove AnswerLattice on the first rollout.'}
                    description="AnswerLattice should not feel like another dashboard to configure. The first rollout now has quickstarts, starter surfaces, import templates, install verification, buyer proof, and a security handoff that all point back to owner-approved support knowledge."
                />

                <div className="grid gap-4 lg:grid-cols-6">
                    {PACK_ITEMS.map((item) => (
                        <article
                            key={item.title}
                            className={`group flex min-h-[15rem] flex-col justify-between rounded-[1.5rem] border border-white/[0.08] bg-[#101028]/80 p-5 transition hover:border-teal-300/25 hover:bg-teal-500/[0.055] ${
                                item.featured ? 'lg:col-span-3' : 'lg:col-span-2'
                            }`}
                        >
                            <div>
                                <div className="mb-5 inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#8f8faa]">
                                    {item.label}
                                </div>
                                <h3 className="text-xl font-semibold leading-snug text-white">{item.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{item.description}</p>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href={item.href}
                                    className="inline-flex rounded-full border border-teal-300/20 bg-teal-500/10 px-4 py-2 text-xs font-semibold text-teal-100 transition group-hover:border-teal-200/35 group-hover:text-white"
                                >
                                    {item.cta}
                                </AnswerlatticeLink>
                                {item.secondaryHref && item.secondaryCta && (
                                    <AnswerlatticeLink
                                        basePath={basePath}
                                        href={item.secondaryHref}
                                        className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-xs font-semibold text-[#d6d6ef] transition hover:border-white/[0.18] hover:text-white"
                                    >
                                        {item.secondaryCta}
                                    </AnswerlatticeLink>
                                )}
                            </div>
                        </article>
                    ))}
                </div>

                <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-[#6b6b8a]">
                    These are setup accelerators, not auto-publish shortcuts. Imported content, generated drafts, and missing-answer fixes still require owner review before they become official support guidance.
                </p>
            </div>
        </section>
    );
}
