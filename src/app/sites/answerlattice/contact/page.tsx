import { Metadata } from 'next';
import { headers } from 'next/headers';
import { LuCheck, LuMail, LuShieldCheck, LuUsers } from 'react-icons/lu';
import ContactForm from './ContactForm';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'Contact',
    description: 'Contact AnswerLattice for setup help, demos, pricing, security questions, or partnership requests for your SaaS app or digital product.',
    alternates: { canonical: '/contact' },
};

const fitPoints = [
    'Share where users will need help and which pages need support first.',
    'Check setup fit before you add a full support team.',
    'Ask about security, allowed origins, team access, and rollout paths.',
];

const contactCards = [
    {
        title: 'Direct email',
        body: 'Use this for setup questions, demos, pricing, and product fit.',
        href: 'mailto:hello@answerlattice.com',
        label: 'hello@answerlattice.com',
        icon: LuMail,
    },
    {
        title: 'Partnerships',
        body: 'For studios, founder communities, and SaaS launch partners.',
        href: 'mailto:partners@answerlattice.com',
        label: 'partners@answerlattice.com',
        icon: LuUsers,
    },
    {
        title: 'Security review',
        body: 'Ask about safe page context, screenshots, access controls, and data handling.',
        href: '/security-one-pager',
        label: 'View one-pager',
        icon: LuShieldCheck,
    },
];

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default async function AnswerlatticeContactPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/contact" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-20 sm:py-24">
                    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
                        <div>
                            <div className="text-center">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Contact</p>
                                <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl">
                                    Talk to AnswerLattice before support gets noisy.
                                </h1>
                                <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                                    Send your product URL, expected or recurring questions, and the pages that need support first. We will help you decide whether AnswerLattice fits your launch.
                                </p>
                                <PageProofStrip
                                    className="mt-8 text-left"
                                    items={[
                                        { label: 'Best inquiry', value: 'SaaS or digital product preparing support for launch or early users' },
                                        { label: 'Useful context', value: 'Product URL, first support page, expected or recurring questions' },
                                        { label: 'Avoid sending', value: 'Passwords, tokens, customer datasets, raw logs' },
                                    ]}
                                />
                            </div>

                            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                                <h2 className="text-base font-semibold text-white">What to include</h2>
                                <div className="mt-4 grid gap-3">
                                    {fitPoints.map((point) => (
                                        <div key={point} className="flex gap-3">
                                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-400/10 text-teal-300">
                                                <LuCheck size={13} strokeWidth={3} aria-hidden />
                                            </span>
                                            <p className="text-sm leading-relaxed text-[#d6d6ef]">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4">
                                {contactCards.map((card) => {
                                    const Icon = card.icon;
                                    const href = card.href.startsWith('/') ? `${basePath}${card.href}` : card.href;
                                    return (
                                        <a
                                            key={card.title}
                                            href={href}
                                            className="group rounded-2xl border border-white/[0.08] bg-[#0f1023] p-5 transition hover:border-teal-300/30 hover:bg-white/[0.045]"
                                        >
                                            <div className="flex items-start gap-4">
                                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
                                                    <Icon size={19} aria-hidden />
                                                </span>
                                                <div>
                                                    <h3 className="font-semibold text-white">{card.title}</h3>
                                                    <p className="mt-1 text-sm leading-relaxed text-[#808099]">{card.body}</p>
                                                    <p className="mt-3 text-sm font-semibold text-teal-300 group-hover:text-teal-200">{card.label}</p>
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <div className="mb-4 rounded-2xl border border-teal-300/15 bg-teal-400/[0.045] p-4 text-sm leading-relaxed text-[#d6d6ef]">
                                For faster review, include your product URL, what users ask most, and the first page where they need better help.
                            </div>
                            <ContactForm basePath={basePath} />
                            <p className="mt-4 text-xs leading-relaxed text-[#6b6b8a]">
                                Contact submissions are used only to respond to your request. Do not send passwords, tokens, or full customer datasets.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
