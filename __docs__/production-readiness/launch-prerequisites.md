# Launch Prerequisites — Manual Tasks & Setup Guide

**Created:** February 20, 2026  
**Purpose:** Everything you need to do manually before enabling the monitoring systems.  
**Estimated Time:** 30-45 minutes total

---

## Step 1: Create Telegram Bot (5 minutes)

1. Open Telegram on your phone
2. Search for **@BotFather** (verified bot)
3. Send `/newbot`
4. Name it: `MenuList Ops Bot`
5. Username: `menulist_ops_bot` (or any available name)
6. **Copy the bot token** — looks like `7123456789:AAF...`
7. Create a private channel or group for alerts
8. Add the bot to that channel
9. Get your **chat ID**:
   - Send any message to the bot
   - Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   - Find `"chat":{"id": -100XXXXXXXXXX}` — that's your chat ID

**Where to store:**

```bash
# Firebase Functions secrets
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# Paste: 7123456789:AAF...

firebase functions:secrets:set TELEGRAM_CHAT_ID
# Paste: -100XXXXXXXXXX
```

---

## Step 2: Set GCP Budget Alerts (10 minutes)

1. Go to **Google Cloud Console** → Billing → Budgets & Alerts
2. Create budget: `MenuList Production`
3. Set thresholds:

| Threshold | Amount | Action                 |
| --------- | ------ | ---------------------- |
| 50%       | ₹500   | Email notification     |
| 75%       | ₹750   | Email notification     |
| 90%       | ₹900   | Email + auto SAFE_MODE |
| 100%      | ₹1000  | Email + auto SAFE_MODE |

4. **Link to auto SAFE_MODE** (optional but recommended):
   - In budget settings, check "Connect a Pub/Sub topic"
   - Create topic: `budget-alerts`
   - Create push subscription pointing to: `https://us-central1-<PROJECT_ID>.cloudfunctions.net/gcpBudgetAlertWebhook`
   - This will auto-activate SAFE_MODE when budget threshold is exceeded

---

## Step 3: Deploy Cloud Functions (5 minutes)

```bash
cd functions
firebase deploy --only functions
```

This deploys all new functions:

- `verifyMenuPublish` — post-publish health check
- `gcpBudgetAlertWebhook` — auto SAFE_MODE on budget alert
- `alertEscalation` — 30-min re-alert for unresolved critical alerts
- `forceRepublish` — admin recovery tool

---

## Step 4: Deploy Firestore Indexes (2 minutes)

```bash
firebase deploy --only firestore:indexes
```

Required for `alertEscalation` query (severity + acknowledged + timestamp).

---

## Step 5: Enable Feature Flags (2 minutes)

In `src/config/features.ts`, set these to `true` one by one:

```typescript
ENABLE_COST_PROTECTION: true,    // SAFE_MODE circuit breaker
ENABLE_OPS_ALERTS: true,         // Telegram alert delivery
ENABLE_MENU_HEALTH_MONITOR: true, // Post-publish verification
```

**Order matters:** Enable SAFE_MODE first so you have a kill switch before enabling the others.

---

## Step 6: Test Everything (10 minutes)

| Test                         | How                                                 | Expected                      |
| ---------------------------- | --------------------------------------------------- | ----------------------------- |
| Telegram works               | Visit `/ops` → Enable SAFE_MODE → Check Telegram    | You get a critical alert      |
| SAFE_MODE blocks AI          | With SAFE_MODE active, try generating a description | 503 "System maintenance"      |
| SAFE_MODE doesn't block menu | With SAFE_MODE active, load a public menu URL       | Menu loads normally           |
| Disable SAFE_MODE            | `/ops` → Disable SAFE_MODE → Try AI again           | AI works again                |
| Publish verification         | Publish any project → Check store doc in Firebase   | `health.status` field appears |
| Force republish              | `/ops` → Enter store/tenant ID → Force Republish    | Success message               |
| Alert mute                   | `/ops` → Mute 20min → Generate an error             | No Telegram message           |

---

## Step 7: SMTP Email Setup for Lifecycle Messaging (10 minutes)

> Lifecycle messaging uses nodemailer with any SMTP server. Gmail SMTP is free (500/day personal, 2000/day Workspace).

### Option A: Gmail SMTP (Recommended for launch)

1. **Enable 2-Factor Authentication** on your Google account
2. Go to **Google Account → Security → 2-Step Verification → App Passwords**
3. Generate an App Password — select "Mail" and "Other (Custom name)" → name it `MenuList Mailer`
4. **Copy the 16-character app password** (e.g., `abcd efgh ijkl mnop`)

**Store credentials in Firebase Functions secrets:**

```bash
firebase functions:secrets:set SMTP_HOST
# Enter: smtp.gmail.com

firebase functions:secrets:set SMTP_PORT
# Enter: 587

firebase functions:secrets:set SMTP_USER
# Enter: your-email@gmail.com (or your-email@yourdomain.com for Workspace)

firebase functions:secrets:set SMTP_PASS
# Enter: abcdefghijklmnop (the 16-char app password, no spaces)
```

**Also add to Next.js `.env.local` (for API route side):**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop

# Internal notifications — founder email for revenue alerts
INTERNAL_NOTIFICATION_EMAIL=your-email@gmail.com
INTERNAL_BILLING_EMAIL=your-email@gmail.com
```

### Option B: Custom SMTP (Any provider)

Use any SMTP server — the same 4 variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).

### Enable the Feature Flag

In Firestore Console, create/update document `ops_config/system`:

```json
{
  "ENABLE_LIFECYCLE_MESSAGING": true
}
```

### Gmail SMTP Limits

| Account Type     | Daily Limit      | Sufficient?                         |
| ---------------- | ---------------- | ----------------------------------- |
| Personal Gmail   | 500 emails/day   | ✅ Yes (50 stores ≈ 5 emails/day)   |
| Google Workspace | 2,000 emails/day | ✅ Yes (500 stores ≈ 50 emails/day) |

**Cost: ₹0** — Gmail SMTP is free. No API keys, no paid plans.

---

## Step 8: UptimeRobot Setup (5 minutes) — FREE

> **Why UptimeRobot if Sentry exists?** See FAQ below.

1. Go to [uptimerobot.com](https://uptimerobot.com) — create free account
2. Add monitors:

| Monitor        | URL                                          | Check Interval |
| -------------- | -------------------------------------------- | -------------- |
| MenuList Main  | `https://menulist.ai`                        | 5 min          |
| Sample Store 1 | `https://yourstore.menulist.ai`              | 5 min          |
| Sample Store 2 | `https://anotherstore.menulist.ai`           | 5 min          |
| API Health     | `https://menulist.ai/api/health` (if exists) | 5 min          |

3. Set alert contacts: your email + Telegram webhook (optional)

**Free tier:** 50 monitors, 5-minute checks. More than enough.

---

## FAQ — Your Questions Answered

### Q: If Sentry is there, why do we need UptimeRobot?

**They do completely different things:**

|                         | Sentry                                     | UptimeRobot                                |
| ----------------------- | ------------------------------------------ | ------------------------------------------ |
| **What it monitors**    | Code errors inside the app                 | Whether the site is reachable from outside |
| **When it works**       | App is running but has bugs                | App is completely down                     |
| **How it detects**      | Catches thrown errors in JS/Node           | HTTP ping from external servers            |
| **If Vercel goes down** | Sentry goes down too (it's inside the app) | UptimeRobot detects it instantly           |
| **If DNS breaks**       | Sentry can't report (site unreachable)     | UptimeRobot reports "site down"            |
| **Cost**                | Free tier: 5K events/month                 | Free tier: 50 monitors                     |

**Real scenario:** Vercel has an outage → your site returns 500 errors → Sentry might not even fire because the app didn't load → UptimeRobot pings from its servers and says "SITE DOWN."

**Bottom line:** Sentry = "is the code working?" | UptimeRobot = "is the site reachable?"

---

### Q: Why Telegram and not something else?

| Alternative                  | Why NOT for MenuList                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Slack**                    | Overkill for solo founder. Requires workspace, app setup. Designed for teams, not 1 person.             |
| **Discord**                  | Gaming-focused. Not professional for ops alerts. Same complexity as Slack.                              |
| **Email**                    | Too slow. Gets buried in inbox. No instant push notification.                                           |
| **SMS**                      | Costs money (₹0.10-0.50 per message). Adds billing complexity.                                          |
| **WhatsApp Business API**    | Requires Meta Business Manager approval, template message approval, costs per message. Way too complex. |
| **Push notifications (FCM)** | Requires building a notification UI in the app, service worker setup. Complex for ops-only alerts.      |

**Why Telegram wins:**

- **Free** — No cost for any volume of messages
- **Instant** — Push notification to your phone in <1 second
- **Simple** — Just an HTTP POST, no library needed (6 lines of code)
- **Works in India** — No geo-restrictions
- **Silent hours** — DND/mute per chat (won't wake you at 3am for P2 alerts)
- **History** — All alerts stay in the channel, searchable
- **Multiple devices** — Desktop + phone + tablet simultaneously
- **No approval process** — Create bot in 2 minutes, start sending immediately

---

## Cost Breakdown — Complete Monitoring Stack

### Firebase / Cloud Functions Cost

| System                                   | Reads/month | Writes/month | CF Invocations | Monthly Cost   |
| ---------------------------------------- | ----------- | ------------ | -------------- | -------------- |
| SAFE_MODE checks (API routes)            | ~3,000      | 0            | 0              | ~₹1            |
| Menu Health Monitor                      | ~3,000      | ~1,500       | ~1,500         | ~₹8            |
| Alert Delivery (Telegram)                | ~100        | ~100         | ~100           | ~₹0.30         |
| Deploy Mute Window                       | ~50         | ~10          | 0              | ~₹0.02         |
| Alert Escalation (scheduler)             | ~1,440      | 0            | ~1,440         | ~₹2            |
| GCP Budget Webhook                       | ~0          | ~1           | ~1             | ~₹0.00         |
| Force Republish                          | ~5          | ~5           | ~5             | ~₹0.01         |
| Ops Dashboard (2x/day)                   | ~480        | 0            | 0              | ~₹0.15         |
| Lifecycle Messaging (idempotency + logs) | ~300        | ~150         | 0              | ~₹0.05         |
| **TOTAL Firebase**                       |             |              |                | **~₹12/month** |

_Estimates based on 50 stores, 3 publishes/day average._

### Third-Party Services Cost

| Service               | What It Does                    | Plan                     | Monthly Cost |
| --------------------- | ------------------------------- | ------------------------ | ------------ |
| **Telegram Bot API**  | Alert delivery to your phone    | Free forever             | **₹0**       |
| **UptimeRobot**       | External uptime monitoring      | Free (50 monitors, 5min) | **₹0**       |
| **Sentry**            | Error tracking (already set up) | Free (5K events/month)   | **₹0**       |
| **GCP Budget Alerts** | Budget threshold notifications  | Free (built into GCP)    | **₹0**       |
| **Upstash Redis**     | Rate limiting (already set up)  | Free (10K requests/day)  | **₹0**       |
| **TOTAL Third-Party** |                                 |                          | **₹0**       |

### Grand Total

| Category                  | Monthly Cost                |
| ------------------------- | --------------------------- |
| Firebase reads/writes     | ~₹12                        |
| Cloud Functions compute   | ~₹5                         |
| Third-party services      | ₹0                          |
| **TOTAL MONITORING COST** | **~₹17/month** (~$0.20 USD) |

**At 200 stores:** ~₹50/month (~$0.60 USD)  
**At 500 stores:** ~₹120/month (~$1.40 USD)

---

## Summary: What's Automated vs Manual

| What                          | Automated? | Details                                        |
| ----------------------------- | ---------- | ---------------------------------------------- |
| Publish health check          | ✅ Auto    | Runs after every publish, writes health status |
| Telegram alerts               | ✅ Auto    | Fires on health failure, cost spike            |
| SAFE_MODE on budget spike     | ✅ Auto    | GCP → Pub/Sub → webhook → SAFE_MODE            |
| Alert escalation              | ✅ Auto    | 30-min re-alert for critical unacknowledged    |
| Create Telegram bot           | ❌ Manual  | One-time setup (5 min)                         |
| Set GCP budget alerts         | ❌ Manual  | One-time setup (10 min)                        |
| UptimeRobot setup             | ❌ Manual  | One-time setup (5 min)                         |
| Deploy functions              | ❌ Manual  | `firebase deploy --only functions`             |
| Enable feature flags          | ❌ Manual  | 3 lines in features.ts                         |
| SAFE_MODE disable after spike | ❌ Manual  | Must verify stability before re-enabling       |
| Lifecycle messaging (emails)  | ✅ Auto    | Fires on billing events, renewal reminders     |
| AI key rotation               | ✅ Auto    | Rotates on 429 errors, retries with next key   |
| SMTP setup for messaging      | ❌ Manual  | One-time setup (10 min) — Gmail or custom SMTP |
| Add extra Gemini API keys     | ❌ Manual  | Optional — add 2-3 extra keys for high traffic |

---

## Step 9: AI Key Rotation Setup (5 minutes) — OPTIONAL

> Only needed if you expect high concurrent AI usage (100+ simultaneous users).
> With a single key, the gateway still provides retry + backoff protection.

### Add Extra Gemini API Keys

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create 2-3 additional API keys (same project is fine)
3. Store in Firebase Functions secrets:

```bash
firebase functions:secrets:set GEMINI_AI_KEY_2
# Paste: AIza...

firebase functions:secrets:set GEMINI_AI_KEY_3
# Paste: AIza...

firebase functions:secrets:set GEMINI_AI_KEY_4
# Paste: AIza...
```

4. Add to Vercel environment variables (same key names)
5. Redeploy both CF and Vercel

**How it works:** The KeyManager auto-discovers available keys at startup. On 429 rate limit errors, it rotates to the next healthy key and retries immediately. Keys that hit rate limits get a 60s→120s→5min exponential cooldown.

**Cost: ₹0** — Google AI Studio API keys are free to create. You pay per API call, not per key.

---

**Version History:**

| Version | Date              | Changes                                                                    |
| ------- | ----------------- | -------------------------------------------------------------------------- |
| 1.0     | February 20, 2026 | Initial prerequisites guide                                                |
| 1.1     | February 20, 2026 | Added Step 7: SMTP email setup for lifecycle messaging, updated cost table |
| 1.2     | March 13, 2026    | Added Step 9: AI key rotation setup for multi-key Gemini protection        |
