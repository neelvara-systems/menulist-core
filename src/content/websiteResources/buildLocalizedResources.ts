import type {
    WebsiteResourceArticle,
    WebsiteResourceTranslationPack,
    WebsiteResourcesCopy,
} from './types';

function localizeArticle(
    sourceArticle: WebsiteResourceArticle,
    translation: WebsiteResourceTranslationPack['articles'][string] | undefined,
): WebsiteResourceArticle {
    if (!translation) {
        return sourceArticle;
    }

    return {
        ...sourceArticle,
        title: translation.title,
        metaTitle: translation.metaTitle,
        metaDescription: translation.metaDescription,
        description: translation.description,
        quickAnswer: translation.quickAnswer,
        distributionSnippets: translation.distributionSnippets || sourceArticle.distributionSnippets,
        primaryCta: {
            ...sourceArticle.primaryCta,
            label: translation.primaryCtaLabel,
        },
        sections: sourceArticle.sections.map((section) => {
            const translatedSection = translation.sections[section.id];
            if (!translatedSection) {
                return section;
            }

            return {
                ...section,
                title: translatedSection.title,
                body: translatedSection.body ?? section.body,
                bullets: translatedSection.bullets ?? section.bullets,
                checklist: translatedSection.checklist ?? section.checklist,
                comparisonRows: translatedSection.comparisonRows ?? section.comparisonRows,
            };
        }),
        faq: sourceArticle.faq?.map((item) => {
            const translatedFaq = translation.faq?.[item.id];
            if (!translatedFaq) {
                return item;
            }

            return {
                ...item,
                question: translatedFaq.question,
                answer: translatedFaq.answer,
            };
        }),
    };
}

export function buildLocalizedWebsiteResources(
    sourceCopy: WebsiteResourcesCopy,
    pack: WebsiteResourceTranslationPack,
): WebsiteResourcesCopy {
    return {
        ...sourceCopy,
        locale: pack.locale,
        localeStatus: pack.status,
        reviewedAt: pack.reviewedAt,
        sourceVersion: pack.sourceVersion,
        labels: pack.labels,
        hub: pack.hub,
        clusterLabels: pack.clusterLabels,
        articles: sourceCopy.articles.map((article) => (
            localizeArticle(article, pack.articles[article.slug])
        )),
    };
}
