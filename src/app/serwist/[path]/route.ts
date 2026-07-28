import { createSerwistRoute } from '@serwist/turbopack';

const distDir = process.env.NEXT_DIST_DIR || '.next';
const revision = process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.NEXT_PUBLIC_BUILD_ID
    || process.env.NEXT_PUBLIC_BUILD_CREATED_AT
    || 'local-build';

export const {
    dynamic,
    dynamicParams,
    revalidate,
    generateStaticParams,
    GET,
} = createSerwistRoute({
    additionalPrecacheEntries: [{ url: '/offline', revision }],
    globPatterns: [
        // The fallback is server-rendered HTML. Precache its styles and owner
        // shell assets, but never force every product's JavaScript chunk onto
        // an owner's device during worker installation.
        `${distDir}/static/**/*.css`,
        'public/icons/**/*.{ico,png,svg,webp}',
        'public/favicon.ico',
        'public/manifest.json',
    ],
    maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
});
