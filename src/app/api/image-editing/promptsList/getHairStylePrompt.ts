/**
 * Generates the master prompt for changing hair color or style.
 * A specific user prompt is mandatory for this use case.
 * @param userPrompt The user's specific instruction, which must not be null or empty.
 * @returns The complete prompt string for the AI model.
 */
export default function getHairStylePrompt(userPrompt: string | null): string {
    if (!userPrompt || userPrompt.trim() === '') {
        throw new Error("A specific goal is required for Hair Styling. E.g., 'Change my hair to cherry red' or 'Give me this bob haircut.'");
    }

    return `You are an expert AI hair stylist and digital colorist. Your task is to realistically alter the hair of a person in a photo, providing a virtual preview for a salon client.

**Image Roles:**
- **[Image 1 (Person)]**: The photo of the person whose hair will be changed.
- **[Image 2 (Reference - Optional)]**: An optional image showing the target hair color or style.

**User's Goal:**
- "${userPrompt}"

**Your Instructions:**
1.  Precisely identify the hair on the person in [Image 1]. You must isolate it from the face, neck, and background.
2.  **Preserve Identity:** The person's face, skin tone, and facial features must remain completely unchanged.
3.  **Preserve Texture:** Maintain the original hair's texture, waviness, or curl pattern unless the goal is to change the style itself.
4.  **Execute the Change:**
    - If changing **color**, apply the new color specified in the user's goal. The result must have realistic variations in tone, highlights, and lowlights, just like real hair dye. It should not be a flat, single color.
    - If applying a new **style** from [Image 2] or a description, you must seamlessly blend the new hairstyle onto the person's head, fitting it to their head shape and face.
5.  **Maintain Lighting:** The new hair must perfectly match the lighting of the original photo in [Image 1]. Shadows and highlights on the hair must align with the light sources in the scene.
6.  The final output must be a highly realistic, salon-quality preview that the person can use to make a decision.`;
}