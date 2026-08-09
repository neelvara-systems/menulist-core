/**
 * Stable customer-facing labels for Answerlattice management surfaces.
 *
 * Internal routes, schemas, permission keys, and technical documentation keep
 * their architecture terms. These labels are only the owner presentation layer.
 */
export const ANSWERLATTICE_CUSTOMER_LANGUAGE = {
    navigation: {
        getLive: 'Get Live',
        runSupport: 'Run Support',
        answerQuality: 'Answer Quality',
        allTools: 'All tools',
        showFewerTools: 'Show fewer tools',
    },
    knowledge: {
        trustedAnswers: 'Trusted Answers',
        productTopics: 'Product Topics',
        topicCoverage: 'Topic Coverage',
        suggestedTopics: 'Suggested Topics',
        answersToRecheck: 'Answers to Recheck',
        suggestedUpdates: 'Suggested Updates',
        productPagesAndFlows: 'Product Pages & Flows',
        setupStatus: 'Setup Status',
    },
    install: {
        installSupport: 'Install Support',
        codingAgentInstall: 'Coding-agent install',
        copyCodingAgentInstall: 'Copy coding-agent install',
    },
} as const;
