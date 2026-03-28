/** @type {import('next').NextConfig} */

const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin();

// Disable memory-heavy webpack plugins on Vercel preview builds
// Production deploys (VERCEL_ENV=production) get full Sentry + PWA
const isVercelPreview = process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'production';

// Additional memory optimization for local builds
const isLocalBuild = !process.env.VERCEL;

const nextConfig = {
    sassOptions: {
        includePaths: [path.join(__dirname, 'app/styles')],
    },
    experimental: {
        serverComponentsExternalPackages: ['@google-cloud/tasks', 'firebase-admin'],
        webpackBuildWorker: true,
        serverSourceMaps: false,
        outputFileTracingExcludes: {
            '*': [
                'node_modules/@swc/**',
                'node_modules/@esbuild/**',
                'node_modules/webpack/**',
                'node_modules/rollup/**',
                'node_modules/terser/**',
                'node_modules/firebase-admin/**',
                'node_modules/@google-cloud/**',
                'node_modules/@sentry/webpack-plugin/**',
                'node_modules/pdfjs-dist/**',
                'node_modules/jspdf/**',
                'node_modules/exceljs/**',
                'node_modules/razorpay/**',
                'node_modules/stripe',
            ],
        },
        // Optimize for memory usage in builds
        optimizeCss: true,
        optimizePackageImports: ['antd', 'antd-mobile', 'react-icons'],
        // Enable compression
        compress: true,
        // Enable modern JavaScript features
        esmExternals: true,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    reactStrictMode: false,
    productionBrowserSourceMaps: false,
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
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
    webpack(config, { isServer, dev }) {
        // Memory optimizations for builds
        if (!dev) {
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    ...config.optimization.splitChunks,
                    chunks: 'all',
                    minSize: 20000,
                    maxSize: 150000, // Reduced from 244000
                    cacheGroups: {
                        ...config.optimization.splitChunks?.cacheGroups,
                        commons: {
                            name: 'commons',
                            chunks: 'all',
                            minChunks: 3, // Increased from 2
                            priority: 10,
                            reuseExistingChunk: true,
                        },
                        vendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: 'vendors',
                            chunks: 'all',
                            priority: 20,
                            reuseExistingChunk: true,
                        },
                        // Specific optimizations for large libraries
                        antd: {
                            test: /[\\/]node_modules[\\/]antd[\\/]/,
                            name: 'antd',
                            chunks: 'all',
                            priority: 30,
                        },
                        'react-icons': {
                            test: /[\\/]node_modules[\\/]react-icons[\\/]/,
                            name: 'react-icons',
                            chunks: 'all',
                            priority: 30,
                        },
                        firebase: {
                            test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
                            name: 'firebase',
                            chunks: 'all',
                            priority: 30,
                        },
                    },
                },
                // Enable tree shaking
                usedExports: true,
                sideEffects: false,
            };
        }

        if (isServer) {
            config.externals = [
                ...config.externals,
                'firebase-admin',
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
                'firebase-admin': false,
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

        // Disable webpack in-memory cache on Vercel — cache stores all compiled
        // module artifacts in RAM and exhausts the 8GB build container
        if (process.env.VERCEL === '1' && !dev) {
            config.cache = false;
        }

        return config;
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-DNS-Prefetch-Control', value: 'on' },
                ],
            },
        ];
    },
    async redirects() {
        return [
            { source: '/about-us', destination: '/about', permanent: true },
            { source: '/contact-us', destination: '/contact', permanent: true },
            { source: '/home', destination: '/', permanent: true },
        ];
    },
}

const withPWA = require("next-pwa")({
    dest: "public",
    disable: process.env.NODE_ENV === "development" || isVercelPreview,
    register: true,
    skipWaiting: true,
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
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
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'firestore-api',
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
                networkTimeoutSeconds: 10,
            },
        },
        {
            urlPattern: /^\/_client\/.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'client-menu-pages',
                expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
                networkTimeoutSeconds: 10,
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
            urlPattern: /^\/api\/public\/.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'public-api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
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
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
    withBundleAnalyzer(withPWA(withNextIntl(nextConfig))),
    {
        org: "test-dev-vw",
        project: "javascript-nextjs",
        sentryConfigFile: "./instrumentation-client.ts",
        silent: true,
        // On Vercel preview builds: disable both webpack plugins (saves ~1GB peak memory)
        // Sentry runtime SDK still initialises — errors are still captured
        // Source maps + performance tracing only run on production deploys
        disableClientWebpackPlugin: isVercelPreview,
        disableServerWebpackPlugin: isVercelPreview,
        disableSourceMapUpload: isVercelPreview,
        widenClientFileUpload: false,
        disableLogger: true,
        automaticVercelMonitors: true,
    }
);
