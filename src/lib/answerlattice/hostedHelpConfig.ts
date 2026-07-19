import { normalizeHostedHelpDomain } from '@constant/answerlattice/hostedHelp';
import { z } from 'zod';

const MAX_HOSTED_HELP_DOMAINS = 5;
const MAX_HOSTED_HELP_TEXT = 120;
const MAX_HOSTED_HELP_DESCRIPTION = 220;
const MAX_HOSTED_HELP_DNS_RECORDS = 20;
const MAX_HOSTED_HELP_DNS_RECORD_TEXT = 1_024;

export type AnswerlatticeHostedHelpDnsRecord = {
    type: string;
    domain?: string;
    name?: string;
    value?: string;
    reason?: string;
};

export type AnswerlatticeHostedHelpDomainVerification = {
    misconfigured: boolean | null;
    verificationRecords: AnswerlatticeHostedHelpDnsRecord[];
    configuredBy: AnswerlatticeHostedHelpDnsRecord[];
};

export const AnswerlatticeHostedHelpConfigSchema = z.object({
    enabled: z.boolean().default(false),
    domains: z.preprocess(
        (value) => normalizeHostedHelpDomains(value),
        z.array(z.string().min(4).max(253)).max(MAX_HOSTED_HELP_DOMAINS).default([])
    ),
    primaryDomain: z.string().trim().max(253).optional().nullable(),
    title: z.string().trim().min(1).max(MAX_HOSTED_HELP_TEXT).default('Help Center'),
    description: z.string().trim().min(1).max(MAX_HOSTED_HELP_DESCRIPTION).default('Find guides, answers, and recent product updates.'),
    showFaqs: z.boolean().default(true),
    showChangelog: z.boolean().default(true),
    noIndex: z.boolean().default(false),
});

export type AnswerlatticeHostedHelpConfig = z.infer<typeof AnswerlatticeHostedHelpConfigSchema>;

export const DEFAULT_ANSWERLATTICE_HOSTED_HELP_CONFIG: AnswerlatticeHostedHelpConfig = AnswerlatticeHostedHelpConfigSchema.parse({});

export function normalizeHostedHelpDomains(value: unknown): string[] {
    const rawValues = typeof value === 'string'
        ? value.split(/[\n,]/)
        : Array.isArray(value) ? value : [];

    return Array.from(new Set(
        rawValues
            .filter((entry): entry is string => typeof entry === 'string')
            .map(normalizeHostedHelpDomain)
            .filter((entry): entry is string => Boolean(entry))
    )).slice(0, MAX_HOSTED_HELP_DOMAINS);
}

export function normalizeHostedHelpConfig(value: unknown): AnswerlatticeHostedHelpConfig {
    const parsed = AnswerlatticeHostedHelpConfigSchema.safeParse(value || {});
    const config = AnswerlatticeHostedHelpConfigSchema.parse(parsed.success ? parsed.data : {});
    const normalizedPrimary = config.primaryDomain ? normalizeHostedHelpDomain(config.primaryDomain) : null;
    const primaryDomain = normalizedPrimary && config.domains.includes(normalizedPrimary)
        ? normalizedPrimary
        : config.domains[0] || null;

    return {
        ...config,
        enabled: Boolean(config.enabled && config.domains.length > 0),
        primaryDomain,
    };
}

export function parseHostedHelpConfigSaveInput(value: unknown): AnswerlatticeHostedHelpConfig {
    return normalizeHostedHelpConfig(value);
}

const normalizeDnsRecordText = (value: unknown, maxLength = MAX_HOSTED_HELP_DNS_RECORD_TEXT): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
};

const normalizeHostedHelpDnsRecord = (value: unknown): AnswerlatticeHostedHelpDnsRecord | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const type = normalizeDnsRecordText(record.type, 16) || 'TXT';
    const domain = normalizeDnsRecordText(record.domain, 253);
    const name = normalizeDnsRecordText(record.name, 253);
    const recordValue = normalizeDnsRecordText(record.value);
    const reason = normalizeDnsRecordText(record.reason, 240);
    if (!domain && !name && !recordValue && !reason) return null;

    return {
        type,
        ...(domain ? { domain } : {}),
        ...(name ? { name } : {}),
        ...(recordValue ? { value: recordValue } : {}),
        ...(reason ? { reason } : {}),
    };
};

export function normalizeHostedHelpDomainVerification(value: unknown): AnswerlatticeHostedHelpDomainVerification {
    const record = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const normalizeRecords = (candidate: unknown) => (
        Array.isArray(candidate)
            ? candidate
                .slice(0, MAX_HOSTED_HELP_DNS_RECORDS)
                .map(normalizeHostedHelpDnsRecord)
                .filter((item): item is AnswerlatticeHostedHelpDnsRecord => item !== null)
            : []
    );

    return {
        misconfigured: typeof record.misconfigured === 'boolean' ? record.misconfigured : null,
        verificationRecords: normalizeRecords(record.verificationRecords),
        configuredBy: normalizeRecords(record.configuredBy),
    };
}
