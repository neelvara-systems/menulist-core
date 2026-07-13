export const MENU_EXTRACTION_DESTINATION_TYPES = {
  MESSAGING_ONBOARDING: "messaging_onboarding",
  PROJECT: "project",
  PUBLIC_MENU_DRAFT: "public_menu_draft",
} as const;

export const MENU_EXTRACTION_SOURCES = {
  MENU_LINK_IMPORT: "menu_link_import",
  MESSAGING_ONBOARDING: "MESSAGING_ONBOARDING",
  OWNER_UPLOAD: "owner_upload",
  PUBLIC_CREATE_MENU: "public_create_menu",
} as const;

export const MENU_EXTRACTION_JOB_LIMITS = {
  MAX_FILES: 15,
  MAX_FILE_SIZE_BYTES: 30 * 1024 * 1024,
} as const;

export const OWNER_MENU_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES = [
  ...OWNER_MENU_UPLOAD_MIME_TYPES,
  "image/heic",
  "image/heif",
] as const;

export const MENU_LINK_IMPORT_TEXT_MIME_TYPES = [
  "application/json",
  "application/ld+json",
  "application/xhtml+xml",
  "application/xml",
  "text/html",
  "text/plain",
  "text/xml",
] as const;

export const MENU_LINK_IMPORT_MIME_TYPES = [
  ...MENU_LINK_IMPORT_TEXT_MIME_TYPES,
  ...OWNER_MENU_UPLOAD_MIME_TYPES,
] as const;

export const SUPPORTED_MENU_EXTRACTION_JOB_MIME_TYPES = [
  ...MENU_LINK_IMPORT_TEXT_MIME_TYPES,
  ...MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES,
] as const;

export type MenuExtractionDestinationType =
  (typeof MENU_EXTRACTION_DESTINATION_TYPES)[keyof typeof MENU_EXTRACTION_DESTINATION_TYPES];

export type MenuExtractionJobSource =
  (typeof MENU_EXTRACTION_SOURCES)[keyof typeof MENU_EXTRACTION_SOURCES];

export type MenuExtractionProjectSaveMode = "auto_or_review" | "review";

export type MenuExtractionJobDestination =
  | {
      type: typeof MENU_EXTRACTION_DESTINATION_TYPES.PROJECT;
      projectId: string;
      saveMode?: MenuExtractionProjectSaveMode;
    }
  | {
      type: typeof MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT;
      draftId: string;
      sourceType?: "image_upload" | "menu_link_import";
    }
  | {
      type: typeof MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING;
      sessionId: string;
    };

export function buildProjectMenuExtractionDestination(
  projectId: string,
  saveMode: MenuExtractionProjectSaveMode = "auto_or_review",
): Extract<MenuExtractionJobDestination, { type: "project" }> {
  return {
    projectId,
    saveMode,
    type: MENU_EXTRACTION_DESTINATION_TYPES.PROJECT,
  };
}

export function buildPublicDraftMenuExtractionDestination(
  draftId: string,
  sourceType: "image_upload" | "menu_link_import",
): Extract<MenuExtractionJobDestination, { type: "public_menu_draft" }> {
  return {
    draftId,
    sourceType,
    type: MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT,
  };
}

export function buildMessagingOnboardingMenuExtractionDestination(
  sessionId: string,
): Extract<MenuExtractionJobDestination, { type: "messaging_onboarding" }> {
  return {
    sessionId,
    type: MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING,
  };
}

export function buildMenuExtractionRoutingFields(destination: MenuExtractionJobDestination) {
  return {
    destination,
    destinationType: destination.type,
  };
}

export function isMessagingOnboardingMenuExtractionProjectId(
  value: unknown,
): value is string {
  return typeof value === "string" && value.startsWith("msg-onboarding-");
}

export function normalizeProjectJobSource(value: unknown): "menu_link_import" | "owner_upload" {
  return value === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
    ? MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
    : MENU_EXTRACTION_SOURCES.OWNER_UPLOAD;
}
