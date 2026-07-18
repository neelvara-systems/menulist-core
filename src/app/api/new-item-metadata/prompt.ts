import { LanguageType, NewItemMetadataItem } from "@template/main-app/projects/types";

interface PromptParams {
  item: NewItemMetadataItem;
  businessType?: string;
  targetLang: LanguageType[]; // e.g., ["Spanish (es)", "German (de)"]
  sourceLang: LanguageType; // e.g., "English (en)"
  tone?: 'Professional' | 'Friendly' | 'Premium';
}

function sanitizeNewItemMetadataPromptText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';

  const dangerousPatterns = [
    /ignore\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?|commands?|rules?|context)/gi,
    /forget\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?|commands?|rules?|context)/gi,
    /disregard\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?|commands?|rules?)/gi,
    /override\s+(previous|above|all|prior)\s+(instructions?|prompts?|commands?|rules?)/gi,
    /new\s+(instructions?|prompts?|commands?|rules?|context)/gi,
    /system\s+(prompt|instruction|command|message)/gi,
    /you\s+are\s+(now|a|an)\s+/gi,
    /act\s+as\s+(a|an)?\s*/gi,
    /pretend\s+(you|to)\s+(are|be)/gi,
    /from\s+now\s+on/gi,
    /instead\s+of/gi,
    /translate\s+(the\s+)?(following\s+)?instructions?/gi,
  ];

  let sanitized = value;
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, ' ');
  });

  return sanitized
    .replace(/[<>{}\[\]\\|`~@#$%^*()+=;:"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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
  const systemInstruction = `You are an expert assistant specializing in multilingual content generation and structured JSON transformation for business applications. Your mission is to process a single JSON object containing item details, preserve its owner-provided identity, and generate its first description. You must adhere to the following rules with absolute precision.

**1. Primary Goal & Structure:**
Your input is a single JSON object containing \`item\`, \`businessType\`, \`targetLang\`, and \`sourceLang\`. Your entire response MUST be a single, valid JSON object conforming to the specified output structure. Do not include any explanations, notes, or markdown formatting like \`\`\`json.

**2. Output Format Adherence:**
The final output JSON must have keys: \`name\`, \`description\`, and optionally \`attributes\`. The value for each of these keys (except for \`attributes\`) must be another JSON object, where keys are the language codes (e.g., "es", "de") extracted from the \`targetLang\` array, and values are the corresponding text.

**3. Universal Translation Rule:**
Translate the following fields from the \`sourceLang\` into EVERY language specified in \`targetLang\`:
*   \`item.name\`
*   Each \`name\` within the \`item.attributes\` array (if it exists).

**4. First Description:**
The \`item.description\` field is empty. Generate a new description in EVERY language specified in \`targetLang\`. Do not invent an existing description or treat this as a rewrite operation.

**5. Rules for Generation:**
*   **Use Explicit Context Only:** Use the \`businessType\` only to understand vocabulary. Base factual content only on \`item.name\`, \`item.category\`, and the supplied attribute names.
*   **Accuracy:** Do not invent ingredients, materials, procedures, techniques, health outcomes, allergens, dietary claims, or benefits that are not explicit in the input.
*   **Tone:** ${toneInstruction} Avoid promotional, exaggerated, medical, or unverifiable language.
*   **Length:** Keep the generated description concise and clear, aiming for 1-3 well-formed sentences.

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
    - \`spiceLevel\`: one of "none","mild","medium","hot","very-hot" — include only when explicitly stated in the item wording

*   **Service businesses** (Salon, Spa, Cleaning, etc.): Optionally include:
    - \`duration\`: number (minutes) — include only when the item clearly states a duration

*   **Health businesses** (Gym, Yoga, Fitness, etc.): Optionally include:
    - \`duration\`: number (minutes) — include only when the item clearly states a duration

*   **Creative/Professional businesses**: Optionally include:
    - \`duration\`: number (minutes) only when clearly stated

Include metadata fields ONLY when confident — omit if uncertain. These are suggestions the owner can edit.

Now, process the following JSON input and generate the corresponding structured JSON output according to all rules specified above.`;

  const inputData = {
    item: {
      ...item,
      id: sanitizeNewItemMetadataPromptText(item.id, 100),
      name: sanitizeNewItemMetadataPromptText(item.name, 500),
      category: sanitizeNewItemMetadataPromptText(item.category, 100),
      description: sanitizeNewItemMetadataPromptText(item.description, 2000),
      attributes: item.attributes?.map((attribute) => ({
        ...attribute,
        id: sanitizeNewItemMetadataPromptText(attribute.id, 100),
        name: sanitizeNewItemMetadataPromptText(attribute.name, 500),
        price: sanitizeNewItemMetadataPromptText(String(attribute.price ?? ''), 120),
      })),
    },
    businessType: sanitizeNewItemMetadataPromptText(businessType, 100),
    targetLang: targetLang.map((language) => ({
      code: sanitizeNewItemMetadataPromptText(language.code, 10),
      name: sanitizeNewItemMetadataPromptText(language.name, 100),
    })),
    sourceLang: {
      code: sanitizeNewItemMetadataPromptText(sourceLang.code, 10),
      name: sanitizeNewItemMetadataPromptText(sourceLang.name, 100),
    },
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
