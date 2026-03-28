# ISO 27001-LITE COMPLIANCE MAPPING

**Document Type:** Compliance  
**Last Updated:** 2026-01-11  
**Status:** 📋 ALIGNED (Not Certified)  
**Audience:** Security, Legal, Investors, Auditors

---

## DISCLAIMER

This document maps MenuListAi controls to ISO 27001 Annex A controls.

**This is NOT an ISO 27001 certification.**  
It is a lightweight alignment assessment ("ISO-lite") suitable for SMB SaaS.

---

## ISO 27001 OVERVIEW

ISO 27001 is the international standard for information security management systems (ISMS).

This "lite" mapping covers the most relevant controls for a startup SaaS product:

- A.5: Organizational Controls
- A.6: People Controls
- A.7: Physical Controls
- A.8: Technological Controls

---

## A.5: ORGANIZATIONAL CONTROLS

### A.5.1 - Policies for Information Security

| Control                     | MenuListAi Implementation   | Status |
| --------------------------- | --------------------------- | ------ |
| Information security policy | SSOT documentation suite    | ✅     |
| Policy review               | Quarterly governance review | ✅     |

### A.5.2 - Information Security Roles

| Control                  | MenuListAi Implementation  | Status |
| ------------------------ | -------------------------- | ------ |
| Defined responsibilities | Escalation matrix, runbook | ✅     |
| Segregation of duties    | Multi-tenant isolation     | ✅     |

### A.5.3 - Contact with Authorities

| Control            | MenuListAi Implementation | Status |
| ------------------ | ------------------------- | ------ |
| Authority contacts | Incident response plan    | ✅     |

### A.5.7 - Threat Intelligence

| Control           | MenuListAi Implementation | Status |
| ----------------- | ------------------------- | ------ |
| Threat monitoring | Sentry, Firebase logs     | ✅     |

### A.5.8 - Information Security in Projects

| Control                 | MenuListAi Implementation        | Status |
| ----------------------- | -------------------------------- | ------ |
| Security in development | Architecture freeze, code review | ✅     |

### A.5.15 - Access Control

| Control               | MenuListAi Implementation | Status |
| --------------------- | ------------------------- | ------ |
| Access control policy | ACCESS-CONTROLS.md        | ✅     |

### A.5.22 - Supplier Monitoring

| Control           | MenuListAi Implementation   | Status     |
| ----------------- | --------------------------- | ---------- |
| Vendor assessment | Firebase/Vercel/Gemini SLAs | ⚠️ Partial |

### A.5.24 - Incident Planning

| Control                | MenuListAi Implementation | Status |
| ---------------------- | ------------------------- | ------ |
| Incident response plan | INCIDENT-RESPONSE.md      | ✅     |

### A.5.29 - Business Continuity

| Control             | MenuListAi Implementation  | Status |
| ------------------- | -------------------------- | ------ |
| Continuity planning | Backup & disaster recovery | ✅     |

### A.5.31 - Legal Requirements

| Control               | MenuListAi Implementation | Status |
| --------------------- | ------------------------- | ------ |
| Regulatory compliance | Privacy policy, terms     | ✅     |

---

## A.6: PEOPLE CONTROLS

### A.6.1 - Screening

| Control           | MenuListAi Implementation | Status      |
| ----------------- | ------------------------- | ----------- |
| Background checks | Standard hiring practice  | ⚠️ Informal |

### A.6.2 - Terms of Employment

| Control                   | MenuListAi Implementation | Status |
| ------------------------- | ------------------------- | ------ |
| Security responsibilities | Employment agreements     | ✅     |

### A.6.3 - Security Awareness

| Control          | MenuListAi Implementation | Status      |
| ---------------- | ------------------------- | ----------- |
| Training program | Governance doc review     | ⚠️ Informal |

### A.6.4 - Disciplinary Process

| Control            | MenuListAi Implementation | Status |
| ------------------ | ------------------------- | ------ |
| Violation handling | Governance enforcement    | ✅     |

### A.6.5 - Post-Employment

| Control     | MenuListAi Implementation | Status |
| ----------- | ------------------------- | ------ |
| Offboarding | Access revocation         | ✅     |

---

## A.7: PHYSICAL CONTROLS

### A.7.1 - Physical Security Perimeters

| Control              | MenuListAi Implementation | Status |
| -------------------- | ------------------------- | ------ |
| Data center security | Firebase/Vercel managed   | ✅     |

### A.7.4 - Physical Security Monitoring

| Control             | MenuListAi Implementation | Status |
| ------------------- | ------------------------- | ------ |
| Facility monitoring | Cloud provider managed    | ✅     |

---

## A.8: TECHNOLOGICAL CONTROLS

### A.8.1 - User Endpoint Devices

| Control       | MenuListAi Implementation | Status      |
| ------------- | ------------------------- | ----------- |
| Device policy | Standard practices        | ⚠️ Informal |

### A.8.2 - Privileged Access Rights

| Control           | MenuListAi Implementation | Status |
| ----------------- | ------------------------- | ------ |
| Privileged access | Firebase/Vercel IAM       | ✅     |

### A.8.3 - Information Access Restriction

| Control            | MenuListAi Implementation | Status |
| ------------------ | ------------------------- | ------ |
| Access restriction | Multi-tenant isolation    | ✅     |

### A.8.5 - Secure Authentication

| Control        | MenuListAi Implementation | Status |
| -------------- | ------------------------- | ------ |
| Authentication | Firebase Auth             | ✅     |

### A.8.6 - Capacity Management

| Control           | MenuListAi Implementation      | Status |
| ----------------- | ------------------------------ | ------ |
| Capacity planning | Auto-scaling (Firebase/Vercel) | ✅     |

### A.8.7 - Protection Against Malware

| Control            | MenuListAi Implementation       | Status |
| ------------------ | ------------------------------- | ------ |
| Malware protection | Cloud-managed, dependency audit | ✅     |

### A.8.8 - Technical Vulnerability Management

| Control                  | MenuListAi Implementation | Status |
| ------------------------ | ------------------------- | ------ |
| Vulnerability management | Sentry, npm audit         | ✅     |

### A.8.9 - Configuration Management

| Control               | MenuListAi Implementation  | Status |
| --------------------- | -------------------------- | ------ |
| Configuration control | Git, environment variables | ✅     |

### A.8.12 - Data Leakage Prevention

| Control | MenuListAi Implementation         | Status |
| ------- | --------------------------------- | ------ |
| DLP     | No PII exposure, authority policy | ✅     |

### A.8.15 - Logging

| Control          | MenuListAi Implementation | Status |
| ---------------- | ------------------------- | ------ |
| Activity logging | Firebase logs, Sentry     | ✅     |

### A.8.16 - Monitoring Activities

| Control             | MenuListAi Implementation | Status |
| ------------------- | ------------------------- | ------ |
| Security monitoring | Alerts, dashboards        | ✅     |

### A.8.20 - Network Security

| Control          | MenuListAi Implementation      | Status |
| ---------------- | ------------------------------ | ------ |
| Network controls | HTTPS, Firebase security rules | ✅     |

### A.8.24 - Cryptography

| Control    | MenuListAi Implementation          | Status |
| ---------- | ---------------------------------- | ------ |
| Encryption | HTTPS, Firebase encryption at rest | ✅     |

### A.8.25 - Secure Development

| Control     | MenuListAi Implementation     | Status |
| ----------- | ----------------------------- | ------ |
| Secure SDLC | Code review, OWASP compliance | ✅     |

### A.8.28 - Secure Coding

| Control          | MenuListAi Implementation  | Status |
| ---------------- | -------------------------- | ------ |
| Coding standards | TypeScript, Zod validation | ✅     |

### A.8.31 - Separation of Environments

| Control                | MenuListAi Implementation | Status |
| ---------------------- | ------------------------- | ------ |
| Environment separation | Dev/Staging/Prod          | ✅     |

---

## GAP ANALYSIS

| Gap                            | Severity | Remediation                   |
| ------------------------------ | -------- | ----------------------------- |
| Formal vendor risk docs        | Low      | Document supplier assessments |
| Background check formalization | Low      | Document hiring process       |
| Security awareness training    | Medium   | Implement formal program      |
| Device security policy         | Low      | Document endpoint standards   |

---

## ALIGNMENT SCORE

| Control Domain       | Score   |
| -------------------- | ------- |
| A.5 - Organizational | 90%     |
| A.6 - People         | 75%     |
| A.7 - Physical       | 100%    |
| A.8 - Technological  | 95%     |
| **Overall**          | **90%** |

---

## NEXT STEPS FOR CERTIFICATION

1. Establish formal ISMS
2. Address identified gaps
3. Document risk treatment plan
4. Conduct internal audit
5. Engage ISO 27001 auditor
6. Certification audit (Stage 1 & 2)

---

_Document Status: 📋 ALIGNED_  
_Certification Status: Not Certified_
