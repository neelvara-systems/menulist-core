/**
 * Generates the master prompt for previewing a tattoo.
 * Handles two cases:
 * 1. Tattoo Design + Body Photo (2 images): Places the design on the provided photo.
 * 2. Tattoo Design only + Descriptive Prompt (1 image): Generates a model and places the design.
 * @param userPrompt The user's specific instruction. Must not be null or empty.
 * @param hasSecondImage A boolean indicating if the user uploaded a body part photo.
 * @returns The complete prompt string for the AI model.
 */
export default function getTattooTryonPrompt(userPrompt: string | null, hasSecondImage: boolean): string {
    if (!userPrompt || userPrompt.trim() === '') {
        throw new Error("A descriptive prompt specifying the placement location is required for Tattoo Try-On. E.g., 'Place this on a man's forearm.'");
    }

    // --- Dynamically define the Image Roles and Core Instructions based on context ---
    const imageRoles = hasSecondImage
        ? `
**Image Roles:**
- **[Image 1 (Tattoo Design)]**: The image of the tattoo art.
- **[Image 2 (Person/Body Part)]**: The photo of the person's body where the tattoo will be placed.`
        : `
**Image Role:**
- **[Image 1 (Tattoo Design)]**: The image of the tattoo art to be placed.`;

    const coreInstructions = hasSecondImage
        ? `
1.  **Isolate Art:** Isolate the tattoo artwork from [Image 1].
2.  **Place on Provided Skin:** Execute the user's goal by placing the tattoo design onto the skin in [Image 2].
3.  **Conform to Body:** You must **warp and wrap** the flat tattoo design to follow the natural 3D contours and curves of the body part in [Image 2].`
        : `
1.  **Isolate Art:** Isolate the tattoo artwork from [Image 1].
2.  **Generate Scene:** Generate a photorealistic model and scene based on the user's goal (e.g., 'a man's hand', 'a woman's neck in a studio setting').
3.  **Place on Generated Skin:** Place the isolated tattoo design onto the generated model's skin.
4.  **Conform to Body:** You must **warp and wrap** the flat tattoo design to follow the natural 3D contours and curves of the generated body part.`;

    // --- Assemble the final, complete prompt ---
    return `You are an expert AI tattoo artist and virtual application specialist. Your task is to realistically preview a tattoo design.
${imageRoles}

**User's Goal:**
- "${userPrompt}"

**--- EXECUTION PLAN ---**

**Part 1: Core Task**
${coreInstructions}

**Part 2: Mandatory Realism Effects (Apply to the final result)**
-   **Conformation:** Ensure the tattoo does not look like a flat sticker. It must follow the body's curves.
-   **Skin Interaction:** Make the tattoo slightly semi-transparent to let the underlying skin texture show through, just like real ink.
-   **Lighting Match:** Subtly adjust the tattoo's colors, brightness, and shadows to perfectly match the lighting of the scene (whether from [Image 2] or the generated scene). A tattoo in a shadow must be darker than one in direct light.

**Part 3: Final Output**
-   The final image must be a highly believable, photorealistic preview that accurately shows how the tattoo would look.`;
}