const normalizeComparableProfileValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value.trim() : String(value);
};

export const retainChangedProfileFields = (
  existingData: Record<string, unknown>,
  proposedUpdates: Record<string, unknown>,
): Record<string, unknown> => Object.fromEntries(
  Object.entries(proposedUpdates).filter(([key, value]) => (
    normalizeComparableProfileValue(existingData[key])
    !== normalizeComparableProfileValue(value)
  )),
);
