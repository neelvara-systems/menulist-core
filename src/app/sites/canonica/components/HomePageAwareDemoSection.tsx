import CanonicaPublicDemo from '../demo/CanonicaPublicDemo';
import CanonicaLink from './CanonicaLink';

export default function HomePageAwareDemoSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-y border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.13),transparent_42%),rgba(255,255,255,0.01)] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-10 max-w-3xl text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        The aha moment
                    </p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                        Generic AI guesses. Canonica answers from the page the user is on.
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                        A billing question from Billing should not get the same answer as a setup question from Onboarding. Canonica uses safe page hints to serve the right approved canonical answer or owner FAQ answer.
                    </p>
                    <CanonicaLink
                        basePath={basePath}
                        href="/demo"
                        data-canonica-event="homepage_demo_link_clicked"
                        data-canonica-label="open_full_demo"
                        className="mt-6 inline-flex rounded-full border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                    >
                        Open full demo
                    </CanonicaLink>
                </div>
                <CanonicaPublicDemo />
                <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-[#8f8faa]">
                    When Canonica does not have a matching canonical or published owner answer, it does not invent one. It records the gap for review.
                </p>
            </div>
        </section>
    );
}
