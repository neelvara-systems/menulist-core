const ENTITY_CANDIDATE_IDENTITY_DISALLOWED_PATTERN = new RegExp('[^\\p{L}\\p{M}\\p{N}]+', 'gu');

/**
 * Builds the stable name component used by deterministic entity-candidate IDs.
 * The ASCII contract is preserved for existing IDs while letters and numbers
 * from every supported script remain distinct.
 */
export const normalizeAnswerlatticeEntityCandidateIdentityName = (name: string): string => {
    const canonicalName = name.normalize('NFKC').toLowerCase().trim();
    const normalizedName = canonicalName
        .replace(ENTITY_CANDIDATE_IDENTITY_DISALLOWED_PATTERN, ' ')
        .trim();

    // Provider validation normally requires a real word. Retaining the bounded
    // canonical input here still prevents all-symbol legacy values from sharing
    // one empty identity key.
    return normalizedName || canonicalName;
};
