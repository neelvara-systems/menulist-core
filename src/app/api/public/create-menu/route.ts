export const dynamic = 'force-dynamic';
/**
 * Public Menu Entry API
 * 
 * POST /api/public/create-menu — Upload image + trigger extraction (no auth)
 * GET  /api/public/create-menu?draftId={token} — Poll extraction status (no auth)
 * 
 * PUBLIC ENDPOINT - No authentication required.
 * Rate limited by IP address using Upstash.
 * Feature gated: ENABLE_PUBLIC_MENU_ENTRY
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import { genAIClient } from '@lib/google/genAi';
import { checkSafeMode } from '@lib/ops/safeMode';
import { secureError, secureLog } from '@lib/security/secureLogger';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit, getClientIp } from 'src/middleware/publicApi';

const COLLECTION = DB_COLLECTIONS.PUBLIC_MENU_DRAFTS;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const IMAGE_URL_EXPIRY_MS = 25 * 60 * 60 * 1000; // 25 hours (1h longer than draft TTL)

/**
 * POST /api/public/create-menu
 * 
 * Upload a menu image and trigger AI extraction.
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
        // 3. Parse multipart form data
        const formData = await req.formData();
        const imageFile = formData.get('image') as File | null;

        if (!imageFile) {
            return NextResponse.json(
                { success: false, error: 'No image file provided.' },
                { status: 400 }
            );
        }

        // 4. Validate file type
        if (!ALLOWED_TYPES.includes(imageFile.type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
                { status: 400 }
            );
        }

        // 5. Validate file size
        if (imageFile.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, error: 'File too large. Maximum size is 10MB.' },
                { status: 400 }
            );
        }

        // 6. Generate draft token (crypto-random, not guessable)
        const draftToken = crypto.randomUUID();

        // 7. Upload image to Firebase Storage (temp path)
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const ext = imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg';
        const storagePath = `publicMenuDrafts/${draftToken}/menu.${ext}`;

        const bucket = storageAdmin.bucket();
        const file = bucket.file(storagePath);
        await file.save(buffer, {
            metadata: {
                contentType: imageFile.type,
                metadata: {
                    draftToken,
                    uploadedAt: new Date().toISOString(),
                },
            },
        });

        // Generate signed URL for preview (25h — outlives 24h draft TTL)
        const [imageUrl] = await file.getSignedUrl({
            action: 'read' as const,
            expires: Date.now() + IMAGE_URL_EXPIRY_MS,
        });

        // 8. Hash IP for storage (privacy — don't store raw IP)
        const ip = getClientIp(req);
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);

        // 9. Create draft document in Firestore
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(Date.now() + DRAFT_TTL_MS);

        const draftData = {
            token: draftToken,
            imageUrl,
            imagePath: storagePath,
            originalFileName: imageFile.name || 'menu.jpg',
            extractedData: null,
            extractionStatus: 'pending' as const,
            detectedBusinessName: null,
            detectedBusinessType: null,
            ipHash,
            createdAt: now,
            expiresAt,
            claimed: false,
        };

        await firestoreAdmin.collection(COLLECTION).doc(draftToken).set(draftData);

        secureLog('[PublicMenuEntry] Draft created', { draftToken, ipHash, fileSize: imageFile.size });

        // 10. Trigger extraction via Cloud Function (fire-and-forget)
        // We'll call the extraction inline here since it's simpler than a separate CF for v1
        triggerExtraction(draftToken, imageUrl, storagePath).catch((err) => {
            secureError('[PublicMenuEntry] Extraction trigger failed', err instanceof Error ? err : new Error(String(err)), { draftToken });
        });

        // 11. Return draft info
        return NextResponse.json({
            success: true,
            draftId: draftToken,
            previewUrl: `/create-menu/preview/${draftToken}`,
            status: 'processing',
        });

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
async function triggerExtraction(draftToken: string, imageUrl: string, storagePath: string): Promise<void> {
    const draftRef = firestoreAdmin.collection(COLLECTION).doc(draftToken);

    try {
        // Mark as processing
        await draftRef.update({ extractionStatus: 'processing' });

        // Download image from Storage for Gemini
        const bucket = storageAdmin.bucket();
        const file = bucket.file(storagePath);
        const [imageBuffer] = await file.download();
        const base64Image = imageBuffer.toString('base64');
        const mimeType = storagePath.endsWith('.png') ? 'image/png' : storagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

        const prompt = `You are a menu data extraction expert. Analyze this menu image and extract ALL items into a structured JSON format.

Return a JSON object with this exact structure:
{
    "businessName": "detected business name or null",
    "businessType": "Restaurant or Cafe or Bakery or Salon or other detected type",
    "categories": [
        {
            "id": "cat_1",
            "name": { "en": "Category Name" }
        }
    ],
    "items": [
        {
            "id": "item_1",
            "category": "cat_1",
            "name": { "en": "Item Name" },
            "description": { "en": "Description if visible" },
            "price": "price as string with currency symbol if visible",
            "attributes": []
        }
    ],
    "languages": ["en"]
}

Rules:
- Extract EVERY item visible in the menu
- Preserve original category groupings
- If price is visible, include it as a string (e.g., "₹250", "$12.99")
- If description is visible, include it
- Detect the language of the menu
- Detect business name if visible on the menu
- Detect business type from the content (restaurant, cafe, bakery, salon, etc.)
- Return ONLY valid JSON, no markdown, no explanation`;

        // Use genAIClient (shared Gemini client) — same pattern as all other AI routes
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                { text: prompt },
                {
                    inlineData: {
                        data: base64Image,
                        mimeType,
                    },
                },
            ],
        });

        const responseText = response.text || '';

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);

        // Update draft with extraction results
        await draftRef.update({
            extractionStatus: 'completed',
            extractedData: {
                categories: parsed.categories || [],
                items: parsed.items || [],
                languages: parsed.languages || ['en'],
            },
            detectedBusinessName: parsed.businessName || null,
            detectedBusinessType: parsed.businessType || null,
        });

        secureLog('[PublicMenuEntry] Extraction completed', {
            draftToken,
            categories: (parsed.categories || []).length,
            items: (parsed.items || []).length,
        });

    } catch (error) {
        secureError('[PublicMenuEntry] Extraction failed', error instanceof Error ? error : new Error(String(error)), { draftToken });

        // Mark as failed
        await draftRef.update({
            extractionStatus: 'failed',
            extractionError: error instanceof Error ? error.message : 'Extraction failed. Please try again with a clearer photo.',
        }).catch(() => { /* ignore update failure */ });
    }
}
