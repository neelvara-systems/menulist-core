# 📋 Cascade AI Rules - MenuListAI Project

**Last Updated**: November 5, 2025  
**Status**: ✅ Active & Enforced

---

## 📁 Rules Structure

This folder contains **MANDATORY RULES** that Cascade AI must follow strictly (not suggestions or memories).

### Active Rules:

| File                                    | Purpose                         | Authority   | Lines |
| --------------------------------------- | ------------------------------- | ----------- | ----- |
| **SECURITY_IMPLEMENTATION_RULES.md**    | Security patterns & enforcement | 🔴 CRITICAL | 600+  |
| **DOCUMENTATION_ORGANIZATION_RULES.md** | Global vs feature-specific docs | 🔴 CRITICAL | 500+  |
| **MOBILE_SUPPORT_RULES.md**             | Mobile support & UX enforcement | 🔴 CRITICAL | 130+  |

---

## 🎯 Rules vs Memories vs Workflows

### **Rules** (This Folder) 🔴

- **Authority**: HIGHEST - Cannot be overridden
- **Enforcement**: STRICT - No exceptions
- **Purpose**: Mandatory patterns that MUST be followed
- **Example**: "NEVER skip withAuth() on protected routes"

### **Memories** (Cascade Settings) 💾

- **Authority**: MEDIUM - Informational context
- **Enforcement**: SOFT - Can be adapted
- **Purpose**: Remember past implementations and preferences
- **Example**: "User prefers splitting large components"

### **Workflows** (Cascade Settings) ⚙️

- **Authority**: LOW - Process suggestions
- **Enforcement**: FLEXIBLE - Can be modified
- **Purpose**: Recommended work processes
- **Example**: "Run tests before deploying"

---

## 🚨 Critical Difference

**Rules = LAW (Must obey)**  
**Memories = CONTEXT (Should consider)**  
**Workflows = SUGGESTIONS (Can adapt)**

---

## 📊 Current Rules Summary

### Security Implementation Rules (15 Core Rules)

1. ✅ API Route Protection - `withAuth()` mandatory
2. ✅ Multi-Tenant Isolation - `verifyTenantAccess()` required
3. ✅ Input Validation - Zod schemas before DB
4. ✅ Security Logging - `logger.security()` for events
5. ✅ Rate Limiting - Before expensive operations
6. ✅ Firestore Rules - Default deny all
7. ✅ No Sensitive Data - Never log passwords/tokens
8. ✅ HTTPS Only - Production requirement
9. ✅ Generic Errors - Prevent user enumeration
10. ✅ Session Sanitization - No sensitive data
11. ✅ Critical Files - Review required before changes
12. ✅ Pre-Implementation Checklist - Must verify before coding
13. ✅ Documentation First - Check guides before implementing
14. ✅ Zero Tolerance - No violations allowed
15. ✅ User Override Protection - Cannot skip security

**Total**: 15 mandatory rules covering 100% of security implementation

---

## 🎓 How to Use Rules

### For Cascade AI (Me):

**BEFORE every code change, I MUST:**

1. ✅ Check if change affects security
2. ✅ Verify against SECURITY_IMPLEMENTATION_RULES.md
3. ✅ Follow mandatory patterns exactly
4. ✅ Complete pre-implementation checklist
5. ✅ Refuse to implement if violates rules

**I CANNOT:**

- ❌ Skip rules "just this once"
- ❌ Override rules for convenience
- ❌ Implement insecure code even if user requests
- ❌ Modify critical files without explicit approval

### For Developers:

**To understand what Cascade must follow:**

1. Read `SECURITY_IMPLEMENTATION_RULES.md`
2. Reference when requesting security-related changes
3. Know that Cascade will refuse insecure implementations
4. Use rules as source of truth for security patterns

---

## 📝 Rule Compliance Verification

### After Every Code Change:

```bash
# Cascade will internally verify:
✅ No withAuth() skipped on protected routes
✅ No verifyTenantAccess() skipped on tenant data
✅ No input validation skipped
✅ Security events properly logged
✅ No sensitive data in logs
✅ No critical file changes without review
✅ All pre-implementation checks completed
```

---

## 🔗 Related Documentation

**Security Guides** (Implementation Details):

- `__docs__/security/authentication/COMPLETE_GUIDE.md`
- `__docs__/security/csp/COMPLETE_GUIDE.md`
- `__docs__/security/app-check/COMPLETE_GUIDE.md`
- `__docs__/security/monitoring/COMPLETE_GUIDE.md`

**Rules** (Mandatory Enforcement):

- `.cascade/rules/SECURITY_IMPLEMENTATION_RULES.md` ← YOU ARE HERE

**Difference**:

- **Guides** = HOW to implement (education)
- **Rules** = MUST follow (enforcement)

---

## 🎯 Rule Authority Hierarchy

```
┌─────────────────────────────────────┐
│  1. Security Implementation Rules   │ ← HIGHEST (Cannot override)
│     (.cascade/rules/)               │
├─────────────────────────────────────┤
│  2. OWASP Top 10 Requirements       │ ← Industry Standards
├─────────────────────────────────────┤
│  3. Documentation Guidelines        │ ← Best Practices
│     (__docs__/security/)            │
├─────────────────────────────────────┤
│  4. User Preferences (Memories)     │ ← Context & History
├─────────────────────────────────────┤
│  5. Workflow Suggestions            │ ← Flexible Processes
└─────────────────────────────────────┘
```

**If conflict arises**: Higher authority wins, no exceptions.

---

## ✅ Rule Establishment

**Created**: November 5, 2025  
**Authority**: Maximum (cannot be overridden)  
**Enforcement**: Strict (zero tolerance)  
**Scope**: All security-related code changes  
**Violations**: Will be refused by Cascade AI

---

**These rules ensure MenuListAI maintains production-grade security standards across all development work.**
