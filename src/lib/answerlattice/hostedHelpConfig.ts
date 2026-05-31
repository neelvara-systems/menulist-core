import { normalizeHostedHelpDomain } from '@constant/answerlattice/hostedHelp';
import { z } from 'zod';

const MAX_HOSTED_HELP_DOMAINS = 5;
const MAX_HOSTED_HELP_TEXT = 120;
const MAX_HOSTED_HELP_DESCRIPTION = 220;

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

