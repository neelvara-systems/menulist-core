import type { WebsiteResourceFaq } from '@/content/websiteResources/types';

interface FaqBlockProps {
    faq: WebsiteResourceFaq[];
    title: string;
}

export default function FaqBlock({ faq, title }: FaqBlockProps) {
    if (!faq.length) return null;

    return (
        <section className="ws-resource-faq" aria-labelledby="resource-faq-title">
            <h2 id="resource-faq-title">{title}</h2>
            <div className="ws-resource-faq__grid">
                {faq.map((item) => (
                    <article key={item.id} className="ws-resource-faq__item">
                        <h3>{item.question}</h3>
                        <p>{item.answer}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
