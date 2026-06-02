export type WebsiteResourceChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export type WebsiteResourceCluster =
    | 'source-audit'
    | 'official-source'
    | 'qr-menu'
    | 'google-menu'
    | 'menu-seo'
    | 'ai-discovery'
    | 'menu-engineering'
    | 'checklists'
    | 'multi-location';

export type WebsiteResourceComparisonRow = {
    label: string;
    left: string;
    right: string;
};

export type WebsiteResourceSection = {
    body?: string[];
    bullets?: string[];
    checklist?: string[];
    comparisonRows?: WebsiteResourceComparisonRow[];
    id: string;
    title: string;
};

export type WebsiteResourceFaq = {
    answer: string;
    id: string;
    question: string;
};

export type WebsiteResourceCta = {
    href: string;
    label: string;
};

export type WebsiteResourceArticle = {
    changeFrequency: WebsiteResourceChangeFrequency;
    cluster: WebsiteResourceCluster;
    description: string;
    distributionSnippets?: string[];
    faq?: WebsiteResourceFaq[];
    metaDescription: string;
    metaTitle: string;
    primaryCta: WebsiteResourceCta;
    priority: number;
    publishedAt: string;
    quickAnswer: string;
    readingTime: string;
    relatedSlugs: string[];
    sections: WebsiteResourceSection[];
    slug: string;
    title: string;
    updatedAt: string;
};

export type WebsiteResourcesHubCopy = {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    primaryCta: WebsiteResourceCta;
    secondaryCta: WebsiteResourceCta;
    proofItems: string[];
    clusterTitle: string;
    clusterSubtitle: string;
    toolTitle: string;
    toolSubtitle: string;
};

export type WebsiteResourceClusterLabels = Record<WebsiteResourceCluster, string>;

export type WebsiteResourcesLabels = {
    allResources: string;
    backToHub: string;
    checklist: string;
    comparison: string;
    copiedChecklist: string;
    copyChecklist: string;
    faqTitle: string;
    onThisPage: string;
    primaryAction: string;
    quickAnswer: string;
    readingTime: string;
    readResource: string;
    relatedResources: string;
    resources: string;
    updated: string;
};

export type WebsiteResourcesCopy = {
    articles: WebsiteResourceArticle[];
    clusterLabels: WebsiteResourceClusterLabels;
    hub: WebsiteResourcesHubCopy;
    labels: WebsiteResourcesLabels;
    locale: string;
    localeStatus: WebsiteResourceLocaleStatus;
    reviewedAt?: string;
    sourceVersion: string;
};

export type WebsiteResourceLocaleStatus = 'source' | 'draft' | 'reviewed' | 'needs_review';

export type WebsiteResourceSectionTranslation = {
    body?: string[];
    bullets?: string[];
    checklist?: string[];
    comparisonRows?: WebsiteResourceComparisonRow[];
    title: string;
};

export type WebsiteResourceFaqTranslation = {
    answer: string;
    question: string;
};

export type WebsiteResourceArticleTranslation = {
    description: string;
    distributionSnippets?: string[];
    faq?: Record<string, WebsiteResourceFaqTranslation>;
    metaDescription: string;
    metaTitle: string;
    primaryCtaLabel: string;
    quickAnswer: string;
    sections: Record<string, WebsiteResourceSectionTranslation>;
    title: string;
};

export type WebsiteResourceTranslationPack = {
    articles: Record<string, WebsiteResourceArticleTranslation>;
    clusterLabels: WebsiteResourceClusterLabels;
    hub: WebsiteResourcesHubCopy;
    labels: WebsiteResourcesLabels;
    locale: string;
    reviewedAt?: string;
    sourceVersion: string;
    status: Exclude<WebsiteResourceLocaleStatus, 'source'>;
};
