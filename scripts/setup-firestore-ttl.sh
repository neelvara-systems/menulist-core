#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Firestore TTL Policy Setup
# ═══════════════════════════════════════════════════════════════
#
# Run this script ONCE after deploying to set up automatic
# document deletion for collections that accumulate over time.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Project set: gcloud config set project YOUR_PROJECT_ID
#
# How TTL works:
#   - Documents with a timestamp field older than the TTL
#     are automatically deleted by Firestore (free of charge).
#   - Deletion happens in background, may take up to 24h.
#   - Documents without the TTL field are NOT affected.
#
# @see https://firebase.google.com/docs/firestore/ttl
# ═══════════════════════════════════════════════════════════════

set -e

PROJECT_ID=$(gcloud config get-value project)
echo "Setting up Firestore TTL policies for project: $PROJECT_ID"

# ─────────────────────────────────────────────────────────────
# authSecurityEvents — Delete after 90 days
# Login/auth events are only needed for recent security analysis
# Field: timestamp (Firestore Timestamp)
# ─────────────────────────────────────────────────────────────
echo "→ authSecurityEvents: TTL on 'expiresAt' (90 days from creation)"
gcloud firestore fields ttls update expiresAt \
  --collection-group=authSecurityEvents \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || echo "  (already exists or field not found — OK)"

# ─────────────────────────────────────────────────────────────
# applicationLogs — Delete after 30 days
# Client-side app logs are for debugging, not long-term storage
# Field: expiresAt (Firestore Timestamp)
# ─────────────────────────────────────────────────────────────
echo "→ applicationLogs: TTL on 'expiresAt' (30 days from creation)"
gcloud firestore fields ttls update expiresAt \
  --collection-group=applicationLogs \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || echo "  (already exists or field not found — OK)"

# ─────────────────────────────────────────────────────────────
# errorLogs — Delete after 30 days
# Client-side error logs are for debugging, not long-term storage
# Field: expiresAt (Firestore Timestamp)
# ─────────────────────────────────────────────────────────────
echo "→ errorLogs: TTL on 'expiresAt' (30 days from creation)"
gcloud firestore fields ttls update expiresAt \
  --collection-group=errorLogs \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || echo "  (already exists or field not found — OK)"

# ─────────────────────────────────────────────────────────────
# systemErrors — Delete after 30 days
# System errors are for monitoring, Sentry has long-term storage
# Field: expiresAt (Firestore Timestamp)
# ─────────────────────────────────────────────────────────────
echo "→ systemErrors: TTL on 'expiresAt' (30 days from creation)"
gcloud firestore fields ttls update expiresAt \
  --collection-group=systemErrors \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || echo "  (already exists or field not found — OK)"

# ─────────────────────────────────────────────────────────────
# systemHealth — Delete after 7 days
# Health check snapshots are ephemeral
# Field: expiresAt (Firestore Timestamp)
# ─────────────────────────────────────────────────────────────
echo "→ systemHealth: TTL on 'expiresAt' (7 days from creation)"
gcloud firestore fields ttls update expiresAt \
  --collection-group=systemHealth \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || echo "  (already exists or field not found — OK)"

# ─────────────────────────────────────────────────────────────
# messagingOnboardingEvents — Delete after 30 days
# Onboarding analytics events are for short-term debugging
# Field: expiresAt (Firestore Timestamp)
# ─────────────────────────────────────────────────────────────
echo "→ messagingOnboardingEvents: TTL on 'expiresAt' (30 days from creation)"
gcloud firestore fields ttls update expiresAt \
  --collection-group=messagingOnboardingEvents \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || echo "  (already exists or field not found — OK)"

echo ""
echo "✅ TTL policies configured."
echo ""
echo "IMPORTANT: For TTL to work, documents must include an 'expiresAt' field"
echo "with a Firestore Timestamp value set to the desired deletion time."
echo ""
echo "Example: { expiresAt: Timestamp.fromMillis(Date.now() + 90 * 24 * 60 * 60 * 1000) }"
