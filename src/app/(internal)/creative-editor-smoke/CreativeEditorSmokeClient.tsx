"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { CreativeEditorDocument } from "@/modules/creative-editor/types";

const CreativeEditor = dynamic(() => import("@/modules/creative-editor/CreativeEditor"), {
    ssr: false,
    loading: () => <div style={{ color: "#202020", padding: 24 }}>Loading editor...</div>,
});

type SmokeVariant = "default" | "stress";
type QaStatus = "idle" | "running" | "passed" | "failed";

const smokeAssetSources = [
    {
        id: "smoke-approved-image",
        label: "Smoke approved image",
        sourceRef: "creative-editor-smoke",
        type: "image" as const,
        url: "/images/menu-card-export/botanical-corner-watercolor.png",
    },
    {
        id: "smoke-brand-logo",
        label: "Smoke brand logo",
        sourceRef: "creative-editor-smoke",
        type: "logo" as const,
        url: "/images/menu-card-export/botanical-corner-watercolor.png",
    },
];

interface QaResult {
    detail?: string;
    label: string;
    status: "passed" | "failed";
}

const wait = (duration: number) => new Promise((resolve) => {
    window.setTimeout(resolve, duration);
});

async function waitFor<T>(producer: () => T | null | undefined | false, label: string, timeout = 6000): Promise<T> {
    const startedAt = window.performance.now();
    while (window.performance.now() - startedAt < timeout) {
        const value = producer();
        if (value) return value;
        await wait(80);
    }
    throw new Error(`${label} did not appear within ${timeout}ms.`);
}

function query<T extends Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
}

async function clickSelector(selector: string, label: string) {
    const element = await waitFor(() => query<HTMLElement>(selector), label);
    element.click();
    await wait(120);
    return element;
}

function getLayerCount() {
    const root = query<HTMLElement>("[data-creative-editor-root='true']");
    return Number(root?.getAttribute("data-creative-editor-layer-count") || "0");
}

function getButtonName(button: HTMLButtonElement) {
    return [
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
        button.textContent,
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function describeBlockingTarget(target: Element | null) {
    if (!(target instanceof HTMLElement)) return "unknown element";
    const className = target.className
        ? `.${String(target.className).replace(/\s+/g, ".")}`
        : "";
    const accessibleName = target.getAttribute("aria-label")
        || target.getAttribute("title")
        || target.textContent
        || "";
    return `${target.tagName.toLowerCase()}${className} ${accessibleName}`.trim();
}

async function clickButtonByName(name: string, label = name, scopeSelector?: string) {
    const normalizedName = name.toLowerCase();
    const button = await waitFor(() => {
        const scope = scopeSelector ? query<HTMLElement>(scopeSelector) : document;
        if (!scope) return null;
        const buttons = Array.from(scope.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
        return buttons.find((candidate) => getButtonName(candidate).toLowerCase().includes(normalizedName));
    }, label);
    button.click();
    await wait(160);
    return button;
}

async function clickTool(toolId: string) {
    await clickSelector(`[data-creative-editor-tool='${toolId}']`, `${toolId} tool`);
    await waitFor(() => {
        const root = query<HTMLElement>("[data-creative-editor-root='true']");
        const body = query<HTMLElement>("[data-creative-editor-body='true']");
        return root?.getAttribute("data-creative-editor-active-tool") === toolId
            && body?.getAttribute("data-drawer-collapsed") === "false";
    }, `${toolId} drawer`);
}

async function waitForLayerCountAbove(count: number, label: string) {
    return waitFor(() => {
        const nextCount = getLayerCount();
        return nextCount > count ? nextCount : null;
    }, label);
}

function pressEscape() {
    window.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Escape",
    }));
}

function pressKey(key: string, init: KeyboardEventInit = {}) {
    window.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key,
        ...init,
    }));
}

function sampleCanvasColorCount(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context || canvas.width < 2 || canvas.height < 2) return 0;
    const samples = new Set<string>();
    for (let xIndex = 0; xIndex < 7; xIndex += 1) {
        for (let yIndex = 0; yIndex < 7; yIndex += 1) {
            const x = Math.max(0, Math.min(canvas.width - 1, Math.round((canvas.width - 1) * (xIndex / 6))));
            const y = Math.max(0, Math.min(canvas.height - 1, Math.round((canvas.height - 1) * (yIndex / 6))));
            const data = context.getImageData(x, y, 1, 1).data;
            samples.add(`${data[0]},${data[1]},${data[2]},${data[3]}`);
        }
    }
    return samples.size;
}

function setControlledValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
}

function setSmokeQaState(status: QaStatus, results: QaResult[]) {
    (window as typeof window & {
        __creativeEditorSmokeQa?: { results: QaResult[]; status: QaStatus };
    }).__creativeEditorSmokeQa = { results, status };
}

function createQaPanel() {
    const panel = document.createElement("aside");
    Object.assign(panel.style, {
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "8px",
        bottom: "16px",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.22)",
        color: "#f9fafb",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        maxHeight: "48vh",
        overflow: "auto",
        padding: "12px",
        pointerEvents: "none",
        position: "fixed",
        right: "16px",
        width: "360px",
        zIndex: "1000",
    });
    panel.setAttribute("data-creative-editor-qa-status", "idle");
    document.body.appendChild(panel);
    return panel;
}

function renderQaPanel(panel: HTMLElement, status: QaStatus, results: QaResult[]) {
    panel.setAttribute("data-creative-editor-qa-status", status);

    const title = document.createElement("strong");
    title.textContent = `Creative editor QA: ${status}`;

    const list = document.createElement("ol");
    Object.assign(list.style, {
        margin: "8px 0 0",
        paddingLeft: "18px",
    });

    results.forEach((result) => {
        const item = document.createElement("li");
        Object.assign(item.style, {
            color: result.status === "passed" ? "#bbf7d0" : "#fecaca",
            marginBottom: "6px",
        });
        item.append(document.createTextNode(result.label));
        if (result.detail) {
            const detail = document.createElement("span");
            detail.style.color = "#d1d5db";
            detail.textContent = ` - ${result.detail}`;
            item.append(detail);
        }
        list.append(item);
    });

    panel.replaceChildren(title, list);
}

function CreativeEditorSmokeQaProbe({
    expectedLayerCount,
    variant,
}: {
    expectedLayerCount: number;
    variant: SmokeVariant;
}): null {
    useEffect(() => {
        let cancelled = false;
        const panel = createQaPanel();
        const nextResults: QaResult[] = [];
        const commit = (nextStatus: QaStatus) => {
            if (cancelled) return;
            const committedResults = [...nextResults];
            renderQaPanel(panel, nextStatus, committedResults);
            setSmokeQaState(nextStatus, committedResults);
        };
        const step = async (label: string, runner: () => Promise<string | void> | string | void) => {
            try {
                const detail = await runner();
                nextResults.push({ detail: detail || undefined, label, status: "passed" });
            } catch (error) {
                nextResults.push({
                    detail: error instanceof Error ? error.message : "Unknown QA failure.",
                    label,
                    status: "failed",
                });
            }
            commit("running");
        };

        const run = async () => {
            commit("running");

            await step("Editor root, body, and canvas render", async () => {
                const root = await waitFor(() => query<HTMLElement>("[data-creative-editor-root='true']"), "editor root");
                await waitFor(() => query<HTMLElement>("[data-creative-editor-body='true']"), "editor body");
                const canvas = await waitFor(() => query<HTMLCanvasElement>("[data-creative-editor-canvas='true']"), "editor canvas");
                await waitFor(() => sampleCanvasColorCount(canvas) > 1, "painted Fabric canvas", variant === "stress" ? 9000 : 6000);
                const layerCount = Number(root.getAttribute("data-creative-editor-layer-count") || "0");
                if (layerCount < expectedLayerCount) {
                    throw new Error(`Expected at least ${expectedLayerCount} layers, found ${layerCount}.`);
                }
                return `${layerCount} layers, ${canvas.width}x${canvas.height} canvas.`;
            });

            await step("Single-page designs can add, duplicate, switch, and lock pages", async () => {
                const root = await waitFor(() => query<HTMLElement>("[data-creative-editor-root='true']"), "editor root");
                if (root.getAttribute("data-creative-editor-page-count") !== "1") {
                    throw new Error("Smoke fixture did not start with exactly one page.");
                }
                await clickButtonByName("Add page", "add second page");
                await waitFor(() => root.getAttribute("data-creative-editor-page-count") === "2", "second page");
                await clickButtonByName("Duplicate page", "duplicate active page");
                await waitFor(() => root.getAttribute("data-creative-editor-page-count") === "3", "third page");
                await clickButtonByName("Page 1", "return to first page", "[aria-label='Design pages']");
                await waitFor(() => root.getAttribute("data-creative-editor-active-page-id") === "page_1", "first page active");
                await clickButtonByName("Lock page", "lock active page", "[aria-label='Page controls']");
                await waitFor(() => query<HTMLButtonElement>("[aria-label='Unlock page']"), "page locked");
                await clickButtonByName("Unlock page", "unlock active page", "[aria-label='Page controls']");
                await waitFor(() => query<HTMLButtonElement>("[aria-label='Lock page']"), "page unlocked");
                return "3 pages with Page 1 active and unlocked.";
            });

            await step("Top-bar toggles keep the viewport stable", async () => {
                const root = await waitFor(() => query<HTMLElement>("[data-creative-editor-root='true']"), "editor root");
                const stage = await waitFor(() => query<HTMLElement>("[data-creative-editor-stage='true']"), "editor stage");
                await clickSelector("[data-creative-editor-action='toggle-theme']", "theme toggle");
                await waitFor(() => root.getAttribute("data-theme") === "light", "light theme");
                await clickSelector("[data-creative-editor-action='toggle-theme']", "theme toggle reset");
                await waitFor(() => root.getAttribute("data-theme") === "dark", "dark theme");
                await clickSelector("[data-creative-editor-action='toggle-grid']", "grid toggle");
                await waitFor(() => stage.getAttribute("data-grid") === "true", "grid enabled");
                await clickSelector("[data-creative-editor-action='toggle-safe-area']", "safe area toggle");
                await waitFor(() => stage.getAttribute("data-safe-area") === "true", "safe area enabled");
                await clickSelector("[data-creative-editor-action='review']", "review mode");
                await waitFor(() => root.getAttribute("data-review-mode") === "true", "review mode enabled");
                await clickSelector("[data-creative-editor-action='review']", "review mode reset");
                await waitFor(() => root.getAttribute("data-review-mode") === "false", "review mode disabled");
            });

            await step("Background panel exposes status and real actions only", async () => {
                const drawerSelector = "[data-creative-editor-asset-drawer='true']";
                await clickTool("background");
                const drawer = await waitFor(() => query<HTMLElement>(drawerSelector), "background drawer");
                const status = await waitFor(() => (
                    drawer.querySelector<HTMLElement>("[data-creative-editor-background-status='color']")
                ), "color background status");
                if (status.textContent?.trim() !== "Color background") {
                    throw new Error("Background status did not describe the current color mode.");
                }
                if (drawer.querySelector("input[type='checkbox'][readonly]")) {
                    throw new Error("Background drawer exposed a read-only checkbox as an action.");
                }
                await clickButtonByName("Add image layer", "image-layer handoff", drawerSelector);
                await waitFor(() => (
                    query<HTMLElement>("[data-creative-editor-root='true']")
                        ?.getAttribute("data-creative-editor-active-tool") === "images"
                ), "Images tool after background handoff");
                await clickTool("background");
                await waitFor(() => (
                    query<HTMLElement>("[data-creative-editor-background-status='color']")
                ), "background status after returning");
            });

            await step("Template search includes goal starters and applies a result", async () => {
                const layerCount = getLayerCount();
                await clickTool("templates");
                const searchField = await waitFor(() => (
                    query<HTMLInputElement>("input[placeholder='Search templates']")
                ), "template search field");
                searchField.focus();
                setControlledValue(searchField, "appointment");
                const appointmentStarter = await waitFor(() => {
                    const drawer = query<HTMLElement>("[data-creative-editor-asset-drawer='true']");
                    return Array.from(drawer?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") || [])
                        .find((candidate) => getButtonName(candidate).includes("Appointment reminder"));
                }, "Appointment reminder search result");
                appointmentStarter.click();
                const nextLayerCount = await waitForLayerCountAbove(layerCount, "appointment starter layers");
                setControlledValue(searchField, "");
                return `${nextLayerCount - layerCount} starter layers added.`;
            });

            await step("Rail tabs and drawer insertions create editable layers", async () => {
                let layerCount = getLayerCount();
                const drawerSelector = "[data-creative-editor-asset-drawer='true']";
                await clickTool("text");
                await clickButtonByName("Add a text box", "add text", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "text layer inserted");
                await clickTool("graphics");
                await clickButtonByName("Add Sale sticker", "sale sticker", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "sticker layer inserted");
                await clickTool("shapes");
                await clickButtonByName("Rectangle", "rectangle shape", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "shape layer inserted");
                await clickTool("qr");
                await clickButtonByName("Add plain QR", "plain qr action", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "qr layer inserted");
                await clickTool("barcode");
                await clickButtonByName("Add barcode", "barcode layer", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "barcode layer inserted");
                return `${layerCount} layers after drawer insertions.`;
            });

            await step("Approved image, My Stuff, and Brand Kit assets insert from deterministic sources", async () => {
                let layerCount = getLayerCount();
                const drawerSelector = "[data-creative-editor-asset-drawer='true']";
                await clickTool("images");
                await clickButtonByName("Smoke approved image", "approved image source", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "approved image inserted");
                await clickTool("myStuff");
                await clickButtonByName("Smoke approved image", "My Stuff approved image", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "My Stuff image inserted");
                await clickTool("brandKit");
                await clickButtonByName("Smoke brand logo", "brand logo source", drawerSelector);
                layerCount = await waitForLayerCountAbove(layerCount, "brand logo inserted");
                return `${layerCount} layers after all three approved-asset insertion paths.`;
            });

            await step("Keyboard creation shortcuts use normal history", async () => {
                (document.activeElement as HTMLElement | null)?.blur();
                let layerCount = getLayerCount();
                pressKey("t");
                layerCount = await waitForLayerCountAbove(layerCount, "keyboard text inserted");
                pressKey("r");
                layerCount = await waitForLayerCountAbove(layerCount, "keyboard rectangle inserted");
                pressKey("c");
                layerCount = await waitForLayerCountAbove(layerCount, "keyboard circle inserted");
                pressKey("l");
                layerCount = await waitForLayerCountAbove(layerCount, "keyboard line inserted");
                pressKey("q");
                layerCount = await waitForLayerCountAbove(layerCount, "keyboard qr inserted");
                return `${layerCount} layers after keyboard insertions.`;
            });

            await step("Multi-selection actions group, distribute, duplicate, delete, and ungroup", async () => {
                const root = await waitFor(() => query<HTMLElement>("[data-creative-editor-root='true']"), "editor root");
                const initialCount = getLayerCount();
                const keyboardTarget = await waitFor(() => query<HTMLButtonElement>("[data-creative-editor-action='layers']"), "editor keyboard target");
                keyboardTarget.click();
                const nonTextLayer = await waitFor(() => {
                    const row = query<HTMLElement>("[data-creative-layer-name='Hexagon accent']");
                    return row?.querySelector<HTMLButtonElement>("[data-creative-editor-action='select-layer']");
                }, "non-text layer for multi-selection");
                nonTextLayer.click();
                await wait(120);
                keyboardTarget.focus();
                keyboardTarget.dispatchEvent(new KeyboardEvent("keydown", {
                    bubbles: true,
                    cancelable: true,
                    ctrlKey: true,
                    key: "a",
                }));
                const floatingToolbar = await waitFor(() => {
                    const toolbar = query<HTMLElement>("[data-creative-editor-floating-toolbar='true'][data-multi='true']");
                    return toolbar?.querySelector<HTMLButtonElement>("button[title='Group selected layers']:not([disabled])")
                        ? toolbar
                        : null;
                }, "enabled multi-selection toolbar");
                keyboardTarget.click();
                await waitFor(() => query<HTMLElement>("[data-creative-editor-inspector='true'][data-panel-mode='layers'][aria-hidden='false']"), "layers panel with multi-selection");
                await clickButtonByName("Close layers panel", "close layers panel before contextual actions", "[data-creative-editor-inspector='true']");
                const contextualToolbar = await waitFor(() => query<HTMLElement>("[aria-label='Selected layers properties']"), "multi-selection properties");
                const distributeX = Array.from(contextualToolbar.querySelectorAll<HTMLButtonElement>("button:not([disabled])"))
                    .find((button) => getButtonName(button).includes("Distribute X"));
                const distributeY = Array.from(contextualToolbar.querySelectorAll<HTMLButtonElement>("button:not([disabled])"))
                    .find((button) => getButtonName(button).includes("Distribute Y"));
                if (!distributeX || !distributeY) {
                    throw new Error("Multi-selection distribution actions were not enabled.");
                }
                distributeX.click();
                await wait(160);
                distributeY.click();
                await wait(160);

                const contextualPosition = Array.from(contextualToolbar.querySelectorAll<HTMLButtonElement>("button:not([disabled])"))
                    .find((button) => getButtonName(button).includes("Position"));
                if (!contextualPosition) throw new Error("Contextual multi-selection Position action was unavailable.");
                contextualPosition.click();
                await waitFor(() => query<HTMLElement>("[data-creative-editor-inspector='true'][data-panel-mode='properties'][aria-hidden='false']"), "contextual multi-selection properties");
                const quickTools = await waitFor(() => query<HTMLElement>("[data-creative-editor-inspector='true'][data-panel-mode='properties'][aria-hidden='false']"), "multi-selection Quick Tools");
                await clickButtonByName("Distribute X", "Quick Tools distribute X", "[data-creative-editor-inspector='true']");
                await clickButtonByName("Distribute Y", "Quick Tools distribute Y", "[data-creative-editor-inspector='true']");
                if (!quickTools) throw new Error("Multi-selection Quick Tools did not render.");

                const floatingDistributeX = floatingToolbar.querySelector<HTMLButtonElement>("button[title='Distribute across']:not([disabled])");
                const floatingDistributeY = floatingToolbar.querySelector<HTMLButtonElement>("button[title='Distribute down']:not([disabled])");
                const floatingMore = floatingToolbar.querySelector<HTMLButtonElement>("button[title='More layer controls']:not([disabled])");
                if (!floatingDistributeX || !floatingDistributeY || !floatingMore) {
                    throw new Error("Floating multi-selection distribution or More action was unavailable.");
                }
                floatingDistributeX.click();
                await wait(160);
                floatingDistributeY.click();
                await wait(160);
                floatingMore.click();
                await waitFor(() => query<HTMLElement>("[data-creative-editor-inspector='true'][data-panel-mode='properties'][aria-hidden='false']"), "floating More properties");

                const duplicate = floatingToolbar.querySelector<HTMLButtonElement>("button[title='Duplicate selected layers']:not([disabled])");
                if (!duplicate) throw new Error("Multi-selection duplicate action was unavailable.");
                duplicate.click();
                await waitFor(() => getLayerCount() === initialCount * 2, "multi-selection duplicate");
                const deleteSelection = await waitFor(() => (
                    query<HTMLButtonElement>("[data-creative-editor-floating-toolbar='true'] button[title='Delete selected layers']:not([disabled])")
                ), "multi-selection delete action");
                deleteSelection.click();
                await waitFor(() => getLayerCount() === initialCount, "multi-selection duplicate cleanup");

                keyboardTarget.focus();
                keyboardTarget.dispatchEvent(new KeyboardEvent("keydown", {
                    bubbles: true,
                    cancelable: true,
                    ctrlKey: true,
                    key: "a",
                }));
                const group = await waitFor(() => (
                    query<HTMLButtonElement>("[data-creative-editor-floating-toolbar='true'] button[title='Group selected layers']:not([disabled])")
                ), "floating group action");
                group.click();
                const groupedToolbar = await waitFor(() => query<HTMLElement>("[aria-label='Selected group actions']"), "grouped selection toolbar");
                const position = groupedToolbar.querySelector<HTMLButtonElement>("button[title='Position and layers']:not([disabled])");
                if (!position) throw new Error("Grouped selection Position action was unavailable.");
                position.click();
                await waitFor(() => query<HTMLElement>("[data-creative-editor-inspector='true'][data-panel-mode='properties'][aria-hidden='false']"), "group properties inspector");
                const ungroup = await waitFor(() => (
                    query<HTMLButtonElement>("[data-creative-editor-floating-toolbar='true'] button[title='Ungroup selected layers']:not([disabled])")
                ), "floating ungroup action");
                ungroup.click();
                await waitFor(() => query("[data-creative-editor-floating-toolbar='true'][data-multi='true']"), "ungrouped multi-selection");

                const quickGroup = await waitFor(() => (
                    Array.from(document.querySelectorAll<HTMLButtonElement>("[data-creative-editor-inspector='true'] button:not([disabled])"))
                        .find((button) => getButtonName(button) === "Group")
                ), "Quick Tools group action");
                quickGroup.click();
                const quickUngroup = await waitFor(() => (
                    Array.from(document.querySelectorAll<HTMLButtonElement>("[data-creative-editor-inspector='true'] button:not([disabled])"))
                        .find((button) => getButtonName(button) === "Ungroup")
                ), "Quick Tools ungroup action");
                quickUngroup.click();
                await waitFor(() => query("[data-creative-editor-floating-toolbar='true'][data-multi='true']"), "Quick Tools ungrouped multi-selection");
                await clickSelector("[data-creative-editor-action='layers']", "open layers before closing inspector");
                await clickButtonByName("Close layers panel", "close inspector before toolbar geometry", "[data-creative-editor-inspector='true']");
                pressEscape();
                await waitFor(() => !query("[data-creative-editor-floating-toolbar='true']"), "multi-selection cleared");
                pressKey("t");
                await waitFor(() => getLayerCount() === initialCount + 1, "fresh toolbar anchor layer");
                return `${initialCount} unlocked layers exercised through real Fabric multi-selection; one fresh anchor layer added for toolbar geometry.`;
            });

            await step("Floating toolbar stays below selection border", async () => {
                const stage = await waitFor(() => query<HTMLElement>("[data-creative-editor-stage='true']"), "editor stage");
                await waitFor(() => query<HTMLElement>("[data-creative-editor-floating-toolbar='true']"), "fresh anchor floating toolbar");
                await clickButtonByName("Fit to screen", "fit canvas to screen");
                await wait(520);
                const toolbar = await waitFor(() => query<HTMLElement>("[data-creative-editor-floating-toolbar='true']"), "floating selection toolbar");
                const top = Number.parseFloat(toolbar.style.top || "0");
                const left = Number.parseFloat(toolbar.style.left || "0");
                if (!Number.isFinite(top) || !Number.isFinite(left) || top <= 0) {
                    throw new Error("Floating toolbar position did not resolve.");
                }
                const anchorLeft = Number(toolbar.dataset.anchorLeft || "");
                const selectionBottom = Number(toolbar.dataset.selectionBottom || "");
                if (!Number.isFinite(anchorLeft) || !Number.isFinite(selectionBottom)) {
                    throw new Error("Floating toolbar anchor data did not resolve.");
                }
                const stageRect = stage.getBoundingClientRect();
                const toolbarRect = toolbar.getBoundingClientRect();
                const fabricCanvas = await waitFor(() => query<HTMLCanvasElement>("canvas.lower-canvas"), "Fabric lower canvas");
                const logicalCanvasWidth = Number.parseFloat(fabricCanvas.style.width || "0");
                const logicalCanvasHeight = Number.parseFloat(fabricCanvas.style.height || "0");
                if (!Number.isFinite(logicalCanvasWidth) || !Number.isFinite(logicalCanvasHeight) || logicalCanvasWidth <= 0 || logicalCanvasHeight <= 0) {
                    throw new Error("Fabric logical canvas dimensions did not resolve.");
                }
                const editorBody = query<HTMLElement>("[data-creative-editor-body='true']");
                const inspector = query<HTMLElement>("[data-creative-editor-inspector='true']");
                const availableCanvasWidth = editorBody?.getAttribute("data-inspector-open") === "true" && inspector
                    ? Math.max(1, logicalCanvasWidth - inspector.offsetWidth)
                    : logicalCanvasWidth;
                const logicalToolbarWidth = toolbar.offsetWidth;
                const logicalToolbarHeight = toolbar.offsetHeight;
                const maxToolbarLeft = Math.max(8, availableCanvasWidth - logicalToolbarWidth - 8);
                const maxToolbarTop = Math.max(8, logicalCanvasHeight - logicalToolbarHeight - 8);
                const expectedLeft = Math.max(8, Math.min(maxToolbarLeft, anchorLeft - logicalToolbarWidth / 2));
                const expectedTop = Math.max(8, Math.min(maxToolbarTop, selectionBottom + 10));
                const verticalGap = top - selectionBottom;
                if (Math.abs(left - expectedLeft) > 4) {
                    throw new Error(`Toolbar left was ${Math.round(left)}px; expected ${Math.round(expectedLeft)}px.`);
                }
                if (Math.abs(top - expectedTop) > 4) {
                    throw new Error(`Toolbar top was ${Math.round(top)}px; expected ${Math.round(expectedTop)}px.`);
                }
                if (selectionBottom + 10 > maxToolbarTop + 1) {
                    throw new Error("Toolbar was still bottom-clamped after fitting the canvas, so normal bottom-border anchoring was not verified.");
                }
                if (verticalGap < 8 || verticalGap > 14) {
                    throw new Error(`Toolbar gap was ${Math.round(verticalGap)}px instead of the safe gap below selection.`);
                }
                let blockingTarget: Element | null = null;
                const blockedButton = Array.from(toolbar.querySelectorAll<HTMLButtonElement>("button:not([disabled])"))
                    .find((button) => {
                        const rect = button.getBoundingClientRect();
                        const hitTarget = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                        if (hitTarget && !button.contains(hitTarget)) blockingTarget = hitTarget;
                        return !hitTarget || !button.contains(hitTarget);
                });
                if (blockedButton) {
                    const blocker = describeBlockingTarget(blockingTarget);
                    throw new Error(`${getButtonName(blockedButton) || "Floating toolbar action"} is covered by ${blocker}.`);
                }
                return `Toolbar at ${Math.round(left)}, ${Math.round(top)} with ${Math.round(verticalGap)}px gap.`;
            });

            await step("Shortcut dialog traps focus and Escape restores the toolbar", async () => {
                const shortcutButton = await clickSelector("[data-creative-editor-action='shortcuts']", "shortcut button");
                const dialog = await waitFor(() => query<HTMLElement>("[data-creative-editor-dialog='shortcuts']"), "shortcut dialog");
                if (!dialog.contains(document.activeElement)) {
                    throw new Error("Shortcut dialog did not receive focus.");
                }
                await clickButtonByName("Close", "shortcut close button", "[data-creative-editor-dialog='shortcuts']");
                await waitFor(() => !query("[data-creative-editor-dialog='shortcuts']"), "shortcut dialog close button");
                if (document.activeElement !== shortcutButton) {
                    throw new Error("Shortcut Close did not restore focus to the shortcut button.");
                }
                shortcutButton.click();
                await waitFor(() => query<HTMLElement>("[data-creative-editor-dialog='shortcuts']"), "shortcut dialog reopen");
                pressEscape();
                await waitFor(() => !query("[data-creative-editor-dialog='shortcuts']"), "shortcut dialog close");
                if (document.activeElement !== shortcutButton) {
                    throw new Error("Shortcut close did not restore focus to the shortcut button.");
                }
                await waitFor(() => query<HTMLElement>("[data-creative-editor-floating-toolbar='true']"), "selection toolbar after shortcut close");
            });

            await step("Preview export opens as a PNG and Escape restores focus", async () => {
                const previewButton = await clickSelector("[data-creative-editor-action='preview']", "preview button");
                const image = await waitFor(() => {
                    const previewImage = query<HTMLImageElement>("[data-creative-editor-dialog='preview'] img");
                    return previewImage?.src.startsWith("data:image/png") ? previewImage : null;
                }, "preview image", 9000);
                if (!image.src.startsWith("data:image/png")) {
                    throw new Error("Preview did not create a PNG data URL.");
                }
                pressEscape();
                await waitFor(() => !query("[data-creative-editor-dialog='preview']"), "preview close");
                if (document.activeElement !== previewButton) {
                    throw new Error("Preview close did not restore focus to the preview button.");
                }
                return `PNG preview length ${image.src.length}.`;
            });

            await step("Layer panel opens with draggable layer rows", async () => {
                await clickSelector("[data-creative-editor-action='layers']", "layers button");
                const inspector = await waitFor(() => {
                    const panel = query<HTMLElement>("[data-creative-editor-inspector='true']");
                    return panel?.getAttribute("data-panel-mode") === "layers" ? panel : null;
                }, "layers inspector");
                const rows = Array.from(inspector.querySelectorAll<HTMLElement>("[data-creative-layer-id]"));
                if (rows.length < expectedLayerCount) {
                    throw new Error(`Expected ${expectedLayerCount} layer rows, found ${rows.length}.`);
                }
                if (!rows.some((row) => row.draggable)) {
                    throw new Error("Layer rows are not drag-enabled.");
                }
                return `${rows.length} layer rows.`;
            });

            await step("Existing image layers duplicate and delete through governed history", async () => {
                const root = await waitFor(() => query<HTMLElement>("[data-creative-editor-root='true']"), "editor root");
                await clickSelector("[data-creative-editor-action='layers']", "layers panel");
                const imageLayer = await waitFor(() => {
                    const row = query<HTMLElement>("[data-creative-layer-name='Illustration']");
                    return row?.querySelector<HTMLButtonElement>("[data-creative-editor-action='select-layer']");
                }, "Illustration layer row");
                const imageLayerId = imageLayer.closest<HTMLElement>("[data-creative-layer-id]")?.dataset.creativeLayerId;
                if (!imageLayerId) throw new Error("Illustration layer identity did not resolve.");
                imageLayer.click();
                await waitFor(() => root.getAttribute("data-creative-editor-selected-layer-id") === imageLayerId, "Illustration selection");
                const initialCount = Number(root.getAttribute("data-creative-editor-layer-count") || "0");
                await clickButtonByName("Duplicate selected layer", "duplicate image layer", "[aria-label='Selected layer actions']");
                await waitFor(() => Number(root.getAttribute("data-creative-editor-layer-count") || "0") === initialCount + 1, "duplicated image layer");
                await clickButtonByName("Delete selected layer", "delete duplicated image layer", "[aria-label='Selected layer actions']");
                await waitFor(() => Number(root.getAttribute("data-creative-editor-layer-count") || "0") === initialCount, "image duplicate cleanup");
                return `${initialCount} layers restored after image duplicate cleanup.`;
            });

            await step("Text inspector fields keep focus after value changes", async () => {
                await clickSelector("[data-creative-layer-type='text'] [data-creative-editor-action='select-layer']", "text layer row");
                await clickSelector("[data-creative-editor-action='edit-selected-layer']", "edit selected layer button");
                const textField = await waitFor(() => query<HTMLTextAreaElement>("[data-creative-editor-field='selected-text']"), "selected text field");
                textField.focus();
                setControlledValue(textField, `${textField.value}\nQA`);
                await wait(180);
                if (document.activeElement !== textField) {
                    throw new Error("Text field lost focus after editing.");
                }
                const sizeField = await waitFor(() => query<HTMLInputElement>("[data-creative-editor-field='selected-font-size']"), "selected font size field");
                sizeField.focus();
                setControlledValue(sizeField, String(Math.max(12, Number(sizeField.value || 34) + 1)));
                await wait(180);
                if (document.activeElement !== sizeField) {
                    throw new Error("Font size field lost focus after editing.");
                }
            });

            await step("Built-in artwork remains safe at download readiness", async () => {
                await clickButtonByName("Check", "download readiness check", "[data-creative-editor-inspector='true']");
                const readinessPanel = await waitFor(() => query<HTMLElement>("[data-creative-editor-readiness='true']"), "download readiness panel");
                const hasImageSourceIssue = Array.from(readinessPanel.querySelectorAll("strong"))
                    .some((label) => label.textContent?.trim() === "Image source issue");
                if (hasImageSourceIssue) {
                    throw new Error("Editor-provided artwork was flagged as an unsafe image source.");
                }
                await clickButtonByName("Close download check", "close download readiness", "[data-creative-editor-inspector='true']");
            });

            await step("Escape clears selection first, then collapses the left drawer", async () => {
                (document.activeElement as HTMLElement | null)?.blur();
                pressEscape();
                await waitFor(() => {
                    const body = query<HTMLElement>("[data-creative-editor-body='true']");
                    return body?.getAttribute("data-inspector-open") === "false" && !query("[data-creative-editor-floating-toolbar='true']");
                }, "selection clear");
                pressEscape();
                const body = await waitFor(() => {
                    const editorBody = query<HTMLElement>("[data-creative-editor-body='true']");
                    return editorBody?.getAttribute("data-drawer-collapsed") === "true" ? editorBody : null;
                }, "left drawer collapse");
                if (body.getAttribute("data-drawer-collapsed") !== "true") {
                    throw new Error("Drawer stayed open after second Escape.");
                }
            });

            const failed = nextResults.some((result) => result.status === "failed");
            commit(failed ? "failed" : "passed");
        };

        void run();
        return () => {
            cancelled = true;
            panel.remove();
        };
    }, [expectedLayerCount, variant]);

    return null;
}

export default function CreativeEditorSmokeClient({
    enableQaProbe = false,
    initialDocument,
    variant = "default",
}: {
    enableQaProbe?: boolean;
    initialDocument: CreativeEditorDocument;
    variant?: SmokeVariant;
}) {
    return (
        <>
            <CreativeEditor
                assetSources={smokeAssetSources}
                initialDocument={initialDocument}
                productLabel="Shared"
                sourceLabel={variant === "stress" ? "Internal stress smoke route" : "Internal smoke route"}
            />
            {enableQaProbe ? (
                <CreativeEditorSmokeQaProbe
                    expectedLayerCount={initialDocument.elements.length}
                    variant={variant}
                />
            ) : null}
        </>
    );
}
