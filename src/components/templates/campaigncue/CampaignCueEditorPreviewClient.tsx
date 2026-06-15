"use client";

import dynamic from "next/dynamic";
import { CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTIONS } from "@constant/campaigncue/creativeEditorAiTools";
import { CAMPAIGNCUE_DESIGN_CUE_COMMANDS } from "@constant/campaigncue/designCue";
import { runCampaignCueCreativeEditorAiTool } from "@lib/campaigncue/creativeEditorAiTools";
import { applyCampaignCueDesignCuePatchSet } from "@lib/campaigncue/design-cue/apply";
import { runCampaignCueDesignCue } from "@lib/campaigncue/design-cue/intent";
import { createCreativeEditorDocument } from "@/modules/creative-editor/templates";
import type {
    CreativeEditorAiToolHandler,
    CreativeEditorDesignCueApplyHandler,
    CreativeEditorDesignCueHandler,
    CreativeEditorDocument,
} from "@/modules/creative-editor/types";

const CreativeEditor = dynamic(() => import("@/modules/creative-editor/CreativeEditor"), {
    ssr: false,
    loading: () => <div style={{ color: "#ededed", padding: 24 }}>Loading editor...</div>,
});

const TEST_ASSET_SOURCES = [
    {
        id: "campaigncue-mark",
        label: "CampaignCue mark",
        type: "logo" as const,
        url: "/campaigncue-icon.svg",
    },
];

const buildCampaignCueEditorTestDocument = (): CreativeEditorDocument => ({
    ...createCreativeEditorDocument({
        backgroundColor: "#E7FDCB",
        brandName: "Green Table Cafe",
        elements: [],
        height: 1350,
        primaryColor: "#e7792b",
        productContext: {
            productId: "campaigncue",
            sourceSurface: "campaigncue-editor-test",
            workspaceId: "local-editor-test",
        },
        title: "CampaignCue editor test",
        width: 1080,
    }),
    title: "CampaignCue editor test",
});

const runLocalCampaignCueAiTool: CreativeEditorAiToolHandler = async (request) => (
    runCampaignCueCreativeEditorAiTool({
        actionId: request.actionId,
        document: request.document,
        overview: null,
        selectedElement: request.selectedElement,
        selectedText: request.selectedText,
    })
);

const runLocalDesignCue: CreativeEditorDesignCueHandler = async (request) => (
    runCampaignCueDesignCue({
        ...request,
        overview: null,
    })
);

const applyLocalDesignCue: CreativeEditorDesignCueApplyHandler = async (request) => (
    applyCampaignCueDesignCuePatchSet(request)
);

export default function CampaignCueEditorPreviewClient() {
    return (
        <main style={{ background: "#202020", minHeight: "100vh" }}>
            <CreativeEditor
                assetSources={TEST_ASSET_SOURCES}
                aiToolActions={CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTIONS}
                designCueCommands={CAMPAIGNCUE_DESIGN_CUE_COMMANDS}
                initialDocument={buildCampaignCueEditorTestDocument()}
                onAiToolAction={runLocalCampaignCueAiTool}
                onDesignCueApply={applyLocalDesignCue}
                onDesignCueRequest={runLocalDesignCue}
                productLabel="ecoms.ai"
                sourceLabel="Editor test"
            />
        </main>
    );
}
