# Firestore Vector Search: Troubleshooting and Implementation Guide

This document outlines the challenges and solutions encountered while implementing Firestore's native vector search functionality within a Next.js application. The primary goal was to resolve a persistent `TypeError: Vector is not a constructor` runtime error.

## 1. The Core Problem

When attempting to use Firestore's native vector capabilities for similarity search, the application would consistently crash with a `TypeError: Vector is not a constructor` error. This occurred in Next.js API routes when instantiating a vector object.

**Relevant Files:**
- `src/app/api/helpCenter/search-kb/route.ts`
- `src/app/api/helpCenter/generate-embedding/route.ts`

## 2. Root Cause Analysis

The issue stemmed from two primary sources:

*   __Incorrect Class Name:__ Through runtime debugging, we discovered that the correct class constructor exposed by the `firebase-admin` SDK (version `12.2.0`) is `VectorValue`, not `Vector`.
*   __Next.js Webpack Bundling:__ The way Next.js bundles server-side code for API routes interfered with the `firebase-admin` SDK. This resulted in an improperly initialized module, making it difficult to access the constructor correctly.

## 3. The Solution

A multi-step approach was required to resolve the issue, migrate existing data, and enable the search functionality.

### Step 3.1: Centralize Firebase Admin and Correct the Vector Class

To ensure a consistent and correctly initialized Firebase Admin instance, all initializations were centralized. We corrected the class usage by aliasing `VectorValue` as `Vector` for consistent use across the application.

**File Reference:** `src/lib/firebase/firebaseAdmin.ts`

```typescript
// src/lib/firebase/firebaseAdmin.ts

import admin from 'firebase-admin';

// ... firebase initialization logic

const firestoreAdmin = admin.firestore();
const Vector = (admin.firestore as any).VectorValue; // Corrected class

export { admin, firestoreAdmin, Vector };
```

### Step 3.2: Use a Standalone Migration Script

To bypass the Next.js build environment for a one-time data migration, we created a temporary standalone Node.js script (`scripts/migrate-embeddings.ts`) and ran it using `ts-node`. This allowed direct and correct access to the `firebase-admin` SDK to update Firestore documents with the new `VectorValue` object.

### Step 3.3: Create the Firestore Vector Index

The final step was to create a composite index in Firestore to enable vector similarity queries. This was done using the `gcloud` CLI.

**Command:**
```bash
gcloud firestore indexes composite create --project=[YOUR_PROJECT_ID] --collection-group=kb_articles --query-scope=COLLECTION --field-config=vector-config='{"dimension":"768","flat": "{}"}',field-path=embedding
```

This command creates the necessary index on the `embedding` field for the `kb_articles` collection, completing the setup for functional vector search.
