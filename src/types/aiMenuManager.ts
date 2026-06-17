export type AiMenuManagerInputType = "text" | "voice_transcript" | "upload" | "suggested_action";

export type AiMenuManagerActionType =
    | "item_price_update"
    | "item_create"
    | "item_update"
    | "item_name_update"
    | "item_description_update"
    | "item_description_generate"
    | "item_description_refresh"
    | "item_category_update"
    | "item_availability_update"
    | "item_visibility_update"
    | "item_attribute_create"
    | "item_attribute_update"
    | "item_attribute_delete"
    | "item_attribute_name_update"
    | "item_attribute_price_update"
    | "item_attribute_visibility_update"
    | "item_attribute_order_update"
    | "item_bestseller_update"
    | "item_prep_time_update"
    | "item_promotion_weight_update"
    | "item_metadata_update"
    | "item_metadata_generate"
    | "item_translation_repair"
    | "item_image_update"
    | "item_order_update"
    | "item_quality_review_update"
    | "item_identity_reference"
    | "item_delete"
    | "category_create"
    | "category_update"
    | "category_name_update"
    | "category_visibility_update"
    | "category_icon_update"
    | "category_image_update"
    | "category_time_slot_update"
    | "category_time_slot_preset_create"
    | "category_translation_repair"
    | "category_order_update"
    | "category_identity_reference"
    | "category_delete"
    | "decision_blocks_update"
    | "menu_special_note_update"
    | "menu_design_mood_update"
    | "bulk_price_update"
    | "bulk_availability_update"
    | "image_item_generate"
    | "image_item_apply_generated"
    | "menu_file_upload"
    | "menu_link_import"
    | "menu_import_review_apply"
    | "special_menu_create"
    | "special_menu_activate"
    | "menu_publish"
    | "system_manual_task_create"
    | "system_clarification_request"
    | "system_unsupported_action";

export type AiMenuManagerExecutionMode =
    | "client_project_mutation"
    | "existing_api_job"
    | "server_project_mutation"
    | "existing_client_dal"
    | "existing_server_api"
    | "browser_local_export"
    | "manual_task_card"
    | "manual_task"
    | "read_only_card";

export type AiMenuManagerApprovalLevel =
    | "none"
    | "confirm"
    | "high_confirm"
    | "bulk_confirm"
    | "destructive_confirm"
    | "external_confirm";

export type AiMenuManagerRisk = "low" | "medium" | "high";

export type AiMenuManagerProposalStatus =
    | "pending_approval"
    | "approved"
    | "executing"
    | "executed"
    | "failed"
    | "cancelled"
    | "rejected"
    | "manual_task";

export type AiMenuManagerExecutionStatus = "not_started" | "locked" | "executed" | "failed";

export type AiMenuManagerCardKind =
    | "proposal"
    | "receipt"
    | "manual_task"
    | "clarification"
    | "unsupported";

export type AiMenuManagerPatchKind =
    | "item_update"
    | "bulk_item_update"
    | "category_update"
    | "attribute_update"
    | "menu_settings_update"
    | "decision_blocks_update"
    | "menu_design_preset_apply";

export type AiMenuManagerActionReadiness =
    | "ready_adapter"
    | "needs_adapter_glue"
    | "existing_api_only"
    | "manual_task_only"
    | "blocked";

export interface AiMenuManagerScope {
    type: "project" | "store" | "outlet" | "external";
    tId: number | string;
    sId: number | string;
    projectId?: string;
    outletId?: string;
    label: string;
}

export interface AiMenuManagerApprovalPolicy {
    level: AiMenuManagerApprovalLevel;
    requiresApproval: boolean;
    reason: string;
}

export interface AiMenuManagerEntityRef {
    kind: "project" | "menu_item" | "category" | "store" | "preset" | "manual_task";
    id: string;
    label: string;
}

export interface AiMenuManagerBeforeAfterSummary {
    title: string;
    beforeLabel?: string;
    afterLabel?: string;
    beforeValue?: string;
    afterValue?: string;
    rows?: Array<{
        label: string;
        before?: string;
        after?: string;
    }>;
    warnings?: string[];
}

export interface AiMenuManagerProjectPatch {
    kind: AiMenuManagerPatchKind;
    itemIds?: string[];
    categoryIds?: string[];
    attributeIds?: string[];
    attributeId?: string;
    updates?: Record<string, unknown>;
    itemUpdates?: Record<string, Record<string, unknown>>;
    menuSettings?: Record<string, unknown>;
    decisionBlocks?: {
        enablePopular?: boolean;
        enableQuickPick?: boolean;
        enableBestValue?: boolean;
        pinnedPopular?: string;
        pinnedQuickPick?: string;
        pinnedBestValue?: string;
    };
    designPresetKey?: string;
    designPatch?: {
        menu?: Record<string, unknown>;
        brand?: Record<string, unknown>;
    };
}

export interface AiMenuManagerCardPayload {
    cardId: string;
    kind: AiMenuManagerCardKind;
    actionType: AiMenuManagerActionType;
    title: string;
    message: string;
    status: AiMenuManagerProposalStatus;
    risk: AiMenuManagerRisk;
    approvalPolicy: AiMenuManagerApprovalPolicy;
    scope: AiMenuManagerScope;
    entityRefs: AiMenuManagerEntityRef[];
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    actions: Array<"approve" | "cancel" | "edit" | "open_existing_screen" | "mark_done" | "try_again">;
    createdAt: string;
}

export interface AiMenuManagerCompactMessage {
    messageId: string;
    role: "owner" | "menu_manager" | "system";
    text: string;
    createdAt: string;
}

export interface AiMenuManagerCardSummary {
    proposalId: string;
    actionType: AiMenuManagerActionType;
    title: string;
    status: AiMenuManagerProposalStatus;
    risk: AiMenuManagerRisk;
    projectId?: string;
    updatedAt: string;
}

export interface AiMenuManagerReceipt {
    receiptId: string;
    proposalId: string;
    actionType: AiMenuManagerActionType;
    status: "executed" | "failed" | "manual_task";
    title: string;
    message: string;
    projectId?: string;
    executedAt: string;
    undoAvailable: boolean;
}

export interface AiMenuManagerExecutionDirective {
    proposalId: string;
    executionId: string;
    actionType: AiMenuManagerActionType;
    scope: AiMenuManagerScope;
    baseProjectUpdatedAt?: string;
    baseProjectHash?: string;
    patchHash: string;
    patch: AiMenuManagerProjectPatch;
    patchSummary: AiMenuManagerBeforeAfterSummary;
    expiresAt: string;
}

export interface AiMenuManagerSessionDoc {
    sessionId: string;
    tId: number | string;
    sId: number | string;
    projectId?: string;
    sessionDate: string;
    storageMode: "daily_compact" | "detailed";
    status: "active" | "closed";
    compactMessages: AiMenuManagerCompactMessage[];
    pendingCardSummaries: AiMenuManagerCardSummary[];
    recentReceiptSummaries: AiMenuManagerReceipt[];
    counters: {
        commands: number;
        proposalsCreated: number;
        approvals: number;
        executions: number;
    };
    artifactRefs?: Array<Record<string, unknown>>;
    createdAt: unknown;
    updatedAt: unknown;
    expiresAt?: unknown;
}

export interface AiMenuManagerProposalDoc {
    proposalId: string;
    sessionId: string;
    tId: number | string;
    sId: number | string;
    projectId?: string;
    actionType: AiMenuManagerActionType;
    status: AiMenuManagerProposalStatus;
    risk: AiMenuManagerRisk;
    approvalPolicy: AiMenuManagerApprovalPolicy;
    entityRefs: AiMenuManagerEntityRef[];
    scope: AiMenuManagerScope;
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    cardPayload: AiMenuManagerCardPayload;
    executionMode: AiMenuManagerExecutionMode;
    executionStatus?: AiMenuManagerExecutionStatus;
    approvalRecord?: {
        approvedBy: string | number;
        approvedAt: unknown;
        action: string;
    };
    receipt?: AiMenuManagerReceipt;
    patch?: AiMenuManagerProjectPatch;
    patchHash?: string;
    executionDirective?: AiMenuManagerExecutionDirective;
    baseProjectUpdatedAt?: string;
    baseProjectHash?: string;
    idempotencyKeys: string[];
    createdAt: unknown;
    updatedAt: unknown;
    expiresAt?: unknown;
}

export interface AiMenuManagerActionDefinition {
    actionType: AiMenuManagerActionType;
    ownerLabel: string;
    manualEquivalent: string;
    executionMode: AiMenuManagerExecutionMode;
    approvalLevel: AiMenuManagerApprovalLevel;
    risk: AiMenuManagerRisk;
    costClass:
        | "C0 local"
        | "C1 single project save"
        | "C2 job/storage"
        | "C3 summary/store write"
        | "C4 guarded server mutation"
        | "C5 manual only"
        | "Compact proposal/session write";
    mobileBehavior: string;
    sourceEvidence: string[];
    readiness: AiMenuManagerActionReadiness;
    requiredFlags?: string[];
}

export interface AiMenuManagerCommandRequest {
    sessionId?: string;
    storeId: string;
    projectId: string;
    inputType: AiMenuManagerInputType;
    text?: string;
    uploadRefs?: Array<{ storagePath: string; mimeType: string; size: number }>;
    clientContextVersion?: string;
    idempotencyKey: string;
}

export interface AiMenuManagerProposalActionRequest {
    action: "approve" | "cancel" | "reject" | "mark_done";
    storeId: string | number;
    projectId?: string;
    actionType?: AiMenuManagerActionType;
    idempotencyKey: string;
}

export interface AiMenuManagerProposalCompleteRequest {
    storeId: string | number;
    projectId?: string;
    actionType?: AiMenuManagerActionType;
    executionId: string;
    patchHash: string;
    result: "executed" | "failed";
    message?: string;
    idempotencyKey: string;
}

export interface AiMenuManagerCommandResponse {
    sessionId: string;
    messageId: string;
    cards: AiMenuManagerCardPayload[];
    nextRequiredAction: "none" | "owner_approval" | "clarification";
}

export interface AiMenuManagerInboxResponse {
    session: AiMenuManagerSessionDoc | null;
    cards: AiMenuManagerCardPayload[];
    receipts: AiMenuManagerReceipt[];
}
