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

// Disable memory-heavy webpack plugins on Vercel preview builds
// Production deploys (VERCEL_ENV=production) get full PWA
const isVercelPreview = process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'production';
const buildCreatedAt = process.env.NEXT_PUBLIC_BUILD_CREATED_AT || new Date().toISOString();
const skipNextBuildChecks = process.env.NEXT_SKIP_NEXT_BUILD_CHECKS === '1';

class MenuListServerChunkCompatPlugin {
    async writeRoutesManifest(outputPath) {
        if (!outputPath) return;

        const pageToRoute = (page) => {
            const routeRegex = getNamedRouteRegex(page, true);
            return {
                page,
                regex: normalizeRouteRegex(routeRegex.re.source),
                routeKeys: routeRegex.routeKeys,
                namedRegex: routeRegex.namedRegex,
            };
        };
        const readJson = async (filePath, fallback) => {
            try {
                return JSON.parse(await fs.readFile(filePath, 'utf8'));
            } catch {
                return fallback;
            }
        };
        const rootDistPaths = [
            path.dirname(outputPath),
            path.dirname(path.dirname(outputPath)),
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

            const appPathRoutesManifest = await readJson(
                path.join(rootDistPath, 'app-path-routes-manifest.json'),
                {},
            );
            const serverPagesManifest = await readJson(
                path.join(rootDistPath, 'server', 'pages-manifest.json'),
                await readJson(path.join(outputPath, 'pages-manifest.json'), {}),
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

            const chunksDir = path.join(outputPath, 'chunks');
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

                    const destination = path.join(outputPath, relativePath);
                    await fs.mkdir(path.dirname(destination), { recursive: true });
                    await fs.copyFile(source, destination);
                }));
            };

            try {
                await fs.access(chunksDir);
            } catch {
                return;
            }

            await copyServerChunks(chunksDir);

            // Next's page-data collection still resolves the minimal Pages
            // Router compatibility files even though this app is App Router
            // first. In local worker builds the files can be emitted while the
            // pages manifest remains empty, so repair only those special
            // entries when the compiled files exist.
            const pagesManifestPath = path.join(outputPath, 'pages-manifest.json');
            const specialPages = {
                '/_app': 'pages/_app.js',
                '/_document': 'pages/_document.js',
                '/_error': 'pages/_error.js',
            };
            let pagesManifest = {};
            try {
                pagesManifest = JSON.parse(await fs.readFile(pagesManifestPath, 'utf8'));
            } catch {
                pagesManifest = {};
            }
            let manifestChanged = false;
            await Promise.all(Object.entries(specialPages).map(async ([route, file]) => {
                try {
                    await fs.access(path.join(outputPath, file));
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

            const appManifestPath = path.join(outputPath, 'app-paths-manifest.json');
            const normalizeAppRoute = (route) => {
                const normalized = route.split('/').reduce((pathname, segment, index, segments) => {
                    if (!segment) return pathname;
                    if (segment.startsWith('(') && segment.endsWith(')')) return pathname;
                    if (segment.startsWith('@')) return pathname;
                    if ((segment === 'page' || segment === 'route') && index === segments.length - 1) {
                        return pathname;
                    }
                    return `${pathname}/${segment}`;
                }, '');
                return normalized || '/';
            };
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
                    collected[normalizeAppRoute(rawRoute)] = manifestFile;
                }));
                return collected;
            };
            const emittedAppEntries = await collectAppEntries(path.join(outputPath, 'app'));
            if (Object.keys(emittedAppEntries).length) {
                let appManifest = {};
                try {
                    appManifest = JSON.parse(await fs.readFile(appManifestPath, 'utf8'));
                } catch {
                    appManifest = {};
                }
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

            await this.writeRoutesManifest(outputPath);
        });

        compiler.hooks.done.tapPromise('MenuListServerChunkCompatPluginRoutesManifest', async () => {
            await this.writeRoutesManifest(compiler.options.output.path);
        });
    }
}



const nextConfig = {
    env: {
        NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local',
        NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        NEXT_PUBLIC_DEPLOYMENT_URL: process.env.NEXT_PUBLIC_DEPLOYMENT_URL || process.env.VERCEL_URL || '',
        NEXT_PUBLIC_BUILD_CREATED_AT: buildCreatedAt,
        NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE: process.env.NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE || 'true',
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'app/styles')],
    },
    experimental: {
        serverComponentsExternalPackages: ['@google-cloud/tasks', 'firebase-admin'],
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
        },
        outputFileTracingIncludes: {
            '/sites/mycodex': ['./__docs__/**/*'],
            '/sites/mycodex/**/*': ['./__docs__/**/*'],
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

        config.externals.push({ sharp: 'commonjs sharp', canvas: 'commonjs canvas' });
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
//      Uses next-pwa generated `sw.js` with runtime caching for
//      dashboard pages, auth, fonts, static assets, images.
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
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    // Offline fallback page served by sw.js when a navigation fails.
    // sw-customer.js ships its own equivalent for customer tenants.
    fallbacks: {
        document: '/offline',
    },
    // Owner-dashboard-only runtime caching.
    // Customer-facing URL patterns (/_client/*, Firestore API, /api/public/*)
    // are intentionally NOT cached here — they are served only on customer
    // tenant origins where sw-customer.js (no caching) is registered.
    // This is defense-in-depth: even if sw.js were ever to register on a
    // customer origin, no menu content would be cached.
    runtimeCaching: [
        {
            urlPattern: /^\/(dashboard|billing|business-settings|projects|feedback|qr-code)\/?$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'owner-dashboard-pages',
                expiration: { maxEntries: 16, maxAgeSeconds: 12 * 60 * 60 },
                networkTimeoutSeconds: 8,
            },
        },
        {
            urlPattern: /^\/signin\/?$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'auth-pages',
                expiration: { maxEntries: 4, maxAgeSeconds: 24 * 60 * 60 },
                networkTimeoutSeconds: 8,
            },
        },
        {
            urlPattern: /^\/screen\/.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'screen-pages',
                expiration: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 },
                networkTimeoutSeconds: 10,
            },
        },
        {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'firebase-images',
                expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
        },
        {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
        },
        {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-assets',
                expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
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
