const DEFINITIVE_MEDIA_REGISTRATION_REJECTION_STATUSES = new Set([
    400, 401, 403, 404, 405, 413, 415, 422, 429,
]);

export const isDefinitiveCampaignCueMediaRegistrationRejection = (status: number) => (
    DEFINITIVE_MEDIA_REGISTRATION_REJECTION_STATUSES.has(status)
);

export const shouldCleanupCampaignCueMediaUploadAfterFailure = (params: {
    registrationDispatched: boolean;
    registrationWasUncertain: boolean;
    responseStatus?: number;
}) => (
    !params.registrationDispatched
    || (
        !params.registrationWasUncertain
        && Boolean(
            params.responseStatus
            && isDefinitiveCampaignCueMediaRegistrationRejection(params.responseStatus)
        )
    )
);
