#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import Module from 'node:module';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { JSDOM } = require('jsdom') as {
    JSDOM: new (html: string, options: { url: string }) => {
        window: Window & typeof globalThis & { close: () => void };
    };
};

type TimerHandler = (...args: unknown[]) => void;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:3000/test-error-boundary?lang=en',
});
const browserWindow = dom.window;

Object.assign(globalThis, {
    CustomEvent: browserWindow.CustomEvent,
    DocumentFragment: browserWindow.DocumentFragment,
    Element: browserWindow.Element,
    HTMLElement: browserWindow.HTMLElement,
    MutationObserver: browserWindow.MutationObserver,
    Node: browserWindow.Node,
    ShadowRoot: browserWindow.ShadowRoot,
    SVGElement: browserWindow.SVGElement,
    document: browserWindow.document,
    getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
    window: browserWindow,
});
Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: browserWindow.navigator,
});
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
});
Object.defineProperty(browserWindow, 'matchMedia', {
    configurable: true,
    value: () => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: false,
        media: '',
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
    }),
});
Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class ResizeObserver {
        disconnect() {}
        observe() {}
        unobserve() {}
    },
});

const moduleWithLoad = Module as typeof Module & {
    _load: (request: string, parent: NodeModule | undefined, isMain: boolean) => unknown;
};
const originalModuleLoad = moduleWithLoad._load;
moduleWithLoad._load = function loadForSpecialStateTest(
    request: string,
    parent: NodeModule | undefined,
    isMain: boolean,
) {
    if (request === 'next/font/local') {
        return () => ({ className: '', style: { fontFamily: 'sans-serif' }, variable: '' });
    }
    if (request.endsWith('.svg')) {
        return function TestIllustration() {
            return React.createElement('svg', { 'aria-hidden': 'true' });
        };
    }
    return originalModuleLoad.call(this, request, parent, isMain);
};

const AppError = require('../../src/app/error').default as React.ComponentType<ErrorBoundaryProps>;
const ClientMenuError = require('../../src/app/client/error').default as React.ComponentType<ErrorBoundaryProps>;
const GlobalPagesError = require('../../src/app/(global-pages)/error').default as React.ComponentType<ErrorBoundaryProps>;

interface ErrorBoundaryProps {
    error: Error & { digest?: string };
    reset: () => void;
}

const findButton = (host: HTMLElement, name: string): HTMLButtonElement => {
    const normalizedName = name.toLocaleLowerCase();
    const button = Array.from(host.querySelectorAll('button'))
        .find((candidate) => candidate.textContent?.trim().toLocaleLowerCase().includes(normalizedName));
    assert.ok(button, `Expected button ${name}.`);
    return button;
};

const findAction = (host: HTMLElement, name: string): HTMLElement => {
    const normalizedName = name.toLocaleLowerCase();
    const action = Array.from(host.querySelectorAll('button, a'))
        .find((candidate) => candidate.textContent?.trim().toLocaleLowerCase().includes(normalizedName));
    assert.ok(action, `Expected action ${name}.`);
    return action as HTMLElement;
};

async function renderBoundary(
    Component: React.ComponentType<ErrorBoundaryProps>,
    reset: () => void,
): Promise<{ host: HTMLDivElement; root: Root }> {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
        root.render(<Component error={Object.assign(new Error('bounded-test-error'), { digest: 'test-digest' })} reset={reset} />);
    });
    return { host, root };
}

async function unmountBoundary(host: HTMLElement, root: Root): Promise<void> {
    await act(async () => root.unmount());
    host.remove();
}

async function testGlobalPagesError(): Promise<void> {
    let resetCount = 0;
    const { host, root } = await renderBoundary(GlobalPagesError, () => { resetCount += 1; });
    assert.match(host.textContent || '', /Something went wrong/);
    assert.match(host.textContent || '', /saved information has not been changed/);
    assert.ok(findButton(host, 'Refresh Page'));
    const help = findAction(host, 'Get Help');
    assert.equal(help.getAttribute('href'), '/help');
    await act(async () => findButton(host, 'Try Again').click());
    assert.equal(resetCount, 1, 'Global-pages Try Again must invoke reset exactly once.');
    await unmountBoundary(host, root);
}

async function testAppError(): Promise<void> {
    let resetCount = 0;
    let scheduledFallback: TimerHandler | null = null;
    let helpTarget = '';
    let helpRel = '';
    const originalSetTimeout = globalThis.setTimeout;
    const originalWindowSetTimeout = browserWindow.setTimeout;
    const interceptHelp = (event: Event) => {
        const anchor = event.target as HTMLAnchorElement;
        if (anchor?.tagName !== 'A') return;
        event.preventDefault();
        helpTarget = anchor.getAttribute('href') || '';
        helpRel = anchor.rel;
    };
    document.addEventListener('click', interceptHelp);
    const { host, root } = await renderBoundary(AppError, () => { resetCount += 1; });
    const captureTimer = ((handler: TimerHandler) => {
        scheduledFallback = handler;
        return 123 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;
    globalThis.setTimeout = captureTimer;
    browserWindow.setTimeout = captureTimer as typeof browserWindow.setTimeout;
    try {
        await act(async () => findButton(host, 'Refresh Page').click());
        assert.equal(resetCount, 1, 'App Refresh Page must invoke reset exactly once.');
        assert.equal(typeof scheduledFallback, 'function', 'App Refresh Page must retain a hard-refresh fallback.');
        await act(async () => findButton(host, 'Get Help').click());
        assert.equal(helpTarget, '/help');
        assert.equal(helpRel, 'noopener noreferrer');
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        browserWindow.setTimeout = originalWindowSetTimeout;
        document.removeEventListener('click', interceptHelp);
        await unmountBoundary(host, root);
    }
}

async function testClientMenuError(): Promise<void> {
    let resetCount = 0;
    let scheduledFallback: TimerHandler | null = null;
    const originalSetTimeout = globalThis.setTimeout;
    const originalWindowSetTimeout = browserWindow.setTimeout;
    const { host, root } = await renderBoundary(ClientMenuError, () => { resetCount += 1; });
    assert.match(host.textContent || '', /temporarily unavailable/i);
    assert.match(host.textContent || '', /ask your server for assistance/i);
    const captureTimer = ((handler: TimerHandler) => {
        scheduledFallback = handler;
        return 456 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;
    globalThis.setTimeout = captureTimer;
    browserWindow.setTimeout = captureTimer as typeof browserWindow.setTimeout;
    try {
        const retry = findButton(host, 'Try Again');
        await act(async () => retry.click());
        assert.equal(resetCount, 1, 'Customer Try Again must invoke reset exactly once.');
        assert.equal(typeof scheduledFallback, 'function', 'Customer retry must retain a hard-refresh fallback.');
        assert.equal(retry.disabled, true, 'Customer retry must disable while recovery is pending.');
        assert.match(retry.textContent || '', /retrying/i);
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        browserWindow.setTimeout = originalWindowSetTimeout;
        await unmountBoundary(host, root);
    }
}

async function main(): Promise<void> {
    await testGlobalPagesError();
    await testAppError();
    await testClientMenuError();
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stdout.write('MenuList App Router error-boundary runtime tests passed.\n');
}

main().catch((error: unknown) => {
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
