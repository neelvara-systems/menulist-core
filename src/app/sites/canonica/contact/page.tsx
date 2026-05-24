import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaPageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'Contact',
    description: 'Contact Canonica for setup help, partnership questions, or to check if Canonica fits your AI-built SaaS app.',
    alternates: { canonical: '/contact' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function CanonicaContactPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/contact" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-2xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Contact</p>
                        <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Talk to Canonica.</h1>
                        <p className="mb-12 text-lg text-[#a0a0c0]">
                            Reach out for setup help, partnership questions, or to check if Canonica fits your AI-built SaaS app.
                        </p>
                        <p className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-relaxed text-[#d6d6ef]">
                            For faster review, include your product URL, what users ask most, and where support breaks today.
                        </p>

                        <div className="space-y-6">
                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h3 className="mb-2 font-semibold text-white">Email</h3>
                                <a href="mailto:hello@canonica.app" className="text-indigo-400 hover:text-indigo-300">
                                    hello@canonica.app
                                </a>
                            </div>

                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h3 className="mb-2 font-semibold text-white">For partnerships</h3>
                                <a href="mailto:partners@canonica.app" className="text-indigo-400 hover:text-indigo-300">
                                    partners@canonica.app
                                </a>
                            </div>

                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h3 className="mb-2 font-semibold text-white">Early customer program</h3>
                                <p className="text-sm text-[#808099]">
                                    We work closely with small SaaS teams, solo founders, and studios that want support
                                    answers connected to their product pages before they build a full support team.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
