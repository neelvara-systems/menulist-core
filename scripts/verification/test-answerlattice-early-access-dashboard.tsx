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

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:3000/answerlattice/early-access',
});
const browserWindow = dom.window;
const readComputedStyle = browserWindow.getComputedStyle.bind(browserWindow);
let desktopViewport = true;
let fetchCalls: Array<{ method: string; url: string }> = [];

Object.defineProperty(browserWindow, 'getComputedStyle', {
    configurable: true,
    value: (element: Element) => readComputedStyle(element),
});

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
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browserWindow.navigator });
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });
Object.defineProperty(browserWindow, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: desktopViewport && /min-width:\s*(768|992|1200|1600)px/.test(query),
        media: query,
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

const fixture = {
    counts: { total: 2, pending: 1, approved: 0, invited: 1, activated: 0, declined: 0, withdrawn: 0 },
    hasMore: true,
    nextCursor: 'request-b',
    requests: [
        {
            id: 'request-a',
            name: 'Founder One',
            workEmail: 'founder-one@example.invalid',
            productUrl: 'https://example.invalid/product-one',
            productStage: 'private_beta',
            supportArea: 'onboarding',
            supportQuestions: 'Customers need help finishing setup.',
            featureIdea: 'Show the unanswered questions that block activation.',
            status: 'pending',
            internalNotes: null,
            submissionCount: 1,
            createdAt: '2026-08-29T08:00:00.000Z',
            lastSubmittedAt: '2026-08-29T08:00:00.000Z',
            modifiedOn: '2026-08-29T08:00:00.000Z',
        },
        {
            id: 'request-b',
            name: 'Founder Two',
            workEmail: 'founder-two@example.invalid',
            productUrl: 'https://example.invalid/product-two',
            productStage: 'live',
            supportArea: 'billing',
            supportQuestions: 'Customers ask what happens when a plan changes.',
            featureIdea: null,
            status: 'invited',
            internalNotes: 'Invitation prepared.',
            submissionCount: 2,
            createdAt: '2026-08-28T08:00:00.000Z',
            lastSubmittedAt: '2026-08-29T07:00:00.000Z',
            modifiedOn: '2026-08-29T07:00:00.000Z',
        },
    ],
};

const mockFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = String(init?.method || 'GET').toUpperCase();
    fetchCalls.push({ method, url });
    return new Response(JSON.stringify(fixture), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
    });
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, value: mockFetch });
Object.defineProperty(browserWindow, 'fetch', { configurable: true, value: mockFetch });

const moduleWithLoad = Module as typeof Module & {
    _load: (request: string, parent: NodeModule | undefined, isMain: boolean) => unknown;
};
const originalModuleLoad = moduleWithLoad._load;
moduleWithLoad._load = function loadForEarlyAccessDashboardTest(
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

const AnswerlatticeEarlyAccessDashboard = require(
    '../../src/components/templates/answerlattice/platform/AnswerlatticeEarlyAccessDashboard',
).default as React.ComponentType;

const flush = async () => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
    });
};

const renderDashboard = async (desktop: boolean): Promise<{ host: HTMLDivElement; root: Root }> => {
    desktopViewport = desktop;
    fetchCalls = [];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(<AnswerlatticeEarlyAccessDashboard />));
    await flush();
    return { host, root };
};

const findButton = (host: HTMLElement, name: string): HTMLButtonElement => {
    const button = Array.from(host.querySelectorAll('button'))
        .find((candidate) => candidate.textContent?.trim().toLowerCase().includes(name.toLowerCase()));
    assert.ok(button, `Expected button ${name}.`);
    return button;
};

const unmount = async (host: HTMLElement, root: Root) => {
    await act(async () => root.unmount());
    host.remove();
};

async function testDesktopDashboard(): Promise<void> {
    const { host, root } = await renderDashboard(true);
    assert.match(host.textContent || '', /Early Access/);
    assert.match(host.textContent || '', /Registered\s*2/);
    assert.match(host.textContent || '', /Founder One/);
    assert.match(host.textContent || '', /Founder Two/);
    assert.ok(host.querySelector('table'), 'Desktop must render the review table.');
    assert.equal(fetchCalls[0]?.method, 'GET');
    assert.match(fetchCalls[0]?.url || '', /pageSize=50/);
    assert.ok(findButton(host, 'Load more'), 'Pagination must remain reachable.');

    await act(async () => findButton(host, 'Review').click());
    await flush();
    assert.match(document.body.textContent || '', /Review early access request/);
    assert.match(document.body.textContent || '', /Feature request or idea/);
    assert.match(document.body.textContent || '', /Show the unanswered questions/);
    assert.match(document.body.textContent || '', /do not send an email or provision access/i);
    await unmount(host, root);
}

async function testMobileDashboard(): Promise<void> {
    const { host, root } = await renderDashboard(false);
    assert.equal(host.querySelector('table'), null, 'Mobile must not render the wide desktop table.');
    assert.match(host.textContent || '', /Founder One/);
    assert.match(host.textContent || '', /Idea shared/);
    assert.ok(findButton(host, 'Load more'), 'Mobile pagination must remain reachable.');
    await unmount(host, root);
}

async function main(): Promise<void> {
    await testDesktopDashboard();
    await testMobileDashboard();
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stdout.write('Answerlattice early-access dashboard desktop/mobile runtime tests passed.\n');
}

main().catch((error: unknown) => {
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
