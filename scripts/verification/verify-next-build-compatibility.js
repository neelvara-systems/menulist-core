#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const nextConfig = fs.readFileSync(path.join(repoRoot, 'next.config.js'), 'utf8');
const campaignCueWorkspacePage = fs.readFileSync(
  path.join(repoRoot, 'src/app/(campaigncue)/campaigncue/app/page.tsx'),
  'utf8',
);
const campaignCueSitePage = fs.readFileSync(
  path.join(repoRoot, 'src/app/sites/campaigncue/page.tsx'),
  'utf8',
);
const campaignCueFeaturePage = fs.readFileSync(
  path.join(repoRoot, 'src/app/sites/campaigncue/features/[featureSlug]/page.tsx'),
  'utf8',
);
const campaignCueSmallBusinessPage = fs.readFileSync(
  path.join(repoRoot, 'src/app/sites/campaigncue/use-cases/small-business/page.tsx'),
  'utf8',
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(haystack, needle, message) {
  assert(haystack.includes(needle), message);
}

assertIncludes(
  nextConfig,
  'class MenuListServerChunkCompatPlugin',
  'Next build compatibility plugin must remain present.',
);

assertIncludes(
  nextConfig,
  "path.basename(outputPath) === 'chunks'",
  'Compatibility plugin must normalize .next/server versus .next/server/chunks output paths.',
);

assertIncludes(
  nextConfig,
  'const serverOutputPath = await this.copyServerChunks(outputPath);',
  'Compatibility plugin must continue after optional server chunk copying.',
);

assertIncludes(
  nextConfig,
  'await this.ensurePagesRouterCompatibility(serverOutputPath);',
  'Compatibility plugin must repair reserved Pages Router modules before page-data collection.',
);

assertIncludes(
  nextConfig,
  "'/_document': {\n                file: 'pages/_document.js',\n                module: 'next/dist/pages/_document'",
  'Compatibility plugin must provide a reserved /_document server module fallback.',
);

assertIncludes(
  nextConfig,
  "'/_app': {\n                file: 'pages/_app.js',\n                module: 'next/dist/pages/_app'",
  'Compatibility plugin must provide a reserved /_app server module fallback.',
);

assertIncludes(
  nextConfig,
  "'/_error': {\n                file: 'pages/_error.js',\n                module: 'next/dist/pages/_error'",
  'Compatibility plugin must provide a reserved /_error server module fallback.',
);

assertIncludes(
  nextConfig,
  'await this.writeRoutesManifest(serverOutputPath);',
  'Compatibility plugin must write route manifests from the normalized server output path.',
);

assert(
  !nextConfig.includes("await fs.access(chunksDir);\n            } catch {\n                return;\n            }\n\n            await copyServerChunks(chunksDir);"),
  'Compatibility plugin must not return early when the optional chunks directory is absent.',
);

assertIncludes(
  campaignCueWorkspacePage,
  'export const dynamic = "force-dynamic";',
  'CampaignCue protected workspace must stay dynamic so session/header redirects are not statically prerendered.',
);

assertIncludes(
  campaignCueWorkspacePage,
  'CampaignCueWorkspaceApp',
  'CampaignCue protected workspace route must continue rendering the workspace app behind the dynamic boundary.',
);

assertIncludes(
  campaignCueSitePage,
  "export const dynamic = 'force-dynamic';",
  'CampaignCue public site must stay dynamic because it derives base-path links from request headers.',
);

assertIncludes(
  campaignCueSitePage,
  'const headerList = headers();',
  'CampaignCue public site dynamic guard must remain tied to actual header-derived base-path behavior.',
);

assertIncludes(
  campaignCueFeaturePage,
  'export const dynamic = "force-dynamic";',
  'CampaignCue feature pages must stay dynamic because they derive base-path links from request headers.',
);

assertIncludes(
  campaignCueFeaturePage,
  'const headerList = headers();',
  'CampaignCue feature dynamic guard must remain tied to actual header-derived base-path behavior.',
);

assertIncludes(
  campaignCueSmallBusinessPage,
  'export const dynamic = "force-dynamic";',
  'CampaignCue small-business use-case page must stay dynamic because it derives base-path links from request headers.',
);

assertIncludes(
  campaignCueSmallBusinessPage,
  'const headerList = headers();',
  'CampaignCue small-business dynamic guard must remain tied to actual header-derived base-path behavior.',
);

console.log('Next build compatibility contract verified.');
