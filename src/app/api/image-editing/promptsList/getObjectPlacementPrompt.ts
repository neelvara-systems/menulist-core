/**
 * Generates the master prompt for placing an object into a scene.
 * A descriptive user prompt is mandatory for this use case.
 * @param userPrompt The user's specific instruction, which must not be null or empty.
 * @returns The complete prompt string for the AI model.
 */
export default function getObjectPlacementPrompt(userPrompt: string | null): string {
    if (!userPrompt || userPrompt.trim() === '') {
        throw new Error("A descriptive prompt is required for Object Placement. E.g., 'Place the lamp on the bedside table.'");
    }

    return `You are a master of photorealistic composition and product staging. Your task is to place an object into a scene with absolute realism.

**Image Roles:**
- **[Image 1 (Object)]**: This image contains the primary OBJECT to be placed.
- **[Image 2 (Scene/Background)]**: This is the background scene or surface.

**User's Goal:**
- "${userPrompt}"

**Your Instructions:**
1.  Isolate the main object from [Image 1].
2.  Use [Image 2] as the static, final background. Maintain its original camera angle, perspective, and composition.
3.  Execute the user's goal by placing the object from [Image 1] onto a surface within [Image 2].
4.  The placement must be photorealistic. The object's scale and perspective must correctly match the scene.
5.  Generate realistic interactions with the environment. This includes:
    - **Casting an accurate shadow** from the object onto the surface, matching the direction and softness of the light sources in [Image 2].
    - **Creating subtle reflections** or color bleed onto the object from the surface it's sitting on.
6.  The final output must be a single, seamless, and believable composite image that could be used for professional advertising.`;
}