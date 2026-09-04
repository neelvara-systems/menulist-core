#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { resolveVisibleNavigationTarget } from '../../src/lib/navigation/resolveVisibleNavigationTarget';

const { JSDOM } = require('jsdom') as {
    JSDOM: new (html: string, options: { pretendToBeVisual: boolean; url: string }) => {
        window: Window & typeof globalThis & { close: () => void };
    };
};

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    pretendToBeVisual: true,
    url: 'http://localhost:3000/billing',
});
const browserWindow = dom.window;

Object.assign(globalThis, {
    CustomEvent: browserWindow.CustomEvent,
    DocumentFragment: browserWindow.DocumentFragment,
    Element: browserWindow.Element,
    HTMLElement: browserWindow.HTMLElement,
    MouseEvent: browserWindow.MouseEvent,
    Node: browserWindow.Node,
    SVGElement: browserWindow.SVGElement,
    cancelAnimationFrame: browserWindow.cancelAnimationFrame.bind(browserWindow),
    document: browserWindow.document,
    getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
    requestAnimationFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
    window: browserWindow,
});
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browserWindow.navigator });
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });
Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class ResizeObserver {
        disconnect() {}
        observe() {}
        unobserve() {}
    },
});
Object.defineProperty(browserWindow.HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: () => undefined,
});

const requireWithExtensions = require as NodeJS.Require & {
    extensions: NodeJS.RequireExtensions;
};
requireWithExtensions.extensions['.scss'] = (module: NodeModule) => {
    module.exports = new Proxy({}, {
        get: (_target, property) => String(property),
    });
};

const moduleWithLoad = Module as typeof Module & {
    _load: (request: string, parent: NodeModule | undefined, isMain: boolean) => unknown;
};
const originalModuleLoad = moduleWithLoad._load;

const motionComponent = (tag: string) => React.forwardRef<HTMLElement, Record<string, any>>(
    function TestMotionComponent(props, ref) {
        const {
            animate,
            children,
            exit: _exit,
            initial: _initial,
            onAnimationComplete,
            transition: _transition,
            ...elementProps
        } = props;
        const animationKey = JSON.stringify(animate || {});

        useEffect(() => {
            if (!onAnimationComplete) return undefined;
            const timer = window.setTimeout(onAnimationComplete, 24);
            return () => window.clearTimeout(timer);
        }, [animationKey, onAnimationComplete]);

        return React.createElement(tag, {
            ...elementProps,
            ref,
            style: {
                ...elementProps.style,
                ...(animate?.width ? { width: animate.width } : {}),
            },
        }, children);
    },
);

const motion = new Proxy({}, {
    get: (_target, property) => motionComponent(String(property)),
});

moduleWithLoad._load = function loadForDashboardSidebarTest(
    request: string,
    parent: NodeModule | undefined,
    isMain: boolean,
) {
    if (request === 'antd') {
        return {
            Button: React.forwardRef<HTMLButtonElement, Record<string, any>>(function TestButton(props, ref) {
                const { children, icon, type: _type, ...buttonProps } = props;
                return <button {...buttonProps} ref={ref}>{icon}{children}</button>;
            }),
            theme: {
                useToken: () => ({
                    token: {
                        colorBgBase: '#ffffff',
                        colorBgContainer: '#ffffff',
                        colorBgTextHover: '#eeeeee',
                        colorBorder: '#cccccc',
                        colorBorderSecondary: '#dddddd',
                        colorFillSecondary: '#eeeeee',
                        colorPrimary: '#1677ff',
                        colorPrimaryBg: '#e6f4ff',
                        colorPrimaryBorder: '#91caff',
                        colorPrimaryTextActive: '#0958d9',
                        colorText: '#111111',
                        colorTextBase: '#111111',
                        colorTextLightSolid: '#ffffff',
                    },
                }),
            },
        };
    }
    if (request === 'framer-motion') {
        return {
            AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
            motion,
        };
    }
    return originalModuleLoad.call(this, request, parent, isMain);
};

const DashboardSidebarShell = require(
    '../../src/components/shared/dashboardShell/DashboardSidebarShell',
).default as React.ComponentType<{
    isCollapsed: boolean;
    logoCollapsed: React.ReactNode;
    logoExpanded: React.ReactNode;
    navItems: Array<Record<string, unknown>>;
    onExpandedChange: (expanded: boolean) => void;
}>;

const flush = async (milliseconds = 35) => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, milliseconds));
    });
};

const hasText = (host: HTMLElement, text: string) => (host.textContent || '').includes(text);

async function testCollapsedHoverAndPersistentExpansion(): Promise<void> {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    const layoutStates: boolean[] = [];
    const navItems = [{
        icon: () => <span aria-hidden="true">I</span>,
        key: '/billing',
        label: 'Billing',
        sectionLabel: 'Account and team',
    }];
    const render = (isCollapsed: boolean) => root.render(
        <DashboardSidebarShell
            isCollapsed={isCollapsed}
            logoCollapsed={<span>ML</span>}
            logoExpanded={<span>MenuList</span>}
            navItems={navItems}
            onExpandedChange={(expanded) => layoutStates.push(expanded)}
        />,
    );

    await act(async () => render(true));
    await flush();
    const nav = host.querySelector('nav');
    assert.ok(nav, 'Sidebar navigation must render.');
    assert.equal(nav.style.width, '62px');
    assert.equal(hasText(host, 'Account and team'), false, 'Collapsed rail must not render section labels.');
    assert.deepEqual(layoutStates, [false], 'Collapsed layout must report its persistent 62px state.');

    await act(async () => {
        nav.dispatchEvent(new browserWindow.MouseEvent('mouseover', {
            bubbles: true,
            relatedTarget: document.body,
        }));
    });
    await flush(1);
    assert.equal(host.querySelector('nav')?.style.width, '200px', 'Hover must target the full expanded width immediately.');
    assert.equal(hasText(host, 'Account and team'), false, 'Labels must wait until width expansion completes.');
    await flush();
    assert.equal(hasText(host, 'Account and team'), true, 'Labels must appear after width expansion completes.');
    assert.deepEqual(layoutStates, [false], 'Hover expansion must overlay content without shifting the page layout.');

    await act(async () => root.unmount());
    const persistentRoot: Root = createRoot(host);
    await act(async () => persistentRoot.render(
        <DashboardSidebarShell
            isCollapsed
            logoCollapsed={<span>ML</span>}
            logoExpanded={<span>MenuList</span>}
            navItems={navItems}
            onExpandedChange={(expanded) => layoutStates.push(expanded)}
        />,
    ));
    await flush();
    await act(async () => persistentRoot.render(
        <DashboardSidebarShell
            isCollapsed={false}
            logoCollapsed={<span>ML</span>}
            logoExpanded={<span>MenuList</span>}
            navItems={navItems}
            onExpandedChange={(expanded) => layoutStates.push(expanded)}
        />,
    ));
    assert.equal(host.querySelector('nav')?.style.width, '200px');
    assert.equal(hasText(host, 'Account and team'), false, 'Persistent expansion must also wait for width completion.');
    await flush();
    assert.equal(hasText(host, 'Account and team'), true);
    assert.equal(layoutStates.at(-1), true, 'Top-bar expansion must report the persistent 200px layout state.');

    await act(async () => persistentRoot.unmount());
    host.remove();
}

function testSourceContracts(): void {
    const repositoryRoot = path.resolve(__dirname, '../..');
    const sidebarStyles = fs.readFileSync(
        path.join(repositoryRoot, 'src/components/organisms/sidebar/sidebarComponent.module.scss'),
        'utf8',
    );
    const menuListLayout = fs.readFileSync(
        path.join(repositoryRoot, 'src/components/antdComponent/layoutWrapper/index.tsx'),
        'utf8',
    );
    const ownerSidebar = fs.readFileSync(
        path.join(repositoryRoot, 'src/components/organisms/sidebar/index.tsx'),
        'utf8',
    );

    assert.match(
        sidebarStyles,
        /\.navSectionLabel\s*\{[\s\S]*?white-space:\s*nowrap;/,
        'Section labels must never wrap vertically during width changes.',
    );
    assert.match(
        menuListLayout,
        /const verticalSidebarOffset = isCollapsed\s*\? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH\s*:\s*DASHBOARD_SIDEBAR_EXPANDED_WIDTH;/,
        'MenuList content offset must follow persistent collapse state only.',
    );
    assert.doesNotMatch(
        menuListLayout,
        /sidebarShellExpanded/,
        'MenuList must not shift page content for temporary hover expansion.',
    );
    assert.match(
        ownerSidebar,
        /\[pathname, canManageLocations, canShowGrowthKitsNavigation, hasRecoveryOnlyAccess, hasStarterAccess, platformRole, userPermissions\]/,
        'Owner sidebar must refresh when the derived Growth Kits entitlement changes.',
    );
    assert.match(
        ownerSidebar,
        /const visibleTarget = resolveVisibleNavigationTarget\(navItem\);/,
        'Owner sidebar group clicks must resolve destinations from the filtered visible navigation item.',
    );
}

function testVisibleNavigationTargets(): void {
    const fullAccessMoreGroup = {
        defaultRoute: '/dashboard',
        route: '/dashboard',
        subNav: [
            { route: '/dashboard' },
            { route: '/business-settings' },
            { route: '/billing' },
        ],
    };
    assert.equal(
        resolveVisibleNavigationTarget(fullAccessMoreGroup),
        '/dashboard',
        'A visible configured default route must remain the normal group destination.',
    );

    assert.equal(
        resolveVisibleNavigationTarget({
            ...fullAccessMoreGroup,
            subNav: [
                { route: '/business-settings' },
                { route: '/billing' },
            ],
        }),
        '/business-settings',
        'Starter access must fall back to its first visible child instead of the hidden dashboard.',
    );

    assert.equal(
        resolveVisibleNavigationTarget({
            ...fullAccessMoreGroup,
            subNav: [{ route: '/billing' }, { route: '/help-center' }],
        }),
        '/billing',
        'Recovery-only access must route to an allowed recovery child.',
    );

    assert.equal(
        resolveVisibleNavigationTarget({ route: '/projects' }),
        '/projects',
        'Leaf navigation must continue to use its own route.',
    );
}

async function main(): Promise<void> {
    await testCollapsedHoverAndPersistentExpansion();
    testSourceContracts();
    testVisibleNavigationTargets();
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stdout.write('Dashboard sidebar hover and persistent expansion tests passed.\n');
}

main().catch((error: unknown) => {
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
