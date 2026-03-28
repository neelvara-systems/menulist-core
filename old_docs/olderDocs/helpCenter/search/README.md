# Search KB - How it works

- Endpoint: `POST /api/helpCenter/search-kb`
  - Body: `{ "query": "I have a billing issue", "category": "Billing" }`
- Server:
  - Embeds query via Gemini.
  - Fetches up to 500 published `kb_articles` (filtered by category if provided).
  - Computes cosine similarity between query embedding and article embedding.
  - Returns top 12 results with `id`, `title`, `category`, `snippet`, `score`.

Snippets are generated from content blocks and truncated for display.
