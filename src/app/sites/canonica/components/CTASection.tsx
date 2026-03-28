import CanonicaLink from './CanonicaLink';

export default function CTASection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold sm:text-4xl">
                    Ready to govern your support knowledge?
                </h2>
                <p className="mt-4 text-lg text-[#a0a0c0]">
                    Canonica is in private beta. We work closely with early design partners
                    to validate the canonical answer model against real support traffic.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        className="rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40"
                    >
                        Request Early Access
                    </CanonicaLink>
                    <CanonicaLink
                        basePath={basePath}
                        href="/contact"
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        Talk to Us
                    </CanonicaLink>
                </div>
                <p className="mt-6 text-xs text-[#505070]">
                    Ideal for mid-market SaaS with 5+ support agents and biweekly release cadence.
                </p>
            </div>
        </section>
    );
}
