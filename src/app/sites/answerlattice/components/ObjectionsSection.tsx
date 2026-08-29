import SectionHeader from './SectionHeader';

const OBJECTIONS = [
    {
        question: 'Is this just a chatbot?',
        answer: 'No. Chatbots focus on generating replies. AnswerLattice starts from answers you reviewed and shows you when an answer is missing.',
    },
    {
        question: 'Will AI publish answers by itself?',
        answer: 'No. AI can help prepare a draft, but you decide what becomes official support.',
    },
    {
        question: 'Do I need complete docs?',
        answer: 'No. Start with the useful material you already have and the ten questions users are most likely to ask.',
    },
    {
        question: 'What happens when it does not know?',
        answer: 'The user gets the fallback path you configured, and the missing answer becomes visible work you can fix once.',
    },
];

export default function ObjectionsSection() {
    return (
        <section className="al-objections">
            <div className="mx-auto max-w-4xl">
                <SectionHeader
                    eyebrow="FAQ"
                    title="What founders usually want to know."
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
