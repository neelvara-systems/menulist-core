/**
 * Menu Correctness Engine (MCE) — Type Definitions
 *
 * MCE is a pure validation layer used by supported project mutations and the
 * editor Publish-Gate.
 * It stamps verification metadata (_mce) on the existing project document.
 *
 * Zero new Firestore collections. Zero additional Firebase cost.
 *
 * @see __docs__/menu-correctness-engine/menu-correctness-engine_spec.md
 * @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md
 */

// ─────────────────────────────────────────────────────────────
// MCE METADATA (stored on project document as _mce field)
// ─────────────────────────────────────────────────────────────

/**
 * Verification metadata stamped on the existing project document.
 * Part of the same setDoc() call — zero extra Firebase writes.
 */
export interface MCEMetadata {
    /** Did all critical rules pass? */
    verified: boolean;
    /** Timestamp of last verification (Date.now()) */
    verifiedAt: number;
    /** Non-blocking warning rule IDs (e.g., ['SUSPICIOUS_PRICE_CHANGE']) */
    warnings: string[];
}

// ─────────────────────────────────────────────────────────────
// CSR (Correctness State Resolver) Types
// ─────────────────────────────────────────────────────────────

/**
 * Input to the CSR validation engine.
 * All data needed for validation is passed in — no Firebase calls.
 */
export interface CSRInput {
    /** The project data being saved */
    projectData: unknown;
    /** Whether this is an outlet project (has masterProjectId) */
    isOutlet: boolean;
    /** Master project ID if this is an outlet */
    masterProjectId?: string;
    /** Previous project data for comparison (price anomaly detection) */
    oldProjectData?: unknown;
}

/**
 * Result of CSR validation.
 * Used to generate MCEMetadata for the project document.
 */
export interface CSRResult {
    /** Did all critical rules pass? */
    verified: boolean;
    /** Non-blocking issues (medium/low severity) */
    warnings: CSRWarning[];
    /** Blocking issues (high/critical severity) */
    errors: CSRError[];
    /** Timestamp of validation */
    validatedAt: number;
    /** Total rules evaluated */
    rulesEvaluated: number;
    /** Rules that passed */
    rulesPassed: number;
}

/**
 * Non-blocking warning from CSR validation.
 * Stamps as warning in _mce.warnings but does NOT block verification.
 */
export interface CSRWarning {
    /** Rule identifier (e.g., 'SUSPICIOUS_PRICE_CHANGE') */
    ruleId: string;
    /** Human-readable description */
    message: string;
    /** Warning severity */
    severity: "low" | "medium";
    /** IDs of affected items/categories */
    affectedItems: string[];
}

/**
 * Blocking error from CSR validation.
 * Sets _mce.verified = false.
 */
export interface CSRError {
    /** Rule identifier (e.g., 'REQUIRED_NAME') */
    ruleId: string;
    /** Human-readable description */
    message: string;
    /** Error severity */
    severity: "high" | "critical";
    /** IDs of affected items/categories */
    affectedItems: string[];
    /** Optional fix suggestion for Publish-Gate display */
    suggestedFix?: string;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION RULE TYPES
// ─────────────────────────────────────────────────────────────

/** The 5 Correctness Laws */
export type CorrectnessLaw =
    | "PRICE_INTEGRITY"
    | "AVAILABILITY_INTEGRITY"
    | "HOURS_DATA_CONSISTENCY"
    | "DATA_COMPLETENESS"
    | "STRUCTURAL_INTEGRITY";

/** Severity levels for validation rules */
export type RuleSeverity = "low" | "medium" | "high" | "critical";

/**
 * Individual validation rule definition.
 * Used internally by the CSR to organize and execute rules.
 */
export interface ValidationRule {
    /** Unique rule identifier */
    id: string;
    /** Which Correctness Law this rule belongs to */
    law: CorrectnessLaw;
    /** Human-readable description */
    description: string;
    /** Severity level */
    severity: RuleSeverity;
    /** Whether this rule blocks verification (true for high/critical) */
    blocksVerification: boolean;
    /** The validation function — returns affected item IDs if rule fails */
    validate: (input: CSRInput) => ValidationRuleResult;
}

/**
 * Result of a single validation rule execution.
 */
export interface ValidationRuleResult {
    /** Did the rule pass? */
    passed: boolean;
    /** IDs of affected items (empty if passed) */
    affectedItems: string[];
    /** Human-readable message (empty if passed) */
    message: string;
    /** Optional fix suggestion */
    suggestedFix?: string;
}
