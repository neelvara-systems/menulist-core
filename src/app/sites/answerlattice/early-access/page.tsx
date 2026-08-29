import { Metadata } from 'next';
import { headers } from 'next/headers';
import { LuCheck, LuClock3, LuShieldCheck } from 'react-icons/lu';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import EarlyAccessForm from './EarlyAccessForm';

export const metadata: Metadata = {
    title: 'Request Early Access',
    description: 'Request controlled early access to AnswerLattice for your founder-led SaaS product. No account, subscription, or payment is created by the request.',
    alternates: { canonical: '/early-access' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = await headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;
        const host = h.get('host') || '';
        return h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))
            ? '/__answerlattice'
            : '';
    } catch {
        return '';
    }
}
const REVIEW_STEPS = [
    'Tell us what you are building and where users need help.',
    'We review product fit and the current testing capacity.',
    'If selected, you receive a private setup invitation by email.',
];

export default async function AnswerlatticeEarlyAccessPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/early-access" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 pb-12 pt-20 sm:pb-16 sm:pt-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Controlled early access</p>
                        <h1 className="text-4xl font-bold leading-tight text-white sm:text-6xl">
                            Build your support layer with us before public access opens.
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            AnswerLattice is onboarding a small number of founder-led SaaS products at a time. Share your product and the support questions you need to solve first.
                        </p>
                        <PageProofStrip
                            className="mx-auto mt-8 max-w-4xl text-left"
                            items={[
                                { label: 'Best fit', value: 'Live, beta, or near-launch SaaS with recurring product questions' },
                                { label: 'Review', value: 'Human qualification before any workspace is created' },
                                { label: 'Payment', value: 'No checkout or charge during the request' },
                            ]}
                        />
                    </div>
                </section>

                <section className="px-6 pb-24">
                    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                        <div className="space-y-6 lg:sticky lg:top-24">
                            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
                                        <LuClock3 aria-hidden size={20} />
                                    </span>
                                    <h2 className="text-xl font-semibold text-white">What happens next</h2>
                                </div>
                                <ol className="mt-6 space-y-5">
                                    {REVIEW_STEPS.map((step, index) => (
                                        <li key={step} className="flex gap-3 text-sm leading-relaxed text-[#b7b7d2]">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-400/10 text-xs font-bold text-teal-300">{index + 1}</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <div className="rounded-3xl border border-teal-300/15 bg-teal-400/[0.04] p-6">
                                <div className="flex items-start gap-3">
                                    <LuShieldCheck aria-hidden className="mt-0.5 shrink-0 text-teal-300" size={21} />
                                    <div>
                                        <h2 className="font-semibold text-white">A request is not an account</h2>
                                        <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">
                                            We do not create a workspace, subscription, checkout, or entitlement until a private onboarding step is deliberately approved.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/[0.08] bg-[#0f1023] p-6">
                                <h2 className="font-semibold text-white">Useful details to share</h2>
                                <div className="mt-4 space-y-3">
                                    {[
                                        'The first page where users get stuck',
                                        'Questions you already repeat in chat or email',
                                        'One feature or workflow you wish support software handled better',
                                    ].map((item) => (
                                        <div key={item} className="flex gap-3 text-sm leading-relaxed text-[#a0a0c0]">
                                            <LuCheck aria-hidden className="mt-0.5 shrink-0 text-teal-300" size={16} />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <EarlyAccessForm basePath={basePath} />
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
