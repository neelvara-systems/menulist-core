# Predictive Support — Help Documentation

> **Version:** 1.0.0
> **Last Updated:** 2026-03-10
> **Audience:** SaaS founders using Canonica

---

## What is Predictive Support?

Predictive Support shows your users contextual help before they ask a question. Instead of waiting for confusion to turn into a support ticket, the system detects known friction points and surfaces help at the right moment.

---

## How does it work?

1. Your product's Canonica widget reports which page the user is viewing
2. Canonica checks if there are known issues or common questions for that page
3. If a match is found, a small help card appears with the relevant answer
4. The user can click to read more, or dismiss the card

The system uses your actual support data (tickets, chat conversations, escalations) to learn which pages cause confusion and suggest new proactive help automatically.

---

## Setting up trigger rules

### Creating a trigger manually

1. Open the Canonica Dashboard → Governance → Trigger Rules tab
2. Click "Create Trigger"
3. Set the conditions:
   - **Page:** Which page in your product (e.g., "billing_settings")
   - **Plan:** Optional — target specific plans (e.g., "free")
   - **Role:** Optional — target specific roles (e.g., "admin")
4. Set the action:
   - **Entity:** Link to a product entity with a canonical answer
   - **Article:** Or link directly to a KB article
5. Set behavior:
   - **Priority:** 0-100 (higher = shown first if multiple triggers match)
   - **Cooldown:** How many hours before showing again to the same user
6. Save → trigger is immediately active

### Reviewing auto-generated suggestions

Canonica analyzes your support patterns nightly and may suggest new triggers for pages with high friction. These appear in the Trigger Rules tab with status "Suggested."

To review a suggestion:
1. Open the suggested trigger
2. Set the page condition (the system suggests the entity but needs you to confirm which page)
3. Approve → becomes active
4. Or reject → archived

---

## Trigger effectiveness

Each trigger tracks:
- **Impressions** — How many times it was shown
- **Clicks** — How many users engaged
- **Dismissals** — How many users closed without engaging
- **Effectiveness score** — (clicks - dismissals) / impressions

Triggers with consistently poor effectiveness (score below -0.3 after 100+ impressions) are automatically disabled to prevent annoying users.

---

## FAQ

**Q: Will this annoy my users?**
A: No. Each trigger has a cooldown period (minimum 1 hour, you set the duration). Once shown, it won't appear again until the cooldown expires. Users can dismiss it instantly.

**Q: Can I control what shows on each page?**
A: Yes. You create the rules. Auto-generated suggestions require your approval before they become active.

**Q: Does this use AI?**
A: The trigger evaluation is purely rule-based — no AI. However, the auto-suggestion feature uses your existing friction intelligence data to identify where help is needed.

**Q: What if I don't have friction data yet?**
A: You can create manual triggers right away. Auto-suggestions will appear once enough support data has accumulated (typically after a few weeks of Canonica usage).

**Q: How do I integrate this with my product?**
A: Call `window.CanonicaWidget.page({ path, feature, workflow })` from product navigation after the v1 widget script is installed. See the Widget Contract v1 install documentation for details.
