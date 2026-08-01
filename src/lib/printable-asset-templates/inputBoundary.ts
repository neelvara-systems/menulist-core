import { normalizeMenuKitInput } from '@lib/menu-kit/types';
import { normalizeMenuCardLogoUrl } from '@lib/menu-card-export/source/buildPrintSource';
import { isPrintableAssetTypeId } from './assetTypes';
import { isPrintableTemplateFamilyId } from './templateFamilies';
import type {
    PrintableAssetOutputFormat,
    PrintableAssetRenderInput,
} from './types';

const OUTPUT_FORMATS = new Set<PrintableAssetOutputFormat>(['pdf', 'png', 'zip']);
const MAX_PRINTABLE_TEXT_LENGTH = 240;
const MAX_PRINTABLE_PROJECT_ID_LENGTH = 1_500;

function readOwnField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        return Object.prototype.hasOwnProperty.call(value, key)
            ? (value as Record<string, unknown>)[key]
            : undefined;
    } catch {
        return undefined;
    }
}

function normalizeText(value: unknown, maxLength = MAX_PRINTABLE_TEXT_LENGTH): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.slice(0, maxLength).trim();
    return normalized || undefined;
}

function normalizeHttpsUrl(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length > 4_096) return undefined;
    try {
        const parsed = new URL(value.trim());
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return undefined;
        return parsed.toString();
    } catch {
        return undefined;
    }
}

export function normalizePrintableAssetRenderInput(value: unknown): PrintableAssetRenderInput | null {
    const assetTypeId = readOwnField(value, 'assetTypeId');
    const templateFamilyId = readOwnField(value, 'templateFamilyId');
    if (
        typeof assetTypeId !== 'string'
        || !isPrintableAssetTypeId(assetTypeId)
        || typeof templateFamilyId !== 'string'
        || !isPrintableTemplateFamilyId(templateFamilyId)
    ) {
        return null;
    }

    const menuKitInput = normalizeMenuKitInput(value);
    if (!menuKitInput) return null;
    const safeMenuKitInput = { ...menuKitInput };
    delete safeMenuKitInput.logoUrl;

    const outputFormatValue = readOwnField(value, 'outputFormat');
    const outputFormat = typeof outputFormatValue === 'string' && OUTPUT_FORMATS.has(outputFormatValue as PrintableAssetOutputFormat)
        ? outputFormatValue as PrintableAssetOutputFormat
        : undefined;
    const projectId = normalizeText(readOwnField(value, 'projectId'), MAX_PRINTABLE_PROJECT_ID_LENGTH);
    const logoUrl = normalizeMenuCardLogoUrl(readOwnField(value, 'logoUrl'));
    const printMenuOptions = readOwnField(value, 'printMenuOptions');
    const contactAddress = normalizeText(readOwnField(value, 'contactAddress'));
    const contactEmail = normalizeText(readOwnField(value, 'contactEmail'));
    const contactName = normalizeText(readOwnField(value, 'contactName'));
    const contactPhone = normalizeText(readOwnField(value, 'contactPhone'));
    const contactRole = normalizeText(readOwnField(value, 'contactRole'));
    const socialHandle = normalizeText(readOwnField(value, 'socialHandle'));
    const feedbackUrl = normalizeHttpsUrl(readOwnField(value, 'feedbackUrl'));
    const obpBaseUrl = normalizeHttpsUrl(readOwnField(value, 'obpBaseUrl'));

    return {
        ...safeMenuKitInput,
        assetTypeId,
        templateFamilyId,
        ...(outputFormat ? { outputFormat } : {}),
        ...(projectId && !projectId.includes('/') ? { projectId } : {}),
        ...(logoUrl ? { logoUrl } : {}),
        ...(contactAddress ? { contactAddress } : {}),
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactName ? { contactName } : {}),
        ...(contactPhone ? { contactPhone } : {}),
        ...(contactRole ? { contactRole } : {}),
        ...(socialHandle ? { socialHandle } : {}),
        ...(feedbackUrl ? { feedbackUrl } : {}),
        ...(obpBaseUrl ? { obpBaseUrl } : {}),
        ...(assetTypeId === 'print_menu' && printMenuOptions && typeof printMenuOptions === 'object' && !Array.isArray(printMenuOptions)
            ? { printMenuOptions: printMenuOptions as PrintableAssetRenderInput['printMenuOptions'] }
            : {}),
    };
}

export function admitPrintableAssetRenderInput(value: unknown): PrintableAssetRenderInput {
    const normalized = normalizePrintableAssetRenderInput(value);
    if (!normalized) throw new Error('Invalid printable asset input');
    return normalized;
}
