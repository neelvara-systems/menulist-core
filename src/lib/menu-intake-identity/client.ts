import type {
  MenuIntakeAnalysisResult,
  MenuIntakeFileInput,
} from "@data/shared/menuIntakeIdentity";

export type MenuIntakeIdentityResponse = MenuIntakeAnalysisResult & {
  analyzedFileCount?: number;
  degraded?: boolean;
  skipped?: boolean;
};

export async function runMenuIntakeIdentityPreflight(params: {
  projectId: string;
  files: MenuIntakeFileInput[];
}): Promise<MenuIntakeIdentityResponse | null> {
  const response = await fetch("/api/menu-intake-identity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Could not check this upload.");
  }

  const payload = await response.json();
  if (payload?.skipped) return null;
  return payload as MenuIntakeIdentityResponse;
}
