import {
    ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS,
    type AnswerlatticeCanonicalAnswer,
    type AnswerlatticePublicCitation,
    type AnswerlatticeScopeClarification,
} from '@type/answerlattice';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import { toAnswerlatticePublicIsoTimestamp } from '@lib/answerlattice/publicApiContracts';

export const ANSWERLATTICE_PUBLIC_FALLBACK_REASONS = [
    'canonical_retrieval_unavailable',
    'canonical_answer_review_required',
    'canonical_scope_context_required',
    'canonical_scope_not_covered',
] as const;

export type AnswerlatticePublicFallbackReason = typeof ANSWERLATTICE_PUBLIC_FALLBACK_REASONS[number];

export const serializeAnswerlatticePublicCanonicalAnswer = (
    answer: AnswerlatticeCanonicalAnswer | undefined,
    includeProcedure: boolean,
) => {
    if (!answer) return null;

    let procedure = null;
    if (includeProcedure && answer.answerType === 'procedure') {
        try {
            const parsed = AnswerlatticeProcedureSchema.safeParse(answer.content?.procedure);
            procedure = parsed.success ? parsed.data : null;
        } catch {
            procedure = null;
        }
    }

    return {
        id: answer.id,
        title: answer.title,
        slug: answer.slug,
        answerType: answer.answerType || 'explanation',
        content: {
            structuredSummary: answer.content.structuredSummary,
            detailedExplanation: answer.content.detailedExplanation || '',
            edgeCases: answer.content.edgeCases || null,
            constraints: answer.content.constraints || null,
            procedure,
        },
        scope: {
            entityIds: answer.scope.entityIds,
            planIds: answer.scope.planIds || [],
            roleIds: answer.scope.roleIds || [],
            stateIds: answer.scope.stateIds || [],
        },
        productBinding: {
            introducedInVersion: answer.productBinding.introducedInVersion,
            lastValidatedInVersion: answer.productBinding.lastValidatedInVersion,
            applicableVersions: {
                from: answer.productBinding.applicableVersions.from,
                to: answer.productBinding.applicableVersions.to ?? null,
            },
        },
        validation: {
            confidenceScore: answer.validation.confidenceScore,
            validationSource: answer.validation.validationSource,
            lastValidatedOn: toAnswerlatticePublicIsoTimestamp(answer.validation.lastValidatedOn),
        },
        governance: {
            driftFlag: answer.governance.driftFlag,
            reviewRequired: answer.governance.reviewRequired,
        },
        modifiedOn: toAnswerlatticePublicIsoTimestamp(answer.modifiedOn),
    };
};

const PUBLIC_FALLBACK_REASON_SET = new Set<string>(ANSWERLATTICE_PUBLIC_FALLBACK_REASONS);
const SCOPE_CONTEXT_VALUES = new Set(['plan', 'role', 'state']);
const SENSITIVE_QUERY_KEY_SEGMENT_PATTERN = /(?:^|[_-])(auth|code|credential|key|secret|signature|sig|token)(?:$|[_-])/i;
const SENSITIVE_QUERY_KEY_COMPACT_PATTERN = /^(?:(?:access|api|auth|client|private|refresh|session|signed)(?:code|credential|credentials|key|secret|signature|sig|token)|code|credential|credentials|key|secret|signature|sig|token)$/i;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isSensitivePublicCitationQueryKey = (value: string): boolean => {
    const segmented = value.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
    return SENSITIVE_QUERY_KEY_SEGMENT_PATTERN.test(segmented)
        || SENSITIVE_QUERY_KEY_COMPACT_PATTERN.test(segmented.replace(/[^a-z0-9]/gi, ''));
};

const isBlockedPublicCitationHost = (hostname: string): boolean => {
    const normalized = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
    if (
        normalized === 'localhost'
        || normalized === 'localhost.localdomain'
        || normalized === 'metadata.google.internal'
        || normalized.endsWith('.localhost')
        || normalized.endsWith('.local')
        || normalized === '::1'
        || normalized === '::'
    ) return true;

    if (normalized.startsWith('::ffff:')) {
        const mappedAddress = normalized.slice('::ffff:'.length);
        const mappedHex = mappedAddress.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
        if (mappedHex) {
            const high = Number.parseInt(mappedHex[1], 16);
            const low = Number.parseInt(mappedHex[2], 16);
            return isBlockedPublicCitationHost([
                (high >>> 8) & 0xff,
                high & 0xff,
                (low >>> 8) & 0xff,
                low & 0xff,
            ].join('.'));
        }
        return isBlockedPublicCitationHost(mappedAddress);
    }
    if (normalized.includes(':')) {
        const firstHextet = normalized.split(':', 1)[0];
        if (!/^[0-9a-f]{1,4}$/i.test(firstHextet)) return true;
        const first = Number.parseInt(firstHextet, 16);
        if (
            (first & 0xfe00) === 0xfc00
            || (first & 0xffc0) === 0xfe80
            || (first & 0xffc0) === 0xfec0
            || (first & 0xff00) === 0xff00
            || normalized.startsWith('2001:db8:')
        ) return true;
    }

    const ipv4 = normalized.match(IPV4_PATTERN);
    if (!ipv4) return false;
    const octets = ipv4.slice(1).map(Number);
    if (octets.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b, c] = octets;
    return a === 0
        || a === 10
        || a === 127
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 0 && (c === 0 || c === 2))
        || (a === 192 && b === 168)
        || (a === 198 && (b === 18 || b === 19))
        || (a === 198 && b === 51 && c === 100)
        || (a === 203 && b === 0 && c === 113)
        || a >= 224;
};

export const normalizeAnswerlatticePublicCitationUrl = (value: unknown): string | null => {
    const rawUrl = typeof value === 'string' ? value.trim() : '';
    if (!rawUrl || rawUrl.length > ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_URL_LENGTH) return null;
    try {
        const parsed = new URL(rawUrl);
        if (
            (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
            || parsed.username
            || parsed.password
            || isBlockedPublicCitationHost(parsed.hostname)
            || Array.from(parsed.searchParams.keys()).some(isSensitivePublicCitationQueryKey)
        ) return null;
        return parsed.toString();
    } catch {
        return null;
    }
};

export const normalizeAnswerlatticePublicCitation = (value: unknown): AnswerlatticePublicCitation | null => {
    if (!isRecord(value)) return null;
    const id = typeof value.id === 'string' ? value.id.trim() : '';
    const title = typeof value.title === 'string' ? value.title.trim() : '';
    const url = normalizeAnswerlatticePublicCitationUrl(value.url);
    if (
        !id
        || id.length > 180
        || !title
        || title.length > ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_TITLE_LENGTH
        || !url
    ) return null;
    return { id, title, url };
};

export const normalizeAnswerlatticePublicCitations = (value: unknown): AnswerlatticePublicCitation[] => {
    if (!Array.isArray(value)) return [];
    const seenUrls = new Set<string>();
    return value
        .slice(0, ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS)
        .flatMap((citation) => {
            const normalized = normalizeAnswerlatticePublicCitation(citation);
            if (!normalized || seenUrls.has(normalized.url)) return [];
            seenUrls.add(normalized.url);
            return [normalized];
        });
};

export const normalizeAnswerlatticeScopeClarification = (value: unknown): AnswerlatticeScopeClarification | null => {
    if (!isRecord(value) || value.type !== 'scope_context' || !Array.isArray(value.requiredContext)) return null;
    const requiredContext = Array.from(new Set(
        value.requiredContext
            .filter((item): item is 'plan' | 'role' | 'state' => typeof item === 'string' && SCOPE_CONTEXT_VALUES.has(item))
            .slice(0, 3),
    ));
    return requiredContext.length > 0 ? { type: 'scope_context', requiredContext } : null;
};

export const normalizeAnswerlatticePublicFallbackReason = (
    value: unknown,
): AnswerlatticePublicFallbackReason | null => (
    typeof value === 'string' && PUBLIC_FALLBACK_REASON_SET.has(value)
        ? value as AnswerlatticePublicFallbackReason
        : null
);
