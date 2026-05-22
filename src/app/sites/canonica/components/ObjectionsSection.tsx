const OBJECTIONS = [
    {
        question: 'Does Canonica replace Intercom or Zendesk?',
        answer: 'No. Canonica is the support knowledge layer and page-aware widget. It can reduce repetitive questions before they become tickets, but it is not a full helpdesk replacement.',
    },
    {
        question: 'Will answers publish automatically?',
        answer: 'No. Canonica can generate drafts and proposals, but authoritative answers are owner-approved canonical answers.',
    },
    {
        question: 'Do I need a full docs site first?',
        answer: 'No. Start with FAQs, release notes, product pages, setup guides, and common support answers. Canonica turns those into review work.',
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
        <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
            <div className="mx-auto max-w-4xl">
                <div className="mb-10 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Founder questions</p>
                    <h2 className="text-3xl font-bold sm:text-4xl">The answers buyers need before setup.</h2>
                </div>
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
