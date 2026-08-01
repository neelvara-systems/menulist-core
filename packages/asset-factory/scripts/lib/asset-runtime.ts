import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AssetManifest,
  AssetManifestEntry,
  AssetOutputRole,
  AssetSlot,
} from '../../schemas/asset-schema';
import { menuListAssetSlots } from '../../slots/menulist.asset-slots';
import { answerlatticeAssetSlots } from '../../slots/answerlattice.asset-slots';

export const REPO_ROOT = path.resolve(__dirname, '../../../..');
export const ASSET_FACTORY_ROOT = path.join(REPO_ROOT, 'packages/asset-factory');
export const MANIFEST_PATH = 'packages/asset-factory/manifest/assets.json';

export function toRepoPath(fullPath: string): string {
  return path.relative(REPO_ROOT, fullPath).split(path.sep).join('/');
}

export function fromRepoPath(repoPath: string): string {
  const fullPath = path.resolve(REPO_ROOT, repoPath);
  if (fullPath !== REPO_ROOT && !fullPath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error(`Asset Factory path must stay inside the repository: ${repoPath}`);
  }
  return fullPath;
}

export function fileExists(repoPath: string): boolean {
  return fs.existsSync(fromRepoPath(repoPath));
}

export function readText(repoPath: string): string {
  return fs.readFileSync(fromRepoPath(repoPath), 'utf8');
}

export function readTextIfExists(repoPath: string): string | null {
  if (!fileExists(repoPath)) return null;
  return readText(repoPath);
}

export function ensureDir(repoPath: string): void {
  fs.mkdirSync(fromRepoPath(repoPath), { recursive: true });
}

export function writeText(repoPath: string, content: string): void {
  ensureDir(path.posix.dirname(repoPath));
  fs.writeFileSync(fromRepoPath(repoPath), content);
}

export function allAssetSlots(): AssetSlot[] {
  return [...menuListAssetSlots, ...answerlatticeAssetSlots];
}

export function loadManifest(): AssetManifest {
  const manifest = JSON.parse(readText(MANIFEST_PATH)) as AssetManifest;
  if (!manifest.productBoundary?.internalOnly || manifest.productBoundary.publicRuntime !== false) {
    throw new Error('Asset manifest must remain internal-only with publicRuntime=false.');
  }
  return manifest;
}

export function getSlot(slotId: string): AssetSlot | undefined {
  return allAssetSlots().find((slot) => slot.id === slotId);
}

export function getManifestEntry(slotId: string): AssetManifestEntry | undefined {
  return loadManifest().assets[slotId];
}

export function formatKb(bytes: number): string {
  return `${Math.ceil(bytes / 1024)} KB`;
}

export function getFileSizeBytes(repoPath: string): number {
  return fs.statSync(fromRepoPath(repoPath)).size;
}

export function getOutputBudgetKb(slot: AssetSlot, role: AssetOutputRole): number | undefined {
  return slot.outputs.find((output) => output.role === role)?.maxKb;
}

export function getBrandContextPath(brand: AssetSlot['brand']): string {
  return `packages/asset-factory/brand/${brand}.asset-context.md`;
}

export function getSlotDeclarationPath(brand: AssetSlot['brand']): string {
  return `packages/asset-factory/slots/${brand}.asset-slots.ts`;
}

export function getAssetBriefPath(slotId: string, declaredPath?: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(slotId)) {
    throw new Error(`Asset slot ID is not path-safe: ${slotId}`);
  }
  const expectedPath = `packages/asset-factory/briefs/${slotId}.md`;
  if (declaredPath && declaredPath !== expectedPath) {
    throw new Error(`Asset brief path must match its slot ID: ${slotId}`);
  }
  return expectedPath;
}

export function hashFile(repoPath: string): string | null {
  if (!fileExists(repoPath)) return null;
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(fromRepoPath(repoPath)));
  return hash.digest('hex');
}

export function getWatchedSourceHashes(slot: AssetSlot): Record<string, string> {
  const sources = [getSlotDeclarationPath(slot.brand), getBrandContextPath(slot.brand), ...slot.sources];
  return sources.reduce<Record<string, string>>((acc, source) => {
    const hash = hashFile(source);
    if (hash) acc[source] = hash;
    return acc;
  }, {});
}

export function walkFiles(repoPath: string): string[] {
  const fullPath = fromRepoPath(repoPath);
  if (!fs.existsSync(fullPath)) return [];

  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return [repoPath];

  const results: string[] = [];
  for (const item of fs.readdirSync(fullPath)) {
    const childRepoPath = path.posix.join(repoPath, item);
    const childFullPath = fromRepoPath(childRepoPath);
    const childStat = fs.statSync(childFullPath);
    if (childStat.isDirectory()) {
      results.push(...walkFiles(childRepoPath));
    } else {
      results.push(childRepoPath);
    }
  }
  return results;
}

export function findTrackedPublicAssetFiles(): string[] {
  const websiteAssets = walkFiles('public/images/website');
  const answerlatticeTopLevel = fs
    .readdirSync(fromRepoPath('public'))
    .filter((file) => file.startsWith('answerlattice-'))
    .map((file) => `public/${file}`)
    .filter((repoPath) => fs.statSync(fromRepoPath(repoPath)).isFile());
  const answerlatticeSplash = walkFiles('public/answerlattice-splash');

  return [...websiteAssets, ...answerlatticeTopLevel, ...answerlatticeSplash]
    .filter((file) => !file.endsWith('.map'))
    .sort();
}

export function listKnownSlotIds(): string[] {
  return allAssetSlots().map((slot) => slot.id).sort();
}
