# Menu Extraction Pipeline — Mobile Support

**Status:** Implemented
**Last Updated:** June 2, 2026

Mobile upload keeps the same owner flow:

1. Prepare selected files.
2. Upload files to Storage.
3. Run menu-intake identity preflight and show the same owner decision sheet.
4. Pass `identityOverrideConfirmed` to the shared job helper when the owner accepts a warning.
5. Track the returned job ID as before.

Mobile does not use a separate extraction DAL. `src/components/mobile/sheets/MenuUploadSheet.tsx` calls the same `createProcessingJob()` helper used by desktop.

