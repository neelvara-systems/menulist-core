import { IMAGE_VIEW_TYPES } from "@template/main-app/projects/editorView/AiImageGenerator/imageViewType";
import { GenerateImageViaApiPayloadItemDetailsType } from "@template/main-app/projects/types";
import { UserUploadedFileType } from "@type/common";

function replacePlaceholders(promptTemplate: string, itemDetails: GenerateImageViaApiPayloadItemDetailsType): string {
    let populatedPrompt = promptTemplate;

    // Replace required placeholders if the details exist
    if (itemDetails.name) {
        populatedPrompt = populatedPrompt.replace(/\[Item\/Service Name,.*?\]/g, itemDetails.name);
    }
    if (itemDetails.category) {
        populatedPrompt = populatedPrompt.replace(/\[Category Name,.*?\]/g, itemDetails.category);
    }

    // Handle the optional description placeholder with more robust logic
    if (itemDetails.description && itemDetails.description.trim() !== '') {
        // If a description exists, replace the placeholder with it.
        populatedPrompt = populatedPrompt.replace(/\[Optional Description:.*?\]/g, itemDetails.description);
    } else {
        // If no description exists, remove the placeholder and its surrounding sentence structure cleanly.
        // This regex looks for an optional preceding space, the placeholder, and an optional trailing period.
        populatedPrompt = populatedPrompt.replace(/\s?\[Optional Description:.*?\]\.?/g, '');
    }

    // Final cleanup: remove any leftover placeholders and extra whitespace.
    populatedPrompt = populatedPrompt.replace(/\[.*?\]/g, '').replace(/\s\s+/g, ' ').trim();

    return populatedPrompt;
}

export function generateImageEditingPrompt(
    businessType: string,
    generationConfig: {
        prompt: string;
        referanceImage: UserUploadedFileType | null;
        feature?: string;
        promptImages?: UserUploadedFileType[] | null;
    },
    itemDetails: GenerateImageViaApiPayloadItemDetailsType, // Parameter retained for API compatibility.
): string | null {

    const featureName = generationConfig.feature;
    const userPrompt = generationConfig.prompt;
    const promptImages = generationConfig.promptImages;
    // --- 1. Handle Special Cases for Generic Tools ---
    // These are universal tools that have their own dedicated, detailed prompts.

    if (promptImages && promptImages.length > 0) {
        return `
      You are a sophisticated AI image editor. Your task is to precisely combine two images based on a user's instruction.
      You will be given two images:
      - \`[Image 1]\`: The first image uploaded by the user.
      - \`[Image 2]\`: The second image uploaded by the user.
      You will also be given a specific goal from the user.
      **User's Goal:** "${userPrompt}"
      **Your Instructions:**
      1. Analyze the **User's Goal** to understand the relationship and the required action between \`[Image 1]\` and \`[Image 2]\`.
      2. Identify which image is the subject/object and which is the canvas/model based on the user's goal.
      3. Generate a new, photorealistic image that strictly and accurately executes the user's goal.
      4. Preserve the key features of the original images as directed. For example, if asked to place an object, do not change the object's appearance. If asked to place an object on a person, realistically adjust for fit, drape, lighting, and shadows.
      5. Do not introduce any random elements not mentioned in the prompt or shown in the images. The final output must be a seamless and believable composition.
    `
    }

    if (featureName === "Custom Prompt") {
        return `You are an expert AI Photo Editor. Your task is to generate a NEW image based on the user's uploaded original and their specific instructions. The original image must NEVER be altered.
        User Instructions: "${userPrompt}"`;
    }

    if (featureName === "Enhance Image") {
        return `You are a world-class AI Photo Editor specializing in image enhancement and upscaling. Your task is to generate a NEW, enhanced version of the uploaded image, improving its clarity, color, and resolution, while preserving its original characteristics. The original image must never be altered.

        Follow these steps to create the new, enhanced image:
        1.  **Analyze Image Type:** First, determine if the image is a photograph or a digital illustration/graphic. Apply the following steps accordingly.
        2.  **Improve Clarity & Definition:**
            *   **For Photos:** Subtly increase sharpness to enhance textures and details.
            *   **For Illustrations:** Sharpen the edges of lines and shapes to make them crisp and clean.
        3.  **Enhance Existing Colors:**
            *   Slightly increase the vibrancy and richness of the colors **already present** in the image.
            *   Maintain the original color palette and harmony. **Do not introduce new colors or drastically shift hues.**
        4.  **Preserve Integrity:**
            *   Maintain the original composition, artistic style, and line work.
            *   For images with transparency, ensure the final output is a PNG with a fully transparent background.
        5.  **Intelligent Upscaling & Denoising:** Increase the image resolution and remove any noise or compression artifacts without damaging the original details.
`;
    }

    if (featureName === "Remove Background") {
        return `
      You are a hyper-realistic AI digital artist specializing in high-fidelity object replication. Your sole function is to create a perfect, photorealistic duplicate of an image's primary subject and place it on a transparent background. Your output must be indistinguishable from a professional, hand-masked cutout.

**CRUCIAL OUTPUT REQUIREMENT: NON-NEGOTIABLE**
The final output MUST be a PNG image with a true alpha channel for transparency. The background MUST be transparent, not solid white or any other color.

**--- Your Internal Thought Process ---**

Before generating, you will follow this exact thought process to define your task:

**Step 1: "What am I looking at?"**
Analyze the image content. Is it a photograph of food? A person? A product? A graphic illustration?

**Step 2: "What is the 'Cohesive Subject' here?"**
Based on your analysis, define the complete subject using these rules:
*   If it's food on a plate, bowl, or platter, the Cohesive Subject is **the plate AND everything on it.**
*   If it's a person or animal, the Cohesive Subject is **the person/animal AND any clothes they are wearing or objects they are holding.**
*   If it's a product or graphic, the Cohesive Subject is **the entire product or graphic composition.**
*   The background is the surface or environment behind this Cohesive Subject.

**--- Your Execution Plan ---**

You will now execute the following plan:

1.  **Identify the Cohesive Subject:** Based on your thought process above, lock in your understanding of the complete subject.
2.  **Generate a High-Fidelity Replica:** Generate a NEW image that is a photorealistic, high-fidelity, pixel-perfect replica of ONLY that Cohesive Subject. It must look identical to the original subject in texture, lighting, color, and detail.
3.  **Place on Transparent Canvas:** Place this new, perfect replica on a completely transparent canvas.
4.  **Final Quality Check:** Before outputting, ask yourself: "Does my final image look like a perfect clone of the original subject? Is the background 100% transparent and not white?" If not, repeat the process until it is perfect.
5.  **Output as PNG:** Deliver the final image as a PNG with a fully transparent alpha channel.
        `;
    }

    // --- 2. Main Logic for Feature-Specific Prompts ---

    const business = IMAGE_VIEW_TYPES.find((b) => b.businessType === businessType);
    if (!business) {
        console.error(`Error: Business type "${businessType}" not found.`);
        return null;
    }

    // NOTE: This assumes your data structure keys are `business.features` and `feature.name`.
    // Please adjust these if your actual keys are different.
    const feature = business.editingFeatures.find((f) => f.featureName === featureName);
    if (!feature) {
        console.error(`Error: Feature "${featureName}" not found for business type "${businessType}".`);
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