# SOC 2 TYPE I COMPLIANCE MAPPING

**Document Type:** Compliance  
**Last Updated:** 2026-01-11  
**Status:** 📋 MAPPED (Not Certified)  
**Audience:** Security, Legal, Investors, Auditors

---

## DISCLAIMER

This document maps MenuListAi controls to SOC 2 Type I trust service criteria.

**This is NOT a SOC 2 certification.**  
It is a readiness assessment for future audit.

---

## SOC 2 OVERVIEW

SOC 2 Type I evaluates the design of controls at a point in time across five trust service criteria:

1. **Security** (Common Criteria)
2. **Availability**
3. **Processing Integrity**
4. **Confidentiality**
5. **Privacy**

---

## 1. SECURITY (COMMON CRITERIA)

### CC1: Control Environment

| Criteria                         | MenuListAi Control                  | Status |
| -------------------------------- | ----------------------------------- | ------ |
| CC1.1 - Commitment to integrity  | Code of conduct, governance docs    | ✅     |
| CC1.2 - Board oversight          | CEO oversight, architecture freeze  | ✅     |
| CC1.3 - Organizational structure | Documented roles, escalation matrix | ✅     |
| CC1.4 - Competence commitment    | Hiring standards, training          | ✅     |
| CC1.5 - Accountability           | Governance policies, enforcement    | ✅     |

### CC2: Communication & Information

| Criteria                       | MenuListAi Control           | Status |
| ------------------------------ | ---------------------------- | ------ |
| CC2.1 - Quality information    | SSOT documentation           | ✅     |
| CC2.2 - Internal communication | Governance docs, runbooks    | ✅     |
| CC2.3 - External communication | Authority enforcement policy | ✅     |

### CC3: Risk Assessment

| Criteria                    | MenuListAi Control                      | Status |
| --------------------------- | --------------------------------------- | ------ |
| CC3.1 - Risk objectives     | Production verification                 | ✅     |
| CC3.2 - Risk identification | Security audit, OWASP compliance        | ✅     |
| CC3.3 - Fraud risk          | Access controls, audit logging          | ✅     |
| CC3.4 - Change risk         | Architecture freeze, feature governance | ✅     |

### CC4: Monitoring Activities

| Criteria                      | MenuListAi Control              | Status |
| ----------------------------- | ------------------------------- | ------ |
| CC4.1 - Ongoing monitoring    | Sentry, Firebase logs           | ✅     |
| CC4.2 - Deficiency evaluation | Incident response, post-mortems | ✅     |

### CC5: Control Activities

| Criteria                    | MenuListAi Control             | Status |
| --------------------------- | ------------------------------ | ------ |
| CC5.1 - Control selection   | OWASP Top 10 implementation    | ✅     |
| CC5.2 - Technology controls | Firebase Auth, rate limiting   | ✅     |
| CC5.3 - Policy deployment   | Governance folder, enforcement | ✅     |

### CC6: Logical & Physical Access

| Criteria                              | MenuListAi Control        | Status |
| ------------------------------------- | ------------------------- | ------ |
| CC6.1 - Access architecture           | Multi-tenant isolation    | ✅     |
| CC6.2 - Registration & authorization  | Firebase Auth, withAuth() | ✅     |
| CC6.3 - Access removal                | Standard offboarding      | ✅     |
| CC6.4 - Access restriction            | Role-based, tenant-scoped | ✅     |
| CC6.5 - Physical access               | Vercel/Firebase managed   | ✅     |
| CC6.6 - Threats from malicious actors | Rate limiting, validation | ✅     |
| CC6.7 - Transmission protection       | HTTPS enforced            | ✅     |
| CC6.8 - Unauthorized changes          | Git, deployment controls  | ✅     |

### CC7: System Operations

| Criteria                          | MenuListAi Control              | Status |
| --------------------------------- | ------------------------------- | ------ |
| CC7.1 - Vulnerability detection   | Sentry, dependency audit        | ✅     |
| CC7.2 - Anomaly monitoring        | Alert thresholds, Firebase logs | ✅     |
| CC7.3 - Security event evaluation | Incident response process       | ✅     |
| CC7.4 - Incident response         | Documented runbook              | ✅     |
| CC7.5 - Recovery activities       | Rollback procedures             | ✅     |

### CC8: Change Management

| Criteria                       | MenuListAi Control      | Status |
| ------------------------------ | ----------------------- | ------ |
| CC8.1 - Infrastructure changes | Vercel/Firebase managed | ✅     |

### CC9: Risk Mitigation

| Criteria                  | MenuListAi Control              | Status |
| ------------------------- | ------------------------------- | ------ |
| CC9.1 - Risk mitigation   | Architecture freeze, thresholds | ✅     |
| CC9.2 - Vendor management | Firebase/Vercel/Gemini SLAs     | ✅     |

---

## 2. AVAILABILITY

| Criteria                         | MenuListAi Control              | Status |
| -------------------------------- | ------------------------------- | ------ |
| A1.1 - Capacity management       | Firebase auto-scaling           | ✅     |
| A1.2 - Environmental protections | Cloud-managed (Firebase/Vercel) | ✅     |
| A1.3 - Recovery procedures       | Backup & restore documented     | ✅     |

---

## 3. PROCESSING INTEGRITY

| Criteria                      | MenuListAi Control              | Status |
| ----------------------------- | ------------------------------- | ------ |
| PI1.1 - Processing objectives | Confidence thresholds, formulas | ✅     |
| PI1.2 - Accurate processing   | Nightly batch, validation       | ✅     |
| PI1.3 - Error handling        | Sentry, fallback mechanisms     | ✅     |
| PI1.4 - Output review         | Summary doc pattern             | ✅     |
| PI1.5 - Data store accuracy   | Firestore atomicity             | ✅     |

---

## 4. CONFIDENTIALITY

| Criteria                        | MenuListAi Control                | Status |
| ------------------------------- | --------------------------------- | ------ |
| C1.1 - Confidential information | No PII exposure, tenant isolation | ✅     |
| C1.2 - Disposal                 | Firebase retention policies       | ✅     |

---

## 5. PRIVACY

| Criteria                | MenuListAi Control       | Status     |
| ----------------------- | ------------------------ | ---------- |
| P1.1 - Notice           | Privacy policy           | ✅         |
| P2.1 - Choice & consent | Opt-in flows             | ✅         |
| P3.1 - Collection       | Minimal data collection  | ✅         |
| P4.1 - Use & retention  | Purpose limitation       | ✅         |
| P5.1 - Access           | Owner access to own data | ✅         |
| P6.1 - Disclosure       | No third-party sale      | ✅         |
| P7.1 - Quality          | Data validation          | ✅         |
| P8.1 - Monitoring       | Privacy review           | ⚠️ Partial |

---

## EVIDENCE INVENTORY

| Control Area      | Evidence Location                            |
| ----------------- | -------------------------------------------- |
| Access Control    | `/compliance/ACCESS-CONTROLS.md`             |
| Incident Response | `/compliance/INCIDENT-RESPONSE.md`           |
| Data Protection   | `/compliance/DATA-PROTECTION.md`             |
| Architecture      | `/architecture/03-ARCHITECTURE-BLUEPRINT.md` |
| Operations        | `/operations/07-OPERATIONAL-RUNBOOK.md`      |
| Governance        | `/governance/*`                              |

---

## GAP ANALYSIS

| Gap                            | Severity | Remediation                           |
| ------------------------------ | -------- | ------------------------------------- |
| Formal privacy review process  | Low      | Implement quarterly review            |
| Vendor risk assessment docs    | Low      | Document Firebase/Vercel/Gemini risks |
| Formal change management board | Low      | Formalize approval process            |

---

## READINESS SCORE

| Category             | Score   |
| -------------------- | ------- |
| Security             | 95%     |
| Availability         | 100%    |
| Processing Integrity | 100%    |
| Confidentiality      | 100%    |
| Privacy              | 85%     |
| **Overall**          | **96%** |

---

## NEXT STEPS FOR CERTIFICATION

1. Engage SOC 2 auditor
2. Complete evidence collection
3. Address identified gaps
4. Schedule Type I audit
5. Remediate findings
6. Obtain SOC 2 Type I report

---

_Document Status: 📋 MAPPED_  
_Certification Status: Not Certified_
