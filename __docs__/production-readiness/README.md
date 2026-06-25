# Production Readiness Checklist

**Status:** 📝 ACTIVE — Use before launch  
**Priority:** 🟡 P2 — Reference checklist  
**Created:** February 20, 2026  
**Source:** ChatGPT launch infra review → Cascade critical review  
**Governance:** Constitution §13 — Operational Infrastructure Doctrine

---

## Purpose

Structured pre-launch verification checklist. Run through each section before onboarding real SMB users. Items marked ✅ are already confirmed. Items marked ☐ need verification.

---

## 1. Infrastructure & Hosting

| Check | Status | Notes |
|-------|--------|-------|
| Vercel production deployment active | ☐ | Verify at vercel.com |
| Custom domain configured (menulist.ai) | ☐ | DNS + SSL |
| CDN caching active for public pages | ✅ | Vercel Edge Network automatic |
| SSL auto-renewal | ✅ | Vercel managed |
| Firebase project on Blaze plan | ☐ | Required for Cloud Functions |
| GCP budget alerts configured | ☐ | Set at ₹500, ₹1000, ₹2000 thresholds |
| Cloud Billing export to BigQuery configured | ☐ | Pre-production cost visibility. Enable Standard + Detailed usage export for billing account `Firebase Payment` into `menulist.cloud_billing_export` or a dedicated FinOps project. |
| SAFE_MODE circuit breaker verified | ☐ | Core code exists. Before launch, verify `/ops` toggle, AI route `503`, public menu/OBP unaffected, budget webhook activation, and direct Cloud Function coverage audit. |
| Environment variables set in Vercel | ☐ | All secrets configured |
| Firebase Functions deployed | ☐ | `firebase deploy --only functions` |
| Firestore indexes deployed | ☐ | `firebase deploy --only firestore:indexes` |

---

## 2. Security

| Check | Status | Notes |
|-------|--------|-------|
| Firestore security rules deployed | ☐ | `firebase deploy --only firestore:rules` |
| No public write access in rules | ✅ | Verified in SS audit (Feb 7) |
| Rate limiting active (Upstash) | ✅ | `ENABLE_RATE_LIMITING: true` |
| Sentry configured (prod project) | ✅ | Dual dev/prod Sentry projects |
| HTTPS enforced | ✅ | Vercel automatic |
| CSP headers active | ✅ | Middleware.ts |
| Auth session security | ✅ | NextAuth with secure cookies |
| System strengthening fixes applied | ☐ | SS-1 through SS-9 from `__docs__/system-strengthening/` |

---

## 3. Core Product: Menu Delivery

| Check | Status | Notes |
|-------|--------|-------|
| Public menu page loads <2s | ☐ | Test from mobile device on 4G |
| Menu shows correct data after publish | ☐ | Publish → verify live in <30s |
| Images load correctly | ☐ | Check Firebase Storage CDN |
| QR code scans correctly | ☐ | Test with 3 different apps (see below) |
| OBP page loads with schema.org | ☐ | Check with Google Rich Results Test |
| Menu works offline (CDN cached) | ✅ | Edge caching handles this |
| Menu renders on slow 3G | ☐ | Chrome DevTools network throttle |
| Menu renders on old Android | ☐ | Test with real device or BrowserStack |
| Menu renders on Safari iPhone | ☐ | Test with real device |

### QR Code Testing (Manual)

Test QR scan with:
- [ ] iPhone Camera app
- [ ] WhatsApp camera (scan QR)
- [ ] Instagram camera
- [ ] Android default camera
- [ ] Cheap Android phone (mid-range)

Each must:
- Open instantly
- No redirect chain
- No login wall
- No cookie dependency

---

## 4. Owner Dashboard

| Check | Status | Notes |
|-------|--------|-------|
| Login flow works (email + password) | ☐ | Test fresh signup |
| Dashboard loads after login | ☐ | Check first-load speed |
| Menu editor works (add/edit/delete items) | ☐ | Full CRUD test |
| Publish flow works end-to-end | ☐ | Edit → publish → verify live |
| Working hours editor works | ☐ | Set hours → verify on public page |
| Image upload works | ☐ | Upload, crop, save |
| AI features work (descriptions, translations) | ☐ | Test with feature flags ON |
| Billing/subscription page loads | ☐ | Razorpay integration |
| Settings page works | ☐ | Profile, store info, theme |

---

## 5. Monitoring & Alerting

| Check | Status | Notes |
|-------|--------|-------|
| Sentry receives errors from production | ☐ | Trigger test error, verify in Sentry |
| Error emails configured in Sentry | ☐ | Set up alert rules |
| Telegram alert bot created | ☐ | See `__docs__/ops-alerting-delivery/` |
| Telegram alerts working | ☐ | Test with manual alert trigger |
| Platform alert Email/WhatsApp configured | ☐ | Complete `launch-prerequisites.md` Step 7B before production |
| Menu health monitor deployed | ☐ | See `__docs__/menu-health-monitor/` |
| SAFE_MODE mechanism ready | ☐ | Core built; complete `launch-prerequisites.md` Step 2C before production |
| GCP budget alerts configured | ☐ | Set progressive thresholds |
| BigQuery billing export data verified | ☐ | After export is enabled, confirm billing tables receive daily cost rows before production launch |
| Website analytics configured | ☐ | Configure Plausible sites/env/goals for `menulist.ai` and `answerlattice.com`; keep PostHog out of launch; see `__docs__/client-menu/analytics-tracking/analytics-tracking_vendor-plan.md` |

---

## 6. Data & Backup

| Check | Status | Notes |
|-------|--------|-------|
| Firestore daily export configured | ☐ | Firebase Console → Extensions or scheduled export |
| Export verified (can restore) | ☐ | Test restore to staging |
| Storage backup strategy defined | ☐ | Images in Firebase Storage with bucket versioning |

---

## 7. Legal & Trust

| Check | Status | Notes |
|-------|--------|-------|
| Privacy policy published | ☐ | Accessible from login/signup |
| Terms of service published | ☐ | Accessible from login/signup |
| Support email visible | ☐ | support@menulist.ai or equivalent |
| Data deletion process defined | ☐ | How to handle deletion requests |

---

## 8. SEO & Discovery

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt allows indexing | ✅ | `public/robots.txt` |
| Sitemap exists | ☐ | Auto-generated or manual |
| OBP pages have schema.org markup | ✅ | `src/lib/schema/index.ts` |
| llms.txt published | ✅ | `public/llms.txt` + `public/llms-full.txt` |
| Google Search Console configured | ☐ | Submit sitemap |

---

## 9. Onboarding Readiness

| Check | Status | Notes |
|-------|--------|-------|
| WhatsApp onboarding flow tested | ☐ | End-to-end with 3-5 test users |
| Dashboard signup flow tested | ☐ | Fresh signup → publish → live |
| Pre-written support responses ready | ☐ | 10 common question templates |
| Onboarding documentation ready | ☐ | Internal guide for first 20 users |

---

## 10. Content & Help

| Check | Status | Notes |
|-------|--------|-------|
| Help videos recorded (optional) | ☐ | 10 short screen recordings |
| FAQ/help page accessible | ☐ | Basic help center or docs |
| Common error messages user-friendly | ☐ | No technical jargon in UI |

---

## Post-Launch Monitoring (First 7 Days)

### Daily Checks
- [ ] Open ops dashboard → all green?
- [ ] Check Sentry → any new error patterns?
- [ ] Check Telegram → any alerts fired?
- [ ] Check Firebase Console → usage normal?
- [ ] Check BigQuery billing export → any cost spikes by service/SKU?
- [ ] Message first 5 owners → "Is everything working?"

### Weekly Check
- [ ] Review all stores: any silent failures?
- [ ] Review support messages: any repeated questions?
- [ ] Review Firestore usage trends: any unexpected growth?

---

## Launch Readiness Verdict

**Ready to launch when:**
- All Security checks ✅
- All Core Product checks ✅
- All Monitoring checks ✅
- At least 3 QR scan tests pass
- At least 1 end-to-end onboarding test complete

**NOT ready if:**
- Any Security check fails
- Public menu doesn't load on mobile
- No error monitoring configured
- No budget alerts set
- SAFE_MODE is not verified end-to-end

---

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.2 | May 24, 2026 | Added SAFE_MODE pre-production verification requirement and launch blocker |
| 1.1 | May 24, 2026 | Added pre-production Cloud Billing export to BigQuery requirement and post-launch billing review check |
| 1.0 | February 20, 2026 | Initial checklist from ChatGPT review |
