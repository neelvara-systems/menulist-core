# ACCESS CONTROLS POLICY

**Document Type:** Compliance  
**Last Updated:** 2026-01-11  
**Status:** 🔒 ACTIVE  
**Audience:** Engineering, Security, Ops

---

## PURPOSE

This document defines how access to MenuListAi systems and data is controlled.

---

## ACCESS CONTROL PRINCIPLES

| Principle                | Description                   |
| ------------------------ | ----------------------------- |
| **Least Privilege**      | Grant minimum access required |
| **Need to Know**         | Access only what's necessary  |
| **Separation of Duties** | No single point of control    |
| **Defense in Depth**     | Multiple layers of protection |

---

## USER AUTHENTICATION

### Authentication Methods

| Method           | Used For         | Provider      |
| ---------------- | ---------------- | ------------- |
| Email/Password   | Owner accounts   | Firebase Auth |
| OAuth (Google)   | Owner accounts   | Firebase Auth |
| Service accounts | Internal systems | Firebase IAM  |
| API tokens       | Integrations     | Custom tokens |

### Password Policy

| Requirement    | Value                       |
| -------------- | --------------------------- |
| Minimum length | 8 characters                |
| Complexity     | Mix of letters, numbers     |
| Expiry         | None (discouraged practice) |
| History        | Last 3 passwords blocked    |
| Lockout        | 5 failed attempts → 15 min  |

### Multi-Factor Authentication

| User Type               | MFA Required           |
| ----------------------- | ---------------------- |
| Owners (dashboard)      | Optional (recommended) |
| Admins (internal)       | Required               |
| Engineers (prod access) | Required               |

---

## AUTHORIZATION MODEL

### Multi-Tenant Isolation

```
All data scoped by:
- tenantId (tId)
- storeId (sId)

Document path pattern:
{collection}/{tId}/{sId}/{documentId}

No cross-tenant access allowed.
```

### Role Definitions

| Role         | Description      | Access               |
| ------------ | ---------------- | -------------------- |
| **Owner**    | Business owner   | Own store data       |
| **Staff**    | Store employee   | Limited (future)     |
| **Support**  | Support team     | Read-only, audited   |
| **Engineer** | Engineering team | Prod read, deploy    |
| **Admin**    | System admin     | Full access, audited |

### Permission Matrix

| Resource        | Owner | Staff | Support | Engineer | Admin |
| --------------- | ----- | ----- | ------- | -------- | ----- |
| Menu data       | RW    | R     | R       | R        | RW    |
| Campaigns       | RW    | R     | R       | R        | RW    |
| Analytics       | R     | -     | R       | R        | R     |
| Settings        | RW    | -     | R       | R        | RW    |
| System config   | -     | -     | -       | RW       | RW    |
| User management | -     | -     | -       | -        | RW    |

Legend: R = Read, W = Write, RW = Read/Write, - = No Access

---

## ACCESS LIFECYCLE

### Provisioning (Onboarding)

1. Request submitted
2. Manager approval
3. Access granted (least privilege)
4. Credentials distributed securely
5. Access logged

### Review

| Review Type           | Frequency | Owner       |
| --------------------- | --------- | ----------- |
| User access audit     | Quarterly | Security    |
| Service account audit | Monthly   | Engineering |
| Admin access audit    | Monthly   | CEO         |

### Deprovisioning (Offboarding)

1. Termination notification
2. Access revoked immediately
3. Credentials rotated
4. Sessions terminated
5. Deprovisioning logged

---

## PRIVILEGED ACCESS

### Privileged Accounts

| Account Type       | Purpose        | Holders     |
| ------------------ | -------------- | ----------- |
| Firebase Admin     | Database admin | 2 Engineers |
| Vercel Admin       | Deployment     | 2 Engineers |
| Google Cloud Admin | Infrastructure | CTO         |
| Sentry Admin       | Error tracking | 2 Engineers |

### Privileged Access Rules

- MFA required
- Access logged
- Quarterly review
- Break-glass procedure documented

### Break-Glass Procedure

For emergency access:

1. Page on-call
2. Verbal approval from CTO
3. Access granted (time-limited)
4. Actions logged
5. Post-incident review

---

## API ACCESS

### Token Types

| Token         | Use Case         | Expiry   |
| ------------- | ---------------- | -------- |
| Session token | User sessions    | 24 hours |
| API token     | Integrations     | 90 days  |
| Service token | Internal systems | 1 year   |

### Token Management

- Tokens stored hashed
- Never logged in plain text
- Revocable by admin
- Usage monitored

---

## FIRESTORE SECURITY RULES

### Rule Structure

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Multi-tenant isolation
    match /campaigns/{tenantId}/{storeId}/{document=**} {
      allow read, write: if
        request.auth != null &&
        request.auth.token.tenantId == tenantId &&
        request.auth.token.storeId == storeId;
    }

    // Public read (QR menus)
    match /menus/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Summary documents
    match /platformSummary/{document} {
      allow read: if
        request.auth != null &&
        document.matches('campaigns_' + request.auth.token.storeId);
      allow write: if false; // Server-only
    }
  }
}
```

---

## NETWORK ACCESS

### Network Segmentation

| Zone        | Access From   | Access To          |
| ----------- | ------------- | ------------------ |
| Public      | Internet      | CDN, Load balancer |
| Application | Load balancer | API, Functions     |
| Data        | Application   | Firestore, Storage |

### IP Restrictions

| Service          | Restriction                       |
| ---------------- | --------------------------------- |
| Firebase Console | Admin IPs only (optional)         |
| Vercel Dashboard | Team members only                 |
| Production APIs  | No IP restriction (auth required) |

---

## LOGGING & MONITORING

### Access Events Logged

| Event             | Logged | Retention |
| ----------------- | ------ | --------- |
| Login success     | ✅     | 90 days   |
| Login failure     | ✅     | 90 days   |
| Password change   | ✅     | 1 year    |
| Permission change | ✅     | 1 year    |
| Data access       | ✅     | 30 days   |
| Admin actions     | ✅     | 1 year    |

### Alerting

| Alert                 | Trigger                | Response            |
| --------------------- | ---------------------- | ------------------- |
| Brute force           | 10 failed logins/hour  | Block IP, notify    |
| Unusual access        | Off-hours admin access | Notify, investigate |
| Permission escalation | Self-elevation attempt | Block, alert        |

---

## COMPLIANCE MAPPING

| Framework | Control           | Status |
| --------- | ----------------- | ------ |
| SOC 2     | CC6.1-CC6.8       | ✅     |
| ISO 27001 | A.8.2-A.8.5       | ✅     |
| OWASP     | A01-Broken Access | ✅     |

---

_Document Status: 🔒 ACTIVE_
