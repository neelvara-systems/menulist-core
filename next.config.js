/** @type {import('next').NextConfig} */

const path = require('path');
const fs = require('fs/promises');
const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');
const {
    NEXT_DID_POSTPONE_HEADER,
    NEXT_ROUTER_PREFETCH_HEADER,
    NEXT_ROUTER_STATE_TREE,
    RSC_CONTENT_TYPE_HEADER,
    RSC_HEADER,
} = require('next/dist/client/components/app-router-headers');
const { buildCustomRoute } = require('next/dist/lib/build-custom-route');
const { RSC_PREFETCH_SUFFIX, RSC_SUFFIX } = require('next/dist/lib/constants');
const { normalizeRouteRegex } = require('next/dist/lib/load-custom-routes');
const { isDynamicRoute } = require('next/dist/shared/lib/router/utils/is-dynamic');
const { getNamedRouteRegex } = require('next/dist/shared/lib/router/utils/route-regex');
const { getSortedRoutes } = require('next/dist/shared/lib/router/utils/sorted-routes');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin();
const firebaseAdminExternals = [
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
// Disable memory-heavy webpack plugins on Vercel preview builds.
// VERCEL_ENV is authoritative; a public marker cannot promote preview to production.
const isVercelPreview = isVercelDeployment && nextDeploymentStage === 'preview';
const buildCreatedAt = process.env.NEXT_PUBLIC_BUILD_CREATED_AT || new Date().toISOString();
const skipNextBuildChecks = process.env.NEXT_SKIP_NEXT_BUILD_CHECKS === '1';

class MenuListServerChunkCompatPlugin {
    getServerOutputPath(outputPath) {
        return path.basename(outputPath) === 'chunks'
            ? path.dirname(outputPath)
            : outputPath;
    }

    async readJson(filePath, fallback) {
        try {
            return JSON.parse(await fs.readFile(filePath, 'utf8'));
        } catch {
            return fallback;
        }
    }

    async copyServerChunks(outputPath) {
        const serverOutputPath = this.getServerOutputPath(outputPath);
        const chunksDir = path.basename(outputPath) === 'chunks'
            ? outputPath
            : path.join(serverOutputPath, 'chunks');

        const copyServerChunks = async (sourceDir, relativeDir = '') => {
            let entries = [];
            try {
                entries = await fs.readdir(sourceDir, { withFileTypes: true });
            } catch {
                return;
            }

            await Promise.all(entries.map(async (entry) => {
                const source = path.join(sourceDir, entry.name);
                const relativePath = path.join(relativeDir, entry.name);

                if (entry.isDirectory()) {
                    await copyServerChunks(source, relativePath);
                    return;
                }

                if (!entry.isFile() || !entry.name.endsWith('.js')) return;

                const destination = path.join(serverOutputPath, relativePath);
                if (source === destination) return;
                await fs.mkdir(path.dirname(destination), { recursive: true });
                await fs.copyFile(source, destination);
            }));
        };

        await copyServerChunks(chunksDir);
        return serverOutputPath;
    }

    async ensurePagesRouterCompatibility(serverOutputPath) {
        // Next's static page-data worker still resolves the reserved Pages
        // Router modules while checking the default/custom error shell, even
        // when this repository has no actual Pages Router routes. If Next does
        // not emit those reserved server modules, provide default shims so the
        // worker can complete without changing App Router route behavior.
        const pagesManifestPath = path.join(serverOutputPath, 'pages-manifest.json');
        const compatibilityPages = {
            '/_app': {
                file: 'pages/_app.js',
                module: 'next/dist/pages/_app',
            },
            '/_document': {
                file: 'pages/_document.js',
                module: 'next/dist/pages/_document',
            },
            '/_error': {
                file: 'pages/_error.js',
                module: 'next/dist/pages/_error',
            },
        };

        let pagesManifest = await this.readJson(pagesManifestPath, {});
        let manifestChanged = false;

        await Promise.all(Object.entries(compatibilityPages).map(async ([route, entry]) => {
            const outputFilePath = path.join(serverOutputPath, entry.file);
            try {
                await fs.access(outputFilePath);
            } catch {
                await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
                await fs.writeFile(
                    outputFilePath,
                    `"use strict";\nmodule.exports = require(${JSON.stringify(entry.module)});\n`,
                );
            }

            if (pagesManifest[route] === entry.file) return;
            pagesManifest = {
                ...pagesManifest,
                [route]: entry.file,
            };
            manifestChanged = true;
        }));

        if (manifestChanged) {
            await fs.mkdir(path.dirname(pagesManifestPath), { recursive: true });
            await fs.writeFile(pagesManifestPath, JSON.stringify(pagesManifest, null, 2));
        }
    }

    async writeRoutesManifest(outputPath) {
        if (!outputPath) return;
        const serverOutputPath = this.getServerOutputPath(outputPath);

        const pageToRoute = (page) => {
            const routeRegex = getNamedRouteRegex(page, true);
            return {
                page,
                regex: normalizeRouteRegex(routeRegex.re.source),
                routeKeys: routeRegex.routeKeys,
                namedRegex: routeRegex.namedRegex,
            };
        };
        const rootDistPaths = [
            path.dirname(serverOutputPath),
            path.dirname(path.dirname(serverOutputPath)),
        ].filter((candidate, index, candidates) => (
            candidate
            && candidate !== path.dirname(candidate)
            && candidates.indexOf(candidate) === index
        ));

        await Promise.all(rootDistPaths.map(async (rootDistPath) => {
            const routesManifestPath = path.join(rootDistPath, 'routes-manifest.json');
            try {
                await fs.access(routesManifestPath);
                return;
            } catch {
                // Continue and create the compatibility manifest.
            }

            const appPathRoutesManifest = await this.readJson(
                path.join(rootDistPath, 'app-path-routes-manifest.json'),
                {},
            );
            const serverPagesManifest = await this.readJson(
                path.join(rootDistPath, 'server', 'pages-manifest.json'),
                await this.readJson(path.join(serverOutputPath, 'pages-manifest.json'), {}),
            );
            if (!Object.keys(appPathRoutesManifest).length && !Object.keys(serverPagesManifest).length) {
                return;
            }

            const reservedPages = new Set(['/_app', '/_document', '/_error']);
            const routePages = [
                ...new Set([
                    ...Object.keys(serverPagesManifest),
                    ...Object.values(appPathRoutesManifest),
                ]),
            ].filter((route) => route && !reservedPages.has(route));
            const sortedRoutes = getSortedRoutes(routePages);
            const dynamicRoutes = [];
            const staticRoutes = [];
            for (const route of sortedRoutes) {
                if (isDynamicRoute(route)) {
                    dynamicRoutes.push(pageToRoute(route));
                } else {
                    staticRoutes.push(pageToRoute(route));
                }
            }

            let redirects = [];
            if (typeof nextConfig.redirects === 'function') {
                redirects = await nextConfig.redirects();
            }
            const restrictedRedirectPaths = ['/_next'];
            const routesManifest = {
                version: 3,
                pages404: true,
                caseSensitive: Boolean(nextConfig.experimental?.caseSensitiveRoutes),
                basePath: '',
                redirects: redirects.map((route) => (
                    buildCustomRoute('redirect', route, restrictedRedirectPaths)
                )),
                headers: [],
                dynamicRoutes,
                staticRoutes,
                dataRoutes: [],
                rsc: {
                    header: RSC_HEADER,
                    varyHeader: `${RSC_HEADER}, ${NEXT_ROUTER_STATE_TREE}, ${NEXT_ROUTER_PREFETCH_HEADER}`,
                    prefetchHeader: NEXT_ROUTER_PREFETCH_HEADER,
                    didPostponeHeader: NEXT_DID_POSTPONE_HEADER,
                    contentTypeHeader: RSC_CONTENT_TYPE_HEADER,
                    suffix: RSC_SUFFIX,
                    prefetchSuffix: RSC_PREFETCH_SUFFIX,
                },
                rewrites: [],
                skipMiddlewareUrlNormalize: Boolean(nextConfig.skipMiddlewareUrlNormalize),
            };
            await fs.writeFile(routesManifestPath, JSON.stringify(routesManifest, null, 2));
        }));
    }

    apply(compiler) {
        compiler.hooks.afterEmit.tapPromise('MenuListServerChunkCompatPlugin', async () => {
            const outputPath = compiler.options.output.path;
            if (!outputPath) return;

            const serverOutputPath = await this.copyServerChunks(outputPath);
            await this.ensurePagesRouterCompatibility(serverOutputPath);

            // Next's page-data collection still resolves the minimal Pages
            // Router compatibility files even though this app is App Router
            // first. In local worker builds the files can be emitted while the
            // pages manifest remains empty, so repair only those special
            // entries when the compiled files exist.
            const pagesManifestPath = path.join(serverOutputPath, 'pages-manifest.json');
            const specialPages = {
                '/_app': 'pages/_app.js',
                '/_document': 'pages/_document.js',
                '/_error': 'pages/_error.js',
            };
            let pagesManifest = await this.readJson(pagesManifestPath, {});
            let manifestChanged = false;
            await Promise.all(Object.entries(specialPages).map(async ([route, file]) => {
                try {
                    await fs.access(path.join(serverOutputPath, file));
                } catch {
                    return;
                }
                if (pagesManifest[route]) return;
                pagesManifest[route] = file;
                manifestChanged = true;
            }));
            if (manifestChanged) {
                await fs.mkdir(path.dirname(pagesManifestPath), { recursive: true });
                await fs.writeFile(pagesManifestPath, JSON.stringify(pagesManifest, null, 2));
            }

            const appManifestPath = path.join(serverOutputPath, 'app-paths-manifest.json');
            const collectAppEntries = async (sourceDir, relativeDir = '') => {
                let entries = [];
                try {
                    entries = await fs.readdir(sourceDir, { withFileTypes: true });
                } catch {
                    return {};
                }

                const collected = {};
                await Promise.all(entries.map(async (entry) => {
                    const source = path.join(sourceDir, entry.name);
                    const relativePath = path.join(relativeDir, entry.name);
                    if (entry.isDirectory()) {
                        Object.assign(collected, await collectAppEntries(source, relativePath));
                        return;
                    }
                    if (!entry.isFile() || (entry.name !== 'page.js' && entry.name !== 'route.js')) return;

                    const manifestFile = `app/${relativePath.replace(/\\/g, '/')}`;
                    const rawRoute = `/${relativePath.replace(/\\/g, '/').replace(/\.js$/, '')}`;
                    collected[rawRoute] = manifestFile;
                }));
                return collected;
            };
            const emittedAppEntries = await collectAppEntries(path.join(serverOutputPath, 'app'));
            if (Object.keys(emittedAppEntries).length) {
                let appManifest = await this.readJson(appManifestPath, {});
                let appManifestChanged = false;
                for (const [route, file] of Object.entries(emittedAppEntries)) {
                    if (appManifest[route]) continue;
                    appManifest[route] = file;
                    appManifestChanged = true;
                }
                if (appManifestChanged) {
                    await fs.mkdir(path.dirname(appManifestPath), { recursive: true });
                    await fs.writeFile(appManifestPath, JSON.stringify(appManifest, null, 2));
                }
            }

            await this.writeRoutesManifest(serverOutputPath);
        });

        compiler.hooks.done.tapPromise('MenuListServerChunkCompatPluginRoutesManifest', async () => {
            await this.writeRoutesManifest(compiler.options.output.path);
        });
    }
}



const nextConfig = {
    poweredByHeader: false,
    // Allows CI and local release audits to run concurrently without sharing
    // Next's mutable build output. Production keeps the default `.next` path.
    distDir: process.env.NEXT_DIST_DIR || '.next',
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
    experimental: {
        serverComponentsExternalPackages: ['@google-cloud/tasks', 'firebase-admin', '@napi-rs/canvas'],
        webpackBuildWorker: false,
        serverSourceMaps: false,
        outputFileTracingExcludes: {
            '*': [
                'node_modules/@swc/**',
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
        // Optimize for memory usage in builds
        // optimizeCss: true, // Disabled — causes silent page drops on Vercel OOM builds
        optimizePackageImports: ['antd', 'antd-mobile', 'react-icons'],
        // Enable compression
        // compress: true,
        // Enable modern JavaScript features
        esmExternals: true,
    },
    typescript: {
        // Vercel runs `npm run build:verify` before `next build` when this
        // flag is enabled, so the app still fails on type errors without
        // repeating Next's remote-only lint/type phase inside the build.
        ignoreBuildErrors: skipNextBuildChecks,
    },
    eslint: {
        ignoreDuringBuilds: skipNextBuildChecks,
    },
    reactStrictMode: false,
    productionBrowserSourceMaps: false,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error', 'warn', 'info'] }
            : false,
    },
    transpilePackages: ['antd-mobile', 'pdfjs-dist'],
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
    webpack(config, { isServer, dev, nextRuntime }) {
        if (isServer) {
            config.externals = [
                ...config.externals,
                ...firebaseAdminExternals,
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
                ...Object.fromEntries(firebaseAdminExternals.map((external) => [external, false])),
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

        // Keep server runtime chunk resolution aligned with Next's emitted
        // files. Next 14 app-route/page-data collection resolves Node server
        // chunks as sibling `./1234.js` / `./vendor-chunks/name.js` files,
        // including production builds.
        if (isServer && nextRuntime !== 'edge' && config.output) {
            config.output.chunkFilename = '[name].js';
            config.plugins.push(new MenuListServerChunkCompatPlugin());
        }

        // Disable webpack cache where it is known to destabilize route builds:
        // - Local dev: stale/missing pack files can make app chunks 404.
        // - Production builds: cache stores compiled module artifacts in RAM
        //   and can push this repo over the Node heap limit before route output.
        config.cache = false;

        return config;
    },
    // Security headers are managed exclusively by src/middleware.ts
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
//      Uses next-pwa generated `sw.js` for the offline fallback and
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
// @see __docs__/customer-app/customer-app_impl.md § next-pwa Scoping
// @see public/sw-customer.js
// @see src/components/ServiceWorkerRegister.tsx
// ═══════════════════════════════════════════════════════════════
const withPWA = require("next-pwa")({
    dest: "public",
    disable: isVercelPreview || process.env.NODE_ENV === "development",
    // Manual registration — we register the correct SW per tenant type
    // in ServiceWorkerRegister.tsx (sw.js for owner, sw-customer.js for customers).
    register: false,
    skipWaiting: true,
    // Never reload an owner workflow automatically when connectivity returns.
    reloadOnOnline: false,
    // The platform root is a public website route, not the owner app shell.
    cacheStartUrl: false,
    // Source maps and unrelated product/public-site assets do not improve the
    // owner offline fallback and make every worker install unnecessarily large.
    buildExcludes: [/\.map$/],
    publicExcludes: [
        '!**/*.map',
        '!**/*.{mp4,webm,mov}',
        '!assets/**/*',
        '!images/**/*',
        '!locales/**/*',
        '!styles/**/*',
        '!widget/**/*',
        '!answerlattice*',
        '!campaigncue*',
        '!mycodex*',
        '!neelvara*',
        '!llms*.txt',
        '!robots.txt',
        '!sitemap.xml',
        '!screen-sw.js',
        '!sw-customer.js',
        '!platform.webmanifest',
    ],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    // Offline fallback page served by sw.js when a navigation fails.
    // sw-customer.js ships its own equivalent for customer tenants.
    fallbacks: {
        document: '/offline',
    },
    // Public-font runtime caching only. Authenticated owner HTML, sign-in HTML,
    // screen HTML, APIs, Firestore and customer-facing routes are intentionally
    // absent. Firebase Storage and broad extension rules are also absent so a
    // shared browser cannot retain cross-account media through this worker.
    runtimeCaching: [
        {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
        },
    ],
});

const sentryWebpackPluginOptions = {
    authToken: process.env.SENTRY_AUTH_TOKEN,
    autoInstrumentAppDirectory: false,
    autoInstrumentServerFunctions: false,
    disableLogger: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
    },
    // Keep Sentry active in every deployed environment while avoiding the
    // preview-build penalty from uploading widened client artifacts.
    widenClientFileUpload: process.env.VERCEL_ENV === 'production',
};

const withClientOnlyPWA = (config) => {
    const intlConfig = withNextIntl(config);
    const pwaConfig = withPWA(intlConfig);
    const pwaWebpack = pwaConfig.webpack;
    const baseWebpack = intlConfig.webpack;

    pwaConfig.webpack = (webpackConfig, options) => {
        if (options.isServer) {
            return typeof baseWebpack === 'function'
                ? baseWebpack(webpackConfig, options)
                : webpackConfig;
        }

        return typeof pwaWebpack === 'function'
            ? pwaWebpack(webpackConfig, options)
            : webpackConfig;
    };

    return pwaConfig;
};

module.exports = withSentryConfig(
    withBundleAnalyzer(withClientOnlyPWA(nextConfig)),
    sentryWebpackPluginOptions
);
