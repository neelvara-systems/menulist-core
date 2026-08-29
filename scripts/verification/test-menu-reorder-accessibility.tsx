#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const { JSDOM } = require('jsdom') as {
    JSDOM: new (html: string, options: { url: string }) => {
        window: Window & typeof globalThis & { close: () => void };
    };
};

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:3000/projects',
});
const browserWindow = dom.window;

Object.assign(globalThis, {
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

const { DndContext } = require('@dnd-kit/core') as typeof import('@dnd-kit/core');
const {
    SortableContext,
    verticalListSortingStrategy,
} = require('@dnd-kit/sortable') as typeof import('@dnd-kit/sortable');
const ReorderSortableItem = require(
    '../../src/components/templates/main-app/projects/editorView/ReorderSortableItem',
).default as typeof import('../../src/components/templates/main-app/projects/editorView/ReorderSortableItem').default;

async function renderItem(props: React.ComponentProps<typeof ReorderSortableItem>) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
        root.render(
            <DndContext>
                <SortableContext items={[props.uid]} strategy={verticalListSortingStrategy}>
                    <ReorderSortableItem {...props} />
                </SortableContext>
            </DndContext>,
        );
    });
    return { host, root };
}

async function main(): Promise<void> {
    let selectionCount = 0;
    const category = await renderItem({
        index: 0,
        isSelected: true,
        label: 'Breakfast',
        meta: '3 items',
        onClick: () => { selectionCount += 1; },
        uid: 'category-breakfast',
    });
    const categoryButtons = Array.from(category.host.querySelectorAll('button'));
    assert.equal(categoryButtons.length, 2, 'A selectable category needs one drag handle and one selection action.');
    const categoryHandle = categoryButtons.find(button => button.getAttribute('aria-label') === 'Reorder Breakfast');
    assert.ok(categoryHandle, 'Category drag handle must have a stable accessible name.');
    assert.equal(categoryHandle.style.width, '44px');
    assert.equal(categoryHandle.style.height, '44px');
    assert.equal(categoryHandle.style.touchAction, 'none');
    assert.equal(categoryHandle.tabIndex, 0, 'The drag activator must own keyboard focus.');
    const selectionButton = categoryButtons.find(button => button !== categoryHandle);
    assert.ok(selectionButton);
    assert.equal(selectionButton.getAttribute('aria-pressed'), 'true');
    assert.match(selectionButton.textContent || '', /Breakfast/);
    await act(async () => selectionButton.click());
    assert.equal(selectionCount, 1, 'Category selection must invoke its handler exactly once.');
    await act(async () => category.root.unmount());
    category.host.remove();

    const item = await renderItem({
        index: 0,
        label: 'Filter Coffee',
        uid: 'item-filter-coffee',
    });
    const itemButtons = Array.from(item.host.querySelectorAll('button'));
    assert.equal(itemButtons.length, 1, 'A non-selectable item must not expose a dead row action.');
    assert.equal(itemButtons[0].getAttribute('aria-label'), 'Reorder Filter Coffee');
    assert.match(item.host.textContent || '', /Filter Coffee/);
    await act(async () => item.root.unmount());
    item.host.remove();

    dom.window.close();
    process.stdout.write('Menu reorder accessibility component tests passed.\n');
}

main().catch((error: unknown) => {
    dom.window.close();
    const details = error instanceof AggregateError
        ? error.errors.map((entry: unknown) => (
            entry instanceof Error ? entry.stack || entry.message : String(entry)
        )).join('\n')
        : error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`${details}\n`);
    process.exitCode = 1;
});
