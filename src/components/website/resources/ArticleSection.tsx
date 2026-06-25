'use client';

import { useState } from 'react';
import { LuCopy } from 'react-icons/lu';
import type { WebsiteResourceSection } from '@/content/websiteResources/types';
import { trackPlausibleEvent } from '@lib/website/plausible';

interface ArticleSectionProps {
    articleCluster: string;
    articleSlug: string;
    labels: {
        checklist: string;
        comparison: string;
        copiedChecklist: string;
        copyChecklist: string;
    };
    section: WebsiteResourceSection;
}

type WebsiteGtagWindow = Window & {
    gtag?: (...args: unknown[]) => void;
};

function trackChecklistCopy(articleSlug: string, articleCluster: string, sectionId: string) {
    trackPlausibleEvent('resource_checklist_copy');

    const analyticsWindow = window as WebsiteGtagWindow;
    if (typeof analyticsWindow.gtag !== 'function') return;

    analyticsWindow.gtag('event', 'resource_checklist_copy', {
        category: articleCluster,
        checklist_id: sectionId,
        cluster: articleCluster,
        section: sectionId,
        slug: articleSlug,
        target_url: window.location.href,
    });
}

export default function ArticleSection({
    articleCluster,
    articleSlug,
    labels,
    section,
}: ArticleSectionProps) {
    const [copied, setCopied] = useState(false);
    const checklistText = section.checklist?.join('\n');

    async function handleCopyChecklist() {
        if (!checklistText) return;

        try {
            await navigator.clipboard.writeText(checklistText);
            setCopied(true);
            trackChecklistCopy(articleSlug, articleCluster, section.id);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    }

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
                <div className="ws-resource-checklist-block">
                    <div className="ws-resource-checklist-block__header">
                        <span>{labels.checklist}</span>
                        <button
                            type="button"
                            className="ws-resource-copy-button"
                            onClick={handleCopyChecklist}
                        >
                            <LuCopy size={15} />
                            {copied ? labels.copiedChecklist : labels.copyChecklist}
                        </button>
                    </div>
                    <div className="ws-resource-checklist" aria-label={labels.checklist}>
                        {section.checklist.map((item) => (
                            <div key={item} className="ws-resource-checklist__item">
                                <span aria-hidden="true" />
                                <p>{item}</p>
                            </div>
                        ))}
                    </div>
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
