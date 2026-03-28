export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { RESELLER_CAPS } from "@config/resellerPricing";
import {
    createResellerProfile,
    getAllResellerProfiles,
    getResellerProfileById,
    updateResellerProfile,
} from "@database/reseller";
import { logger } from "@lib/monitoring/logger";
import { buildSecurityContext } from "@lib/security/securityContext";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { z } from "zod";
import { validateAPIInput } from "@lib/security/inputValidation";

/**
 * GET /api/reseller/manage — List all reseller profiles (PLATFORM only)
 * POST /api/reseller/manage — Create or update a reseller profile (PLATFORM only)
 * 
 * This is the founder's reseller management endpoint.
 * NOT accessible by resellers — only PLATFORM role.
 */

// --- GET: List all reseller profiles ---
export const GET = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const profiles = await getAllResellerProfiles();
        return NextResponse.json({ profiles });
    } catch (error) {
        console.error('[Reseller Manage GET] Failed:', error);
        return NextResponse.json({ error: 'Failed to fetch reseller profiles.' }, { status: 500 });
    }
}, { requiredPlatformRole: 'PLATFORM' });

// --- POST: Create or update a reseller profile ---
const CreateResellerSchema = z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(15),
    email: z.string().email(),
    username: z.string().min(3).max(50),
    password: z.string().min(6).max(100),
    addressLine: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    country: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
    maxOfflineActivations: z.number().int().min(1).max(100).optional(),
    active: z.boolean().optional(),
});

const UpdateResellerSchema = z.object({
    profileId: z.string().min(1),
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(10).max(15).optional(),
    email: z.string().email().optional(),
    username: z.string().min(3).max(50).optional(),
    password: z.string().min(6).max(100).optional(),
    addressLine: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    country: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
    maxOfflineActivations: z.number().int().min(1).max(100).optional(),
    active: z.boolean().optional(),
});

export const POST = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const body = await request.json();
        const isUpdate = Boolean(body.profileId);

        if (isUpdate) {
            // UPDATE existing profile
            const validation = validateAPIInput(UpdateResellerSchema, body);
            if (!validation.success) {
                const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
                return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
            }

            const { profileId, ...updates } = validation.data;

            // Verify profile exists
            const existing = await getResellerProfileById(profileId);
            if (!existing) {
                return NextResponse.json({ error: "Reseller profile not found." }, { status: 404 });
            }

            await updateResellerProfile(profileId, updates);

            logger.info('Reseller profile updated', {
                ...buildSecurityContext(session, request),
                profileId,
                updatedFields: Object.keys(updates),
            });

            return NextResponse.json({ success: true, profileId, action: 'updated' });
        } else {
            // CREATE new profile
            const validation = validateAPIInput(CreateResellerSchema, body);
            if (!validation.success) {
                const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
                return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
            }

            const data = validation.data;

            const profileId = await createResellerProfile({
                name: data.name,
                phone: data.phone,
                email: data.email,
                username: data.username,
                password: data.password,
                addressLine: data.addressLine,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode,
                country: data.country,
                notes: data.notes,
                maxOfflineActivations: data.maxOfflineActivations || RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER,
                active: data.active !== undefined ? data.active : true,
                createdBy: session.user?.email || 'platform',
            });

            logger.info('Reseller profile created', {
                ...buildSecurityContext(session, request),
                profileId,
                resellerName: data.name,
            });

            return NextResponse.json({ success: true, profileId, action: 'created' });
        }
    } catch (error) {
        console.error('[Reseller Manage POST] Failed:', error);
        return NextResponse.json({ error: 'Failed to manage reseller profile.' }, { status: 500 });
    }
}, { requiredPlatformRole: 'PLATFORM' });
