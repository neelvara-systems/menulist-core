# DATA PROTECTION POLICY

**Document Type:** Compliance  
**Last Updated:** 2026-01-11  
**Status:** 🔒 ACTIVE  
**Audience:** All Teams

---

## PURPOSE

This document defines how MenuListAi collects, processes, stores, and protects data.

---

## DATA CLASSIFICATION

### Data Categories

| Category     | Examples                       | Sensitivity     |
| ------------ | ------------------------------ | --------------- |
| **Public**   | Menu items, prices, categories | Low             |
| **Business** | Analytics events, campaigns    | Medium          |
| **Account**  | Store name, owner email        | Medium          |
| **System**   | Confidence scores, formulas    | High (Internal) |

### Sensitivity Handling

| Sensitivity | Encryption           | Access        | Exposure      |
| ----------- | -------------------- | ------------- | ------------- |
| Low         | In-transit           | All users     | Public        |
| Medium      | In-transit + at-rest | Authenticated | Owner only    |
| High        | In-transit + at-rest | System only   | Never exposed |

---

## DATA COLLECTION

### What We Collect

| Data Type        | Purpose             | Legal Basis         |
| ---------------- | ------------------- | ------------------- |
| Menu data        | Core product        | Legitimate interest |
| Analytics events | Intelligence        | Legitimate interest |
| Account info     | Authentication      | Contract            |
| Usage data       | Product improvement | Legitimate interest |

### What We Don't Collect

| Data Type              | Reason                 |
| ---------------------- | ---------------------- |
| Payment card details   | Processed by Stripe    |
| Personal customer data | Not needed for product |
| Location history       | Not needed for product |
| Biometric data         | Not collected          |

---

## DATA PROCESSING

### Processing Principles

| Principle              | Implementation                 |
| ---------------------- | ------------------------------ |
| **Lawfulness**         | Consent or legitimate interest |
| **Purpose limitation** | Only for stated purposes       |
| **Data minimization**  | Collect only what's needed     |
| **Accuracy**           | Owner can update data          |
| **Storage limitation** | Retention policy enforced      |
| **Integrity**          | Firestore atomicity            |
| **Confidentiality**    | Multi-tenant isolation         |

### Processing Activities

| Activity              | Description            | Schedule |
| --------------------- | ---------------------- | -------- |
| CMI processing        | Confidence calculation | Nightly  |
| Campaign generation   | Selection & ranking    | Nightly  |
| Analytics aggregation | Event processing       | Nightly  |
| Backup creation       | Data backup            | Daily    |

---

## DATA STORAGE

### Storage Locations

| Data           | Location      | Provider        |
| -------------- | ------------- | --------------- |
| Firestore data | Multi-region  | Google Firebase |
| File storage   | Cloud Storage | Google Firebase |
| Logs           | Cloud Logging | Google Cloud    |
| Error tracking | Sentry        | Sentry.io       |

### Encryption

| State      | Method                     |
| ---------- | -------------------------- |
| In-transit | TLS 1.3                    |
| At-rest    | AES-256 (Firebase default) |
| Backups    | AES-256                    |

---

## DATA RETENTION

### Retention Periods

| Data Type        | Retention              | Deletion Method |
| ---------------- | ---------------------- | --------------- |
| Menu data        | Until account deletion | Hard delete     |
| Analytics events | 90 days                | Automatic purge |
| Campaigns        | 1 year                 | Soft delete     |
| Exports          | 30 days                | Automatic purge |
| Logs             | 30 days                | Automatic purge |
| Backups          | 30 days                | Rotation        |

### Deletion Process

1. Owner requests deletion
2. Account marked for deletion
3. 30-day grace period
4. Hard delete executed
5. Confirmation sent

---

## DATA ACCESS

### Access Control

| Role        | Access                   |
| ----------- | ------------------------ |
| Owner       | Own store data only      |
| Support     | Read-only, audited       |
| Engineering | Production read, audited |
| Admin       | Full access, audited     |

### Access Logging

All production data access is logged:

- Who accessed
- What was accessed
- When accessed
- Why (purpose)

---

## DATA SHARING

### Third Parties

| Party    | Data Shared      | Purpose        |
| -------- | ---------------- | -------------- |
| Firebase | All data         | Infrastructure |
| Vercel   | Application code | Hosting        |
| Gemini   | Menu text        | AI processing  |
| Sentry   | Error traces     | Debugging      |

### No Data Sale

MenuListAi does NOT sell user data to third parties.

### Subprocessor Agreements

All third parties have:

- Data processing agreements
- SOC 2 or equivalent certification
- Adequate security measures

---

## DATA SUBJECT RIGHTS

### Rights Supported

| Right         | Implementation    |
| ------------- | ----------------- |
| Access        | Owner dashboard   |
| Rectification | Edit in dashboard |
| Erasure       | Deletion request  |
| Portability   | Export feature    |
| Objection     | Contact support   |
| Restriction   | Contact support   |

### Request Process

1. User submits request
2. Identity verified
3. Request processed within 30 days
4. Confirmation sent

---

## DATA BREACH RESPONSE

### Detection

- Sentry alerts
- Firebase anomaly detection
- Manual monitoring

### Response Timeline

| Action                  | Timeline            |
| ----------------------- | ------------------- |
| Detection to assessment | 4 hours             |
| Internal notification   | 24 hours            |
| Authority notification  | 72 hours            |
| User notification       | Without undue delay |

### Breach Documentation

All breaches documented with:

- Nature of breach
- Data affected
- Individuals affected
- Consequences
- Remediation steps

---

## CROSS-BORDER TRANSFERS

### Transfer Mechanisms

| Region      | Mechanism                    |
| ----------- | ---------------------------- |
| EU to US    | Standard Contractual Clauses |
| India to US | Consent + contract           |
| Other       | Case-by-case assessment      |

---

## COMPLIANCE MONITORING

| Activity        | Frequency | Owner    |
| --------------- | --------- | -------- |
| Policy review   | Quarterly | Legal    |
| Access audit    | Monthly   | Security |
| Retention check | Monthly   | Ops      |
| Breach drill    | Annually  | Security |

---

_Document Status: 🔒 ACTIVE_
