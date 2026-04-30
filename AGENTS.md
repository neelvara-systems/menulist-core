# AGENTS.md — Persistent Brain + Execution System

**Version:** 2.0  
**Status:** 🔒 CRITICAL — SYSTEM AUTHORITY  
**Last Updated:** April 2026

---

## Purpose

This file serves as the **persistent brain** for Codex, replacing Windsurf memory. Contains system decisions, architecture truths, and critical gotchas that must be remembered across all sessions.

---

## System Decisions

### Product Architecture

- **MenuList**: Canonical public business truth infrastructure for SMB restaurants
- **Canonica**: Support Knowledge Control Plane for SaaS (separate product)
- **3-Product Separation**: MenuList vs GrowthOS vs VisualMeta - never merge
- **Infrastructure Identity**: MenuList is public utility, not SaaS software

### Technology Stack Decisions

- **Next.js 14.2.5**: Frozen for 3-year period - no upgrades
- **Dual Platform**: Desktop (Ant Design + SCSS) vs Mobile (antd-mobile + Tailwind)
- **State Management**: Redux Toolkit + Redux Persist - no alternatives
- **Backend**: Firebase (Firestore, Functions, Auth) - cost-optimized patterns
- **Authentication**: NextAuth.js - session management with security guards

### Development Philosophy

- **Docs-First Development**: 7-document set before any code
- **3-Year Freeze**: Complete features ship, no "Phase 2" promises
- **Zero Tolerance Bug Policy**: Fix immediately, no exceptions
- **Constitutional Governance**: All decisions follow MenuList Constitution v3.0

---

## Architecture Truths

### Data Access Layer (DAL) Patterns

- **Client-Side Preference**: Use client-side DAL over unnecessary API routes
- **Compositional Patterns**: apiCallComposer, requestBodyComposer for consistency
- **Firebase Cost Awareness**: Every read/write/delete impacts revenue
- **Single Sources of Truth**: Eliminate redundant data access patterns

### Mobile Architecture

- **Mandatory Mobile Support**: Every feature needs mobile layer
- **Inheritance Model**: Mobile inherits auth, localization, settings from shared logic
- **Optimistic Updates**: UI updates instantly, backend syncs after
- **Touch Optimization**: Large targets, instant feedback, no desktop refactoring

### Security Architecture

- **Input Sanitization**: DOMPurify for all user content
- **Auth Guards**: NextAuth.js with session validation
- **Type Safety**: TypeScript strict mode with Zod validation
- **Data Validation**: Runtime validation at all boundaries

---

## Critical Gotchas

### Development Gotchas

- **Never Mix Icon Libraries**: Use react-icons/lu (Lucide) only
- **No Version Upgrades**: 3-year freeze applies to all dependencies
- **Mobile Files**: Every feature needs `[feature-name]_mobile-support.md`
- **Feature Flags**: Required in `src/config/features.ts` for all new features
- **Type Check**: Must pass `npx tsc --noEmit` before completion

### Documentation Gotchas

- **7-Document Standard**: spec, impl, marketing, website, helpdoc, firebase, README
- **Path Verification**: Every claim must link to exact `file:line` evidence
- **Language Governance**: No "AI-powered", "Smart", "Dynamic" in public content
- **Constitutional Language**: Use "No action needed", "Menu state is stable"

### Firebase Gotchas

- **Cost Tracking**: Document every operation's revenue impact
- **Read Optimization**: Prefer client-side queries over server functions
- **Write Patterns**: Batch operations, minimize document writes
- **Auth Context**: User context affects security rules and costs

### Mobile Gotchas

- **antd-mobile Components**: Use mobile-native components only
- **Tailwind CSS**: Mobile styling layer, don't mix with SCSS modules
- **Touch Events**: Handle touch interactions properly
- **Performance**: Mobile-first optimization required

---

## Product Context Memory

### MenuList Identity

- **North Star**: "The system keeps working when no one is watching"
- **10 Laws**: Default Authority, Silence Is Feature, No Explanations, etc.
- **Infrastructure Mentality**: Upstream positioning, cleanest source
- **Zero Cognitive Load**: If it makes owners think, don't ship

### Canonica Identity (if working on Canonica)

- **Support Knowledge Control Plane**: Help center, KB, tickets, chat
- **5 Pillars**: Canonical answers, drift detection, etc.
- **Infrastructure Freeze**: Independent 3-year freeze
- **Non-Goals Charter**: What NOT to build (feature rejection filter)

---

## Workflow Memory

### Master Execution Protocol

- **Product Detection**: Auto-detect MenuList vs Canonica context
- **Context Loading**: Load appropriate constitution/rules/doctrine
- **Workflow Routing**: 17 integrated workflows
- **Validation**: Web search + codebase reuse + ChatGPT input handling

### Documentation Workflow

- **IDE_PROMPTS**: 19 integrated prompts for all phases
- **Slash Commands**: Use `/help` for workflow routing
- **Validation Strengthening**: Cross-check after implementation
- **End-of-Session**: 8-phase wrap-up protocol

---

## Codebase Structure Memory

### Key Directories

- `__docs__/`: All documentation (constitution, features, canonica)
- `IDE_PROMPTS/`: Development workflow prompts
- `.cascade/rules/`: Security and implementation rules
- `src/config/features.ts`: Feature flag management
- `src/constants/database.ts`: Database constants
- `.kilocode/rules/`: Custom instructions for AI

### Critical Files

- `package.json`: Frozen dependency versions
- `next.config.js`: Next.js configuration with optimizations
- `tsconfig.json`: TypeScript strict configuration
- `firebase.json`: Firebase configuration and rules
- `tailwind.config.ts`: Tailwind configuration for mobile

---

## Testing Memory

### Testing Requirements

- **3 Perspectives**: Unit, Integration, E2E
- **Type Safety**: `npx tsc --noEmit` mandatory
- **Mobile Testing**: Touch interactions, responsive design
- **Performance**: Firebase cost optimization validation

### Validation Checklist

- **Code Review**: Security, performance, maintainability
- **Documentation Review**: Completeness, accuracy, governance
- **Cross-Feature Review**: Consistency, redundancy elimination
- **UI/UX Review**: Mobile optimization, accessibility

---

## Cost Memory

### Firebase Cost Impact

- **Read Operations**: Most expensive, optimize queries
- **Write Operations**: Batch when possible
- **Delete Operations**: Document cleanup costs
- **Auth Operations**: Session management overhead

### Development Cost Discipline

- **Client-Side Preference**: Reduce server function calls
- **Data Reuse**: Cache results, avoid duplicate reads
- **Query Optimization**: Index planning, selective fetching
- **Real-time Updates**: Use judiciously, cost-aware

---

## Security Memory

### Security Implementation Rules

- **Input Validation**: Zod schemas at all boundaries
- **Content Sanitization**: DOMPurify for user content
- **Auth Context**: User-based security rules
- **Data Exposure**: Minimize client-side data access

### Common Security Gotchas

- **XSS Prevention**: Sanitize all user content
- **CSRF Protection**: NextAuth.js handles automatically
- **Data Leaks**: Avoid over-fetching from Firestore
- **Session Management**: Proper token handling

---

## Performance Memory

### Performance Optimization

- **Bundle Size**: Code splitting, lazy loading
- **Image Optimization**: Compressor.js, React Cropper
- **Database Queries**: Optimized Firestore queries
- **Mobile Performance**: Touch response time, battery usage

### Common Performance Gotchas

- **Large Bundle Sizes**: Monitor with bundle analyzer
- **Slow Database Queries**: Use composite indexes
- **Memory Leaks**: Proper cleanup in React components
- **Mobile Battery**: Optimize background operations

---

## Decision Framework Memory

### Decision Hierarchy

1. **MenuList Constitution** - Supreme authority
2. **Master Rules** - Development governance
3. **Security Rules** - Implementation constraints
4. **Feature Documentation** - Feature-specific truth
5. **Existing Code** - Current implementation

### Decision Patterns

- **Codebase > External Research**: Our code is truth
- **Constitution > Assumptions**: Governance documents override
- **Security > Convenience**: Never compromise security
- **Cost > Features**: Firebase costs impact revenue

---

## Communication Memory

### Canonical Phrases (Use These)

- "No action needed."
- "Everything is running normally."
- "Menu state is stable."
- "Handled automatically."
- "No change today."
- "This is set."

### Communication Standards

- **Direct and Factual**: Clear file/line references
- **Evidence-Based**: Back claims with code evidence
- **Structured Updates**: Use markdown headings and bullets
- **Constitutional Language**: Use approved phrases

---

**Document Signature:** Persistent Brain - System Memory Replacement  
**Authority:** Maximum - Critical system memory for all AI sessions
