/**
 * Answerlattice — Entity Extraction Pipeline (Ontology Bootstrap)
 * 
 * Sprint 3: AI-assisted extraction from existing KB articles.
 * Extracts entity candidates → scores by frequency → stages for human validation.
 * 
 * Flow: KB articles → AI extraction → entity_candidates → human review → entities
 * 
 * Extraction Rules (Strict):
 * - Must represent real product concepts (not UI labels, not generic nouns)
 * - Must appear in ≥3 articles OR ≥5 ticket/chat mentions
 * - Must be versionable (would meaningfully change across releases)
 * - Must classify into exactly one of 7 entity types
 * - Descriptions must be declarative, not instructional, ≤3 sentences
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §7
 */

import { FEATURE_FLAGS } from "@config/features";
import { addEntityCandidate } from "@database/answerlattice/entityCandidates";
import { buildAnswerlatticeEntityPrefixTokens } from "@lib/answerlattice/entitySearchTokens";
import { answerlatticeTokenize } from "@lib/answerlattice/tokenizer";
import { ANSWERLATTICE_ENTITY_TYPES, AnswerlatticeEntityCandidate, AnswerlatticeEntityType } from "@type/answerlattice";

// ═══════════════════════════════════════════════════════════════
// EXTRACTION TYPES
// ═══════════════════════════════════════════════════════════════

export interface ExtractedEntityRaw {
    name: string;
    type: AnswerlatticeEntityType;
    confidence: number;
    description: string;
    source?: 'existing' | 'new';  // E3: Whether AI matched an existing entity or proposed a new one
}

export interface ExistingEntityContext {
    name: string;
    slug: string;
    id: string;
    aliases?: string[];
}

export interface ExtractionResult {
    candidates: ExtractedEntityRaw[];
    articlesProcessed: number;
    extractionTimestamp: Date;
    matchedEntityIds?: string[];   // E3: IDs of existing entities that matched extraction output
    newCandidateCount?: number;    // E3: Count of genuinely new candidates created
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION PROMPT (Strict Rules)
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

/**
 * Build extraction prompt for a batch of articles.
 * E3: Registry-guided — includes existing entities so AI prefers reuse over creating new ones.
 */
function buildExtractionPrompt(
    articles: { title: string; content: string; category?: string }[],
    existingEntities?: ExistingEntityContext[]
): string {
    let prompt = '';

    // E3: Provide existing entity context to reduce duplicates
    if (existingEntities && existingEntities.length > 0) {
        const entityList = existingEntities
            .slice(0, 50) // Token budget cap
            .map(e => `- ${e.name}${e.aliases?.length ? ` (also: ${e.aliases.join(', ')})` : ''}`)
            .join('\n');
        prompt += `EXISTING ENTITIES (prefer reusing these over creating new ones):\n${entityList}\n\n`;
        prompt += `IMPORTANT: If an entity matches an existing entity above, use the EXACT existing name and set "source": "existing".\nOnly create new entities ("source": "new") if no existing entity covers the concept.\n\n`;
    }

    const articleTexts = articles.map((a, i) =>
        `--- Article ${i + 1}: "${a.title}" (Category: ${a.category || 'Unknown'}) ---\n${a.content.substring(0, 2000)}`
    ).join('\n\n');

    prompt += `Extract product entities from these knowledge base articles:\n\n${articleTexts}\n\nExtract ALL product entities following the rules. Return JSON only.`;
    if (existingEntities && existingEntities.length > 0) {
        prompt += `\nFor each entity include "source": "existing" or "source": "new".`;
    }

    return prompt;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION & DEDUPLICATION
// ═══════════════════════════════════════════════════════════════

const REJECTED_PATTERNS = [
    /^(the|a|an)\s/i,
    /how to/i,
    /click|button|page|screen|tab|modal|drawer/i,
    /create|update|delete|add|remove|edit/i,
    /^(dashboard|settings|account|profile|home)$/i,
];

/**
 * Validate extracted entity against strict rules
 */
function isValidEntity(entity: ExtractedEntityRaw): boolean {
    if (!entity.name || entity.name.length < 2) return false;
    if (!entity.type || !Object.values(ANSWERLATTICE_ENTITY_TYPES).includes(entity.type)) return false;
    if (entity.name.split(' ').length > 5) return false;
    if (entity.confidence < 0.3) return false;

    for (const pattern of REJECTED_PATTERNS) {
        if (pattern.test(entity.name)) return false;
    }

    return true;
}

/**
 * Deduplicate entities by normalized name
 */
function deduplicateEntities(entities: ExtractedEntityRaw[]): ExtractedEntityRaw[] {
    const seen = new Map<string, ExtractedEntityRaw>();

    for (const entity of entities) {
        const key = entity.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const existing = seen.get(key);

        if (!existing || entity.confidence > existing.confidence) {
            seen.set(key, entity);
        }
    }

    return Array.from(seen.values());
}

/**
 * Generate slug from entity name
 */
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Extract entities from KB articles and store as candidates.
 * This is called from the platform admin UI (KB Generation or Answerlattice dashboard).
 * 
 * E3: Now supports registry-guided extraction — pass existingEntities to reduce duplicates.
 * 
 * @param articles - KB articles with title, content, category
 * @param tId - Tenant ID
 * @param sId - Store ID
 * @param callGemini - Gemini chat function (injected to avoid circular dependency)
 * @param existingEntities - E3: Existing entity context for registry-guided extraction
 * @returns Extraction result with candidates count
 */
export async function extractEntitiesFromArticles(
    articles: { title: string; content: string; category?: string }[],
    tId: number,
    sId: number,
    callGemini: (systemPrompt: string, userPrompt: string) => Promise<string | null>,
    existingEntities?: ExistingEntityContext[]
): Promise<ExtractionResult> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY) {
        return { candidates: [], articlesProcessed: 0, extractionTimestamp: new Date() };
    }

    // Process articles in batches of 5 (to stay within token limits)
    const BATCH_SIZE = 5;
    const allExtracted: ExtractedEntityRaw[] = [];

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);
        const prompt = buildExtractionPrompt(batch, existingEntities);

        try {
            const response = await callGemini(ENTITY_EXTRACTION_SYSTEM_PROMPT, prompt);
            if (response) {
                const parsed = JSON.parse(response);
                if (parsed.entities && Array.isArray(parsed.entities)) {
                    allExtracted.push(...parsed.entities);
                }
            }
        } catch (error) {
            // Continue with next batch on extraction failure (graceful degradation)
            console.error(`Entity extraction failed for batch starting at article ${i}:`, error);
        }
    }

    // Validate and deduplicate
    const validated = allExtracted.filter(isValidEntity);
    const deduplicated = deduplicateEntities(validated);

    // E3: Post-extraction matching against existing entities
    const matchedEntityIds: string[] = [];
    const newCandidates: ExtractedEntityRaw[] = [];

    for (const entity of deduplicated) {
        const match = existingEntities ? matchToExistingEntity(entity, existingEntities) : null;
        if (match) {
            matchedEntityIds.push(match.id);
        } else {
            newCandidates.push(entity);
        }
    }

    // Store only genuinely new entities as candidates (pending human review)
    for (const entity of newCandidates) {
        try {
            await addEntityCandidate({
                tId,
                sId,
                name: entity.name,
                type: entity.type,
                confidence: entity.confidence,
                frequency: {
                    articles: 1,
                    tickets: 0,
                    chat: 0,
                },
                description: entity.description,
                status: 'pending',
            } as Omit<AnswerlatticeEntityCandidate, 'id'>);
        } catch (error) {
            console.error(`Failed to store entity candidate "${entity.name}":`, error);
        }
    }

    return {
        candidates: deduplicated,
        articlesProcessed: articles.length,
        extractionTimestamp: new Date(),
        matchedEntityIds,
        newCandidateCount: newCandidates.length,
    };
}

/**
 * Build search index entry from an approved entity.
 * Called after human approves a candidate and it becomes a real entity.
 */
export function buildSearchIndexEntry(entity: { name: string; slug: string; description: string; aliases?: string[] }) {
    // Use shared tokenizer for identical normalization at index-time and query-time
    const nameTokens = answerlatticeTokenize(entity.name);
    const descTokens = answerlatticeTokenize(entity.description, 4).slice(0, 10);

    const normalizedTokens = Array.from(new Set([...nameTokens, ...descTokens]));

    return {
        canonicalName: entity.name,
        synonyms: entity.aliases || ([] as string[]),
        normalizedTokens,
        prefixTokens: buildAnswerlatticeEntityPrefixTokens({
            canonicalName: entity.name,
            normalizedTokens,
            synonyms: entity.aliases || [],
        }),
        weight: 1.0,
    };
}

// ═══════════════════════════════════════════════════════════════
// E3: POST-EXTRACTION ENTITY MATCHING
// Matches extracted entities against existing registry to reduce duplicates.
// ═══════════════════════════════════════════════════════════════

/**
 * Match an extracted entity to an existing entity by name or alias.
 * Returns the matched existing entity context, or null if no match.
 */
function matchToExistingEntity(
    extracted: ExtractedEntityRaw,
    existingEntities: ExistingEntityContext[]
): ExistingEntityContext | null {
    const normalizedName = extracted.name.toLowerCase().trim();

    for (const existing of existingEntities) {
        // Exact name match (case-insensitive)
        if (existing.name.toLowerCase() === normalizedName) return existing;

        // Slug match
        const extractedSlug = normalizedName.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        if (existing.slug === extractedSlug) return existing;

        // Alias match
        if (existing.aliases?.some(a => a.toLowerCase() === normalizedName)) return existing;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// E4: AUTO-EXTRACT ON ARTICLE SAVE
// Async entity extraction triggered when KB article is saved.
// ═══════════════════════════════════════════════════════════════

const EXTRACTION_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute debounce per article
const extractionTimestamps = new Map<string, number>();

/**
 * Check if extraction should run for this article (debounce protection).
 */
function shouldExtractForArticle(articleId: string): boolean {
    const last = extractionTimestamps.get(articleId) || 0;
    if (Date.now() - last < EXTRACTION_COOLDOWN_MS) return false;
    extractionTimestamps.set(articleId, Date.now());
    return true;
}

/**
 * Extract plain text from TipTap JSON content for entity extraction.
 * Traverses the TipTap node tree and concatenates text content.
 */
function extractPlainTextFromTipTap(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;

    let text = '';
    if (content.text) text += content.text + ' ';
    if (content.content && Array.isArray(content.content)) {
        for (const node of content.content) {
            text += extractPlainTextFromTipTap(node);
        }
    }
    return text.trim();
}

/**
 * E4: Auto-extract entities from a KB article and return matched entity IDs.
 * Called asynchronously after article save (fire-and-forget).
 * 
 * Returns entityIds that should be set on the article document.
 * Does NOT update the article itself — caller is responsible for that.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_ONTOLOGY
 */
export async function extractEntitiesForArticle(
    article: { id: string; title: string; content: any; categoryTitle?: string },
    tId: number,
    sId: number,
    callGemini: (systemPrompt: string, userPrompt: string) => Promise<string | null>
): Promise<{ entityIds: string[]; newCandidateCount: number } | null> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY) return null;
    if (!shouldExtractForArticle(article.id)) return null;

    try {
        // 1. Load existing entities for registry-guided extraction
        const { getEntities } = await import('@database/answerlattice/entities');
        const existing = await getEntities(tId, sId);
        const existingContext: ExistingEntityContext[] = (existing || []).map(e => ({
            name: e.name,
            slug: e.slug,
            id: e.id,
            aliases: e.aliases,
        }));

        // 2. Extract plain text from TipTap content
        const textContent = extractPlainTextFromTipTap(article.content);
        if (!textContent || textContent.length < 20) return null; // Skip very short articles

        // 3. Run registry-guided extraction
        const result = await extractEntitiesFromArticles(
            [{ title: article.title, content: textContent, category: article.categoryTitle }],
            tId,
            sId,
            callGemini,
            existingContext
        );

        return {
            entityIds: result.matchedEntityIds || [],
            newCandidateCount: result.newCandidateCount || 0,
        };
    } catch (error) {
        console.error(`Entity extraction failed for article ${article.id}:`, error);
        return null;
    }
}
