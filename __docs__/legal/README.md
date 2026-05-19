# Legal — Documentation Hub

> **Category:** Legal & Compliance Pages  
> **Last Updated:** May 19, 2026

---

## Documents

| Document | Purpose |
|----------|---------|
| [legal-pages-implementation.md](./legal-pages-implementation.md) | Legal pages implementation (Privacy Policy, Terms, Cookie Policy) |

## Summary

Documentation for customer-facing legal pages — privacy policy, terms of service, cookie consent, and compliance requirements.

## Staff Access Alignment

Staff management and roles/permissions affect public legal and security content because staff accounts introduce owner-created user identities, role-scoped access, Staff ID/passcode login, reset metadata, and owner session revocation.

Current public-page alignment:

- `/privacy-policy` discloses staff account data, role/store assignment, account status, authorized team access, reset/session metadata, and that MenuList does not store plain-text staff passcodes.
- `/terms-of-service` makes owners responsible for staff access they create, safe Staff ID/passcode sharing, correct role assignment, and ending access when staff leave.
- `/trust-security` describes role-scoped staff access, Firebase/Google Auth handling, and owner reset/sign-out controls without claiming GDPR certification or HR/payroll/attendance coverage.
