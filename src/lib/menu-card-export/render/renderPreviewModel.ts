import type { MenuCardExportSettings, MenuCardSafeOverrides } from '../models/exportTypes';
import type { MenuCardLayoutPlan } from '../models/layoutTypes';
import type { MenuCardPreflightResult } from '../models/preflightTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import { paginateBlocks } from '../layout/paginateBlocks';
import { applySafeLayoutOverrides } from '../overrides/applySafeLayoutOverrides';
import { runPrintPreflight } from '../preflight/runPrintPreflight';

export type MenuCardPreviewModel = {
    plan: MenuCardLayoutPlan;
    preflight: MenuCardPreflightResult;
};

export function renderPreviewModel(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    overrides: MenuCardSafeOverrides = {},
): MenuCardPreviewModel {
    const categories = applySafeLayoutOverrides(source.menu.categories, overrides);
    const plan = paginateBlocks(categories, settings);
    const preflight = runPrintPreflight({ ...source, menu: { ...source.menu, categories } }, settings, plan);
    return { plan, preflight };
}
