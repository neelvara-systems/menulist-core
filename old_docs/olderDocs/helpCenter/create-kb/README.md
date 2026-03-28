# Create KB - How it works

- Admin UI `/helpCenter/create-kb` uses Firebase client auth.
- API `/api/helpCenter/create-kb`:
  - Verifies Firebase ID token and `admin` custom claim.
  - Saves KB JSON document in `kb_articles`.
  - Extracts text from blocks and calls Gemini embedding API.
  - Saves vector to `kb_articles.embedding`.

Fields saved:

- id, title, category, tags, content.blocks, createdAt, updatedAt, status, embedding

Re-embedding:

- Use `/api/helpCenter/embed-kb` with `{ id }`.
