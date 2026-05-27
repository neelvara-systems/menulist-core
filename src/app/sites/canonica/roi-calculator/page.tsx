import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import CanonicaRoiCalculator from './CanonicaRoiCalculator';

export const metadata: Metadata = {
    title: 'Support ROI Calculator',
    description: 'Estimate repeated support questions, founder time saved, and Canonica plan fit for AI-built SaaS support.',
    alternates: { canonical: '/roi-calculator' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function CanonicaRoiCalculatorPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/roi-calculator" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">ROI calculator</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Estimate the cost of repeated support questions.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica is most useful when the same billing, onboarding, settings, release, or error questions keep returning. Use this static calculator to plan the first support layer.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <CanonicaRoiCalculator />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold text-white">Prove the loop before upgrading.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Start free, map the first pages, import starter knowledge, install the widget, and watch which questions become approved answers or review work.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <CanonicaLink basePath={basePath} href="/pricing" className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-semibold text-[#d6d6ef] hover:border-white/[0.24]">
                            View pricing
                        </CanonicaLink>
                        <CanonicaLink basePath={basePath} href="/get-started" className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                            Start free setup
                        </CanonicaLink>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
