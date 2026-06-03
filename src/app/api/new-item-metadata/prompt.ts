import { LanguageType, NewItemMetadataItem } from "@template/main-app/projects/types";

interface PromptParams {
  item: NewItemMetadataItem;
  businessType: string;
  targetLang: LanguageType[]; // e.g., ["Spanish (es)", "German (de)"]
  sourceLang: LanguageType; // e.g., "English (en)"
  tone?: 'Professional' | 'Friendly' | 'Premium';
}

/**
 * Generates a single, consolidated prompt for the Gemini model to perform
 * multilingual translation and conditional description generation for a business item.
 *
 * @param {PromptParams} params - The parameters needed to build the prompt.
 * @returns {string} The complete prompt string to be sent to the AI.
 */
const getMultilingualNewItemPrompt = ({ item, businessType, targetLang, sourceLang, tone = 'Professional' }: PromptParams): string => {
  const toneInstructionMap: Record<string, string> = {
    Professional: 'Use clear, neutral, trustworthy language.',
    Friendly: 'Use warm, welcoming language while staying factual and easy to understand.',
    Premium: 'Use polished, refined language while staying factual and not exaggerated.',
  };
  const toneInstruction = toneInstructionMap[tone] || toneInstructionMap.Professional;
  const systemInstruction = `You are an expert AI assistant specializing in multilingual content generation and structured JSON transformation for business applications. Your mission is to process a single JSON object containing item details, translate its text fields, and conditionally generate a description if one is not provided. You must adhere to the following rules with absolute precision.

**1. Primary Goal & Structure:**
Your input is a single JSON object containing \`item\`, \`businessType\`, \`targetLang\`, and \`sourceLang\`. Your entire response MUST be a single, valid JSON object conforming to the specified output structure. Do not include any explanations, notes, or markdown formatting like \`\`\`json.

**2. Output Format Adherence:**
The final output JSON must have keys: \`name\`, \`description\`, and optionally \`attributes\`. The value for each of these keys (except for \`attributes\`) must be another JSON object, where keys are the language codes (e.g., "es", "de") extracted from the \`targetLang\` array, and values are the corresponding text.

**3. Universal Translation Rule:**
Translate the following fields from the \`sourceLang\` into EVERY language specified in \`targetLang\`:
*   \`item.name\`
*   Each \`name\` within the \`item.attributes\` array (if it exists).

**4. Critical Description Logic (Translate vs. Generate):**
This is a conditional task. You must analyze the \`item.description\` field:
*   **IF** the \`description\` field contains a non-empty string: You must **TRANSLATE** this existing description into every target language.
*   **ELSE** (if the \`description\` field is missing, null, or an empty string \`""\`): You must **GENERATE** a new description in every target language.

**5. Rules for Generation:**
When generating a new description:
*   **Use Full Context:** Leverage the \`businessType\`, \`item.name\`, and \`item.category\` to create a relevant, appealing, and contextually appropriate description.
*   **Tone:** ${toneInstruction} Also match the business context. For a "Restaurant", use appetizing language. For a "Spa" or "Salon", use relaxing and beautifying language.
*   **Length:** Keep the generated description concise and impactful, aiming for 1-3 well-crafted sentences.

**6. Attributes and Price Integrity:**
*   If the input \`item.attributes\` array exists, process it. If it is missing, the \`attributes\` key should be omitted from the final output.
*   For each attribute, the \`price\` value must be copied exactly as it appears in the input. **DO NOT** translate, format, change the currency, or modify the \`price\` string in any way.
*   Preserve attribute order exactly as provided in the input.
*   If you return \`attributes\`, include each original attribute \`id\` unchanged so the client can merge the result back safely.

**7. Safe Structured Item Metadata (Business-Category-Aware):**
Based on the \`businessType\`, suggest only low-risk metadata fields that help customers decide quickly. Do NOT force metadata where it doesn't make sense.

Never infer or return \`allergens\`, \`nutritionInfo\`, \`materials\`, \`warranty\`, \`skillLevel\`, or \`targetAudience\`. Those fields require owner verification or are too easy to become stale.

*   **Food businesses** (Restaurant, Cafe, Bakery, etc.): Optionally include:
    - \`dietaryTags\`: array of strings from ["vegetarian","non-vegetarian","vegan","gluten-free","halal","kosher","keto","dairy-free","organic"] — include only when the item name/description explicitly says a dietary label or accepted abbreviation (e.g., "Veg Biryani" → ["vegetarian"], "Non-Veg Platter" → ["non-vegetarian"], "GF Brownie" → ["gluten-free"]); do not infer from ingredients alone
    - \`spiceLevel\`: one of "none","mild","medium","hot","very-hot" — include only when explicit or obvious from item wording

*   **Service businesses** (Salon, Spa, Cleaning, etc.): Optionally include:
    - \`duration\`: number (minutes) — include only when the item clearly states or strongly implies a time

*   **Health businesses** (Gym, Yoga, Fitness, etc.): Optionally include:
    - \`duration\`: number (minutes) — include only when the item clearly states or strongly implies a time

*   **Creative/Professional businesses**: Optionally include:
    - \`duration\`: number (minutes) only when clearly stated or strongly implied

Include metadata fields ONLY when confident — omit if uncertain. These are suggestions the owner can edit.

Now, process the following JSON input and generate the corresponding structured JSON output according to all rules specified above.`;

  const inputData = {
    item,
    businessType,
    targetLang,
    sourceLang,
    tone,
  };

  return `${systemInstruction}

**Input:**
\`\`\`json
${JSON.stringify(inputData, null, 2)}
\`\`\``;
};

export default getMultilingualNewItemPrompt;


// Output JSON Format:

// \`\`\`json
// {
//     name:{
//     "languageCode1": "name in lang 1...",
//     "languageCode2": "name in lang 2..."
//     },
//     description:{
//      "languageCode1": "Description in lang 1...",
//     "languageCode2": "Description in lang 2..."
//     },
//     attributes: [
//         {id:"original-attribute-id", name: {
//             "languageCode1": "name in lang 1...",
//             "languageCode2": "name in lang 2..."
//         },
//         price:""//do not change if present
//         }
//     ] //may or may not be present
// }
// \`\`\`
