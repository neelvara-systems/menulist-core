# POS Sync — Help Documentation

> **Document Type:** Customer-facing help article
> **Audience:** Existing customers (restaurant/salon/spa owners, non-technical)
> **Language:** Zero jargon. Written for non-tech Indian SMB owners.
> **Status:** Implemented
> **Last Updated:** February 14, 2026
> **Version:** 2.0

---

## Quick Summary

POS Sync automatically sends your updated menu to your POS system whenever you make changes in MenuList. You edit once — your POS updates on its own. No manual work needed.

---

## Getting Started

### What You Need Before Starting

- A published menu in MenuList
- A POS system that accepts webhooks (most modern POS systems do)
- The webhook URL from your POS provider (they can give you this)

### First-Time Setup

1. Go to **Business Settings** in your MenuList dashboard
2. Scroll down to the **POS Sync** section (or click "POS Sync" in the left menu)
3. Turn ON the **Enable POS Sync** toggle
   > A secret key will be created automatically. You'll need this later — click **Copy** to save it.
4. Enter your **POS Webhook URL** in the text field
   > This URL comes from your POS provider. If you don't have it, see "How to get your webhook URL" below.
5. Click **Send Test** to check the connection
6. If you see "Webhook reachable" — you're done. Menu changes will now reach your POS automatically.
   > 📸 **Screenshot:** Show the POS Sync tab with all fields filled and "Webhook reachable" success message.

---

## How-To Guides

### How to get your webhook URL

If you don't know your POS webhook URL, you have two options:

**Option A: Ask your POS provider**

1. Contact your POS provider's support team
2. Ask them: "I need a webhook URL to receive menu updates from MenuList"
3. They will give you a URL like `https://your-pos.com/webhook/menu`

**Option B: Send setup instructions from MenuList**

1. In the POS Sync section, find **Send setup instructions to POS provider**
2. Enter your POS provider's email address
3. Click **Send Instructions**
4. MenuList will prepare the setup information and track the send
5. Share the technical summary and sample payload with your POS provider directly
   > You can send up to 3 instruction emails per day.
   > 📸 **Screenshot:** Show the "Send Instructions" section with email field and send button.

### How to test your connection

1. Go to **Business Settings** → **POS Sync**
2. Click **Send Test**
3. Wait a few seconds
4. You'll see one of two results:
   - **"Webhook reachable"** — Your POS is ready to receive menu updates
   - **"Could not reach webhook"** — Check your URL or contact your POS provider
     > 📸 **Screenshot:** Show both success and failure states of the test button.

### How to check delivery status

1. Go to **Business Settings** → **POS Sync**
2. Look at the **Delivery Status** section:
   - **Last delivery:** Shows when the last menu update was sent
   - **Status:** Shows if it was successful
   - **Menu version:** Shows which version of your menu was sent
3. Below that, **Recent Deliveries** shows the last 20 deliveries with time, status, and response
   > 📸 **Screenshot:** Show delivery status section and recent deliveries table.

### How to share setup info with your POS vendor via WhatsApp

1. In the POS Sync section, click **Copy Technical Summary**
2. Open WhatsApp and paste the copied text to your POS vendor
3. The message includes everything they need: a link to documentation and a brief explanation

### How to download a sample menu file for your POS vendor

1. In the POS Sync section, click **Download Sample Payload**
2. A JSON file will download to your computer
3. Send this file to your POS vendor — they can use it to test their setup

### How to change your secret key

If you need a new secret key (for example, if the old one was shared accidentally):

1. Go to **Business Settings** → **POS Sync**
2. Click **Regenerate** next to the Signing Secret
3. Confirm in the popup
4. A new key will be created
5. **Important:** Share the new key with your POS provider. The old key will stop working immediately.

---

## Troubleshooting / FAQ

### My POS is not receiving menu updates

**Why this happens:** The most common reasons are: wrong webhook URL, POS server is down, or the secret key doesn't match.

**How to fix it:**

1. Go to **Business Settings** → **POS Sync**
2. Check if the status shows "Connection issue"
3. Click **Send Test** to check the connection
4. If the test fails:
   - Verify the webhook URL is correct (no extra spaces, correct `https://`)
   - Contact your POS provider to confirm their server is running
   - Make sure they're using the correct secret key
5. If the test succeeds, the next menu change will sync normally
   > If none of this works, contact your POS provider first. MenuList sends the data — they need to confirm they're receiving it.

### I see "Connection issue" in my POS Sync status

**Why this happens:** MenuList tried to send a menu update but couldn’t reach your POS. It marked the connection as having issues to alert you.

**How to fix it:**

1. Check with your POS provider if their server is working
2. Once they confirm it's fixed, click **Send Test** in MenuList
3. If the test succeeds, the status will change back to "Connected"
4. The next menu change will sync normally

### I changed my menu but POS didn't update

**Why this happens:** MenuList waits about 25 seconds after your last edit before sending. This prevents sending many updates when you’re making several changes at once.

**How to fix it:**

1. Wait 1 minute after your last edit
2. Check the **Recent Deliveries** section — you should see a new entry
3. If the delivery shows "Success" but POS didn't update, contact your POS provider — the issue is on their side

### My POS shows old prices

**Why this happens:** Either the delivery failed (check delivery status) or your POS is not processing the updates correctly.

**How to fix it:**

1. Check **Recent Deliveries** — was the latest delivery successful?
2. If successful: Contact your POS provider. MenuList sent the correct menu — they need to apply it.
3. If failed: Follow the "My POS is not receiving menu updates" steps above.

### Can I use this with multiple outlets?

**Yes.** Each outlet connects to its own POS independently:

1. Switch to the outlet you want to configure (using the store switcher)
2. Go to **Business Settings** → **POS Sync**
3. Set up the webhook URL for that outlet's POS
4. Repeat for each outlet

Each outlet can use a different POS system.

---

## Tips & Best Practices

- **Test before relying on it** — Always click "Send Test" after entering your webhook URL. This catches most problems immediately.
- **Don't worry about it** — Once set up and tested, POS Sync runs silently. You don't need to check it regularly.
- **Send instructions to your POS vendor** — If your POS vendor doesn't know how to set up a webhook, use the "Send Instructions" feature. It gives them everything they need.
- **One change at a time** — If you're making many menu changes, finish all your edits first. MenuList waits for you to finish before sending one combined update.
- **Keep your secret key private** — Don't share it publicly. Only share it with your POS provider.

---

## Related Features

- **[Multi-Outlet Management]** — Manage multiple outlets from one account. Each outlet can have its own POS Sync configuration.
- **[Menu Editor]** — Where you make menu changes that trigger POS updates.
- **[Business Settings]** — Where POS Sync and other store settings are configured.

---

## Need More Help?

If you're having trouble with POS Sync:

1. **Check this guide** — Most issues are covered in the Troubleshooting section above
2. **Contact your POS provider** — If MenuList shows "Success" but POS isn't updated, the issue is on their side
3. **Contact MenuList support** — Email us or reach out via WhatsApp if you need further assistance

---

**Document Signature:** Customer Help Documentation
**Author:** Cascade + Founder
**Last Updated:** February 14, 2026
