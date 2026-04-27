export const dynamic = 'force-dynamic';
/**
 * Approve API Route — Trigger publish pipeline
 *
 * Token-based access (no NextAuth — ADR-13/INV-2).
 * Double-publish protection via Firestore transaction (§8.2.7).
 * Publish failure recovery: PUBLISHING → AWAITING_APPROVAL on failure.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §4.2, §8.2.7
 */

import countryData from "@atoms/phoneNumberInput/countryData";
import { DB_COLLECTIONS } from "@constant/database";
import { getGeneratedEmail, getMenuUrl, SIGNIN_URL } from "@constant/urls";
import { getOwnerRoleId } from "@data/defaultRoles";
import { admin } from "@lib/firebase/firebaseAdmin";
import { CANONICAL_SOURCE_LANGUAGE, normalizeProjectLanguages } from "@lib/localization/languagePolicy";
import { createTenantStoreInTransaction, preCheckSubdomain } from "@lib/onboarding/createTenantStore";
import { secureError } from "@lib/security/secureLogger";
import { slugify } from "@lib/utils/slugify";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const db = admin.firestore();

const getCanonicalExtractionLanguages = (languages: any): string[] => normalizeProjectLanguages(
  Array.isArray(languages)
    ? languages.map((language) => typeof language === "string" ? language : language?.code)
    : [],
);

const getDetectedDefaultLanguage = (languages: any): string => {
  if (Array.isArray(languages)) {
    const primary = languages.find((language) => language?.isPrimary)?.code;
    if (primary) return String(primary).trim().toLowerCase();

    const firstCode = typeof languages[0] === "string" ? languages[0] : languages[0]?.code;
    if (firstCode) return String(firstCode).trim().toLowerCase();
  }
  return CANONICAL_SOURCE_LANGUAGE;
};

const ApproveSchema = z.object({
  token: z.string().min(20),
  businessName: z.string().min(1).max(100),
  businessType: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    // 🛡️ PUBLISH THROTTLE: Prevent rapid-fire publishes (IP-based)
    const { checkRateLimit } = await import('@lib/rateLimit');
    const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const publishLimitConfig = getRateLimitForFeature('PUBLISH_OPERATION');
    const publishLimit = await checkRateLimit({ key: `publish:${ip}`, ...publishLimitConfig });
    if (!publishLimit.allowed) {
      return NextResponse.json(
        { error: "Too many publish attempts. Please wait before trying again." },
        { status: 429 }
      );
    }

    const { sessionId } = params;

    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const body = await request.json();
    const validation = ApproveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { token, businessName, businessType, phone, address } = validation.data;
    const sessionRef = db
      .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
      .doc(sessionId);

    // Double-publish protection: atomic state check + transition (§8.2.7)
    let sessionData: any;
    try {
      sessionData = await db.runTransaction(async (tx) => {
        const sessionDoc = await tx.get(sessionRef);
        if (!sessionDoc.exists) {
          throw new Error("Session not found");
        }

        const data = sessionDoc.data()!;

        // Validate token
        if (data.previewToken !== token) {
          throw new Error("Invalid token");
        }

        // Check session is in correct state
        if (data.state !== "AWAITING_APPROVAL") {
          throw new Error(
            `Cannot publish: session state is ${data.state}, not AWAITING_APPROVAL`,
          );
        }

        // Check not expired
        if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
          throw new Error("Session expired");
        }

        // Atomically transition to PUBLISHING
        tx.update(sessionRef, {
          state: "PUBLISHING",
          stateHistory: FieldValue.arrayUnion({
            state: "PUBLISHING",
            timestamp: Timestamp.now(),
            reason: "Owner approved publish",
          }),
          updatedAt: Timestamp.now(),
        });

        return data;
      });
    } catch (txError) {
      const msg = (txError as Error).message;
      if (msg.includes("Invalid token")) {
        return NextResponse.json({ error: "Invalid token" }, { status: 403 });
      }
      if (msg.includes("Session not found")) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (msg.includes("Cannot publish")) {
        return NextResponse.json({ error: msg }, { status: 409 });
      }
      if (msg.includes("expired")) {
        return NextResponse.json({ error: "Session expired" }, { status: 410 });
      }
      throw txError;
    }

    // Log preview approved event
    db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
      .add({
        eventId: crypto.randomUUID(),
        sessionId,
        provider: sessionData.provider,
        eventType: "PREVIEW_APPROVED",
        sessionState: "PUBLISHING",
        userIdMasked: (sessionData.providerUserId || "").slice(-4),
        metadata: { businessName, businessType },
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sessionAgeMs: sessionData.createdAt
          ? Date.now() - sessionData.createdAt.toMillis()
          : 0,
      })
      .catch(() => { });

    // Publish validation gate (spec §Failure Handling — M-2)
    const menuData = sessionData.extractedMenuData;
    const categoryCount = menuData?.categories?.length || 0;
    const itemCount = menuData?.items?.length || 0;
    const hasItemWithPrice = (menuData?.items || []).some(
      (item: any) => item.price !== undefined && item.price !== null && item.price !== "",
    );

    if (categoryCount < 1 || itemCount < 1 || !hasItemWithPrice) {
      // Revert to AWAITING_APPROVAL — don't lose data
      await sessionRef.update({
        state: "AWAITING_APPROVAL",
        stateHistory: FieldValue.arrayUnion({
          state: "AWAITING_APPROVAL",
          timestamp: Timestamp.now(),
          reason: "Publish validation failed: menu must have at least 1 category and 1 item with a price",
        }),
        updatedAt: Timestamp.now(),
      });
      return NextResponse.json(
        { error: "Menu must have at least 1 category and 1 item with a price." },
        { status: 422 },
      );
    }

    // Execute publish with retry (§8.2.7 — Publish Failure Recovery)
    const resolvedBusinessType = businessType || sessionData.detectedBusinessType || "Restaurant";
    const resolvedPhone = phone || sessionData.providerDisplayId;
    const resolvedAddress = address || sessionData.extractedBusinessInfo?.address || "";

    try {
      const result = await executePublishFromApiRoute(sessionId, {
        businessName,
        businessType: resolvedBusinessType,
        phone: resolvedPhone,
        address: resolvedAddress,
        sessionData,
      });

      return NextResponse.json({
        success: true,
        publishedResult: result,
      });
    } catch (publishError) {
      // Retry once
      try {
        const result = await executePublishFromApiRoute(sessionId, {
          businessName,
          businessType: resolvedBusinessType,
          phone: resolvedPhone,
          address: resolvedAddress,
          sessionData,
        });

        return NextResponse.json({
          success: true,
          publishedResult: result,
        });
      } catch (retryError) {
        // Recovery: return to AWAITING_APPROVAL (not FAILED)
        await sessionRef.update({
          state: "AWAITING_APPROVAL",
          stateHistory: FieldValue.arrayUnion({
            state: "AWAITING_APPROVAL",
            timestamp: Timestamp.now(),
            reason: `Publish failed after retry: ${(retryError as Error).message}`,
          }),
          updatedAt: Timestamp.now(),
        });

        // Log failure
        db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
          .add({
            eventId: crypto.randomUUID(),
            sessionId,
            provider: sessionData.provider,
            eventType: "PUBLISH_FAILED",
            sessionState: "AWAITING_APPROVAL",
            userIdMasked: (sessionData.providerUserId || "").slice(-4),
            metadata: {},
            timestamp: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
            sessionAgeMs: 0,
            error: {
              code: "PUBLISH_FAILED",
              message: (retryError as Error).message,
              retryable: true,
            },
          })
          .catch(() => { });

        return NextResponse.json(
          { error: "Publishing failed. Please try again." },
          { status: 500 },
        );
      }
    }
  } catch (error) {
    secureError("[msg-preview/approve] Error", error as Error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}

/**
 * Execute publish directly from API route using Admin SDK.
 * Mirrors publishPipeline.ts logic but runs in Next.js context.
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §8.2.7 — ADR-10
 */
async function executePublishFromApiRoute(
  sessionId: string,
  params: {
    businessName: string;
    businessType: string;
    phone: string;
    address: string;
    sessionData: any;
  },
): Promise<any> {
  const { businessName, businessType, phone, address, sessionData } = params;

  // Infer country/currency from phone (uses frontend countryData.ts — 252 countries)
  const countryInfo = inferCountryFromPhone(sessionData.providerDisplayId || "");
  const country = countryInfo.code;
  const currency = { code: countryInfo.currencyCode, symbol: countryInfo.currencySymbol, timezone: countryInfo.timeZone };

  // Generate placeholder email
  const generatedEmail = getGeneratedEmail(sessionData.providerDisplayId || "");

  const menuData = sessionData.extractedMenuData;
  const extractedLanguageCodes = getCanonicalExtractionLanguages(menuData?.languages);
  const detectedDefaultLanguage = getDetectedDefaultLanguage(menuData?.languages);

  // Story 3B: Check if user with this phone already exists (spec §Story 3B)
  // Query BEFORE transaction — if exists, we UPDATE instead of CREATE
  const existingUserQuery = await db
    .collection(DB_COLLECTIONS.USERS)
    .where("phone", "==", sessionData.providerDisplayId || "")
    .limit(1)
    .get();
  const existingUserDoc = existingUserQuery.empty ? null : existingUserQuery.docs[0];

  // Pre-check subdomain uniqueness (must be outside transaction)
  const preCheckedSubdomain = await preCheckSubdomain(db, businessName);

  // Atomic transaction
  const result = await db.runTransaction(async (transaction) => {
    // Centralized tenant + store creation
    const core = await createTenantStoreInTransaction(transaction, db, {
      businessName,
      businessType,
      email: generatedEmail,
      onboardingSource: 'MESSAGING_ONBOARDING',
      subdomain: { preChecked: preCheckedSubdomain },
      includeTimeSlotPresets: true,
      storeExtra: {
        activationDeadline: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        phoneNumber: sessionData.providerDisplayId || "",
        activeLanguages: extractedLanguageCodes,
        defaultLanguage: detectedDefaultLanguage,
        country,
        currencyCode: currency.code,
        currencySymbol: currency.symbol,
        timeZone: currency.timezone,
        logo: "",
      },
    });

    // Create or Update User (Story 3B: link to existing user doc if phone exists)
    // Auth Fix: Generate claimToken outside conditional so it's accessible in return
    let claimToken: string | null = null;
    let userRef;
    if (existingUserDoc) {
      // Story 3B: User exists (prior dashboard signup) — UPDATE, not create
      userRef = existingUserDoc.ref;
      transaction.update(userRef, {
        tenantId: core.tenantId,
        storeId: core.storeId,
        stores: [{ storeId: core.storeId, name: core.storeName, role: getOwnerRoleId() }],
        provider: sessionData.provider,
        providerUserId: sessionData.providerUserId,
        onboardingSource: "MESSAGING_ONBOARDING",
        modifiedOn: core.now,
      });
    } else {
      // New user — CREATE
      // Auth Fix: Generate claimToken so owner can link their Google account
      claimToken = crypto.randomBytes(32).toString("base64url");
      const claimTokenExpiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      userRef = db.collection(DB_COLLECTIONS.USERS).doc();
      transaction.set(userRef, {
        phone: sessionData.providerDisplayId || "",
        email: generatedEmail,
        name: businessName,
        isVerified: true,          // Auth Fix: Required for NextAuth signIn callback
        active: true,
        platformRole: "OWNER",     // Auth Fix: Required for session.platformRole
        tenantId: core.tenantId,
        storeId: core.storeId,
        stores: [{ storeId: core.storeId, name: core.storeName, role: getOwnerRoleId() }],
        profileImage: "",
        provider: sessionData.provider,
        providerUserId: sessionData.providerUserId,
        createdVia: "messaging-onboarding",
        onboardingSource: "MESSAGING_ONBOARDING",
        claimToken,                // Auth Fix: One-time token for Google account linking
        claimTokenExpiresAt,       // Auth Fix: 7-day expiry for claim token
        createdOn: core.now,
        modifiedOn: core.now,
      });
    }

    // Create Project
    // Path: projects/{tId}/{sId}/{projectId} — matches database/projects/index.ts DAL pattern
    const projectId = `${core.tenantId}-default-${core.storeId}`;
    const projectRef = db.collection(`projects/${core.tenantId}/${core.storeId}`).doc(projectId);
    const validUploads = (sessionData.uploads || []).filter(
      (u: any) => (sessionData.validMenuFiles || []).includes(u.id),
    );

    transaction.set(projectRef, {
      projectId,
      tenantId: core.tenantId,
      storeId: core.storeId,
      files: validUploads.map((upload: any, index: number) => ({
        uid: upload.id,
        name: upload.id,
        size: upload.fileSize,
        type: upload.mimeType,
        url: upload.storageUrl,
        // CRITICAL: Must wrap in { data: ... } to match ExtractedData schema.
        // Dashboard editor reads extractedData.data.categories / extractedData.data.items
        // (44 references across 13 editor files). Without wrapper → empty/broken menu.
        extractedData: index === 0 ? { data: menuData } : null,
      })),
      languages: extractedLanguageCodes,
      defaultLanguage: detectedDefaultLanguage,
      active: true,
      deleted: false,
      createdOn: core.now,
      modifiedOn: core.now,
    });

    // URL Routing Architecture: Create projectsSummary with slug
    // Ensures slug-based URL routing works for messaging-onboarded stores
    const projectSlug = slugify("Menu") || "menu-1";
    const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${core.storeId}`);
    transaction.set(projectsSummaryRef, {
      lastUpdated: core.now,
      [`projects.${projectId}`]: {
        name: "Menu",
        description: `Digital menu for ${businessName}`,
        active: true,
        isDefault: true,
        slug: projectSlug,
      },
    }, { merge: true });

    return { tenantId: core.tenantId, storeId: core.storeId, projectId, userId: userRef.id, subdomain: core.subdomain, claimToken };
  });

  // Update session to LIVE + set confirmationPending for WhatsApp message (T3/M-5)
  // URL Routing Architecture: Use subdomain-based URL (not path-based)
  const publicUrl = getMenuUrl(result.subdomain);
  // Auth Fix: Include claimToken in dashboard URL so owner can link Google account
  const claimTokenForUrl = result.claimToken || "";
  const dashboardUrl = claimTokenForUrl
    ? `${SIGNIN_URL}?claim=${claimTokenForUrl}`
    : SIGNIN_URL;

  const sessionRef = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS).doc(sessionId);
  await sessionRef.update({
    state: "LIVE",
    stateHistory: FieldValue.arrayUnion({
      state: "LIVE",
      timestamp: Timestamp.now(),
      reason: "Published successfully",
    }),
    publishedResult: {
      tenantId: result.tenantId,
      storeId: result.storeId,
      projectId: result.projectId,
      userId: result.userId,
      publicUrl,
      dashboardUrl,
    },
    confirmationPending: true,
    publishedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // TODO (M-3): Create OBP (Official Business Page) if ENABLE_OBP flag is on
  // OBP creation should be called after the transaction succeeds, using the new storeId/tenantId.
  // Pattern: await createOBP({ tenantId, storeId, businessName, businessType, ... });
  // Deferred to post-v1 — OBP creation is non-blocking and can be added independently.

  // TODO (M-4): Generate QR code for the digital menu
  // QR code generation should use the publicUrl and store in Firebase Storage.
  // Deferred to post-v1 — QR is non-blocking and can be added independently.

  return {
    tenantId: result.tenantId,
    storeId: result.storeId,
    projectId: result.projectId,
    publicUrl,
    dashboardUrl,
  };
}

// ═══════════════════════════════════════════════════════════════
// COUNTRY / CURRENCY INFERENCE (derived from frontend countryData.ts — 252 countries)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_COUNTRY_INFO = countryData.find((c) => c.code === "IN")!;

/**
 * Infer country from E.164 phone number using frontend countryData.
 * Sorts dial codes by length DESC so longer codes match first.
 */
function inferCountryFromPhone(phone: string): typeof countryData[number] {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  const withPlus = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

  // Sort by dial code length DESC for longest-match-first
  const sorted = [...countryData].sort(
    (a, b) => b.dialCode.replace(/\s/g, "").length - a.dialCode.replace(/\s/g, "").length,
  );

  for (const entry of sorted) {
    const code = entry.dialCode.replace(/\s/g, "");
    if (withPlus.startsWith(code)) {
      return entry;
    }
  }

  return DEFAULT_COUNTRY_INFO;
}
