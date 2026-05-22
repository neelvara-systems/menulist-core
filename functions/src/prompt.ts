// functions/src/prompt.ts

export const constructKbGenerationPrompt = (): string => {
  return `
You are an expert technical writer and content strategist tasked with creating a structured knowledge base from the provided source materials.

**Primary Goal:** Analyze all provided files (videos, PDFs, etc.) and generate a comprehensive, well-organized knowledge base.

**Output Specification:**
- You MUST output a single, valid JSON object. Do not include any text or markdown formatting before or after the JSON object.
- The root of the object must be a map of category objects, where each key is a unique, temporary ID that you generate (e.g., "temp_cat_123").

**JSON Schema & Structural Rules:**

The root object is a map where keys are temporary IDs and values are Category Objects.

1.  **Category Object**:
    - "id": (string) A unique temporary ID.
    - "title": (string) The high-level topic.
    - "description": (string) A brief description.
    - "articles": (array of Article Objects, optional)
    - "sections": (array of Section Objects, optional)

2.  **Section Object**:
    - "id": (string) A unique temporary ID.
    - "title": (string) The title of the sub-group.
    - "description": (string) A brief description.
    - "articles": (array of Article Objects)

3.  **Article Object**:
    - "id": (string) A unique temporary ID.
    - "title": (string) A concise, descriptive title.
    - "content": (object) A valid Tiptap JSON object for the article's body.
    - **"sources": (array of Source Objects) - A new, mandatory top-level array.**
    - "faqs": (array of FAQ Objects, optional) Short customer questions answered by this article. Use only when the source clearly supports the answer. Maximum 5 FAQs per article.

4.  **Source Object** (must be included in the 'sources' array for each article):
    - "type": (string) The type of the source file. Must be one of: 'video', 'pdf', 'image', 'document', 'web'.
    - "url": (string) The exact gs:// URI of the source file.
    - "name": (string) The original, user-friendly filename of the source.
    - "timestamp": (string, optional) If the source is a video, provide the relevant 'HH:MM:SS' timestamp. Omit if not applicable.
    - "page": (number, optional) If the source is a PDF or document, provide the relevant page number. Omit if not applicable.

5.  **FAQ Object** (optional, nested in an Article Object):
    - "question": (string) A direct customer question, max 160 characters.
    - "answer": (string) A concise answer fully supported by the article/source, max 600 characters.
    - "tags": (array of strings, optional) Topic tags such as billing, setup, plan, integration.
    - "contextKeys": (array of strings, optional) Stable product surface keys if obvious from the source, such as billing_invoices.


**CRITICAL RULE:** A Category Object MUST contain EITHER "articles" OR "sections", but NEVER both.

**CRITICAL REQUIREMENT FOR SOURCES:**
- For each Article Object you generate, you MUST also generate a top-level **"sources"** array.
- This array must contain one or more Source Objects, detailing every source file that contributed to that article's content.
- The Tiptap "content" object should **NO LONGER** contain any "provenance" attributes. That data has been moved to the top-level "sources" array.

**Example of a complete Article Object:**
\`\`\`json
{
  "id": "temp_art_456",
  "title": "How to Update Your Billing Information",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "You can update your credit card from the main dashboard by navigating to the billing settings."
          }
        ]
      }
    ]
  },
  "sources": [
    {
      "type": "video",
      "url": "gs://my-bucket/uploads/billing_walkthrough.mp4",
      "name": "billing_walkthrough.mp4",
      "timestamp": "00:02:31"
    },
    {
      "type": "pdf",
      "url": "gs://my-bucket/uploads/billing_faq.pdf",
      "name": "billing_faq.pdf",
      "page": 5
      }
  ],
  "faqs": [
    {
      "question": "How do I update my billing information?",
      "answer": "Open Billing from the dashboard, update the payment method, then retry any unpaid invoice.",
      "tags": ["billing"],
      "contextKeys": ["billing"]
    }
  ]
}
\`\`\`

**Instructions:**
- Adhere strictly to the JSON schema and all critical rules.
- Do not invent information. All content must be traceable to the source files.
- Generate FAQs only for direct, source-backed questions. Do not create speculative FAQs.
- Keep FAQ answers short. The article remains the detailed source of truth.
- Ensure the final output is a single, raw JSON object, ready for parsing.
`;
};


// export const constructKbGenerationPrompt = (): string => {
//   return `
// You are an expert technical writer and content strategist tasked with creating a structured knowledge base from the provided source materials.

// **Primary Goal:** Analyze all provided files (videos, PDFs, etc.) and generate a comprehensive, well-organized knowledge base.

// **Output Specification:**
// - You MUST output a single, valid JSON object. Do not include any text or markdown formatting before or after the JSON object.
// - The root of the object must be a map of category objects, where each key is a unique, temporary ID that you generate (e.g., "temp_cat_123").

// **JSON Schema & Structural Rules:**

// The root object is a map where keys are temporary IDs and values are Category Objects.

// 1.  **Category Object**:
//     - "id": (string) A unique temporary ID you generate for the category (must match the key in the root map).
//     - "title": (string) The high-level topic.
//     - "description": (string) A brief description of the category.
//     - "articles": (array of Article Objects, optional) Use for simple categories.
//     - "sections": (array of Section Objects, optional) Use for complex categories.

// 2.  **Section Object** (if "sections" is present):
//     - "id": (string) A unique temporary ID you generate for the section.
//     - "title": (string) The title of the sub-group.
//     - "description": (string) A brief description of the section.
//     - "articles": (array of Article Objects) An array of article objects belonging to this section.

// 3.  **Article Object**:
//     - "id": (string) A unique temporary ID you generate for the article.
//     - "title": (string) A concise, descriptive title for the article.
//     - "content": (object) A valid Tiptap JSON object for the article's body.

// **CRITICAL RULE:** A Category Object MUST contain EITHER "articles" OR "sections", but NEVER both.
// - If a category's articles can be listed directly, use the "articles" array.
// - If a category's articles need to be grouped, use the "sections" array, and place the articles inside the "articles" array of each section.

// **content (Tiptap JSON Object):**
// - The structure must be: { "type": "doc", "content": [...] }
// - **CRITICAL REQUIREMENT:** Every block-level node inside the main 'content' array (e.g., paragraphs, headings, list items) MUST have a 'provenance' attribute.
// - The 'provenance' attribute is an object that traces the information back to its source.
// - **Provenance Schema:** { "sourceFile": "gs://path/to/original/file", "timestamp": "HH:MM:SS" (optional) }
//   - 'sourceFile': The exact gs:// URI of the source file the information was derived from.
//   - 'timestamp': If the source is a video, provide the relevant timestamp. Omit for non-video sources.

// **Example of a single Tiptap paragraph node with provenance:**

// json
// {
//   "type": "paragraph",
//   "attrs": {
//     "provenance": {
//       "sourceFile": "gs://my-bucket/uploads/tutorial.mp4",
//       "timestamp": "00:02:31"
//     }
//   },
//   "content": [
//     {
//       "type": "text",
//       "text": "To begin, open the settings panel from the main dashboard."
//     }
//   ]
// }


// **Instructions:**
// - Adhere strictly to the JSON schema and the critical structural rule.
// - Synthesize information from all provided files to create a cohesive knowledge base.
// - Do not invent information. Every piece of content must be traceable to the source files via the 'provenance' attribute.
// - Create logical, user-friendly categories and sections.
// - Ensure the final output is a single, raw JSON object, ready for parsing.
// `;
// };
