import { IMAGE_VIEW_TYPES } from "@template/main-app/projects/editorView/AiImageGenerator/imageViewType";
import { GenerateImageViaApiPayloadItemDetailsType } from "@template/main-app/projects/types";
import { logImageEditingPromptFailure } from "./diagnostics";
import { sanitizeImageEditingItemDetails } from "./promptInput";

function replacePlaceholders(promptTemplate: string, itemDetails: GenerateImageViaApiPayloadItemDetailsType): string {
    let populatedPrompt = promptTemplate;
    const safeItemDetails = sanitizeImageEditingItemDetails(itemDetails);

    // Replace required placeholders if the details exist
    if (safeItemDetails.name) {
        populatedPrompt = populatedPrompt.replace(/\[Item\/Service Name,.*?\]/g, safeItemDetails.name);
    }
    if (safeItemDetails.category) {
        populatedPrompt = populatedPrompt.replace(/\[Category Name,.*?\]/g, safeItemDetails.category);
    }

    // Handle the optional description placeholder with more robust logic
    if (safeItemDetails.description && safeItemDetails.description.trim() !== '') {
        // If a description exists, replace the placeholder with it.
        populatedPrompt = populatedPrompt.replace(/\[Optional Description:.*?\]/g, safeItemDetails.description);
    } else {
        // If no description exists, remove the placeholder and its surrounding sentence structure cleanly.
        // This regex looks for an optional preceding space, the placeholder, and an optional trailing period.
        populatedPrompt = populatedPrompt.replace(/\s?\[Optional Description:.*?\]\.?/g, '');
    }

    // Final cleanup: remove any leftover placeholders and extra whitespace.
    populatedPrompt = populatedPrompt.replace(/\[.*?\]/g, '').replace(/\s\s+/g, ' ').trim();

    return populatedPrompt;
}

export default function getBusinessSpecificPrompt(businessType: string, featureName: string, itemDetails: GenerateImageViaApiPayloadItemDetailsType): string | null {

    const business = IMAGE_VIEW_TYPES.find((b) => b.businessType === businessType);
    if (!business) {
        logImageEditingPromptFailure("image_editing_business_type_not_found", undefined, {
            businessType,
            knownBusinessTypeCount: IMAGE_VIEW_TYPES.length,
        });
        return null;
    }

    // NOTE: This assumes your data structure keys are `business.features` and `feature.name`.
    // Please adjust these if your actual keys are different.
    const feature = business.editingFeatures.find((f) => f.featureName === featureName);
    if (!feature) {
        logImageEditingPromptFailure("image_editing_feature_not_found", undefined, {
            businessType,
            feature: featureName,
            configuredFeatureCount: business.editingFeatures.length,
        });
        return null;
    }

    // --- 3. Assemble the Dynamic Prompt using the Master Template ---
    const coreTaskDescription = replacePlaceholders(feature.prompt, itemDetails);


    // Get the persona directly from the business object. Provide a safe default.
    const personaDescription = business.persona || "General Commercial Photography.";

    const masterPromptTemplate = `
        You are a world-class AI Photo Editor acting as a specialist for a specific business type.

        **Your Assigned Role:**
        - **Business Type:** {business_type}
        - **Your Persona:** {persona_description}

        **The Client's Request:**
        - **Selected Feature:** "{feature_name}"
        - **Goal:** To create a new, enhanced image from a user-provided original. The original image must NEVER be altered.

        **--- DETAILED TASK BRIEF ---**
        {core_task_description}
        **--- END OF BRIEF ---**

        **Mandatory Execution Rules:**
        1.  **Strict Adherence:** You must follow the DETAILED TASK BRIEF precisely. Do not deviate or add your own creative interpretation unless the brief allows for it.
        2.  **Photorealism is Key:** The resulting image must look like a real, high-quality photograph. It must be indistinguishable from professional photography. Avoid any hint of an artificial or "AI-generated" look.
        3.  **Preserve Subject Integrity:** The core subject of the original photo (the dish, the person's identity, the product model) must remain recognizable and authentic. Do not change its fundamental structure unless the brief explicitly commands it.
        4.  **Context is Everything:** Remember your assigned persona and the business type. A "Restaurant" image should feel appetizing; a "Spa" image should feel serene. Let this context guide the subtlety of your execution.

        Generate the new, enhanced image now.
        `;

    const finalPrompt = masterPromptTemplate
        .replace('{business_type}', business.businessType) // <-- Added this
        .replace('{persona_description}', personaDescription)
        .replace('{feature_name}', feature.featureName) // Pass the feature name directly
        .replace('{core_task_description}', coreTaskDescription);

    return finalPrompt;
}
