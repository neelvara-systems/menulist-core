# External Menu Sync — Help Documentation

> **Document Type:** Customer-facing help article
> **Audience:** Existing customers (restaurant/salon/spa owners, non-technical)
> **Language:** Zero jargon. Written for non-tech Indian SMB owners.
> **Status:** Implemented
> **Last Updated:** June 11, 2026
> **Version:** 2.3

---

## Quick Summary

External Menu Sync lets MenuList safely share official business updates with trusted connected systems. You edit once in MenuList, and your provider, developer, agency, website, or ordering system can receive the latest approved information.

MenuList remains the source of truth. Connected systems receive updates from MenuList, but they cannot overwrite your official business information.

You can ignore this section if you do not use external integrations.

---

## Getting Started

### What You Need Before Starting

- A published menu in MenuList
- A provider, developer, agency, website, or ordering system that asked to connect
- The provider connection URL they gave you

### First-Time Setup

1. Go to **Business Settings** in your MenuList dashboard
2. Scroll down to the **External Menu Sync** section
3. Read **Who should use this?**
   > Use it only when your provider, developer, or agency asked to connect another system.
4. Turn ON the **Enable External Sync** toggle
   > A verification secret will be created automatically. It is hidden by default. Use **Reveal** only when needed, or click **Copy** to share it with your provider.
5. Enter your **Provider connection URL** in the text field
   > This URL comes from your provider. If you don't have it, see "How to get your provider connection URL" below.
6. Click **Test connection** to check the connection
7. If you see "Connection reachable" — you're done. Approved menu changes can now reach the connected system automatically.
   > 📸 **Screenshot:** Show the External Menu Sync tab with all fields filled and "Connection reachable" success message.

---

## How-To Guides

### How to get your provider connection URL

If you don't know your provider connection URL, you have two options:

**Option A: Ask your provider**

1. Contact your provider's support team
2. Ask them: "I need a webhook URL to receive updates from MenuList"
3. They will give you a URL like `https://provider.example.com/webhook/menu`

**Option B: Share setup instructions from MenuList**

1. In the External Menu Sync section, find **Share setup instructions with your provider or developer**
2. Enter your provider's email address
3. Click **Send**
4. MenuList opens an email draft with the setup information and tracks the handoff
5. Review the draft and send it from your own email app
   > You can prepare up to 3 provider email drafts per day.
   > 📸 **Screenshot:** Show the "Send Instructions" section with email field and send button.

### How to test your connection

1. Go to **Business Settings** → **External Menu Sync**
2. Click **Test connection**
3. Wait a few seconds
4. You'll see one of two results:
   - **"Connection reachable"** — The connected system is ready to receive menu updates
   - **"Could not reach connected system"** — Check your URL or contact your provider
     > 📸 **Screenshot:** Show both success and failure states of the test button.

### How to check delivery status

1. Go to **Business Settings** → **External Menu Sync**
2. Look at the **Delivery Status** section:
   - **Last delivery:** Shows when the last menu update was sent
   - **Status:** Shows if it was successful
   - **Menu version:** Shows which version of your menu was sent
3. Below that, **Updates sent** shows the last 20 deliveries with time, status, and response
   > 📸 **Screenshot:** Show delivery status section and recent deliveries table.

### How to share setup info with your provider via WhatsApp

1. In the External Menu Sync section, click **Copy setup details**
2. Open WhatsApp and paste the copied text to your provider
3. The message includes everything they need: a link to documentation and a brief explanation

### How to download a sample menu file for your provider

1. In the External Menu Sync section, click **Download sample update file**
2. A JSON file will download to your computer
3. Send this file to your provider — they can use it to test their setup

### How to change your secret key

If you need a new secret key (for example, if the old one was shared accidentally):

1. Go to **Business Settings** → **External Menu Sync**
2. Click **Regenerate** next to the verification secret
3. Confirm in the popup
4. A new key will be created
5. **Important:** Share the new key with your provider. The old key will stop working immediately.

---

## Troubleshooting / FAQ

### The connected system is not receiving menu updates

**Why this happens:** The most common reasons are: wrong provider connection URL, provider server is down, or the secret key doesn't match.

**How to fix it:**

1. Go to **Business Settings** → **External Menu Sync**
2. Check if the status shows "Connection issue"
3. Click **Test connection** to check the connection
4. If the test fails:
   - Verify the provider connection URL is correct (no extra spaces, correct `https://`)
   - Contact your provider to confirm their server is running
   - Make sure they're using the correct secret key
5. If the test succeeds, the next menu change will sync normally
   > If none of this works, contact your provider first. MenuList sends the data — they need to confirm they're receiving it.

### I see "Connection issue" in my External Menu Sync status

**Why this happens:** MenuList tried to send a menu update but couldn’t reach the connected system. It marked the connection as having issues to alert you.

**How to fix it:**

1. Check with your provider if their server is working
2. Once they confirm it's fixed, click **Test connection** in MenuList
3. If the test succeeds, the status will change back to "Connected"
4. The next menu change will sync normally

### I changed my menu but the connected system didn't update

**Why this happens:** MenuList waits about 25 seconds after your last edit before sending. This prevents sending many updates when you’re making several changes at once.

**How to fix it:**

1. Wait 1 minute after your last edit
2. Check the **Updates sent** section — you should see a new entry
3. If the delivery shows "Success" but the connected system didn't update, contact your provider — the issue is on their side

### The connected system shows old prices

**Why this happens:** Either the delivery failed (check delivery status) or the connected system is not processing the updates correctly.

**How to fix it:**

1. Check **Updates sent** — was the latest delivery successful?
2. If successful: Contact your provider. MenuList sent the correct menu — they need to apply it.
3. If failed: Follow the "The connected system is not receiving menu updates" steps above.

### Can I use this with multiple outlets?

**Yes.** Each outlet connects to its own external system independently:

1. Switch to the outlet you want to configure (using the store switcher)
2. Go to **Business Settings** → **External Menu Sync**
3. Set up the provider connection URL for that outlet's connected system
4. Repeat for each outlet

Each outlet can use a different connected system.

---

## Tips & Best Practices

- **Test before relying on it** — Always click "Test connection" after entering your provider connection URL. This catches most problems immediately.
- **Don't worry about it** — Once set up and tested, External Menu Sync runs silently. You don't need to check it regularly.
- **Share setup instructions with your provider** — If your provider doesn't know how to connect, use the setup instructions feature. It gives them everything they need.
- **One change at a time** — If you're making many menu changes, finish all your edits first. MenuList waits for you to finish before sending one combined update.
- **Keep your secret key private** — Don't share it publicly. Only share it with your provider.

---

## Related Features

- **[Multi-Outlet Management]** — Manage multiple outlets from one account. Each outlet can have its own External Menu Sync configuration.
- **[Menu Editor]** — Where you make menu changes that trigger external updates.
- **[Business Settings]** — Where External Menu Sync and other store settings are configured.

---

## Need More Help?

If you're having trouble with External Menu Sync:

1. **Check this guide** — Most issues are covered in the Troubleshooting section above
2. **Contact your provider** — If MenuList shows "Success" but the connected system isn't updated, the issue is on their side
3. **Contact MenuList support** — Email us or reach out via WhatsApp if you need further assistance

---

**Document Signature:** Customer Help Documentation
**Author:** Cascade + Founder
**Last Updated:** May 23, 2026
