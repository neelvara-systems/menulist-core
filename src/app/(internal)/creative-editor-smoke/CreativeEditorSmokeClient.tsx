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
}) {
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

            await step("Floating toolbar stays below selection border", async () => {
                const stage = await waitFor(() => query<HTMLElement>("[data-creative-editor-stage='true']"), "editor stage");
                await clickSelector("[data-creative-editor-action='layers']", "layers panel");
                const centeredLayerButton = await waitFor(() => {
                    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-creative-layer-name]"));
                    const row = rows.find((candidate) => candidate.dataset.creativeLayerName === "Hexagon accent");
                    return row?.querySelector<HTMLButtonElement>("[data-creative-editor-action='select-layer']");
                }, "Hexagon accent layer row");
                centeredLayerButton.click();
                await wait(160);
                await clickButtonByName("Fit to screen", "fit canvas to screen");
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
                const maxToolbarLeft = Math.max(8, stageRect.width - toolbarRect.width - 8);
                const maxToolbarTop = Math.max(8, stageRect.height - toolbarRect.height - 8);
                const expectedLeft = Math.max(8, Math.min(maxToolbarLeft, anchorLeft - toolbarRect.width / 2));
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
                return `Toolbar at ${Math.round(left)}, ${Math.round(top)} with ${Math.round(verticalGap)}px gap.`;
            });

            await step("Shortcut dialog traps focus and Escape restores the toolbar", async () => {
                const shortcutButton = await clickSelector("[data-creative-editor-action='shortcuts']", "shortcut button");
                const dialog = await waitFor(() => query<HTMLElement>("[data-creative-editor-dialog='shortcuts']"), "shortcut dialog");
                if (!dialog.contains(document.activeElement)) {
                    throw new Error("Shortcut dialog did not receive focus.");
                }
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
                assetSources={[]}
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
