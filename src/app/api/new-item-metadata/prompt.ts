import { LanguageType, NewItemMetadataItem } from "@template/main-app/projects/types";

interface PromptParams {
  item: NewItemMetadataItem;
  businessType: string;
  targetLang: LanguageType[]; // e.g., ["Spanish (es)", "German (de)"]
  sourceLang: LanguageType; // e.g., "English (en)"
}

/**
 * Generates a single, consolidated prompt for the Gemini model to perform
 * multilingual translation and conditional description generation for a business item.
 *
 * @param {PromptParams} params - The parameters needed to build the prompt.
 * @returns {string} The complete prompt string to be sent to the AI.
 */
const getMultilingualNewItemPrompt = ({ item, businessType, targetLang, sourceLang }: PromptParams): string => {
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
*   **Tone:** The tone must match the business type. For a "Restaurant", use appetizing language. For a "Spa" or "Salon", use relaxing and beautifying language.
*   **Length:** Keep the generated description concise and impactful, aiming for 1-3 well-crafted sentences.

**6. Attributes and Price Integrity:**
*   If the input \`item.attributes\` array exists, process it. If it is missing, the \`attributes\` key should be omitted from the final output.
*   For each attribute, the \`price\` value must be copied exactly as it appears in the input. **DO NOT** translate, format, change the currency, or modify the \`price\` string in any way.
*   Preserve attribute order exactly as provided in the input.
*   If you return \`attributes\`, include each original attribute \`id\` unchanged so the client can merge the result back safely.

**7. Structured Item Metadata (Business-Category-Aware):**
Based on the \`businessType\`, suggest relevant metadata fields. Only include fields that are contextually appropriate — do NOT force metadata where it doesn't make sense.

*   **Food businesses** (Restaurant, Cafe, Bakery, etc.): Optionally include:
    - \`allergens\`: array of strings from ["dairy","nuts","gluten","shellfish","soy","eggs","fish","sesame","peanuts"] — infer ONLY if clearly implied by the item name/description (e.g., "Cheese Pizza" → ["dairy"])
    - \`dietaryTags\`: array of strings from ["vegetarian","vegan","gluten-free","halal","kosher","keto","dairy-free","organic"] — infer if item clearly fits (e.g., "Veg Biryani" → ["vegetarian"])
    - \`spiceLevel\`: one of "none","mild","medium","hot","very-hot" — infer if item name/description implies it

*   **Service businesses** (Salon, Spa, Cleaning, etc.): Optionally include:
    - \`duration\`: number (minutes) — suggest typical service duration if contextually clear
    - \`targetAudience\`: one of "for-men","for-women","unisex","kids","adults" — if contextually clear

*   **Health businesses** (Gym, Yoga, Fitness, etc.): Optionally include:
    - \`duration\`: number (minutes)
    - \`skillLevel\`: one of "beginner","intermediate","advanced","all-levels"
    - \`targetAudience\`: same as service

*   **Retail businesses**: Optionally include:
    - \`materials\`: string describing material if contextually clear

*   **Creative/Professional businesses**: Optionally include:
    - \`duration\`: number (minutes) if applicable

Include metadata fields ONLY when confident — omit if uncertain. These are suggestions the owner can edit.

Now, process the following JSON input and generate the corresponding structured JSON output according to all rules specified above.`;

  const inputData = {
    item,
    businessType,
    targetLang,
    sourceLang,
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
