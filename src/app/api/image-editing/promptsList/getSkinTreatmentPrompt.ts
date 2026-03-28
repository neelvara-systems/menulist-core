/**
 * Generates the master prompt for skin cleanup and retouching.
 * A user prompt is mandatory to specify the goal.
 * @param userPrompt The user's specific instruction, which must not be null or empty.
 * @returns The complete prompt string for the AI model.
 */
export default function getSkinTreatmentPrompt(userPrompt: string | null): string {
    if (!userPrompt || userPrompt.trim() === '') {
        throw new Error("A prompt specifying what to remove or fix is required for skin treatment. E.g., 'Remove the blemishes on my cheek.'");
    }

    return `You are a specialist in high-end, non-destructive digital skin retouching for the beauty and spa industry. Your task is to realistically simulate the results of a skincare treatment.

**Image Role:**
- **[Image 1]**: The "before" photo of the client's skin.

**User's Goal:**
- "${userPrompt}"
- **Instruction to Model**: The user has likely provided a mask over the area of concern. Confine your edits to this area.

**Your Instructions:**
1.  This is a subtle enhancement, not an unrealistic transformation.
2.  Analyze the masked area in [Image 1], which indicates the blemish, wrinkle, or scar to be treated.
3.  **Preserve Skin Texture:** Do not make the skin look like plastic. You must fill in the targeted area while **meticulously recreating natural skin texture**, including pores. The goal is to heal the imperfection, not erase the skin.
4.  Seamlessly blend your edits with the surrounding, untreated skin. The color, tone, and lighting of the retouched patch must perfectly match the adjacent skin.
5.  The final result should look like naturally healthy skin, representing a realistic "after" photo for a skincare treatment.`;
}