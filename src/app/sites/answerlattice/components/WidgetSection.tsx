import AnswerlatticeLink from './AnswerlatticeLink';
import AnswerlatticeAssetImage from './AnswerlatticeAssetImage';
import { AnswerlatticeStatusBoard } from './AnswerlatticeProofBlocks';
import { ANSWERLATTICE_WIDGET_RUNTIME_ASSET } from '../answerlatticeWebsiteAssets';
import SectionHeader from './SectionHeader';

const WIDGET_STATES = [
    {
        status: 'allowed',
        title: 'Widget can appear',
        detail: 'The current domain matches the workspace allowed-origin list.',
        tone: 'good' as const,
        rows: [
            ['origin', 'app.yourapp.com'],
            ['launcher', 'visible'],
        ] as Array<[string, string]>,
    },
    {
        status: 'blocked',
        title: 'Allow only your domains',
        detail: 'Payment forms, auth pages, and private admin routes can hide the launcher.',
        tone: 'neutral' as const,
        rows: [
            ['route', '/billing/cards/*'],
            ['launcher', 'hidden'],
        ] as Array<[string, string]>,
    },
    {
        status: 'published',
        title: 'Publish hosted help',
        detail: 'Reviewed docs, FAQs, and release notes can live on a support domain.',
        tone: 'good' as const,
        rows: [
            ['domain', 'help.yourapp.com'],
            ['public pages', 'docs + FAQ'],
        ] as Array<[string, string]>,
    },
    {
        status: 'context',
        title: 'Pass page context',
        detail: 'Safe route, feature, workflow, role, and plan hints make in-app support more relevant.',
        tone: 'neutral' as const,
        rows: [
            ['feature', 'billing'],
            ['workflow', 'invoice_review'],
        ] as Array<[string, string]>,
    },
    {
        status: 'configured',
        title: 'Show proactive help carefully',
        detail: 'Configured prompts can appear only when active triggers and approved support summaries exist.',
        tone: 'neutral' as const,
        rows: [
            ['trigger', 'active only'],
            ['prompt', 'approved summary'],
        ] as Array<[string, string]>,
    },
    {
        status: 'visual',
        title: 'Attach screenshots explicitly',
        detail: 'Users can upload or paste a screenshot when visual context helps, without automatic page capture.',
        tone: 'neutral' as const,
        rows: [
            ['input', 'user attached'],
            ['storage', 'not persisted'],
        ] as Array<[string, string]>,
    },
    {
        status: 'review',
        title: 'Review support gaps',
        detail: 'Fallbacks, tickets, safe debugging context, and negative feedback become review work.',
        tone: 'caution' as const,
        rows: [
            ['gap', 'missing answer'],
            ['next step', 'owner review'],
        ] as Array<[string, string]>,
    },
];

const SAMPLE_CONTEXT = `window.AnswerlatticeWidget?.page({
  contextVersion: 1,
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices'
});`;

export default function WidgetSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="In-app help widget"
                    title="Put help inside the screen where users are stuck."
                    description="Users ask from inside your app. AnswerLattice reads safe page hints, accepts explicit screenshot attachments when needed, finds approved answers, owner FAQ answers, and related docs, can show configured prompts, and opens ticket fallback only when coverage is missing."
                >
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/install"
                        className="mt-6 inline-block rounded-full border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        View widget install
                    </AnswerlatticeLink>
                </SectionHeader>

                <div className="grid gap-4 lg:grid-cols-12">
                    <article className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#101028] p-2 text-white shadow-2xl shadow-black/25 lg:col-span-8 lg:row-span-2">
                        <AnswerlatticeAssetImage
                            asset={ANSWERLATTICE_WIDGET_RUNTIME_ASSET}
                            assetSlotId="product.area.page-aware-widget"
                            assetRole="widget-runtime"
                            className="rounded-[1.35rem] border border-white/[0.08]"
                        />
                    </article>

                    <article className="rounded-[1.75rem] border border-white/[0.08] bg-[#101028] p-5 lg:col-span-4">
                        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-200">Install & context</div>
                        <h3 className="text-xl font-bold text-white">One script, then safe page hints.</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                            Developers install the widget once and pass route, feature, workflow, role, or plan hints only when they are safe.
                        </p>
                        <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                            <code>{SAMPLE_CONTEXT}</code>
                        </pre>
                    </article>

                    <div className="lg:col-span-12">
                        <AnswerlatticeStatusBoard items={WIDGET_STATES} />
                    </div>
                </div>
            </div>
        </section>
    );
}
