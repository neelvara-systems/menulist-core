/** @type {import('next').NextConfig} */

const path = require('path');
const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin();
const firebaseAdminClientAliases = [
    'firebase-admin',
    'firebase-admin/firestore',
];
const nativeCanvasExternals = [
    '@napi-rs/canvas',
    '@napi-rs/canvas-linux-x64-gnu',
    '@napi-rs/canvas-linux-x64-musl',
];
const myCodexDocsTraceIncludes = ['./__docs__/**/*.md'];
const myCodexDocsTraceAssetExcludes = [
    './__docs__/**/*.csv',
    './__docs__/**/*.gif',
    './__docs__/**/*.heic',
    './__docs__/**/*.heif',
    './__docs__/**/*.html',
    './__docs__/**/*.ico',
    './__docs__/**/*.jpeg',
    './__docs__/**/*.jpg',
    './__docs__/**/*.json',
    './__docs__/**/*.mov',
    './__docs__/**/*.mp3',
    './__docs__/**/*.mp4',
    './__docs__/**/*.pdf',
    './__docs__/**/*.png',
    './__docs__/**/*.svg',
    './__docs__/**/*.tsv',
    './__docs__/**/*.txt',
    './__docs__/**/*.wav',
    './__docs__/**/*.webm',
    './__docs__/**/*.webp',
    './__docs__/**/*.woff',
    './__docs__/**/*.woff2',
    './__docs__/**/*.zip',
];

const normalizeDeploymentStage = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'production') return 'production';
    if (normalized === 'preview') return 'preview';
    if (normalized === 'development' || normalized === 'local') return 'local';
    return undefined;
};

const resolveNextDeploymentStage = () => {
    const rawServerVercelStage = process.env.VERCEL_ENV;
    const rawPublicVercelStage = process.env.NEXT_PUBLIC_VERCEL_ENV;
    const rawPublicStage = process.env.NEXT_PUBLIC_ENV;
    const serverVercelStage = normalizeDeploymentStage(rawServerVercelStage);
    const publicVercelStage = normalizeDeploymentStage(rawPublicVercelStage);
    const publicStage = normalizeDeploymentStage(rawPublicStage);

    if (rawServerVercelStage && serverVercelStage === undefined) {
        throw new Error('INVALID_SERVER_VERCEL_STAGE');
    }
    if (rawPublicVercelStage && publicVercelStage === undefined) {
        throw new Error('INVALID_PUBLIC_VERCEL_STAGE');
    }
    if (rawPublicStage && publicStage === undefined) {
        throw new Error('INVALID_PUBLIC_DEPLOYMENT_STAGE');
    }
    if (process.env.VERCEL === '1' && !serverVercelStage) {
        throw new Error('MISSING_SERVER_VERCEL_STAGE');
    }
    if (publicVercelStage && publicStage && publicVercelStage !== publicStage) {
        throw new Error('PUBLIC_DEPLOYMENT_STAGE_CONFLICT');
    }
    if (
        serverVercelStage
        && (
            (publicVercelStage && publicVercelStage !== serverVercelStage)
            || (publicStage && publicStage !== serverVercelStage)
        )
    ) {
        throw new Error('SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT');
    }

    return serverVercelStage || publicVercelStage || publicStage || 'local';
};

const nextDeploymentStage = resolveNextDeploymentStage();
const isVercelDeployment = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
const buildCreatedAt = process.env.NEXT_PUBLIC_BUILD_CREATED_AT || new Date().toISOString();
const skipNextBuildChecks = process.env.NEXT_SKIP_NEXT_BUILD_CHECKS === '1';

const nextConfig = {
    poweredByHeader: false,
    // Allows CI and local release audits to run concurrently without sharing
    // Next's mutable build output. Production keeps the default `.next` path.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    outputFileTracingRoot: __dirname,
    env: {
        NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local',
        NEXT_PUBLIC_ENV: nextDeploymentStage,
        NEXT_PUBLIC_VERCEL_ENV: isVercelDeployment || process.env.NEXT_PUBLIC_VERCEL_ENV
            ? nextDeploymentStage
            : '',
        NEXT_PUBLIC_DEPLOYMENT_URL: process.env.NEXT_PUBLIC_DEPLOYMENT_URL || process.env.VERCEL_URL || '',
        NEXT_PUBLIC_BUILD_CREATED_AT: buildCreatedAt,
        NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE: process.env.NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE || 'true',
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'app/styles')],
    },
    serverExternalPackages: [
        '@google-cloud/tasks',
        '@napi-rs/canvas',
        '@serwist/build',
        '@serwist/turbopack',
        'browserslist',
    ],
    outputFileTracingExcludes: {
        '*': [
            // Keep @swc/helpers traceable: Next 16's Turbopack server runtime
            // imports it after deployment. Only omit compiler-only packages.
            'node_modules/@swc/core/**',
            'node_modules/@swc/core-*/**',
            'node_modules/@swc/counter/**',
            'node_modules/@swc/types/**',
            'node_modules/@esbuild/**',
            'node_modules/webpack/**',
            'node_modules/rollup/**',
            'node_modules/terser/**',
        ],
        '/sites/mycodex': myCodexDocsTraceAssetExcludes,
        '/sites/mycodex/[[...slug]]': myCodexDocsTraceAssetExcludes,
        '/sites/mycodex/api/document': myCodexDocsTraceAssetExcludes,
        '/sites/mycodex/**/*': myCodexDocsTraceAssetExcludes,
    },
    outputFileTracingIncludes: {
        '/sites/mycodex': myCodexDocsTraceIncludes,
        '/sites/mycodex/[[...slug]]': myCodexDocsTraceIncludes,
        '/sites/mycodex/api/document': myCodexDocsTraceIncludes,
        '/sites/mycodex/**/*': myCodexDocsTraceIncludes,
    },
    experimental: {
        // Optimize for memory usage in builds
        // optimizeCss: true, // Disabled — causes silent page drops on Vercel OOM builds
        optimizePackageImports: ['antd', 'antd-mobile', 'react-icons'],
        serverSourceMaps: false,
    },
    typescript: {
        // Vercel runs `npm run build:verify` before `next build` when this
        // flag is enabled, so the app still fails on type errors without
        // repeating Next's remote-only lint/type phase inside the build.
        ignoreBuildErrors: skipNextBuildChecks,
    },
    reactStrictMode: false,
    productionBrowserSourceMaps: false,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error', 'warn', 'info'] }
            : false,
    },
    // Firebase Admin 14 pulls jwks-rsa 4, whose CommonJS entry loads ESM-only
    // jose 6. Bundle that dependency boundary so deployed Turbopack routes do
    // not fall back to native require() for firebase-admin/auth.
    transpilePackages: ['antd-mobile', 'firebase-admin', 'pdfjs-dist'],
    turbopack: {
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },
    images: {
        dangerouslyAllowSVG: true,
        remotePatterns: [
            { protocol: 'https', hostname: 'aistudio.google.com', pathname: '/**' },
            { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
            { protocol: 'https', hostname: 'i.imgur.com', pathname: '/**' },
            { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/a/**' },
            { protocol: 'https', hostname: 'framerusercontent.com', pathname: '**' },
            { protocol: 'https', hostname: 'app.framerstatic.com', pathname: '**' },
            { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '**' },
        ],
    },
    webpack(config, { isServer }) {
        if (isServer) {
            config.externals = [
                ...config.externals,
                ...nativeCanvasExternals,
                '@google-cloud/tasks',
                'exceljs',
                'pdfjs-dist',
                'jspdf',
                'razorpay',
                'stripe',
            ];
        }

        // Prevent server-only modules from breaking the client bundle.
        // Dynamic imports in shared DAL files (articles.ts → vectorEmbeddings → firebaseAdmin)
        // pull firebase-admin transitively into client webpack chunks.
        if (!isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                ...Object.fromEntries(firebaseAdminClientAliases.map((external) => [external, false])),
            };
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                'fs/promises': false,
                net: false,
                tls: false,
                child_process: false,
            };
        }

        // Fix pdfjs-dist ES module compatibility
        config.module.rules.push({
            test: /\.m?js$/,
            include: /node_modules\/pdfjs-dist/,
            type: 'javascript/auto',
            resolve: {
                fullySpecified: false,
            },
        });

        config.externals.push({
            sharp: 'commonjs sharp',
            canvas: 'commonjs canvas',
            '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
            '@napi-rs/canvas-linux-x64-gnu': 'commonjs @napi-rs/canvas-linux-x64-gnu',
            '@napi-rs/canvas-linux-x64-musl': 'commonjs @napi-rs/canvas-linux-x64-musl',
        });
        config.module.rules.push({ test: /\.svg$/, use: ['@svgr/webpack'] });

        // This repo's production graph exceeds the available heap when webpack
        // retains its persistent module cache alongside compilation artifacts.
        config.cache = false;

        return config;
    },
    // Security headers are managed exclusively by src/proxy.ts
    // (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
    // Do NOT add an async headers() block here — it would create duplicates.
    async redirects() {
        return [
            { source: '/about-us', destination: '/about', permanent: true },
            { source: '/contact-us', destination: '/contact', permanent: true },
            { source: '/home', destination: '/', permanent: true },
            { source: '/qrCode', destination: '/qr-code', permanent: true },
            { source: '/ops', destination: '/platform/ops-control-room', permanent: false },
            { source: '/ops/extraction', destination: '/platform/extraction-monitor', permanent: false },
            { source: '/ops/scheduler', destination: '/platform/scheduler-monitor', permanent: false },
        ];
    },
}

// ═══════════════════════════════════════════════════════════════
// Service Worker Strategy (Customer App Architecture Decision)
// ═══════════════════════════════════════════════════════════════
// MenuList runs multiple isolated PWAs from one Next.js build:
//
//   1. Owner Dashboard PWA   → app.menulist.ai, menulist.ai
//      Uses Serwist's generated owner worker for the offline fallback and
//      bounded build/icon assets. Authenticated HTML is never cached.
//
//   2. Customer App PWA      → {subdomain}.menulist.ai, custom domains
//      Uses hand-rolled `sw-customer.js` — install reliability only.
//      NO content caching. NO Firestore cache. NO menu page cache.
//      Server-side freshness is guaranteed by unstable_cache +
//      revalidateTag('menu-store-{id}') on every owner save.
//
//   3. MyCodex PWA           → menulist.digital
//      Uses hand-rolled `mycodex-sw.js` — private docs offline shell only.
//      NO document content caching.
//
// Registration is handled manually in ServiceWorkerRegister.tsx
// based on the origin's tenant type (from domainResolver).
//
// @see __docs__/customer-app/customer-app_spec.md § Menu Update Behavior
// @see __docs__/customer-app/customer-app_impl.md § Service-worker scoping
// @see public/sw-customer.js
// @see src/components/ServiceWorkerRegister.tsx
// ═══════════════════════════════════════════════════════════════
const sentryWebpackPluginOptions = {
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
    },
    // Keep Sentry active in every deployed environment while avoiding the
    // preview-build penalty from uploading widened client artifacts.
    widenClientFileUpload: process.env.VERCEL_ENV === 'production',
    webpack: {
        autoInstrumentAppDirectory: false,
        autoInstrumentServerFunctions: false,
        treeshake: {
            removeDebugLogging: true,
        },
    },
};

module.exports = async () => {
    const { withSerwist } = await import('@serwist/turbopack');
    const configuredApp = withBundleAnalyzer(
        withNextIntl(
            withSerwist(nextConfig)
        )
    );

    return withSentryConfig(configuredApp, sentryWebpackPluginOptions);
};
