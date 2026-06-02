# Menu Extraction Pipeline — Website

**Status:** Internal infrastructure
**Last Updated:** June 2, 2026

No new website claim is required. Public `/create-menu` behavior stays the same from the owner's perspective: upload or paste a menu source, wait for preview, then claim/publish after sign-in.

Implementation truth: public extraction is now queued durably through `menuImageProcessingJobs` instead of running AI work inside the public API request.

