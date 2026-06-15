import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueOutput,
    CampaignCueWorkspace,
} from "@type/campaigncue";
import {
    buildCreativeEditorImageElement,
    buildCreativeEditorQrElement,
    buildCreativeEditorTextElement,
    createCreativeEditorDocument,
} from "../templates";
import type {
    CreativeEditorAssetSource,
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorSourceRef,
    CreativeEditorTextPlaceholder,
} from "../types";

const getCampaignCueBrandColor = (businessBrain: CampaignCueBusinessBrain) => (
    businessBrain.brandKit.primaryColor || "#24564d"
);

const getCampaignCueDestination = (businessBrain: CampaignCueBusinessBrain, output?: CampaignCueOutput) => (
    output?.fields.destination
    || businessBrain.contacts.bookingUrl
    || businessBrain.contacts.publicMenuUrl
    || businessBrain.contacts.website
    || businessBrain.contacts.whatsapp
    || businessBrain.contacts.phone
    || "https://campaigncue.ai"
);

const campaignCueSourceRefs = (params: {
    campaign?: CampaignCueCampaign;
    output?: CampaignCueOutput;
}): CreativeEditorSourceRef[] => {
    const outputRefs = params.output?.sourceReferences || [];
    const campaignRefs = params.campaign?.sourceSnapshotId ? [params.campaign.sourceSnapshotId] : [];
    return Array.from(new Set([...outputRefs, ...campaignRefs])).map((sourceRef) => ({
        campaignId: params.campaign?.id,
        channel: params.output?.channel,
        label: sourceRef,
        outputId: params.output?.id,
        productId: "campaigncue",
        sourceRef,
    }));
};

const compactPlaceholders = (placeholders: CreativeEditorTextPlaceholder[]) => {
    const seen = new Set<string>();
    return placeholders
        .map((placeholder) => ({
            ...placeholder,
            value: placeholder.value.trim(),
        }))
        .filter((placeholder) => {
            if (!placeholder.value) return false;
            const key = `${placeholder.label}:${placeholder.value}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 14);
};

const buildCampaignCueTextPlaceholders = (params: {
    businessBrain: CampaignCueBusinessBrain;
    campaign?: CampaignCueCampaign;
    output?: CampaignCueOutput;
}): CreativeEditorTextPlaceholder[] => compactPlaceholders([
    {
        id: "business-name",
        label: "Business name",
        sourceRef: "business_profile",
        value: params.businessBrain.name,
    },
    {
        id: "locality",
        label: "Location",
        sourceRef: "business_profile",
        value: params.businessBrain.locality || "",
    },
    {
        id: "phone",
        label: "Phone",
        sourceRef: "contact",
        value: params.businessBrain.contacts.phone || "",
    },
    {
        id: "website",
        label: "Website",
        sourceRef: "contact",
        value: params.businessBrain.contacts.website || "",
    },
    {
        id: "booking-link",
        label: "Booking link",
        sourceRef: "contact",
        value: params.businessBrain.contacts.bookingUrl || "",
    },
    {
        id: "menu-link",
        label: "Menu link",
        sourceRef: "contact",
        value: params.businessBrain.contacts.publicMenuUrl || "",
    },
    {
        id: "campaign-title",
        label: "Campaign title",
        sourceRef: params.campaign?.id,
        value: params.campaign?.title || "",
    },
    {
        id: "headline",
        label: "Headline",
        sourceRef: params.output?.id,
        value: params.output?.fields.headline || "",
    },
    {
        id: "body",
        label: "Body",
        sourceRef: params.output?.id,
        value: params.output?.fields.body || params.output?.text || "",
    },
    {
        id: "cta",
        label: "Call to action",
        sourceRef: params.output?.id,
        value: params.output?.fields.cta || "",
    },
    {
        id: "destination",
        label: "Destination",
        sourceRef: params.output?.id,
        value: getCampaignCueDestination(params.businessBrain, params.output),
    },
]);

export function buildCampaignCueBlankCreativeDocument(params: {
    businessBrain: CampaignCueBusinessBrain;
    workspace: CampaignCueWorkspace;
}): CreativeEditorDocument {
    const brandColor = getCampaignCueBrandColor(params.businessBrain);
    const documentValue = createCreativeEditorDocument({
        brandName: params.businessBrain.name,
        primaryColor: brandColor,
        productContext: {
            productId: "campaigncue",
            sourceSurface: "asset-library",
            workspaceId: params.workspace.workspaceId,
        },
        title: `${params.businessBrain.name} asset`,
    });
    const destination = getCampaignCueDestination(params.businessBrain);
    return {
        ...documentValue,
        elements: documentValue.elements.map((element) => (
            element.type === "qr" ? { ...element, value: destination } : element
        )),
        metadata: {
            ...documentValue.metadata,
            brand: {
                accentColor: "#f6d365",
                fontFamily: "Inter, Arial, sans-serif",
                logoUrl: params.businessBrain.brandKit.logoUrl,
                name: params.businessBrain.name,
                primaryColor: brandColor,
                secondaryColor: "#16231f",
                voice: params.businessBrain.brandKit.voice,
            },
            textPlaceholders: buildCampaignCueTextPlaceholders({
                businessBrain: params.businessBrain,
            }),
        },
    };
}

export function buildCampaignCueOutputCreativeDocument(params: {
    businessBrain: CampaignCueBusinessBrain;
    campaign: CampaignCueCampaign;
    output: CampaignCueOutput;
    workspace: CampaignCueWorkspace;
}): CreativeEditorDocument {
    const brandColor = getCampaignCueBrandColor(params.businessBrain);
    const destination = getCampaignCueDestination(params.businessBrain, params.output);
    const sourceRefs = campaignCueSourceRefs({ campaign: params.campaign, output: params.output });
    const headline = params.output.fields.headline || params.campaign.title;
    const body = params.output.fields.body || params.output.text;
    const elements: CreativeEditorElement[] = [
        {
            ...buildCreativeEditorTextElement(headline),
            color: "#16231f",
            fontSize: 58,
            height: 170,
            name: "Headline",
            sourceRefs,
            width: 720,
            x: 88,
            y: 118,
        },
        {
            ...buildCreativeEditorTextElement(body),
            color: "#40524d",
            fontSize: 28,
            fontWeight: "600",
            height: 250,
            name: "Body",
            sourceRefs,
            width: 620,
            x: 90,
            y: 330,
        },
        {
            fill: brandColor,
            height: 230,
            id: `cc_visual_${Date.now().toString(36)}`,
            name: "Offer block",
            opacity: 1,
            radius: 28,
            stroke: "transparent",
            strokeWidth: 0,
            type: "rect",
            visible: true,
            width: 390,
            x: 600,
            y: 680,
        },
        {
            ...buildCreativeEditorTextElement(params.output.fields.cta || "Order now"),
            align: "center",
            color: "#ffffff",
            fontSize: 34,
            height: 90,
            name: "Call to action",
            sourceRefs,
            width: 320,
            x: 635,
            y: 760,
        },
        {
            ...buildCreativeEditorQrElement(destination),
            height: 160,
            name: "Destination QR",
            sourceRefs,
            width: 160,
            x: 92,
            y: 825,
        },
    ];
    if (params.businessBrain.brandKit.logoUrl) {
        elements.unshift({
            ...buildCreativeEditorImageElement({
                name: "Logo",
                src: params.businessBrain.brandKit.logoUrl,
                x: 850,
                y: 84,
            }),
            height: 120,
            width: 120,
        });
    }

    return {
        canvas: {
            backgroundColor: "#fffdfa",
            height: 1080,
            width: 1080,
        },
        elements,
        id: `cc_editor_${params.campaign.id}_${params.output.id}`,
        metadata: {
            brand: {
                accentColor: "#f6d365",
                fontFamily: "Inter, Arial, sans-serif",
                logoUrl: params.businessBrain.brandKit.logoUrl,
                name: params.businessBrain.name,
                primaryColor: brandColor,
                secondaryColor: "#16231f",
                voice: params.businessBrain.brandKit.voice,
            },
            campaignId: params.campaign.id,
            channel: params.output.channel,
            outputId: params.output.id,
            sourceRefs,
            templateId: "campaigncue-output-square",
            textPlaceholders: buildCampaignCueTextPlaceholders({
                businessBrain: params.businessBrain,
                campaign: params.campaign,
                output: params.output,
            }),
            trustGate: params.output.trustGate,
        },
        productContext: {
            productId: "campaigncue",
            sourceSurface: "campaign-output",
            workspaceId: params.workspace.workspaceId,
        },
        schemaVersion: "creative-editor.v1",
        title: `${params.campaign.title} ${params.output.channel} asset`,
    };
}

export function buildCampaignCueCreativeAssetSources(params: {
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
}): CreativeEditorAssetSource[] {
    const logo = params.businessBrain.brandKit.logoUrl
        ? [{
            id: "campaigncue_business_logo",
            label: "Business logo",
            sourceRef: "business_brand_kit",
            type: "logo" as const,
            url: params.businessBrain.brandKit.logoUrl,
        }]
        : [];
    const assetSources = params.assets
        .filter((asset) => asset.status === "ready")
        .filter((asset) => asset.assetType === "image" || asset.assetType === "logo")
        .filter((asset) => Boolean(asset.file?.downloadUrl))
        .map((asset) => ({
            id: asset.id,
            label: asset.name,
            sourceRef: asset.id,
            type: asset.assetType === "logo" ? "logo" as const : "image" as const,
            url: asset.file!.downloadUrl!,
        }));
    return [...logo, ...assetSources].slice(0, 12);
}
