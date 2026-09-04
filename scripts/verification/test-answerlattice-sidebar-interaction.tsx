#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import Module from 'node:module';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const { JSDOM } = require('jsdom') as {
    JSDOM: new (html: string, options: { url: string }) => {
        window: Window & typeof globalThis & { close: () => void };
    };
};

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/answerlattice/activation',
});
const browserWindow = dom.window;
Object.assign(globalThis, {
    document: browserWindow.document,
    HTMLElement: browserWindow.HTMLElement,
    MouseEvent: browserWindow.MouseEvent,
    Node: browserWindow.Node,
    window: browserWindow,
});
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browserWindow.navigator });
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });

const pushes: string[] = [];
let navigateCount = 0;

const moduleWithLoad = Module as typeof Module & {
    _load: (request: string, parent: NodeModule | undefined, isMain: boolean) => unknown;
};
const originalModuleLoad = moduleWithLoad._load;

moduleWithLoad._load = function loadForAnswerlatticeSidebarTest(
    request: string,
    parent: NodeModule | undefined,
    isMain: boolean,
) {
    if (request === '@atoms/answerlatticeLogoMark') {
        return { __esModule: true, default: () => <span>AL</span> };
    }
    if (request === '@config/features') {
        return { FEATURE_FLAGS: new Proxy({}, { get: () => true }) };
    }
    if (request === '@/components/shared/dashboardShell/DashboardSidebarShell') {
        return {
            __esModule: true,
            default: ({ navItems }: { navItems: Array<{ key: string; label: React.ReactNode; onClick?: () => void; sectionLabel?: React.ReactNode }> }) => (
                <nav aria-label="Answerlattice navigation">
                    {navItems.map(item => (
                        <React.Fragment key={item.key}>
                            {item.sectionLabel ? <span data-section>{item.sectionLabel}</span> : null}
                            <button data-key={item.key} onClick={item.onClick}>{item.label}</button>
                        </React.Fragment>
                    ))}
                </nav>
            ),
        };
    }
    if (request === '@hook/useAppDispatch') {
        return { useAppDispatch: () => () => undefined };
    }
    if (request === '@hook/useAppSelector') {
        return { useAppSelector: () => false };
    }
    if (request === '@hook/useClientAuthSession') {
        return { useClientAuthSession: () => ({ user: { email: 'owner@example.com' } }) };
    }
    if (request === '@lib/answerlattice/sessionScope') {
        return { canUseAnswerlatticeManagement: () => true };
    }
    if (request === '@providers/answerlatticeAccessProvider') {
        return {
            useAnswerlatticeAccess: () => ({
                access: {
                    canUseManagement: true,
                    isPlatformAdmin: true,
                    permissions: {},
                },
            }),
        };
    }
    if (request === '@reduxSlices/clientThemeConfig') {
        return {
            getDarkModeState: () => false,
            getSidebarState: () => false,
            toggleAppSettingsPanel: () => ({ type: 'test/app-settings' }),
            toggleDarkMode: () => ({ type: 'test/dark-mode' }),
        };
    }
    if (request === 'antd') {
        return {
            theme: {
                useToken: () => ({ token: { colorText: '#111111' } }),
            },
        };
    }
    if (request === 'next/navigation') {
        return {
            usePathname: () => '/answerlattice/activation',
            useRouter: () => ({ push: (route: string) => pushes.push(route) }),
            useSearchParams: () => ({ get: () => null }),
        };
    }
    return originalModuleLoad.call(this, request, parent, isMain);
};

const AnswerlatticeSidebar = require(
    '../../src/components/answerlattice/AnswerlatticeSidebar',
).default as React.ComponentType<{ mobile?: boolean; onNavigate?: () => void }>;

const host = document.getElementById('root');
assert.ok(host);
const root = createRoot(host);

async function main(): Promise<void> {
    await act(async () => {
        root.render(
            <AnswerlatticeSidebar
                mobile
                onNavigate={() => {
                    navigateCount += 1;
                }}
            />,
        );
    });

    const sectionLabels = Array.from(host.querySelectorAll('[data-section]'))
        .map(element => element.textContent);
    assert.deepEqual(sectionLabels, [
        'Get Live',
        'Improve answers',
        'Run Support',
        'Customer help',
        'Workspace',
        'Advanced',
    ]);
    assert.ok(host.querySelector('button[data-key="/answerlattice/activation"]'));
    assert.ok(host.querySelector('button[data-key="answerlattice-all-tools"]'));
    assert.equal(host.textContent?.includes('Known Issues'), false);

    await act(async () => {
        (host.querySelector('button[data-key="answerlattice-all-tools"]') as HTMLButtonElement).click();
    });
    assert.equal(pushes.length, 0, 'All tools must not navigate.');
    assert.equal(navigateCount, 0, 'All tools must not close the mobile drawer.');
    assert.equal(host.textContent?.includes('Known Issues'), true, 'All tools must reveal authorized advanced routes.');

    const knownIssuesButton = Array.from(host.querySelectorAll('button'))
        .find(button => button.textContent === 'Known Issues') as HTMLButtonElement | undefined;
    assert.ok(knownIssuesButton);
    await act(async () => knownIssuesButton.click());
    assert.equal(pushes.length, 1, 'A destination must use the existing router.');
    assert.equal(navigateCount, 1, 'A destination must close the mobile drawer.');

    await act(async () => root.unmount());
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stdout.write('Answerlattice grouped sidebar interaction tests passed.\n');
}

main().catch((error: unknown) => {
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
