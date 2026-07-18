export interface BusinessAttributeDefaultsMergeResult {
  businessAttributes: Record<string, unknown>;
  changed: boolean;
}

export function mergeMissingBusinessAttributeDefaults(
  currentAttributes: unknown,
  candidateDefaults: unknown,
  allowedKeys: readonly string[],
): BusinessAttributeDefaultsMergeResult {
  const current = currentAttributes && typeof currentAttributes === "object" && !Array.isArray(currentAttributes)
    ? currentAttributes as Record<string, unknown>
    : {};
  const candidates = candidateDefaults && typeof candidateDefaults === "object" && !Array.isArray(candidateDefaults)
    ? candidateDefaults as Record<string, unknown>
    : {};
  const nextAttributes: Record<string, unknown> = { ...current };
  let changed = false;

  for (const key of allowedKeys) {
    if (candidates[key] !== true || typeof current[key] === "boolean") continue;
    nextAttributes[key] = true;
    changed = true;
  }

  return { businessAttributes: nextAttributes, changed };
}
