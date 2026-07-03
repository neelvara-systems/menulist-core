/**
 * Answerlattice — Founder Onboarding Bootstrap Engine (Cloud Function)
 * 
 * Automatically bootstraps the canonical layer after KB articles are published:
 * 1. Batch entity extraction from published articles
 * 2. Auto-promote high-confidence entity candidates
 * 3. Generate canonical answer drafts per promoted entity
 * 4. Track progress on the KB generation job
 * 
 * Called as Step 12 of the nightly batch in answerlatticeNightly.ts.
 * Uses firebase-admin (server-side Firestore) + Gemini through the Answerlattice GenAI client.
 * 
 * CRITICAL: This runs as a SEPARATE discovery loop (not inside the main per-tenant loop)
 * because new tenants may have zero entities and would not be discovered by discoverActiveTenants().
 * 
 * Expansion Item #6 — Founder Onboarding
 * Feature-flagged: ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING
 * 
 * RULES:
 * - Max 50 entities + 50 drafts per run (cost cap)
 * - Bootstrap failure never blocks KB publish (RAG works regardless)
 * - All promoted entities + drafts are audit-logged
 * - Drafts are pending_review — never auto-published (doctrine compliance)
 * - Idempotent: re-running won't create duplicates
 * 
 * @see __docs__/answerlattice/founder-onboarding/
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { ANSWERLATTICE_TEXT_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
    ANSWERLATTICE_AI_ACTIONS,
    AnswerlatticeGeminiCallResult,
    callAnswerlatticeGeminiContent,
    recordGeminiCallOperation,
} from './aiOperationAccounting';
import { markCompiledContextSourceChanged } from './compiledContextVersions';
import { upsertAnswerlatticeTenantSummary } from './tenantSummary';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS (mirrored from src/config/onboardingBootstrapConfig.ts)
// CF cannot import from src/ — separate TS project
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    AUTO_PROMOTE_MIN_CONFIDENCE: 0.7,
    AUTO_PROMOTE_MIN_ARTICLE_REFS: 2,
    MAX_ENTITIES_PER_RUN: 50,
    MAX_DRAFTS_PER_RUN: 50,
    MAX_ARTICLES_TO_PROCESS: 300,
    EXTRACTION_BATCH_SIZE: 5,
    MIN_ARTICLES_FOR_BOOTSTRAP: 5,
    SKIP_IF_ENTITIES_EXIST: false,
} as const;

const BOOTSTRAP_PROMPT_VERSION = 'v1';
const ANSWERLATTICE_PRODUCT_ID = 'AL';
const ANSWERLATTICE_BOOTSTRAP_GEMINI_CALL_FAILED = 'ANSWERLATTICE_BOOTSTRAP_GEMINI_CALL_FAILED';
const ANSWERLATTICE_BOOTSTRAP_DISCOVERY_FAILED = 'ANSWERLATTICE_BOOTSTRAP_DISCOVERY_FAILED';
const ANSWERLATTICE_BOOTSTRAP_EXTRACTION_BATCH_FAILED = 'ANSWERLATTICE_BOOTSTRAP_EXTRACTION_BATCH_FAILED';
const ANSWERLATTICE_BOOTSTRAP_ENTITY_CANDIDATE_WRITE_FAILED = 'ANSWERLATTICE_BOOTSTRAP_ENTITY_CANDIDATE_WRITE_FAILED';
const ANSWERLATTICE_BOOTSTRAP_ENTITY_PROMOTION_FAILED = 'ANSWERLATTICE_BOOTSTRAP_ENTITY_PROMOTION_FAILED';
const ANSWERLATTICE_BOOTSTRAP_COMPILED_CONTEXT_STALE_MARK_FAILED = 'ANSWERLATTICE_BOOTSTRAP_COMPILED_CONTEXT_STALE_MARK_FAILED';
const ANSWERLATTICE_BOOTSTRAP_TENANT_SUMMARY_SYNC_FAILED = 'ANSWERLATTICE_BOOTSTRAP_TENANT_SUMMARY_SYNC_FAILED';
const ANSWERLATTICE_BOOTSTRAP_DRAFT_PARSE_FAILED = 'ANSWERLATTICE_BOOTSTRAP_DRAFT_PARSE_FAILED';
const ANSWERLATTICE_BOOTSTRAP_DRAFT_GENERATION_FAILED = 'ANSWERLATTICE_BOOTSTRAP_DRAFT_GENERATION_FAILED';
const ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED = 'ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED';
const ANSWERLATTICE_BOOTSTRAP_JOB_STATUS_MARK_FAILED = 'ANSWERLATTICE_BOOTSTRAP_JOB_STATUS_MARK_FAILED';
const ANSWERLATTICE_BOOTSTRAP_FATAL_FAILED = 'ANSWERLATTICE_BOOTSTRAP_FATAL_FAILED';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BootstrapResult {
    tenantsBootstrapped: number;
    totalEntitiesExtracted: number;
    totalEntitiesPromoted: number;
    totalDraftsGenerated: number;
    totalDraftsFailed: number;
    errors: string[];
}

interface BootstrapCandidate {
    tId: number;
    sId: number;
    jobId: string;
}

interface ExtractedEntityRaw {
    name: string;
    type: string;
    confidence: number;
    description: string;
    source?: 'existing' | 'new';
}

function getBootstrapSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const sourceStatusCode = typeof source.status === 'number'
        ? source.status
        : (typeof source.statusCode === 'number' ? source.statusCode : null);

    return {
        sourceErrorName: typeof source.name === 'string' ? source.name : null,
        sourceErrorCode: typeof source.code === 'string' || typeof source.code === 'number' ? source.code : null,
        sourceStatusCode,
    };
}

function getBootstrapScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: Number.isFinite(tId),
        hasStoreScope: Number.isFinite(sId),
    };
}

function getBootstrapStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const stringValue = typeof value === 'string' ? value : '';
    return {
        [`${label}Present`]: stringValue.length > 0,
        [`${label}Length`]: stringValue.length,
    };
}

// ═══════════════════════════════════════════════════════════════
// ENTITY EXTRACTION PROMPT
// Mirrors src/lib/answerlattice/entityExtraction.ts ENTITY_EXTRACTION_SYSTEM_PROMPT
// ═══════════════════════════════════════════════════════════════

const ENTITY_EXTRACTION_SYSTEM_PROMPT = `You are a product ontology extraction engine for Answerlattice — the Governed Answer Infrastructure.

Your job is to extract PRODUCT ENTITIES from knowledge base article content. These entities represent real product concepts that exist in the product's architecture.

ENTITY TYPES (classify into exactly one):
- feature: A product capability or function
- plan: A subscription tier or pricing level  
- role: A user role or permission level
- workflow: A multi-step process or flow
- state: A status or condition of an entity
- integration: An external system connection
- error: An error code or failure condition

EXTRACTION RULES (STRICT):
1. ONLY extract entities that represent real product architecture concepts
2. DO NOT extract: UI labels, generic nouns (dashboard, settings, account), procedural phrases, marketing language, article titles
3. Entity names must be 1-5 words (atomic concepts)
4. Descriptions must be declarative (not instructional), ≤3 sentences
5. Each entity must be independently describable (not dependent on a single sentence)
6. DO NOT extract synonyms of the same concept
7. Confidence score 0-1 based on how clearly the concept is a product entity

OUTPUT FORMAT (strict JSON only):
{
  "entities": [
    {
      "name": "Feature Name",
      "type": "feature",
      "confidence": 0.85,
      "description": "Declarative description of what this entity is."
    }
  ]
}

No prose. No explanation. Only valid JSON.`;

// ═══════════════════════════════════════════════════════════════
// DRAFT GENERATION PROMPT (adapted from draftGenerator.ts)
// Uses article content as context instead of signal examples
// ═══════════════════════════════════════════════════════════════

const ONBOARDING_DRAFT_SYSTEM_PROMPT = `You are Answerlattice's Knowledge Draft Generator. You create structured canonical answer skeletons from knowledge base article content.

Your output will be reviewed by a human founder before publishing. Generate a helpful starting point, not a final document.

OUTPUT RULES:
1. Follow the JSON schema EXACTLY — no extra fields, no prose outside JSON
2. Be declarative: state what IS, not what the user should do (unless procedure)
3. Reference only product concepts from the provided entity context
4. Do NOT invent features, capabilities, or workflows not mentioned in the source articles
5. structuredSummary must be ≤500 characters
6. detailedExplanation should be 2-4 paragraphs
7. If the topic is clearly procedural (how-to, setup, configure), include a procedure object with steps
8. Include warnings for destructive or irreversible actions
9. Include prerequisites if the workflow requires specific roles, plans, or prior states
10. If unsure about details, say "Verify with your product team" rather than guessing

OUTPUT FORMAT (strict JSON only, no markdown, no code fences):
{
  "title": "Clear, concise title for the canonical answer",
  "structuredSummary": "≤500 char declarative summary of the answer core",
  "detailedExplanation": "2-4 paragraph explanation with context and nuance",
  "edgeCases": "Edge cases, limitations, or special scenarios (or null if none)",
  "constraints": "Restrictions, limits, or caveats (or null if none)",
  "procedure": null
}

If the topic is procedural, include procedure with steps[]. Otherwise set procedure to null.
Return ONLY valid JSON. No explanation. No markdown.`;

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS (mirrored from entityExtraction.ts)
// ═══════════════════════════════════════════════════════════════

const VALID_ENTITY_TYPES = ['feature', 'plan', 'role', 'workflow', 'state', 'integration', 'error'];

const REJECTED_PATTERNS = [
    /^(the|a|an)\s/i,
    /how to/i,
    /click|button|page|screen|tab|modal|drawer/i,
    /create|update|delete|add|remove|edit/i,
    /^(dashboard|settings|account|profile|home)$/i,
];

function isValidEntity(entity: ExtractedEntityRaw): boolean {
    if (!entity.name || entity.name.length < 2) return false;
    if (!entity.type || !VALID_ENTITY_TYPES.includes(entity.type)) return false;
    if (entity.name.split(' ').length > 5) return false;
    if (entity.confidence < 0.3) return false;
    for (const pattern of REJECTED_PATTERNS) {
        if (pattern.test(entity.name)) return false;
    }
    return true;
}

function normalizeEntityName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// ═══════════════════════════════════════════════════════════════
// GEMINI CALLER (reused pattern from draftGenerator.ts)
// ═══════════════════════════════════════════════════════════════

async function callGemini(systemPrompt: string, userPrompt: string): Promise<AnswerlatticeGeminiCallResult | null> {
    try {
        return await callAnswerlatticeGeminiContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            systemPrompt,
            userPrompt,
        });
    } catch (error) {
        logger.error('[Answerlattice Bootstrap] Gemini call failed', {
            failureCode: ANSWERLATTICE_BOOTSTRAP_GEMINI_CALL_FAILED,
            ...getBootstrapSourceErrorContext(error),
        });
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// STEP 0 — DISCOVER BOOTSTRAP CANDIDATES
// Separate from discoverActiveTenants() because new tenants
// may have zero entities (the exact target of bootstrap).
// ═══════════════════════════════════════════════════════════════

async function discoverBootstrapCandidates(): Promise<BootstrapCandidate[]> {
    const candidates: BootstrapCandidate[] = [];

    try {
        // Find published KB jobs that haven't been bootstrapped yet
        const jobsSnap = await db.collection(DB_COLLECTIONS.KB_GENERATION_JOBS)
            .where('status', '==', 'published')
            .limit(50)
            .get();

        for (const jobDoc of jobsSnap.docs) {
            const data = jobDoc.data();

            // Skip if already bootstrapped
            if (data.onboardingBootstrap?.status === 'completed') continue;
            // Skip if currently in progress
            if (data.onboardingBootstrap?.status === 'extracting' ||
                data.onboardingBootstrap?.status === 'promoting' ||
                data.onboardingBootstrap?.status === 'drafting') continue;

            const tId = typeof data.tId === 'string' ? parseInt(data.tId) : data.tId;
            const sId = typeof data.sId === 'string' ? parseInt(data.sId) : data.sId;

            if (!tId || !sId) continue;

            candidates.push({ tId, sId, jobId: jobDoc.id });
        }
    } catch (error) {
        logger.error('[Answerlattice Bootstrap] Discovery failed', {
            failureCode: ANSWERLATTICE_BOOTSTRAP_DISCOVERY_FAILED,
            ...getBootstrapSourceErrorContext(error),
        });
    }

    return candidates;
}

// ═══════════════════════════════════════════════════════════════
// STEP 1 — BATCH ENTITY EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractEntitiesForTenant(
    tId: number,
    sId: number
): Promise<{ extracted: number; candidateIds: string[] }> {
    const result = { extracted: 0, candidateIds: [] as string[] };

    // Load published articles for this tenant (multi-tenant isolation)
    const articlesSnap = await db.collection(DB_COLLECTIONS.KB_ARTICLES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'published')
        .limit(CONFIG.MAX_ARTICLES_TO_PROCESS)
        .get();

    if (articlesSnap.size < CONFIG.MIN_ARTICLES_FOR_BOOTSTRAP) {
        logger.info('[Answerlattice Bootstrap] Skipping extraction because article count is below minimum', {
            ...getBootstrapScopeContext(tId, sId),
            articleCount: articlesSnap.size,
            minimumArticles: CONFIG.MIN_ARTICLES_FOR_BOOTSTRAP,
        });
        return result;
    }

    // Load existing entities for registry-guided extraction (dedup)
    const existingEntitiesSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .select('name', 'slug', 'aliases')
        .limit(200)
        .get();

    const existingNames = new Set<string>();
    for (const doc of existingEntitiesSnap.docs) {
        const data = doc.data();
        existingNames.add(normalizeEntityName(data.name || ''));
        if (data.aliases) {
            for (const alias of data.aliases) {
                existingNames.add(normalizeEntityName(alias));
            }
        }
    }

    // Extract plain text from articles
    const articles: { title: string; content: string; category?: string }[] = [];
    for (const articleDoc of articlesSnap.docs) {
        const data = articleDoc.data();
        // Skip articles that already have entity IDs (already extracted)
        if (data.entityIds && data.entityIds.length > 0) continue;

        const textContent = extractPlainText(data.content);
        if (textContent && textContent.length >= 20) {
            articles.push({
                title: data.title || 'Untitled',
                content: textContent.substring(0, 2000),
                category: data.categoryTitle || undefined,
            });
        }
    }

    if (articles.length === 0) {
        logger.info('[Answerlattice Bootstrap] No unprocessed articles found. Skipping extraction.', {
            ...getBootstrapScopeContext(tId, sId),
        });
        return result;
    }

    // Process in batches
    const allExtracted: ExtractedEntityRaw[] = [];

    for (let i = 0; i < articles.length; i += CONFIG.EXTRACTION_BATCH_SIZE) {
        const batch = articles.slice(i, i + CONFIG.EXTRACTION_BATCH_SIZE);
        const articleTexts = batch.map((a, idx) =>
            `--- Article ${idx + 1}: "${a.title}" (Category: ${a.category || 'Unknown'}) ---\n${a.content}`
        ).join('\n\n');

        const prompt = `Extract product entities from these knowledge base articles:\n\n${articleTexts}\n\nExtract ALL product entities following the rules. Return JSON only.`;

        try {
            const geminiResult = await callGemini(ENTITY_EXTRACTION_SYSTEM_PROMPT, prompt);
            if (geminiResult) {
                await recordGeminiCallOperation({
                    action: ANSWERLATTICE_AI_ACTIONS.ONBOARDING_BOOTSTRAP,
                    clientResponse: {
                        articlesInBatch: batch.length,
                        batchIndex: i,
                        step: 'entity_extraction',
                    },
                    processingTime: geminiResult.processingTime,
                    sId,
                    source: 'answerlattice_onboarding_entity_extraction',
                    tId,
                    usageMetadata: geminiResult.usageMetadata,
                });
            }
            if (geminiResult?.text) {
                let cleaned = geminiResult.text.trim();
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
                }
                const parsed = JSON.parse(cleaned);
                if (parsed.entities && Array.isArray(parsed.entities)) {
                    allExtracted.push(...parsed.entities);
                }
            }
        } catch (error) {
            logger.error('[Answerlattice Bootstrap] Extraction failed for article batch', {
                failureCode: ANSWERLATTICE_BOOTSTRAP_EXTRACTION_BATCH_FAILED,
                ...getBootstrapScopeContext(tId, sId),
                batchIndex: i,
                ...getBootstrapSourceErrorContext(error),
            });
        }
    }

    // Validate + deduplicate
    const seenNames = new Map<string, ExtractedEntityRaw>();
    for (const entity of allExtracted) {
        if (!isValidEntity(entity)) continue;
        const key = normalizeEntityName(entity.name);
        // Skip if already exists in ontology
        if (existingNames.has(key)) continue;
        // Keep highest-confidence version
        const existing = seenNames.get(key);
        if (!existing || entity.confidence > existing.confidence) {
            seenNames.set(key, entity);
        }
    }

    const deduplicated = Array.from(seenNames.values());

    // Store as candidates (capped)
    for (const entity of deduplicated.slice(0, CONFIG.MAX_ENTITIES_PER_RUN)) {
        try {
            const docRef = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_CANDIDATES).add({
                tId,
                sId,
                name: entity.name,
                type: entity.type,
                confidence: entity.confidence,
                frequency: { articles: 1, tickets: 0, chat: 0 },
                description: entity.description,
                status: 'pending',
                createdOn: Timestamp.now(),
                modifiedOn: Timestamp.now(),
            });
            result.candidateIds.push(docRef.id);
            result.extracted++;
        } catch (error) {
            logger.error('[Answerlattice Bootstrap] Failed to store entity candidate', {
                failureCode: ANSWERLATTICE_BOOTSTRAP_ENTITY_CANDIDATE_WRITE_FAILED,
                ...getBootstrapScopeContext(tId, sId),
                ...getBootstrapStringContext('entityName', entity.name),
                ...getBootstrapSourceErrorContext(error),
            });
        }
    }

    return result;
}

/**
 * Extract plain text from TipTap JSON content.
 * Mirrors src/lib/answerlattice/entityExtraction.ts extractPlainTextFromTipTap()
 */
function extractPlainText(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;

    let text = '';
    if (content.text) text += content.text + ' ';
    if (content.content && Array.isArray(content.content)) {
        for (const node of content.content) {
            text += extractPlainText(node);
        }
    }
    return text.trim();
}

// ═══════════════════════════════════════════════════════════════
// STEP 2 — AUTO-PROMOTE HIGH-CONFIDENCE ENTITIES
// ═══════════════════════════════════════════════════════════════

async function autoPromoteEntities(
    tId: number,
    sId: number
): Promise<{ promoted: number; forReview: number }> {
    const result = { promoted: 0, forReview: 0 };

    // Query pending candidates
    const candidatesSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_CANDIDATES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'pending')
        .limit(200)
        .get();

    if (candidatesSnap.empty) return result;

    // Check existing entities (dedup against promoted)
    const existingSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .select('name', 'slug')
        .limit(200)
        .get();

    const existingNames = new Set<string>();
    for (const doc of existingSnap.docs) {
        existingNames.add(normalizeEntityName(doc.data().name || ''));
    }

    for (const candidateDoc of candidatesSnap.docs) {
        if (result.promoted >= CONFIG.MAX_ENTITIES_PER_RUN) break;

        const candidate = candidateDoc.data();
        const normalizedName = normalizeEntityName(candidate.name);

        // Check auto-promote criteria
        const meetsConfidence = candidate.confidence >= CONFIG.AUTO_PROMOTE_MIN_CONFIDENCE;
        const meetsFrequency = (candidate.frequency?.articles || 0) >= CONFIG.AUTO_PROMOTE_MIN_ARTICLE_REFS;
        const notDuplicate = !existingNames.has(normalizedName);

        if (meetsConfidence && meetsFrequency && notDuplicate) {
            try {
                // Create entity
                const slug = generateSlug(candidate.name);
                const entityRef = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).add({
                    tId,
                    sId,
                    type: candidate.type,
                    name: candidate.name,
                    slug,
                    description: candidate.description || '',
                    status: 'active',
                    currentVersion: 1000000, // v1.0.0
                    createdOn: Timestamp.now(),
                    modifiedOn: Timestamp.now(),
                });

                // Create search index entry
                const nameTokens = tokenize(candidate.name);
                const descTokens = tokenize(candidate.description || '').slice(0, 10);
                const normalizedTokens = Array.from(new Set([...nameTokens, ...descTokens]));
                await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX).add({
                    tId,
                    sId,
                    entityId: entityRef.id,
                    canonicalName: candidate.name,
                    synonyms: [],
                    normalizedTokens,
                    prefixTokens: buildPrefixTokens([candidate.name, ...normalizedTokens]),
                    weight: 1.0,
                    createdOn: Timestamp.now(),
                    modifiedOn: Timestamp.now(),
                });

                // Update candidate status
                await candidateDoc.ref.update({
                    status: 'approved',
                    modifiedOn: Timestamp.now(),
                });

                // Audit log
                await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).add({
                    pId: ANSWERLATTICE_PRODUCT_ID,
                    tId,
                    sId,
                    action: 'entity_auto_promoted_onboarding',
                    entityType: 'entity',
                    entityId: entityRef.id,
                    previousState: { candidateId: candidateDoc.id, confidence: candidate.confidence },
                    newState: { entityId: entityRef.id, name: candidate.name, type: candidate.type, slug },
                    performedBy: 'system:onboarding_bootstrap',
                    timestamp: Timestamp.now(),
                });

                existingNames.add(normalizedName);
                result.promoted++;
            } catch (error) {
                logger.error('[Answerlattice Bootstrap] Failed to promote entity candidate', {
                    failureCode: ANSWERLATTICE_BOOTSTRAP_ENTITY_PROMOTION_FAILED,
                    ...getBootstrapScopeContext(tId, sId),
                    ...getBootstrapStringContext('candidateId', candidateDoc.id),
                    ...getBootstrapStringContext('candidateName', candidate.name),
                    ...getBootstrapSourceErrorContext(error),
                });
            }
        } else {
            result.forReview++;
        }
    }

    if (result.promoted > 0) {
        await markCompiledContextSourceChanged(db, 'entities', tId, sId, {
            reason: 'onboarding_entities_promoted',
            sourceType: 'answerlattice_entities',
        }).catch(error => {
            logger.warn('[Answerlattice Onboarding] Failed to mark compiled context stale after entity promotion', {
                failureCode: ANSWERLATTICE_BOOTSTRAP_COMPILED_CONTEXT_STALE_MARK_FAILED,
                ...getBootstrapScopeContext(tId, sId),
                ...getBootstrapSourceErrorContext(error),
            });
        });
        await upsertAnswerlatticeTenantSummary(db, tId, sId, {
            source: 'onboarding_bootstrap',
            hasEntities: true,
        }).catch(error => {
            logger.warn('[Answerlattice Onboarding] Failed to sync tenant summary after entity promotion', {
                failureCode: ANSWERLATTICE_BOOTSTRAP_TENANT_SUMMARY_SYNC_FAILED,
                ...getBootstrapScopeContext(tId, sId),
                ...getBootstrapSourceErrorContext(error),
            });
        });
    }

    return result;
}

/**
 * Simple tokenizer for search index.
 * Mirrors src/lib/answerlattice/tokenizer.ts answerlatticeTokenize()
 */
function tokenize(text: string): string[] {
    if (!text) return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2)
        .filter(t => !['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'and', 'or', 'not'].includes(t));
}

function buildPrefixTokens(values: string[]): string[] {
    const prefixes = new Set<string>();
    const tokens = Array.from(new Set(values.flatMap(value => tokenize(value)).filter(token => token.length >= 3)));
    for (const token of tokens) {
        const upperBound = Math.min(token.length, 18);
        for (let length = 3; length <= upperBound; length += 1) {
            prefixes.add(token.slice(0, length));
            if (prefixes.size >= 80) return Array.from(prefixes);
        }
        prefixes.add(token);
        if (prefixes.size >= 80) return Array.from(prefixes);
    }
    return Array.from(prefixes);
}

// ═══════════════════════════════════════════════════════════════
// STEP 3 — GENERATE CANONICAL ANSWER DRAFTS
// ═══════════════════════════════════════════════════════════════

async function generateDraftsForPromotedEntities(
    tId: number,
    sId: number
): Promise<{ generated: number; failed: number }> {
    const result = { generated: 0, failed: 0 };

    // Get recently promoted entities (from this bootstrap run)
    const entitiesSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(CONFIG.MAX_DRAFTS_PER_RUN)
        .get();

    if (entitiesSnap.empty) return result;

    // Get all published articles for this tenant (multi-tenant isolation)
    const articlesSnap = await db.collection(DB_COLLECTIONS.KB_ARTICLES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'published')
        .limit(CONFIG.MAX_ARTICLES_TO_PROCESS)
        .get();

    const articleTexts = new Map<string, string>();
    for (const doc of articlesSnap.docs) {
        const data = doc.data();
        const text = extractPlainText(data.content);
        if (text) articleTexts.set(doc.id, `${data.title || 'Untitled'}: ${text.substring(0, 1000)}`);
    }

    for (const entityDoc of entitiesSnap.docs) {
        if (result.generated >= CONFIG.MAX_DRAFTS_PER_RUN) break;

        const entity = entityDoc.data();

        // Check if proposal already exists for this entity (idempotent)
        const existingProposalSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('relatedEntityIds', 'array-contains', entityDoc.id)
            .where('mutationType', '==', 'new_answer_required')
            .limit(1)
            .get();

        if (!existingProposalSnap.empty) continue;

        // Also check if a canonical answer already exists for this entity
        const existingAnswerSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('scope.entityIds', 'array-contains', entityDoc.id)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (!existingAnswerSnap.empty) continue;

        // Find articles relevant to this entity (simple keyword match)
        const entityTokens = tokenize(entity.name);
        const relevantArticles: string[] = [];
        for (const [, text] of articleTexts) {
            const textLower = text.toLowerCase();
            if (entityTokens.some(t => textLower.includes(t))) {
                relevantArticles.push(text.substring(0, 500));
                if (relevantArticles.length >= 3) break;
            }
        }

        if (relevantArticles.length === 0) {
            result.failed++;
            continue;
        }

        // Build prompt
        const promptParts: string[] = [
            `Entity: ${entity.name} (${entity.type})`,
            `Description: ${entity.description || 'No description available'}`,
            '',
            'Source knowledge base articles:',
        ];
        for (const article of relevantArticles) {
            promptParts.push(`- ${article}`);
        }
        promptParts.push('');
        promptParts.push('Generate a canonical answer draft for this product concept based on the source articles. Return JSON only.');

        try {
            const geminiResult = await callGemini(ONBOARDING_DRAFT_SYSTEM_PROMPT, promptParts.join('\n'));
            const rawResponse = geminiResult?.text || null;
            if (geminiResult) {
                await recordGeminiCallOperation({
                    action: ANSWERLATTICE_AI_ACTIONS.ONBOARDING_BOOTSTRAP,
                    clientResponse: {
                        entityId: entityDoc.id,
                        entityName: entity.name,
                        relevantArticlesCount: relevantArticles.length,
                        step: 'draft_generation',
                    },
                    processingTime: geminiResult.processingTime,
                    sId,
                    source: 'answerlattice_onboarding_draft_generation',
                    tId,
                    usageMetadata: geminiResult.usageMetadata,
                });
            }

            // Parse response
            const parsed = parseDraftResponse(rawResponse);
            if (!parsed) {
                result.failed++;
                logger.warn('[Answerlattice Bootstrap] Failed to parse draft response', {
                    failureCode: ANSWERLATTICE_BOOTSTRAP_DRAFT_PARSE_FAILED,
                    ...getBootstrapScopeContext(tId, sId),
                    ...getBootstrapStringContext('entityId', entityDoc.id),
                    ...getBootstrapStringContext('entityName', entity.name),
                });
                continue;
            }

            // Create mutation proposal with draft
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).add({
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId,
                sId,
                targetAnswerId: '',
                relatedEntityIds: [entityDoc.id],
                mutationType: 'new_answer_required',
                signalSummary: {
                    ticketCount: 0,
                    chatCount: 0,
                    negativeFeedbackRate: 0,
                    exampleReferences: [],
                },
                suggestedChange: {
                    draftTitle: parsed.title,
                    structuredSummary: parsed.structuredSummary,
                    detailedExplanation: parsed.detailedExplanation,
                    edgeCases: parsed.edgeCases,
                    constraints: parsed.constraints,
                    procedure: parsed.procedure,
                    draftStatus: 'generated',
                    draftSource: 'onboarding_bootstrap',
                    draftGeneratedAt: Timestamp.now(),
                    draftSignalExamples: relevantArticles.map(a => a.substring(0, 200)).slice(0, 5),
                    draftEntityContext: `${entity.name}: ${entity.description || ''}`.substring(0, 500),
                    draftPromptVersion: BOOTSTRAP_PROMPT_VERSION,
                },
                confidenceScore: 0.6,
                status: 'pending_review',
                createdOn: Timestamp.now(),
                modifiedOn: Timestamp.now(),
                createdBy: 'system:onboarding_bootstrap',
                modifiedBy: 'system:onboarding_bootstrap',
            });

            // Audit log
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).add({
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId,
                sId,
                action: 'draft_generated_onboarding',
                entityType: 'mutationProposal',
                entityId: entityDoc.id,
                previousState: null,
                newState: {
                    draftTitle: parsed.title,
                    draftSource: 'onboarding_bootstrap',
                    entityName: entity.name,
                    promptVersion: BOOTSTRAP_PROMPT_VERSION,
                },
                performedBy: 'system:onboarding_bootstrap',
                timestamp: Timestamp.now(),
            });

            result.generated++;
        } catch (error) {
            logger.error('[Answerlattice Bootstrap] Draft generation failed', {
                failureCode: ANSWERLATTICE_BOOTSTRAP_DRAFT_GENERATION_FAILED,
                ...getBootstrapScopeContext(tId, sId),
                ...getBootstrapStringContext('entityId', entityDoc.id),
                ...getBootstrapStringContext('entityName', entity.name),
                ...getBootstrapSourceErrorContext(error),
            });
            result.failed++;
        }
    }

    return result;
}

/**
 * Parse Gemini draft response into structured object.
 * Mirrors draftGenerator.ts parseDraftResponse()
 */
function parseDraftResponse(rawResponse: string | null): {
    title: string;
    structuredSummary: string;
    detailedExplanation: string;
    edgeCases: string | null;
    constraints: string | null;
    procedure: Record<string, any> | null;
} | null {
    if (!rawResponse) return null;

    try {
        let cleaned = rawResponse.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleaned);

        if (!parsed.title || typeof parsed.title !== 'string') return null;
        if (!parsed.structuredSummary || typeof parsed.structuredSummary !== 'string') return null;
        if (!parsed.detailedExplanation || typeof parsed.detailedExplanation !== 'string') return null;

        const summary = parsed.structuredSummary.length > 500
            ? parsed.structuredSummary.substring(0, 497) + '...'
            : parsed.structuredSummary;

        return {
            title: parsed.title.substring(0, 200),
            structuredSummary: summary,
            detailedExplanation: parsed.detailedExplanation,
            edgeCases: typeof parsed.edgeCases === 'string' ? parsed.edgeCases : null,
            constraints: typeof parsed.constraints === 'string' ? parsed.constraints : null,
            procedure: parsed.procedure && typeof parsed.procedure === 'object' ? parsed.procedure : null,
        };
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN BOOTSTRAP FUNCTION (called from answerlatticeNightly.ts)
// ═══════════════════════════════════════════════════════════════

/**
 * Run the onboarding bootstrap for all eligible tenants.
 * 
 * This function has its OWN tenant discovery (queries kb_generation_jobs)
 * because new tenants may have zero entities.
 * 
 * Called as Step 12 of the nightly batch, AFTER the main per-tenant loop.
 */
export async function runOnboardingBootstrap(): Promise<BootstrapResult> {
    const result: BootstrapResult = {
        tenantsBootstrapped: 0,
        totalEntitiesExtracted: 0,
        totalEntitiesPromoted: 0,
        totalDraftsGenerated: 0,
        totalDraftsFailed: 0,
        errors: [],
    };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING) {
        return result;
    }

    try {
        // Discover tenants with published KB jobs that need bootstrapping
        const candidates = await discoverBootstrapCandidates();
        if (candidates.length === 0) {
            logger.info('[Answerlattice Bootstrap] No bootstrap candidates found.');
            return result;
        }

        logger.info('[Answerlattice Bootstrap] Found bootstrap candidates', { candidateCount: candidates.length });

        for (const { tId, sId, jobId } of candidates) {
            const jobRef = db.collection(DB_COLLECTIONS.KB_GENERATION_JOBS).doc(jobId);

            try {
                // Check if entities already exist and skip flag is on
                if (CONFIG.SKIP_IF_ENTITIES_EXIST) {
                    const existingEntities = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
                        .where('tId', '==', tId)
                        .where('sId', '==', sId)
                        .limit(1)
                        .get();
                    if (!existingEntities.empty) {
                        logger.info('[Answerlattice Bootstrap] Entities already exist, skipping tenant', {
                            ...getBootstrapScopeContext(tId, sId),
                            reason: 'SKIP_IF_ENTITIES_EXIST',
                        });
                        await jobRef.update({ 'onboardingBootstrap.status': 'completed', 'onboardingBootstrap.completedAt': Timestamp.now() });
                        continue;
                    }
                }

                // Mark as started
                await jobRef.update({
                    'onboardingBootstrap.status': 'extracting',
                    'onboardingBootstrap.startedAt': Timestamp.now(),
                    'onboardingBootstrap.entitiesExtracted': 0,
                    'onboardingBootstrap.entitiesAutoPromoted': 0,
                    'onboardingBootstrap.candidatesForReview': 0,
                    'onboardingBootstrap.draftsGenerated': 0,
                    'onboardingBootstrap.draftsFailed': 0,
                });

                // Step 1: Entity Extraction
                const extractionResult = await extractEntitiesForTenant(tId, sId);
                await jobRef.update({
                    'onboardingBootstrap.status': 'promoting',
                    'onboardingBootstrap.entitiesExtracted': extractionResult.extracted,
                });
                result.totalEntitiesExtracted += extractionResult.extracted;

                // Step 2: Auto-Promote
                const promoteResult = await autoPromoteEntities(tId, sId);
                await jobRef.update({
                    'onboardingBootstrap.status': 'drafting',
                    'onboardingBootstrap.entitiesAutoPromoted': promoteResult.promoted,
                    'onboardingBootstrap.candidatesForReview': promoteResult.forReview,
                });
                result.totalEntitiesPromoted += promoteResult.promoted;

                // Step 3: Generate Drafts
                const draftResult = await generateDraftsForPromotedEntities(tId, sId);
                result.totalDraftsGenerated += draftResult.generated;
                result.totalDraftsFailed += draftResult.failed;

                // Step 4: Finalize
                await jobRef.update({
                    'onboardingBootstrap.status': 'completed',
                    'onboardingBootstrap.completedAt': Timestamp.now(),
                    'onboardingBootstrap.draftsGenerated': draftResult.generated,
                    'onboardingBootstrap.draftsFailed': draftResult.failed,
                });

                result.tenantsBootstrapped++;

                logger.info('[Answerlattice Bootstrap] Tenant bootstrap completed', {
                    ...getBootstrapScopeContext(tId, sId),
                    extracted: extractionResult.extracted,
                    promoted: promoteResult.promoted,
                    review: promoteResult.forReview,
                    draftsGenerated: draftResult.generated,
                    draftsFailed: draftResult.failed,
                });

            } catch (error) {
                result.errors.push(ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED);
                logger.error('[Answerlattice Bootstrap] Tenant bootstrap failed', {
                    failureCode: ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED,
                    ...getBootstrapScopeContext(tId, sId),
                    ...getBootstrapStringContext('jobId', jobId),
                    ...getBootstrapSourceErrorContext(error),
                });

                try {
                    await jobRef.update({
                        'onboardingBootstrap.status': 'failed',
                        'onboardingBootstrap.errorMessage': ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED,
                    });
                } catch (statusError) {
                    logger.error('[Answerlattice Bootstrap] Job failure status update failed', {
                        failureCode: ANSWERLATTICE_BOOTSTRAP_JOB_STATUS_MARK_FAILED,
                        ...getBootstrapScopeContext(tId, sId),
                        ...getBootstrapStringContext('jobId', jobId),
                        ...getBootstrapSourceErrorContext(statusError),
                    });
                }
            }
        }
    } catch (error) {
        logger.error('[Answerlattice Bootstrap] Fatal error', {
            failureCode: ANSWERLATTICE_BOOTSTRAP_FATAL_FAILED,
            ...getBootstrapSourceErrorContext(error),
        });
        result.errors.push(ANSWERLATTICE_BOOTSTRAP_FATAL_FAILED);
    }

    return result;
}
