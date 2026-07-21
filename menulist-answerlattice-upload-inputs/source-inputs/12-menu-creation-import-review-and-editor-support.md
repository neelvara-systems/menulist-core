# MenuList Menu Creation, Import, Review, And Editor Support

**Verified:** 2026-07-20 against current extraction, editor, pricing, AI content, project save/publish, MobileShell, and cache behavior.

## Core Truth

In MenuList, menus are managed as Projects. An owner can create a project, upload a menu file or image, import from an existing public menu link, review extracted content, edit items, and keep the customer-facing menu current.

MenuList should never treat extracted or imported content as unquestionably correct. Owners must review and fix the draft before relying on it.

## Supported Menu Inputs

- Menu photos.
- Menu PDFs.
- Manual item entry.
- Public menu pages.
- Business homepages that link to a menu, service list, catalog, or rate card on the same website.
- Direct PDF links.
- Direct image links.
- Public QR menu destination links.

## Not Supported For Link Import

- Links that require login.
- Blocked pages.
- Delivery app pages.
- CAPTCHA pages.
- Links where the menu appears only after choosing a location, signing in, or opening another company's website.

## Owner Workflow

1. Open Projects or the create-menu flow.
2. Create a project/menu.
3. Upload a photo/PDF, import a public menu link, or add items manually.
4. Wait for extraction/import processing.
5. Review the draft.
6. Edit names, categories, prices, descriptions, availability, and images.
7. Save changes.
8. Preview the customer menu.
9. Publish or keep the active menu current according to the current project state.

## Editor Support Topics

Owners can:

- update item prices;
- mark items available or sold out;
- add or remove items;
- reorder items and categories;
- update descriptions;
- upload or adjust item images;
- change design settings in preview/customization areas;
- add languages where enabled;
- use Menu Command Center for bulk price, availability, visibility, and category changes.

## Menu Command Center Safety

The Command Center is for bulk changes. It includes preview before apply, confirmation, price limits, no zero/negative prices, and short undo for the last action.

## Content Preparation And AI Menu Manager

Owner-reviewed content preparation can include first descriptions, description rewrites, translations, generated images, image edits, and extracted menu structure. The flow must keep these distinctions:

- extraction and first-pass setup operations can be platform-absorbed;
- eligible premium operations show exact required credits before starting;
- valid provider output does not become public truth until the owner accepts and saves it;
- terminal paid-operation failure restores the exact reserved credit buckets;
- partial provider results cannot be presented as a fully saved menu;
- raw prompts, generated response bodies, base64 images, provider costs, and private identifiers do not belong in owner Transactions or support answers.

AI Menu Manager sits over registered MenuList operations. It can answer selected-menu questions and prepare supported proposal cards. The owner approves required work; stale or conflicting proposals fail instead of overwriting newer menu truth. It is not a generic autonomous chatbot.

## Answerlattice Answer Boundary

Answerlattice can guide owners through the steps. It must not guarantee that imported content is perfect, and it must not tell owners that review is unnecessary.

If an owner reports wrong extracted data, Answerlattice should advise them to correct it in the editor and escalate repeated extraction quality issues with the source file/link.

If generated content is wrong, advise review/edit/discard or retry. Do not tell the owner that generated text, translation, image, allergen, price, or availability is verified merely because the provider returned it.
