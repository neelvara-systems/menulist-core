import SectionHeader from './SectionHeader';

const OBJECTIONS = [
    {
        question: 'Does AnswerLattice replace Intercom or Zendesk?',
        answer: 'No. AnswerLattice is the support knowledge layer and page-aware widget. It can reduce repetitive questions before they become tickets, but it is not a full helpdesk replacement.',
    },
    {
        question: 'Will answers publish automatically?',
        answer: 'No. AnswerLattice can generate drafts and proposals, but official answers require owner approval.',
    },
    {
        question: 'Do I need a full docs site first?',
        answer: 'No. Start with FAQs, release notes, product pages, setup guides, and common support answers. AnswerLattice turns those into review work.',
    },
    {
        question: 'Can I add my own repeated Q&A?',
        answer: 'Yes. Owners can publish exact FAQ or custom answers, link them to articles and product pages, and let AnswerLattice use them after canonical answers and before fallback.',
    },
    {
        question: 'I built my app with AI. Is AnswerLattice still useful?',
        answer: 'Yes, especially when the product is live, in beta, or preparing to launch. AnswerLattice helps support keep up when the product ships faster than docs and support processes.',
    },
    {
        question: 'How hard is install?',
        answer: 'One script, allowed origins, optional blocked routes, and safe page context. The activation dashboard verifies the runtime path.',
    },
    {
        question: 'Is it safe on sensitive pages?',
        answer: 'Yes. Owners can block routes, restrict origins, and limit context to route or workflow hints instead of secrets.',
    },
];

export default function ObjectionsSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-20">
            <div className="mx-auto max-w-4xl">
                <SectionHeader
                    eyebrow="Founder questions"
                    title="The answers buyers need before setup."
                />
                <div className="grid gap-4">
                    {OBJECTIONS.map((item) => (
                        <article key={item.question} className="rounded-2xl border border-white/[0.06] bg-[#101028] p-5">
                            <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{item.answer}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
