# AI Image Generation — Help Documentation

**Status:** Source-backed owner guidance; target release QA remains pending
**Last Updated:** August 31, 2026

## Quick Summary
Prepare image drafts for selected menu items where the feature, plan, credits, provider, and safety checks allow. Review each draft before using it on a customer-facing menu.

---

## Getting Started

### Prerequisites
- A menu project with items already extracted or entered
- Items should have names (descriptions help improve image quality)
- Image generation must be enabled for your workspace, and enough credits must be available for the request

---

## How-To Guides

### How to generate an image for one item
1. Go to **Projects** → select your project → **Editor**
2. Find the item you want an image for
3. Click the **image area** (or camera icon) on the item
4. Click **Generate Image** if the option is available
5. Wait for the draft to finish processing; timing depends on provider status and current queue behavior
6. Review the draft against the real item
7. If it matches the item, click **Use This Image**
8. If not, keep the existing image or try again where credits and provider status allow

> 📸 **Screenshot:** Image generation modal with preview and accept/reject buttons

### How to prepare a supported batch
1. Go to your project → **Editor**
2. Click the **Bulk Generate** option if it is available in the image upload modal
3. Choose 1–50 supported items to include
4. Click **Start Generation**
5. Watch progress as the selected items are processed
6. Review each result before applying it
7. Save only the images that match the real business and menu item

> 💡 **Tip:** Batch size, processing time, and retry behavior depend on the current release, credits, provider status, and safety checks.

### How to generate a menu or business cover
1. Open the menu settings or Official Business Page settings
2. Find the menu image or business cover section
3. Choose **Generate** if the option is available
4. Review the prepared preview against the real business
5. Adjust or replace it if needed, then save

A missing menu cover may also be prepared after accepted menu extraction truth. An existing owner image always has priority and must not be overwritten by a late generated result.

### How to edit a generated image
1. Click on an existing image in the Editor
2. Click **Edit Image** if image editing is available
3. Describe what you want changed (e.g., "make the plate white", "add garnish")
4. Wait for the edited draft
5. Review and accept only if the result matches the real item

---

## Troubleshooting

### "Rate limit exceeded" error
**Why:** Image generation is rate-limited to protect credits and provider capacity.
**Fix:** Wait and try again, or reduce the batch size if you are preparing several items.

### Generated image doesn't look like my dish
**Why:** The system generates based on the item name and description. Generic names like "Special #3" give generic results.
**Fix:** Add a descriptive name ("Butter Chicken with Naan") and a short description.

### Bulk generation stopped partway through
**Why:** One or more item tasks exhausted retries, were rate limited, or hit a temporary provider/service issue.
**Fix:** Progress already recorded remains visible. Save any suitable available images, then use **Save Available & Retry** or **Retry Job** to start a new job for the failed items.

### Generate or Edit is not shown
**Why:** The master feature flag is off for the deployed release, or the current owner/location does not have permission under the active outlet policy.
**Fix:** Upload and manage existing photos instead. Existing batch results remain available for review; contact the workspace owner if the action should be enabled.

### Image draft does not match the item
**Fix:** 
1. Make sure your item has a clear, descriptive name
2. Add a description if there isn't one
3. Keep the existing image or generate another draft where credits and provider status allow

---

## Tips
- 💡 Descriptive item names = better images ("Grilled Salmon with Lemon Butter" > "Fish")
- 💡 Add descriptions before generating — they can improve the prompt context
- 💡 Use supported batch generation for selected groups of items when available
- 💡 You can always replace a generated image with your own photo later
- 💡 Review generated drafts before applying them to the public menu

## Keep the same person across image drafts

1. Open an item or service and choose **Generate Photo**.
2. On the desktop owner app, under **Saved person**, choose **Add person**.
3. Add two to four clear photos of the same adult. Front, three-quarter, and side views work best.
4. Enter a short internal label. Do not use confidential identity details.
5. Confirm that you have permission to use the photos for commercial image generation and that the person is not a public figure.
6. Save and select the person, then generate the draft.
7. Review the person's appearance and the service details before saving any result.

For salons, spas, tattoo studios, gyms, fashion, and photography businesses, this option appears as a recommended consistency step. For other businesses, open **Include a saved person** only when a person is relevant to that item.

On desktop, use **Rename** to change the private label. Use **Update photos** to replace all two to four references; you must confirm permission again, and older in-progress generations pinned to the previous version will ask you to choose the person again.

Use **Withdraw permission** to stop all new generations with that profile. Use **Delete saved person** to remove its private source photos. Previously accepted catalog images are not removed automatically; review and replace those separately when needed.

Before starting, the button shows the maximum content credits for the requested photos. Credits are charged only for photos that complete successfully. If generation fails, MenuList shows a safe recovery message instead of treating the request as an empty successful result.

On mobile, you can select or clear an existing active saved person while generating. Create, withdraw, and delete saved people from the desktop owner app because those actions include multi-photo consent and privacy governance.

## Related Features
- **[Data Editor]** — Where you view and manage item images
- **[Description Generation]** — Prepare descriptions that may improve image prompt context
- **[Upload & File Processing]** — Upload your own photos instead of generating

## Need More Help?
- **Email:** support@menulist.ai
- **In-app:** Click the help icon in your dashboard
