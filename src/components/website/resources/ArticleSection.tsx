import type { WebsiteResourceSection } from '@/content/websiteResources/types';

interface ArticleSectionProps {
    labels: {
        checklist: string;
        comparison: string;
    };
    section: WebsiteResourceSection;
}

export default function ArticleSection({ labels, section }: ArticleSectionProps) {
    return (
        <section id={section.id} className="ws-resource-article-section">
            <h2>{section.title}</h2>
            {section.body?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
            ))}

            {section.bullets?.length ? (
                <ul className="ws-resource-bullet-list">
                    {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                    ))}
                </ul>
            ) : null}

            {section.checklist?.length ? (
                <div className="ws-resource-checklist" aria-label={labels.checklist}>
                    {section.checklist.map((item) => (
                        <div key={item} className="ws-resource-checklist__item">
                            <span aria-hidden="true" />
                            <p>{item}</p>
                        </div>
                    ))}
                </div>
            ) : null}

            {section.comparisonRows?.length ? (
                <div className="ws-resource-comparison" aria-label={labels.comparison}>
                    {section.comparisonRows.map((row) => (
                        <div key={row.label} className="ws-resource-comparison__row">
                            <strong>{row.label}</strong>
                            <p>{row.left}</p>
                            <p>{row.right}</p>
                        </div>
                    ))}
                </div>
            ) : null}
        </section>
    );
}
