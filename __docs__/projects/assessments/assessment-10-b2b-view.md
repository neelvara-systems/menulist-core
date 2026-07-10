# 💼 B2B View & API Integration Assessment

**Feature**: JSON Editor, API Export, and Developer-Friendly Integration
**Risk Level**: 🟡 MEDIUM
**Historical Result**: Needs review record; not a production-launch approval
**Launch Boundary**: Historical assessment result only; not current launch certification. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, API/export security review, browser/mobile QA where exposed, and target-environment smoke.
**Implementation Status**: ⏳ PENDING ASSESSMENT

---

## 📋 Executive Summary

The B2B View provides a developer-friendly interface for businesses that want to integrate menu data into their own systems. It includes a JSON editor, API documentation, export functionality, and webhook support.

**Business Impact**: HIGH - Critical for enterprise customers, POS integrations, and third-party developers.

---

## 🚨 Critical Issues to Assess

### **1. JSON Editor Security** 🔒 P0

**Risk**: Users could inject malicious code or break data integrity.

**Must Verify**:

- [ ] JSON schema validation before save
- [ ] Readonly fields (IDs, timestamps) protected
- [ ] Preview/diff before applying changes
- [ ] Undo/rollback capability

---

### **2. API Key Security** 🔑 P0

**Risk**: Leaked API keys could expose restaurant data.

**Must Verify**:

- [ ] API keys hashed in database
- [ ] Key rotation/revocation support
- [ ] Rate limiting per key
- [ ] Scope control (read/write permissions)

---

### **3. Export Data Privacy** 📊 P0

**Risk**: Exported JSON might contain sensitive data.

**Must Verify**:

- [ ] PII removed from exports (user emails, phone numbers)
- [ ] Internal IDs sanitized
- [ ] Audit log for exports
- [ ] Download encryption option

---

## 📁 Files to Review

- `/src/components/templates/main-app/projects/b2bView.tsx`
- `/src/app/api/export/route.ts`
- `/src/lib/apiKeys/` directory

---

**Assessment Date**: Nov 20, 2025
**Priority**: MEDIUM-HIGH
