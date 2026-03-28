/**
 * Generates the master prompt for virtual clothing try-on.
 * Handles two cases:
 * 1. Apparel + Model Photo (2 images): Fits the clothing onto the provided model.
 * 2. Apparel only + Descriptive Prompt (1 image): Generates a model and scene.
 * @param userPrompt The user's specific instruction. Must not be null or empty.
 * @param hasSecondImage A boolean indicating if the user uploaded a model photo.
 * @returns The complete prompt string for the AI model.
 */
export default function getClothingTryonPrompt(userPrompt: string | null, hasSecondImage: boolean): string {
    if (!userPrompt || userPrompt.trim() === '') {
        throw new Error("A prompt is required for Clothing Try-On. E.g., 'Put this dress on the model.'");
    }

    const imageRoles = hasSecondImage
        ? `
**Image Roles:**
- **[Image 1 (Apparel)]**: This image contains the item of CLOTHING to be fitted.
- **[Image 2 (Model)]**: This image contains the specific MODEL who will wear the clothing.`
        : `
**Image Role:**
- **[Image 1 (Apparel)]**: This image contains the item of CLOTHING to be showcased.`;

    const coreInstructions = hasSecondImage
        ? `
1.  **Identify Apparel:** Identify the main item of clothing in [Image 1].
2.  **Fit on Provided Model:** The goal is to fit this clothing onto the model in [Image 2]. The final image must retain the original model's head, face, hair, and limbs.
3.  **Conform to Body:** You must **warp, drape, and conform** the clothing from [Image 1] to the model's specific body shape, pose, and posture in [Image 2].`
        : `
1.  **Identify Apparel:** Identify the main item of clothing in [Image 1].
2.  **Generate Scene & Model:** Based on the user's goal, generate a new, photorealistic scene and a suitable model (e.g., 'a male model in a city at night', 'a woman walking on a beach').
3.  **Fit on Generated Model:** The goal is to fit the clothing from [Image 1] onto the model you have just generated.
4.  **Conform to Body:** You must **warp, drape, and conform** the clothing to the generated model's body shape, pose, and posture.`;

    return `You are an expert AI fashion stylist and virtual fitting specialist. Your task is to realistically dress a model from a photo as if they were in a high-end virtual dressing room or a professional photoshoot.
${imageRoles}

**User's Goal:**
- "${userPrompt}"

**--- EXECUTION PLAN ---**

**Part 1: Core Task**
${coreInstructions}

**Part 2: Mandatory Realism Effects (Apply to the final result)**
-   **Fit and Drape:** The clothing must not look flat or like a sticker. It must follow the body's contours realistically.
-   **Fabric Realism:** Preserve the original texture, pattern, and color of the clothing, but generate realistic new **wrinkles, folds, and shadows** that are naturally caused by the pose and movement.
-   **Lighting Match:** Adjust the lighting on the clothing to perfectly match the lighting of the scene (whether from [Image 2] or the generated scene). This includes ambient light, key light, and shadows.

**Part 3: Final Output**
-   The final image must be a single, seamless, and totally believable image of a model wearing the new item of clothing. It should be of professional catalogue quality.`;
}