export const CONTENT_CREDIT_OPERATION_COSTS = {
    DESCRIPTION_REWRITE: 1,
    GENERATED_MENU_IMAGE: 5,
    LANGUAGE_ADDITION: 3,
    ITEM_TRANSLATION: 1,
    IMAGE_TRANSLATION: 5,
    IMAGE_EDIT: 5,
} as const;

export const getContentCreditOutcomeExamples = (credits: number) => {
    const availableCredits = Number.isFinite(credits) ? Math.max(0, Math.floor(credits)) : 0;

    return {
        descriptionRewrites: Math.floor(availableCredits / CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE),
        generatedMenuImages: Math.floor(availableCredits / CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE),
    };
};
