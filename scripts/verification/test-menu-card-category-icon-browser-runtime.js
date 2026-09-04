#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSync } = require('esbuild');

const root = process.cwd();
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'menulist-category-icon-runtime-'));
const bundlePath = path.join(tempDirectory, 'runtime.js');
const htmlPath = path.join(tempDirectory, 'index.html');

const chromeCandidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));

if (!chromePath) {
    throw new Error('Chrome or Chromium is required for the category-icon print raster regression');
}

const browserEntry = String.raw`
import { createPrintableCategoryIconDataUrl } from './src/lib/menu-card-export/render/renderCategoryIcon';

const finish = (result) => {
    document.title = 'MENULIST_RESULT:' + btoa(JSON.stringify(result));
};

(async () => {
    try {
        const [lucideDataUrl, cachedLucideDataUrl, emojiDataUrl, unknownDataUrl] = await Promise.all([
            createPrintableCategoryIconDataUrl('lu:LuSoup', '#315C4B'),
            createPrintableCategoryIconDataUrl('lu:LuSoup', '#315C4B'),
            createPrintableCategoryIconDataUrl('emoji:🍲', '#315C4B'),
            createPrintableCategoryIconDataUrl('lu:NotARealIcon', '#315C4B'),
        ]);

        finish({
            cacheIsDeterministic: lucideDataUrl === cachedLucideDataUrl,
            emojiRasterized: typeof emojiDataUrl === 'string'
                && emojiDataUrl.startsWith('data:image/png;base64,')
                && emojiDataUrl.length > 100,
            lucideRasterized: typeof lucideDataUrl === 'string'
                && lucideDataUrl.startsWith('data:image/png;base64,')
                && lucideDataUrl.length > 100,
            malformedRejected: unknownDataUrl === null,
        });
    } catch (error) {
        finish({ runtimeError: error instanceof Error ? error.message : String(error) });
    }
})();
`;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForBrowserResult(browserProcess, browserProfilePath, getStderr) {
    const activePortPath = path.join(browserProfilePath, 'DevToolsActivePort');
    const deadline = Date.now() + 45000;
    let latestTitle = 'not-started';

    while (Date.now() < deadline) {
        if (browserProcess.exitCode !== null) {
            throw new Error(`Headless Chrome exited before returning a result: ${getStderr().slice(0, 1000)}`);
        }

        if (fs.existsSync(activePortPath)) {
            const port = fs.readFileSync(activePortPath, 'utf8').split(/\r?\n/)[0]?.trim();
            if (port) {
                try {
                    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
                    const page = Array.isArray(targets)
                        ? targets.find((target) => target?.type === 'page' && target?.url === `file://${htmlPath}`)
                        : null;
                    if (typeof page?.title === 'string') latestTitle = page.title;
                    if (typeof page?.title === 'string' && page.title.startsWith('MENULIST_RESULT:')) {
                        return page.title.slice('MENULIST_RESULT:'.length);
                    }
                } catch {
                    // DevTools may need another moment after publishing the active port.
                }
            }
        }

        await delay(100);
    }

    throw new Error(`Timed out waiting for the category-icon browser runtime at ${latestTitle}: ${getStderr().slice(0, 1000)}`);
}

(async () => {
try {
    buildSync({
        absWorkingDir: root,
        bundle: true,
        format: 'iife',
        logLevel: 'silent',
        outfile: bundlePath,
        platform: 'browser',
        stdin: {
            contents: browserEntry,
            loader: 'ts',
            resolveDir: root,
            sourcefile: 'category-icon-browser-runtime.ts',
        },
        target: ['chrome120'],
        tsconfig: path.join(root, 'tsconfig.json'),
    });

    const inlineBundle = fs.readFileSync(bundlePath, 'utf8').replace(/<\/script/gi, '<\\/script');
    fs.writeFileSync(
        htmlPath,
        `<!doctype html><html><head><meta charset="utf-8"><title>RUNNING</title></head><body><script>${inlineBundle}</script></body></html>`,
        'utf8',
    );

    const browserProfilePath = path.join(tempDirectory, 'browser-profile');
    const browserProcess = spawn(chromePath, [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--allow-file-access-from-files',
        '--remote-debugging-port=0',
        `--user-data-dir=${browserProfilePath}`,
        `file://${htmlPath}`,
    ], {
        stdio: ['ignore', 'ignore', 'pipe'],
    });
    let browserStderr = '';
    browserProcess.stderr.setEncoding('utf8');
    browserProcess.stderr.on('data', (chunk) => {
        if (browserStderr.length < 20000) browserStderr += chunk;
    });

    let encodedResult;
    try {
        encodedResult = await waitForBrowserResult(browserProcess, browserProfilePath, () => browserStderr);
    } finally {
        if (browserProcess.exitCode === null) {
            browserProcess.kill('SIGTERM');
            await Promise.race([
                new Promise((resolve) => browserProcess.once('exit', resolve)),
                delay(2000),
            ]);
        }
        if (browserProcess.exitCode === null) browserProcess.kill('SIGKILL');
    }

    const result = JSON.parse(Buffer.from(encodedResult, 'base64').toString('utf8'));
    const failedChecks = Object.entries(result)
        .filter(([, passed]) => passed !== true)
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`);

    if (failedChecks.length > 0) {
        throw new Error(`Category-icon PDF browser runtime failed: ${failedChecks.join(', ')}`);
    }

    process.stdout.write('Category-icon browser raster runtime tests passed.\n');
} finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
})().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
