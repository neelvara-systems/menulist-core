import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import OnboardingForm from './OnboardingForm';

export const metadata: Metadata = {
    title: 'Get Started',
    description: 'Create your Canonica account — the Support Knowledge Control Plane for SaaS. Free during beta.',
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const CRITERIA = [
    { label: 'ARR $5M–$40M', description: 'Mid-market SaaS with established support operation' },
    { label: 'Biweekly or monthly releases', description: 'Regular product changes that create knowledge drift' },
    { label: '5+ support agents', description: 'Team large enough that knowledge consistency matters' },
    { label: 'Multi-feature product', description: 'Plans, roles, workflows, states — real product complexity' },
    { label: 'Already using AI support', description: 'Seeing accuracy issues with probabilistic AI answers' },
];

export default function CanonicaGetStartedPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Get Started</p>
                        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
                            Request early access
                        </h1>
                        <p className="mb-12 text-lg text-[#a0a0c0]">
                            Canonica is in private beta. We work with a small number of design partners
                            to validate the canonical answer model against real support traffic.
                        </p>

                        <div className="grid gap-8 md:grid-cols-2">
                            {/* Left: criteria */}
                            <div>
                                <h2 className="mb-6 text-xl font-semibold">Ideal design partner</h2>
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
                        <h2 className="mb-6 text-xl font-semibold">What happens after you apply?</h2>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                { step: '1', title: 'We review', description: 'We evaluate fit based on product complexity and support scale.' },
                                { step: '2', title: 'Guided setup', description: 'We help you bootstrap your ontology and create initial canonical answers.' },
                                { step: '3', title: '4-week experiment', description: 'Measure canonical hit rate, feedback improvement, and drift detection quality.' },
                            ].map((s) => (
                                <div key={s.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-400">
                                        {s.step}
                                    </div>
                                    <h3 className="mb-1 text-sm font-semibold text-white">{s.title}</h3>
                                    <p className="text-xs leading-relaxed text-[#808099]">{s.description}</p>
                                </div>
                            ))}
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
