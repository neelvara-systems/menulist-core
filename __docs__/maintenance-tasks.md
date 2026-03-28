# 🔧 Maintenance Tasks Checklist

**Last Updated:** November 6, 2025  
**Next Review:** May 6, 2026

---

## 📅 Every 6 Months

### **Security: Update Disposable Email Domains**
**Due:** May 6, 2026

- [ ] Navigate to project directory
- [ ] Run update command:
  ```bash
  curl -s "https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.json" -o src/lib/validation/disposable-domains-full.json
  ```
- [ ] Verify file size (should be ~1-2MB):
  ```bash
  ls -lh src/lib/validation/disposable-domains-full.json
  ```
- [ ] Test with a disposable email:
  - Try login with: `test@10minutemail.com`
  - Should show error: "Disposable email not allowed"
- [ ] Commit changes:
  ```bash
  git add src/lib/validation/disposable-domains-full.json
  git commit -m "chore: update disposable email domains list"
  git push
  ```
- [ ] Deploy to production
- [ ] Update "Last Updated" date above
- [ ] Set next reminder for 6 months

**Time Required:** 10 minutes  
**Priority:** Medium  
**Impact:** Blocks new spam services

---

## 📊 Monthly Reviews

### **Security: Check Spam Signup Rate**
**Review:** First Monday of each month

- [ ] Open Firestore Console
- [ ] Go to `security_events` collection
- [ ] Filter: `eventType: 'login_failed'` + `reason contains 'invalid_email'`
- [ ] Count blocked attempts in last 30 days
- [ ] If spam signups increasing > 50%, update domains list early

**Time Required:** 5 minutes  
**Priority:** Low  
**Threshold:** Update if >50% increase in spam

---

## 🚨 When Issues Occur

### **If Users Report Signup Issues**

- [ ] Check if legitimate email provider is blocked
- [ ] Review: `/src/lib/validation/emailDomainValidator.ts`
- [ ] Check `localDomains` array (line 78)
- [ ] Remove false positive if found
- [ ] Deploy fix immediately
- [ ] Document in this file

### **If Spam Increases Suddenly**

- [ ] Check Firestore logs for patterns
- [ ] Identify new disposable service domains
- [ ] Run disposable domains update (see 6-month task above)
- [ ] Don't wait for scheduled update

---

## 📝 Task History

| Date | Task | Status | Notes |
|------|------|--------|-------|
| Nov 6, 2025 | Initial disposable domains setup | ✅ Done | 10,000+ domains added |
| Nov 6, 2025 | Added front-end validation | ✅ Done | Instant feedback |
| May 6, 2026 | Update disposable domains | 🔜 Due | |

---

## 🔔 Reminders

Set calendar reminders for:
- ⏰ **May 1, 2026** - Update disposable email domains
- ⏰ **First Monday** of each month - Check spam rates
- ⏰ **November 1, 2026** - Next 6-month update

---

## 📌 Quick Commands

```bash
# Update disposable email domains
curl -s "https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.json" -o src/lib/validation/disposable-domains-full.json

# Check file size
ls -lh src/lib/validation/disposable-domains-full.json

# Test locally
npm run dev
# Try login with: test@10minutemail.com

# Commit and push
git add src/lib/validation/disposable-domains-full.json
git commit -m "chore: update disposable email domains list"
git push

# Deploy
vercel --prod
```

---

**Note:** This file is maintained by the development team. Add new recurring maintenance tasks here as they are discovered.
