#!/usr/bin/env bash
# Guarded one-time MenuList Firestore TTL policy setup.
#
# Usage:
#   bash scripts/setup-firestore-ttl.sh --project-id menulist-qa
#   bash scripts/setup-firestore-ttl.sh --project-id menulist-qa --apply --confirm-project menulist-qa
#
# Dry-run is the default. TTL deletions are asynchronous and are billable
# Firestore document-delete operations; documents without a valid expiresAt
# Timestamp are not eligible.

set -euo pipefail

PROJECT_ID=""
CONFIRMED_PROJECT_ID=""
APPLY=false
DATABASE_ID="(default)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-id)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --confirm-project)
      CONFIRMED_PROJECT_ID="${2:-}"
      shift 2
      ;;
    --apply)
      APPLY=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$PROJECT_ID" != "menulist-qa" && "$PROJECT_ID" != "menulist" ]]; then
  echo "--project-id must be menulist-qa or menulist." >&2
  exit 1
fi

if [[ "$APPLY" == true && "$CONFIRMED_PROJECT_ID" != "$PROJECT_ID" ]]; then
  echo "Refusing apply: pass --confirm-project $PROJECT_ID." >&2
  exit 1
fi

command -v gcloud >/dev/null 2>&1 || {
  echo "gcloud is required." >&2
  exit 1
}

gcloud projects describe "$PROJECT_ID" --format='value(projectId)' >/dev/null

TTL_COLLECTION_GROUPS=(
  "authPhoneOtpChallenges"
  "authPhoneOtpLoginTokens"
  "authSecurityEvents"
  "applicationLogs"
  "errorLogs"
  "systemErrors"
  "systemAlerts"
  "systemHealth"
  "systemTelemetry"
  "messagingOnboardingEvents"
  "messagingOnboardingInboundMessages"
  "messagingOnboardingRateLimits"
)

echo "Project: $PROJECT_ID"
echo "Database: $DATABASE_ID"
echo "Mode: $([[ "$APPLY" == true ]] && echo APPLY || echo 'DRY RUN')"

for collection_group in "${TTL_COLLECTION_GROUPS[@]}"; do
  if [[ "$APPLY" == false ]]; then
    echo "[dry] enable expiresAt TTL for collection group: $collection_group"
    continue
  fi

  echo "[apply] enable expiresAt TTL for collection group: $collection_group"
  gcloud firestore fields ttls update expiresAt \
    --collection-group="$collection_group" \
    --database="$DATABASE_ID" \
    --enable-ttl \
    --project="$PROJECT_ID" \
    --quiet
done

if [[ "$APPLY" == true ]]; then
  echo "TTL policy update commands completed successfully for $PROJECT_ID."
else
  echo "Dry run complete. No TTL policy was changed."
fi
