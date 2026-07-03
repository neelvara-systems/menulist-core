import { getBoundedSecurityStringContext, logSecurityFailure } from '@lib/security/securityDiagnostics';

type ImageEditingPromptFailureContext = {
    businessType?: unknown;
    configuredFeatureCount?: number;
    feature?: unknown;
    hasItemCategory?: boolean;
    hasItemDescription?: boolean;
    hasItemName?: boolean;
    knownBusinessTypeCount?: number;
};

export const logImageEditingPromptFailure = (
    failureCode: string,
    error?: unknown,
    context: ImageEditingPromptFailureContext = {},
): void => {
    logSecurityFailure(failureCode, error, {
        ...getBoundedSecurityStringContext('businessType', context.businessType),
        ...getBoundedSecurityStringContext('feature', context.feature),
        configuredFeatureCount: context.configuredFeatureCount,
        hasItemCategory: context.hasItemCategory,
        hasItemDescription: context.hasItemDescription,
        hasItemName: context.hasItemName,
        knownBusinessTypeCount: context.knownBusinessTypeCount,
    });
};
