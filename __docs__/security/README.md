# 🔐 Security Documentation

## Overview

This folder contains all security-related documentation for MenuListAI platform. Each subfolder focuses on a specific security feature.

## 📁 Folder Structure

### `/authentication`

**Complete authentication and authorization system**

- Rate limiting and account lockout
- Session management
- Role-based access control (RBAC)
- Security logging

### `/csp`

**Content Security Policy implementation**

- CSP headers configuration
- Violation monitoring
- Development vs Production setup
- Migration guides

### `/app-check`

**Firebase App Check protection**

- Bot prevention
- reCAPTCHA v3 integration
- Setup and configuration
- Decision documentation

### `/input-validation`

**Input validation and sanitization**

- Zod schemas
- Validation patterns
- XSS/Injection prevention

### `/monitoring`

**Security event monitoring**

- Sentry integration
- Alert configuration
- Logging best practices

### `/owasp`

**OWASP Top 10 compliance**

- Implementation status
- Mitigation strategies
- Security checklists

### `/cors`

**CORS validation and protection**

- Origin validation
- Allowed origins whitelist
- Preflight handling
- withCORS() wrapper

### `/file-upload`

**File upload security**

- Magic byte verification
- File size/type limits
- Multiple signature variants
- Code consolidation (client/server)

### `/webhook`

**Webhook signature verification**

- HMAC-based validation
- Timing-safe comparison
- Provider-specific validators (Razorpay, Stripe, GitHub)
- Security event logging

### `/app-check`

**Firebase App Check setup**

- reCAPTCHA v3 integration
- Bot protection
- DDoS prevention
- Step-by-step setup guide

### `/api-security`

**API route protection**

- Middleware implementation
- Endpoint security
- Rate limiting

### `/payment-security`

**Payment and financial security**

- Razorpay integration
- Webhook validation
- Transaction security

### `/email-validation`

**Email validation and spam prevention**

- 10,000+ disposable email domains
- Front-end + back-end validation
- Domain format validation
- Maintenance guide

### `/dependency-security`

**Pinned dependency, audit, and upstream-advisory policy**

- Exact package and lockfile enforcement
- Safe remediation and `--force` prohibition
- Current Next/PostCSS upstream exception
- Fabric 7, Firebase Admin 14, UUID, Sharp, and Node 22 migration boundaries
- Release-time audit stop rules

### `/security-operating-system`

**Internal portfolio security evidence and audit orchestration**

- Product-separated security surface registry
- Existing verifier and local-emulator evidence map
- Mapped vs passed truth model
- Private finding and external-tool provenance rules
- No public runtime, source upload, automatic fixes, or deployment

## 🚀 Quick Start

**New to the project?** Start here:

1. Read `/authentication/complete-guide.md` - Understand auth system
2. Read `/monitoring/complete-guide.md` - Learn monitoring setup
3. Read `/owasp/IMPLEMENTATION_STATUS.md` - See security coverage

**Setting up production?**

1. Check `/deployment/PRODUCTION_CHECKLIST.md`
2. Review each security feature's setup guide
3. Enable monitoring and alerts

**Running an internal evidence audit?**

1. Read `/SECURITY.md`
2. Read `/security-operating-system/README.md`
3. Run `npm run security-os:audit`
4. Select only the smallest relevant mapped evidence command

## 📊 Security Status

This table is navigation, not certification. A current security claim requires
the exact relevant verifier or emulator command to run and its output to be
reviewed on the current worktree.

| Feature | Status | Current evidence note |
| --- | --- | --- |
| Authentication | Maintained | Use the mapped auth failure matrix and product-specific checks |
| Authorization | Maintained | Tenant/store/product scope remains verifier-specific |
| Input Validation | Maintained | Boundary tests exist; portfolio coverage is not represented as a percentage |
| Email Validation | Maintained | Disposable-domain data size is not a security-completion metric |
| CSP | Partial | Reporting and policy evidence are separate from full browser-header review |
| App Check | Setup-dependent | Code presence does not prove live provider enforcement |
| Monitoring | Setup-dependent | Local code does not prove deployed alerts or retention |
| OWASP alignment | Partial | Checklist alignment is not certification |
| SecurityOS | Phase one | Registry implemented; mapped evidence remains not-run until executed |

## 🔗 Quick Links

- **Main README**: `/README.md`
- **Deployment Guide**: `/deployment/PRODUCTION_GUIDE.md`
- **Feature Flags**: `/features/CONFIGURATION.md`

---

**Last Updated**: July 29, 2026
**Maintained By**: Development Team
