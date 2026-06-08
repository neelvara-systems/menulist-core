import SectionHeader from './SectionHeader';

const OBJECTIONS = [
    {
        question: 'Is this just a chatbot?',
        answer: 'No. It is a support layer with an in-app widget, hosted help, tickets, feedback, changelog, and approved answers.',
    },
    {
        question: 'Do answers publish automatically?',
        answer: 'No. Official answers require review before they become customer-facing support.',
    },
    {
        question: 'Do I need complete docs?',
        answer: 'No. Start with what you already have: docs, FAQs, release notes, setup notes, tickets, and repeated questions.',
    },
    {
        question: 'What happens when it does not know?',
        answer: 'The user can create a ticket, and you get a support gap to review and improve for the next user.',
    },
    {
        question: 'Does it replace Intercom or Zendesk?',
        answer: 'No. It is the support layer before your first support hire or full helpdesk operation.',
    },
];

export default function ObjectionsSection() {
    return (
        <section className="al-objections">
            <div className="mx-auto max-w-4xl">
                <SectionHeader
                    eyebrow="FAQ"
                    title="Questions founders ask before adding a support layer."
                />
                <div className="al-objections__list">
                    {OBJECTIONS.map((item) => (
                        <article key={item.question} className="al-objections__card" data-answerlattice-reveal-item>
                            <h3>{item.question}</h3>
                            <p>{item.answer}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
