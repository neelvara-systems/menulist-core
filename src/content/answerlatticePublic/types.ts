export type AnswerlatticePublicChangeFrequency = 'weekly' | 'monthly' | 'yearly';

export type AnswerlatticePublicCta = {
    href: string;
    label: string;
};

export type AnswerlatticeResourceItem = {
    label: string;
    href: string;
    description: string;
    eventName?: string;
};

export type AnswerlatticeResourceGroup = {
    title: string;
    description: string;
    items: AnswerlatticeResourceItem[];
};

export type AnswerlatticeComparison = {
    slug: string;
    path: string;
    title: string;
    metaDescription: string;
    eyebrow: string;
    heroTitle: string;
    heroDescription: string;
    answerlatticeFit: string[];
    otherFit: string[];
    tableRows: Array<{
        label: string;
        conventional: string;
        answerlattice: string;
    }>;
    faq: Array<{
        question: string;
        answer: string;
    }>;
};

export type AnswerlatticeDeveloperDoc = {
    slug: string;
    path: string;
    title: string;
    metaDescription: string;
    eyebrow: string;
    heroTitle: string;
    heroDescription: string;
    proof: Array<{
        label: string;
        value: string;
    }>;
    sections: Array<{
        title: string;
        description: string;
        bullets: string[];
    }>;
};

export type AnswerlatticeResourceArticleCluster =
    | 'launch-setup'
    | 'widget-install'
    | 'knowledge-governance'
    | 'support-control'
    | 'pricing'
    | 'security';

export type AnswerlatticeResourceArticleSection = {
    id: string;
    title: string;
    body?: string[];
    bullets?: string[];
    checklist?: string[];
};

export type AnswerlatticeResourceArticleFaq = {
    question: string;
    answer: string;
};

export type AnswerlatticeResourceArticle = {
    slug: string;
    path: string;
    title: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
    quickAnswer: string;
    readingTime: string;
    publishedAt: string;
    updatedAt: string;
    priority: number;
    changeFrequency: AnswerlatticePublicChangeFrequency;
    cluster: AnswerlatticeResourceArticleCluster;
    primaryCta: AnswerlatticePublicCta;
    relatedSlugs: string[];
    sections: AnswerlatticeResourceArticleSection[];
    faq?: AnswerlatticeResourceArticleFaq[];
};

