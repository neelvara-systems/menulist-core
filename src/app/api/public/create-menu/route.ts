export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * Public Menu Entry API
 *
 * POST /api/public/create-menu — Upload image or owner-provided menu link + trigger extraction (no account required)
 * GET  /api/public/create-menu?draftId={token} — Poll extraction status (no auth)
 *
 * POST is public by design so owners can see the first proof moment before auth.
 * Cost leakage is controlled by SAFE_MODE, IP rate limiting, file validation, and TTL cleanup.
 * Public link import additionally requires owner permission confirmation and uses the
 * same SSRF-safe acquisition helper as the authenticated owner flow.
 * GET remains token-based so owners can review an existing draft.
 * Rate limited by IP address using Upstash.
 * Feature gated: ENABLE_PUBLIC_MENU_ENTRY; link input also requires ENABLE_MENU_LINK_IMPORT.
 *
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { ECOMSAI_PLATFORM_STORE_ID, ECOMSAI_PLATFORM_TENANT_ID, ECOMSAI_PLATFORM_USER_ID } from '@constant/user';
import { resolveBusinessCategory } from '@data/shared/businessTypes';
import { applyCategoryIconDefaults } from '@data/shared/categoryIconSuggestions';
import { recordAiOperation } from '@lib/ai/operationLog';
import { firestoreAdmin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import { genAIClient } from '@lib/google/genAi';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { acquireMenuLinkSource, MenuLinkImportError } from '@lib/menu-link-import/sourceAcquisition';
import { checkSafeMode } from '@lib/ops/safeMode';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit, getClientIp } from 'src/middleware/publicApi';
import { z } from 'zod';

const COLLECTION = DB_COLLECTIONS.PUBLIC_MENU_DRAFTS;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TEXT_SOURCE_CHARS = 80_000;

const PublicMenuLinkSchema = z.object({
    permissionConfirmed: z.literal(true),
    sourceType: z.literal('menu_link'),
    url: z.string().min(8).max(4000),
});

type PublicDraftSource = {
    contentType: string;
    kind: 'image_upload' | 'menu_link_import';
    sourceKind?: string;
    storagePath: string;
};

const normalizeDraftExtractionLanguages = (languages: any): Array<{ code: string; name: string; isPrimary?: boolean }> => {
    const normalized = Array.isArray(languages)
        ? languages
            .map((language) => typeof language === 'string'
                ? { code: language, name: language === CANONICAL_SOURCE_LANGUAGE ? 'English' : language, isPrimary: language === CANONICAL_SOURCE_LANGUAGE }
                : {
                    code: String(language?.code || '').trim().toLowerCase(),
                    name: String(language?.name || '').trim(),
                    isPrimary: Boolean(language?.isPrimary),
                })
            .filter((language) => language.code)
        : [];

    const deduped = Array.from(
        new Map(normalized.map((language) => [language.code, language])).values(),
    );

    const hasPrimary = deduped.some((language) => language.isPrimary);
    const withPrimary = hasPrimary
        ? deduped
        : deduped.map((language, index) => ({ ...language, isPrimary: index === 0 }));

    if (withPrimary.some((language) => language.code === CANONICAL_SOURCE_LANGUAGE)) {
        return withPrimary;
    }

    return [
        ...withPrimary,
        { code: CANONICAL_SOURCE_LANGUAGE, name: 'English', isPrimary: false },
    ];
};

function buildDownloadUrl(bucketName: string, storagePath: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

function hashClientIp(req: NextRequest): string {
    const ip = getClientIp(req);
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

async function createImageDraft(req: NextRequest, imageFile: File) {
    // Validate file type
    if (!ALLOWED_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
            { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
            { status: 400 }
        );
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { success: false, error: 'File too large. Maximum size is 10MB.' },
            { status: 400 }
        );
    }

    const draftToken = crypto.randomUUID();
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const ext = imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `publicMenuDrafts/${draftToken}/menu.${ext}`;
    const downloadToken = crypto.randomUUID();

    const bucket = storageAdmin.bucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, {
        metadata: {
            cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
            contentType: imageFile.type,
            metadata: {
                draftToken,
                firebaseStorageDownloadTokens: downloadToken,
                uploadedAt: new Date().toISOString(),
            },
        },
    });

    // Use a stable Firebase download-token URL because claimed project files
    // keep this source image reference after the preview becomes a workspace.
    const imageUrl = buildDownloadUrl(bucket.name, storagePath, downloadToken);
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(Date.now() + DRAFT_TTL_MS);
    const ipHash = hashClientIp(req);

    await firestoreAdmin.collection(COLLECTION).doc(draftToken).set({
        token: draftToken,
        imageUrl,
        imagePath: storagePath,
        originalFileName: imageFile.name || 'menu.jpg',
        fileType: imageFile.type,
        fileSize: imageFile.size,
        sourceType: 'image_upload',
        extractedData: null,
        extractionStatus: 'pending' as const,
        detectedBusinessName: null,
        detectedBusinessType: null,
        ipHash,
        createdByUId: null,
        createdAt: now,
        expiresAt,
        claimed: false,
    });

    secureLog('[PublicMenuEntry] Draft created', { draftToken, ipHash, fileSize: imageFile.size, sourceType: 'image_upload' });

    triggerExtraction(draftToken, {
        contentType: imageFile.type,
        kind: 'image_upload',
        storagePath,
    }).catch((err) => {
        secureError('[PublicMenuEntry] Extraction trigger failed', err instanceof Error ? err : new Error(String(err)), { draftToken });
    });

    return NextResponse.json({
        success: true,
        draftId: draftToken,
        previewUrl: `/create-menu/preview/${draftToken}`,
        status: 'processing',
    });
}

async function createMenuLinkDraft(req: NextRequest, body: unknown) {
    if (!FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT) {
        return NextResponse.json(
            { success: false, error: 'Menu link import is not available.' },
            { status: 404 },
        );
    }

    const validation = PublicMenuLinkSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { success: false, error: 'Enter a public menu link and confirm you have permission to import it.' },
            { status: 400 },
        );
    }

    const draftToken = crypto.randomUUID();
    const createdStoragePaths: string[] = [];

    try {
        const acquisition = await acquireMenuLinkSource(validation.data.url);
        const bucket = storageAdmin.bucket();
        const storagePath = `publicMenuDrafts/${draftToken}/source.${acquisition.artifactExtension}`;
        const downloadToken = crypto.randomUUID();

        await bucket.file(storagePath).save(acquisition.artifactBuffer, {
            metadata: {
                cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
                contentType: acquisition.artifactContentType,
                metadata: {
                    draftToken,
                    firebaseStorageDownloadTokens: downloadToken,
                    importedAt: new Date().toISOString(),
                    sourceKind: acquisition.sourceKind,
                },
            },
        });
        createdStoragePaths.push(storagePath);

        const sourceUrl = buildDownloadUrl(bucket.name, storagePath, downloadToken);
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(Date.now() + DRAFT_TTL_MS);
        const ipHash = hashClientIp(req);
        const fileName = `Imported menu link.${acquisition.artifactExtension}`;

        await firestoreAdmin.collection(COLLECTION).doc(draftToken).set({
            token: draftToken,
            imageUrl: sourceUrl,
            imagePath: storagePath,
            originalFileName: fileName,
            fileType: acquisition.artifactContentType,
            fileSize: acquisition.size,
            sourceType: 'menu_link_import',
            sourceMetadata: {
                acquisitionProvider: 'direct-http',
                contentHash: acquisition.contentHash,
                finalUrl: acquisition.finalUrl,
                permissionConfirmed: true,
                redirectCount: acquisition.redirectCount,
                sourceContentType: acquisition.sourceContentType,
                sourceKind: acquisition.sourceKind,
                sourceTextPreview: acquisition.sourceTextPreview || null,
                sourceUrl: validation.data.url.trim(),
                storagePath,
            },
            extractedData: null,
            extractionStatus: 'pending' as const,
            detectedBusinessName: null,
            detectedBusinessType: null,
            ipHash,
            createdByUId: null,
            createdAt: now,
            expiresAt,
            claimed: false,
        });

        secureLog('[PublicMenuEntry] Link draft created', {
            draftToken,
            ipHash,
            sourceKind: acquisition.sourceKind,
            fileSize: acquisition.size,
        });

        triggerExtraction(draftToken, {
            contentType: acquisition.artifactContentType,
            kind: 'menu_link_import',
            sourceKind: acquisition.sourceKind,
            storagePath,
        }).catch((err) => {
            secureError('[PublicMenuEntry] Link extraction trigger failed', err instanceof Error ? err : new Error(String(err)), { draftToken });
        });

        return NextResponse.json({
            success: true,
            draftId: draftToken,
            previewUrl: `/create-menu/preview/${draftToken}`,
            status: 'processing',
        });
    } catch (error) {
        await Promise.allSettled(createdStoragePaths.map((path) => storageAdmin.bucket().file(path).delete({ ignoreNotFound: true })));

        if (error instanceof MenuLinkImportError) {
            secureLog('[PublicMenuEntry] Link source rejected', {
                code: error.code,
                status: error.status,
            });
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: error.status },
            );
        }

        secureError('[PublicMenuEntry] Link import failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: 'We could not read this menu link. Upload a photo or try another public menu link.' },
            { status: 500 },
        );
    }
}

/**
 * POST /api/public/create-menu
 *
 * Upload a menu image or owner-provided menu link and trigger AI extraction.
 * Returns a draftId (token) for polling and preview.
 */
export async function POST(req: NextRequest) {
    // 1. Feature gate
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    // 2. SAFE_MODE check — block AI operations during maintenance
    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    // 3. Rate limiting (3 per IP per 24 hours)
    const rateLimitResponse = await checkPublicRateLimit(req, 'PUBLIC_MENU_ENTRY');
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await req.json().catch(() => null);
            return createMenuLinkDraft(req, body);
        }

        // 3. Parse multipart form data
        const formData = await req.formData();
        const imageFile = formData.get('image') as File | null;

        if (!imageFile) {
            return NextResponse.json(
                { success: false, error: 'No image file provided.' },
                { status: 400 }
            );
        }

        return createImageDraft(req, imageFile);

    } catch (error) {
        secureError('[PublicMenuEntry] Upload failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: 'Failed to process your menu image. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/public/create-menu?draftId={token}
 * 
 * Poll extraction status for a draft.
 */
export async function GET(req: NextRequest) {
    // 1. Feature gate
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get('draftId');

    if (!draftId) {
        return NextResponse.json(
            { success: false, error: 'Missing draftId parameter.' },
            { status: 400 }
        );
    }

    try {
        const draftDoc = await firestoreAdmin.collection(COLLECTION).doc(draftId).get();

        if (!draftDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Draft not found or expired.' },
                { status: 404 }
            );
        }

        const draft = draftDoc.data()!;

        // Check expiry
        if (draft.expiresAt && draft.expiresAt.toMillis() < Date.now()) {
            return NextResponse.json(
                { success: false, error: 'Draft expired. Please upload again.', status: 'expired' },
                { status: 410 }
            );
        }

        return NextResponse.json({
            success: true,
            status: draft.extractionStatus,
            extractedData: draft.extractedData || null,
            detectedBusinessName: draft.detectedBusinessName || null,
            detectedBusinessType: draft.detectedBusinessType || null,
            imageUrl: draft.imageUrl,
            sourceType: draft.sourceType || 'image_upload',
            error: draft.extractionError || null,
        });

    } catch (error) {
        secureError('[PublicMenuEntry] Poll failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: 'Failed to check status.' },
            { status: 500 }
        );
    }
}

/**
 * Trigger AI extraction for a public menu draft.
 * Runs server-side using Gemini 2.5 Flash.
 * Updates the draft document with extraction results.
 */
async function triggerExtraction(draftToken: string, source: PublicDraftSource): Promise<void> {
    const draftRef = firestoreAdmin.collection(COLLECTION).doc(draftToken);

    try {
        // Mark as processing
        await draftRef.update({ extractionStatus: 'processing' });

        // Download the submitted source from Storage for Gemini.
        const bucket = storageAdmin.bucket();
        const file = bucket.file(source.storagePath);
        const [sourceBuffer] = await file.download();
        const mimeType = source.contentType || (
            source.storagePath.endsWith('.png') ? 'image/png' : source.storagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
        );

        const prompt = `You are a menu data extraction expert. Analyze this menu source and extract ALL items into a structured JSON format.

Return a JSON object with this exact structure:
{
    "businessName": "detected business name or null",
    "businessType": "Restaurant or Cafe or Bakery or Salon or other detected type",
    "categories": [
        {
            "id": "cat_1",
            "name": { "language code": "Category Name" }
        }
    ],
    "items": [
        {
            "id": "item_1",
            "category": "cat_1",
            "name": { "language code": "Item Name" },
            "description": { "language code": "Description if visible" },
            "price": "price as string with currency symbol if visible",
            "attributes": []
        }
    ],
    "languages": [
        {
            "code": "en",
            "name": "English",
            "isPrimary": false
        }
    ]
}

Rules:
- Extract EVERY item visible in the menu
- Preserve original category groupings
- If price is visible, include it as a string (e.g., "₹250", "$12.99")
- If description is visible, include it
- Detect the primary language of the menu
- Preserve the detected source/original language in multilingual field objects
- Always include English translations in multilingual field objects
- If the menu is already in English, return English as the primary language
- Detect business name if visible on the menu
- Detect business type from the content (restaurant, cafe, bakery, salon, etc.)
- Return ONLY valid JSON, no markdown, no explanation`;
        const isTextSource = mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml');
        const sourceContents = isTextSource
            ? [{
                text: `${prompt}\n\nMENU SOURCE TEXT:\n${sourceBuffer.toString('utf8').slice(0, MAX_TEXT_SOURCE_CHARS)}`,
            }]
            : [
                { text: prompt },
                {
                    inlineData: {
                        data: sourceBuffer.toString('base64'),
                        mimeType,
                    },
                },
            ];

        // Use genAIClient (shared Gemini client) — same pattern as all other AI routes
        const operationStart = Date.now();
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: sourceContents,
        });

        const responseText = response.text || '';

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        let parsed: any;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (parseError) {
            secureError(
                '[PublicMenuEntry] AI extraction JSON parse failed',
                parseError instanceof Error ? parseError : new Error(String(parseError)),
                { draftToken },
            );
            throw new Error('EXTRACTION_PARSE_FAILED');
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            secureError(
                '[PublicMenuEntry] AI extraction returned invalid shape',
                new Error('Expected extraction JSON object'),
                { draftToken },
            );
            throw new Error('EXTRACTION_INVALID_SHAPE');
        }
        const businessCategory = resolveBusinessCategory(parsed.businessType, parsed.businessCategory) || 'specialty';
        const categoriesWithIcons = applyCategoryIconDefaults(
            parsed.categories || [],
            parsed.items || [],
            businessCategory,
        );

        // Update draft with extraction results
        await draftRef.update({
            extractionStatus: 'completed',
            extractedData: {
                categories: categoriesWithIcons,
                items: parsed.items || [],
                languages: normalizeDraftExtractionLanguages(parsed.languages),
            },
            detectedBusinessName: parsed.businessName || null,
            detectedBusinessType: parsed.businessType || null,
        });

        recordAiOperation({
            action: AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION,
            billingMode: 'public',
            clientResponse: {
                businessCategory,
                categoriesCount: categoriesWithIcons.length,
                itemsCount: (parsed.items || []).length,
                languagesCount: normalizeDraftExtractionLanguages(parsed.languages).length,
            },
            draftToken,
            geminiResponse: response,
            model: 'gemini-2.0-flash',
            processingTime: Date.now() - operationStart,
            sId: ECOMSAI_PLATFORM_STORE_ID,
            source: 'public_create_menu',
            storagePath: source.storagePath,
            tId: ECOMSAI_PLATFORM_TENANT_ID,
            uId: String(ECOMSAI_PLATFORM_USER_ID),
        }).catch((error) => {
            secureError('[PublicMenuEntry] Operation log failed', error instanceof Error ? error : new Error(String(error)), { draftToken });
        });

        secureLog('[PublicMenuEntry] Extraction completed', {
            draftToken,
            categories: (parsed.categories || []).length,
            items: (parsed.items || []).length,
            sourceType: source.kind,
        });

    } catch (error) {
        secureError('[PublicMenuEntry] Extraction failed', error instanceof Error ? error : new Error(String(error)), { draftToken });

        // Mark as failed
        await draftRef.update({
            extractionStatus: 'failed',
            extractionError: source.kind === 'menu_link_import'
                ? 'We could not read this menu link. Upload a photo or try another public menu link.'
                : 'Extraction failed. Please try again with a clearer photo.',
        }).catch(() => { /* ignore update failure */ });
    }
}
