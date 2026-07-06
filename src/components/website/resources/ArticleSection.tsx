'use client';

import { useState } from 'react';
import { LuCopy } from 'react-icons/lu';
import type { WebsiteResourceSection } from '@/content/websiteResources/types';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { trackGoogleMarketingEvent, trackPlausibleEvent } from '@lib/website/plausible';

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

function trackChecklistCopy(articleSlug: string, articleCluster: string, sectionId: string) {
    trackPlausibleEvent('resource_checklist_copy');

    trackGoogleMarketingEvent('resource_checklist_copy', {
        category: articleCluster,
        checklist_id: sectionId,
        cluster: articleCluster,
        section: sectionId,
        slug: articleSlug,
        target_url: window.location.href,
    });
}

function hasResourceChecklistClipboardWrite(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}

function hasResourceChecklistCopyFallback(): boolean {
    return typeof document !== 'undefined'
        && Boolean(document.body)
        && typeof document.createElement === 'function'
        && typeof document.execCommand === 'function';
}

async function copyResourceChecklistToClipboard(checklistText: string): Promise<void> {
    let clipboardWriteError: unknown;

    if (hasResourceChecklistClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(checklistText);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasResourceChecklistCopyFallback()) {
        throw clipboardWriteError || new Error('website_resource_checklist_copy_unavailable');
    }

    const textarea = document.createElement('textarea');
    textarea.value = checklistText;
    textarea.readOnly = true;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error('website_resource_checklist_copy_fallback_failed');
        }
    } finally {
        document.body.removeChild(textarea);
    }
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
            await copyResourceChecklistToClipboard(checklistText);
            setCopied(true);
            trackChecklistCopy(articleSlug, articleCluster, section.id);
            window.setTimeout(() => setCopied(false), 1800);
        } catch (error) {
            logRuntimeFailure('website_resource_checklist_copy_failed', error, {
                ...getBoundedRuntimeStringContext('articleSlug', articleSlug),
                ...getBoundedRuntimeStringContext('articleCluster', articleCluster),
                ...getBoundedRuntimeStringContext('sectionId', section.id),
                ...getBoundedRuntimeStringContext('checklistText', checklistText),
                hasClipboardWrite: hasResourceChecklistClipboardWrite(),
                hasCopyFallback: hasResourceChecklistCopyFallback(),
            });
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
