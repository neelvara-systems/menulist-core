# Embed KB - How it works

- Endpoint: `POST /api/helpCenter/embed-kb`
  - Body: `{ "id": "<articleId>" }`
- Admin-only: verifies Firebase ID token and `admin` claim.
- Loads article, extracts text, generates embedding via Gemini, updates `kb_articles.{id}.embedding`.

Use this when you update article content and need to refresh the vector.
