# Menu Extraction Pipeline — Website

**Status:** Internal infrastructure
**Last Updated:** June 30, 2026

No new website claim is required. Public `/create-menu` behavior stays the same from the owner's perspective: upload or paste a menu source, wait for preview, then claim/publish after sign-in.

Implementation truth: public extraction is now queued durably through `menuImageProcessingJobs` instead of running AI work inside the public API request.

Browser handoff truth: `/create-menu` upload/link creation, preview polling, and claim submission use same-origin credentials, no-store cache policy, and manual redirect handling before accepting route responses. This keeps middleware/auth/API redirects from being followed silently by the browser while preserving the existing owner-facing upload, preview, and claim flow.
