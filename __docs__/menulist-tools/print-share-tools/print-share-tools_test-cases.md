# Print & Share Tools - Test Cases

**Last Updated:** July 4, 2026

---

| ID | Case | Expected Result |
| --- | --- | --- |
| PST-001 | Public user opens `/tools/qr-poster-maker` | Page loads without login |
| PST-002 | Public user enters business name and a valid public HTTPS URL | Browser-local asset preview renders |
| PST-003 | Public user enters invalid URL | Report marks customer link missing and evidence says public HTTPS URL format was checked locally |
| PST-003A | Public user enters `http://localhost`, private IP, raw IP, `.local`, or credentialed URL | Report marks customer link missing and the asset falls back instead of encoding that URL in the QR |
| PST-004 | Public user downloads PNG | PNG is generated from the browser-local SVG |
| PST-005 | Public user downloads PDF | PDF is generated in the browser with no server route |
| PST-006 | Public user uses Print | Browser print window opens with the generated asset |
| PST-007 | Public user copies share report link | Link points to `/tools/reports#r=` and contains no query payload |
| PST-007A | Browser blocks clipboard write | Public report URL remains visible in readonly field and Open public report still works |
| PST-008 | Feedback QR card without ethical confirmation | Report requires review before printing |
| PST-009 | Tool attempts Firestore or Storage access | Verification fails |
| PST-010 | Tool adds file upload in V0 | Verification fails |
| PST-011 | Tool fetches owner-entered URL | Verification fails |
| PST-012 | Tool claims Google, WhatsApp, social, review, search, or AI inspection | Verification fails |
| PST-013 | Tools Hub omits Print & Share Assets group | Verification fails |
| PST-014 | Sitemap or LLM context omits a public asset route | Verification fails |
| PST-015 | Page requires owner authentication | Verification fails |
