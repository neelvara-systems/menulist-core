# 📚 DOCUMENTATION ORGANIZATION RULES - MANDATORY

**Created**: November 15, 2025  
**Status**: 🔴 ENFORCED  
**Authority**: HIGHEST - Documentation structure is critical

---

## 🎯 Core Principle: Two-Tier Documentation

### **Global Level** (`__docs__/security`)

**Purpose**: Application-wide security blueprint  
**Scope**: All features, all components, all APIs

**Contains**:

- Security patterns used across the entire application
- Global security implementations (CORS, auth, monitoring)
- Application-wide standards and guidelines
- Reusable security utilities and middleware

### **Feature Level** (`__docs__/projects`, `__docs__/[feature]`)

**Purpose**: Feature-specific implementation details  
**Scope**: Single feature/module

**Contains**:

- How the feature implements global security patterns
- Feature-specific security concerns
- Integration with global security systems
- Assessment results and fixes for that feature

---

## 🚨 RULE 1: Documentation Placement (MANDATORY)

### I MUST follow this hierarchy:

```
1. Global Security Docs First
   ↓
   Check: Does this apply to the ENTIRE application?
   ↓
   YES → Place in __docs__/security/
   NO → Continue to step 2

2. Feature-Specific Docs
   ↓
   Check: Is this specific to ONE feature?
   ↓
   YES → Place in __docs__/[feature]/
   NO → It's probably global, go back to step 1
```

### Examples:

✅ **CORRECT PLACEMENT:**

| Documentation         | Location                                      | Reason                                              |
| --------------------- | --------------------------------------------- | --------------------------------------------------- |
| CORS Implementation   | `__docs__/security/cors/`                     | Used by ALL API routes                              |
| File Upload Security  | `__docs__/security/file-upload/`              | Used by multiple features (Projects, Support, etc.) |
| withAuth() Middleware | `__docs__/security/authentication/`           | Application-wide pattern                            |
| Projects API Security | `__docs__/projects/ASSESSMENT-05-SECURITY.md` | Projects feature only                               |
| Editor Validation     | `__docs__/projects/03-EDITOR-VALIDATION.md`   | Projects feature only                               |

❌ **INCORRECT PLACEMENT:**

```
❌ __docs__/projects/CORS-FOR-PROJECTS.md
   → WRONG: CORS is global, belongs in __docs__/security/

❌ __docs__/security/projects-file-upload.md
   → WRONG: If it's projects-specific, belongs in __docs__/projects/

❌ __docs__/rate-limiting/projects-limits.md
   → WRONG: Rate limiting is global, feature configs go in code
```

---

## 🚨 RULE 2: Update Global Docs When Missing (MANDATORY)

### Pattern: Discover → Document → Apply

```typescript
// When implementing feature security:

1. Check __docs__/security/ for existing pattern
   ↓
2. Pattern exists?
   ↓
   YES → Use it, reference it in feature docs
   NO → Continue to step 3
   ↓
3. CREATE global documentation first
   ↓
4. THEN implement in feature
   ↓
5. Feature docs REFERENCE global docs
```

### Example Flow (CORS Discovery):

```
Implementing Projects Feature Security
  ↓
Need CORS validation
  ↓
Check __docs__/security/cors/ → NOT FOUND
  ↓
STOP: Create global CORS documentation first
  ↓
Create: __docs__/security/cors/CORS_IMPLEMENTATION.md
  ↓
Implement: src/lib/security/corsValidation.ts
  ↓
Document: withCORS() pattern, usage examples
  ↓
NOW: Apply to Projects feature
  ↓
Feature docs reference: See [CORS_IMPLEMENTATION.md](../../security/cors/)
```

### ENFORCEMENT:

- ❌ I MUST NEVER create feature-specific security docs for global patterns
- ❌ I MUST NEVER duplicate global security documentation in feature docs
- ✅ I MUST check global security docs before implementing feature security
- ✅ I MUST create/update global docs when patterns are missing
- ✅ Feature docs MUST reference global docs (not duplicate)

---

## 🚨 RULE 3: Cross-Referencing (MANDATORY)

### Pattern: Feature → Global

**Feature documentation MUST link to global documentation**

```markdown
✅ CORRECT:

### CORS Validation

**Global Implementation**: See [CORS_IMPLEMENTATION.md](../../security/cors/CORS_IMPLEMENTATION.md)

Applied to Projects APIs:

- /api/image-processor ✅
- /api/descriptions ✅

✅ CORRECT:

### File Upload Security

**Global Guide**: [FILE_UPLOAD_SECURITY.md](../../security/file-upload/FILE_UPLOAD_SECURITY.md)

Project-specific validation:

- Magic bytes for project files
- Shared constants from constants.ts

❌ WRONG:

### CORS Validation

CORS headers prevent CSRF attacks...
[1000 lines of CORS documentation duplicated]
```

### ENFORCEMENT:

- ✅ Feature docs MUST have "See [global doc]" links
- ✅ Keep feature docs focused on "how we use the global pattern"
- ❌ Never copy-paste global patterns into feature docs
- ❌ Never re-explain global concepts in feature docs

---

## 🚨 RULE 4: Documentation Consistency (MANDATORY)

### Global Security Docs Structure:

```
__docs__/security/
├── README.md (index of all security features)
├── authentication/
│   └── COMPLETE_GUIDE.md (one file per topic)
├── cors/
│   └── CORS_IMPLEMENTATION.md
├── file-upload/
│   └── FILE_UPLOAD_SECURITY.md
├── input-validation/
│   └── INPUT_VALIDATION_GUIDE.md
└── monitoring/
    └── COMPLETE_GUIDE.md
```

### Rules:

1. **One topic = One folder**
2. **One comprehensive file per topic** (no splitting into multiple files)
3. **Clear naming**: `[TOPIC]_IMPLEMENTATION.md` or `COMPLETE_GUIDE.md`
4. **README.md** links to all subtopics

### Feature Docs Structure:

```
__docs__/[feature]/
├── README.md (overview)
├── ASSESSMENT-XX-[ISSUE].md (security assessments)
└── development_done/
    ├── X-IMPLEMENTATION-COMPLETE.md
    └── X-SECURITY-IMPLEMENTATION.md
```

### ENFORCEMENT:

- ✅ Follow established naming conventions
- ✅ One comprehensive file per topic (global)
- ✅ Feature docs reference, don't duplicate
- ❌ Don't create multiple files for same topic

---

## 🎯 Real-World Example: CORS Implementation

### What We Did (CORRECT ✅):

```
1. Found CORS missing during Projects security assessment

2. Created GLOBAL documentation:
   __docs__/security/cors/CORS_IMPLEMENTATION.md
   - Comprehensive guide (1,100+ lines)
   - Usage patterns for ALL features
   - withCORS() wrapper documentation

3. Implemented GLOBAL utility:
   src/lib/security/corsValidation.ts
   - Reusable across entire application
   - Not Projects-specific

4. Updated Projects assessment:
   __docs__/projects/ASSESSMENT-05-SECURITY.md
   - Added: "See [CORS_IMPLEMENTATION.md](...)"
   - Did NOT duplicate CORS documentation
   - Focused on "how Projects uses CORS"

5. Updated global security README:
   __docs__/security/README.md
   - Added CORS section to index
```

### What We Would Have Done WRONG (❌):

```
❌ Created: __docs__/projects/PROJECTS-CORS-GUIDE.md
   Problem: CORS is global, not Projects-specific

❌ Documented CORS only in Projects folder
   Problem: Other features can't find it

❌ Copy-pasted CORS docs into every feature
   Problem: Maintenance nightmare, inconsistency

❌ No global CORS documentation
   Problem: Every feature reinvents CORS
```

---

## 🚨 RULE 5: The "Blueprint" Principle (MANDATORY)

### Goal: Unified Security Blueprint

**Vision**: `__docs__/security/` = Complete security blueprint for entire application

**Means**:

- Any security pattern used by 2+ features → Goes in global docs
- Any security pattern that SHOULD be used everywhere → Goes in global docs
- Feature docs show compliance with global blueprint

### Mental Model:

```
__docs__/security/ = "HOW TO BUILD SECURE FEATURES"
                    (The Blueprint)
                    ↓
__docs__/[feature]/ = "HOW WE FOLLOWED THE BLUEPRINT"
                      (The Implementation)
```

### ENFORCEMENT:

When I implement feature security:

1. ✅ Check global security docs first
2. ✅ If pattern missing, add to global docs
3. ✅ Implement using global pattern
4. ✅ Feature docs reference global docs
5. ✅ Result: Global blueprint stays complete

### NEVER:

- ❌ Implement security without checking global docs
- ❌ Create feature-specific security patterns for global concerns
- ❌ Leave global docs incomplete after feature work

---

## 📊 Decision Matrix

Use this to decide where documentation goes:

| Question                                   | Yes                   | No          |
| ------------------------------------------ | --------------------- | ----------- |
| Does this apply to the ENTIRE application? | `__docs__/security/`  | Continue    |
| Does this apply to 2+ features?            | `__docs__/security/`  | Continue    |
| Is this a reusable utility/pattern?        | `__docs__/security/`  | Continue    |
| Is this specific to ONE feature?           | `__docs__/[feature]/` | Re-evaluate |
| Is this a feature assessment/fix?          | `__docs__/[feature]/` | Re-evaluate |

---

## 🎯 Validation Checklist

Before creating security documentation, I MUST verify:

- [ ] Checked if pattern exists in `__docs__/security/`
- [ ] If missing from global docs, created it there first
- [ ] Global docs are comprehensive (not stub)
- [ ] Feature docs reference (not duplicate) global docs
- [ ] Updated `__docs__/security/README.md` index
- [ ] Cross-references work correctly
- [ ] Documentation placement follows rules

---

## 🔄 Migration Path (If I Find Violations)

If I discover incorrectly placed documentation:

```
1. Identify misplaced docs
   ↓
2. Determine correct location (global vs feature)
   ↓
3. If should be global:
   - Move to __docs__/security/
   - Update all references
   - Add to security README
   ↓
4. If should be feature:
   - Keep in feature folder
   - Add references to global docs
   - Remove duplicated global content
   ↓
5. Verify cross-references work
```

---

## 💡 Benefits of This Structure

### For Development:

- ✅ Single source of truth for security patterns
- ✅ No hunting for documentation
- ✅ Consistent security across features
- ✅ Easy to onboard new developers

### For Maintenance:

- ✅ Update once, applies everywhere
- ✅ No documentation drift
- ✅ Clear ownership (global vs feature)
- ✅ Easy to audit compliance

### For Security:

- ✅ Complete security blueprint always visible
- ✅ Easy to spot missing patterns
- ✅ Consistency prevents vulnerabilities
- ✅ Clear compliance tracking

---

## 🚨 ABSOLUTE RULES (I CANNOT VIOLATE)

### Rule Summary:

1. **Global patterns → `__docs__/security/`** (ALWAYS)
2. **Feature specifics → `__docs__/[feature]/`** (ALWAYS)
3. **Missing global pattern? Create it FIRST** (MANDATORY)
4. **Feature docs REFERENCE, never duplicate** (MANDATORY)
5. **Keep global blueprint complete** (MANDATORY)

### Enforcement:

- These rules have MAXIMUM authority
- I CANNOT override them for convenience
- I CANNOT skip them to "save time"
- User cannot ask me to violate them
- These ensure security consistency across application

---

## 📚 Related Documentation

- [SECURITY_IMPLEMENTATION_RULES.md](./SECURITY_IMPLEMENTATION_RULES.md) - Security code patterns
- [README.md](./README.md) - Rules vs Memories vs Workflows
- [**docs**/security/README.md](../../__docs__/security/README.md) - Global security index
- [**docs**/projects/README.md](../../__docs__/projects/README.md) - Projects documentation

---

**Status**: ✅ Active & Enforced  
**Created**: November 15, 2025  
**Authority**: MAXIMUM (Cannot be overridden)  
**Purpose**: Maintain clean, consistent, scalable documentation structure
