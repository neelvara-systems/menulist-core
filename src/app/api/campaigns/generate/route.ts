export const dynamic = 'force-dynamic';
import { createCampaign, getSuppressedCampaignTypes, getTodayCampaigns } from "@database/campaigns";
import { getProjectData } from "@database/projects";
import { generateTodayCampaigns, MenuItemForCampaign, ProjectContext } from "@lib/campaigns/engine";
import { logger } from "@lib/monitoring/logger";
import { checkDataWriteLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { CampaignGenerateRequestSchema } from "@lib/validation/apiSchemas";
import { CampaignType, TodayCampaignSummary } from "@type/campaigns";
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

/**
 * Campaign Generation API
 * 
 * Per Strategy Doc:
 * - Generates today's campaigns from menu data
 * - Uses confidence scoring to select best campaigns
 * - One PRIMARY campaign per day
 * - Passive campaigns as OPERATIONAL below the fold
 * 
 * Follows existing DAL patterns from projects
 */
export const POST = withAuth(async (request, session) => {
    const userId = session.user.id;

    try {
        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkDataWriteLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION
        const rawData = await request.json();
        const validation = validateAPIInput(CampaignGenerateRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Campaign Generate Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/campaigns/generate',
                error: errorMsg,
            }, 'medium');

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { projectId, forceRefresh } = validation.data;

        // 🔒 TENANT ISOLATION
        const tenantId = session.tId;
        const storeId = session.sId;

        if (!verifyTenantAccess(session, tenantId, storeId, request)) {
            logger.security('Tenant Access Violation - Campaign Generate API', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/campaigns/generate',
                attemptedProjectId: projectId,
            }, 'critical');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if we already have campaigns for today (unless force refresh)
        if (!forceRefresh) {
            const existingData = await getTodayCampaigns();
            if (existingData?.today && !existingData.today.isEmpty) {
                return NextResponse.json({
                    data: existingData,
                    cached: true
                }, { status: 200 });
            }
        }

        // Get project data with menu items
        const projectData = await getProjectData(projectId);

        if (!projectData || !projectData.files?.length) {
            return NextResponse.json({
                data: {
                    primary: null,
                    operational: [],
                    isEmpty: true
                },
                message: 'No menu data available'
            }, { status: 200 });
        }

        // Extract menu items from project files
        const menuItems: MenuItemForCampaign[] = [];

        for (const file of projectData.files) {
            if (file.extractedData?.data?.items) {
                for (const item of file.extractedData.data.items) {
                    // Get primary language name (first available)
                    const itemName = typeof item.name === 'string'
                        ? item.name
                        : Object.values(item.name || {})[0] || 'Unknown Item';

                    menuItems.push({
                        id: item.id,
                        name: itemName,
                        categoryId: item.id, // Use item id as category identifier
                        categoryName: item.category,
                        available: item.available !== false,
                        isBestSeller: item.isBestSeller || false,
                        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                        imageUrl: item.images?.[0]?.url,
                        // Analytics signals would come from owner dashboard data
                        viewCount: 0, // TODO: Integrate with analytics
                        tapCount: 0,
                    });
                }
            }
        }

        if (menuItems.length === 0) {
            return NextResponse.json({
                data: {
                    primary: null,
                    operational: [],
                    isEmpty: true
                },
                message: 'No menu items found'
            }, { status: 200 });
        }

        // Get suppressed campaign types
        const suppressedTypes = await getSuppressedCampaignTypes();

        // Build project context for campaign engine
        const now = new Date();
        const dayOfWeek = now.getDay();

        const context: ProjectContext = {
            projectId,
            tId: String(tenantId),
            sId: String(storeId),
            items: menuItems,
            businessType: (projectData as any).businessType,
            isOpenToday: true, // TODO: Integrate with business hours
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            suppressedTypes: suppressedTypes as CampaignType[]
        };

        // Generate campaigns using the engine
        const generatedCampaigns = generateTodayCampaigns(context);

        // Persist campaigns to database
        const persistedCampaigns: {
            primary?: TodayCampaignSummary;
            operational: TodayCampaignSummary[];
            isEmpty: boolean;
        } = {
            primary: undefined,
            operational: [],
            isEmpty: generatedCampaigns.isEmpty
        };

        if (generatedCampaigns.primary) {
            const campaign = await createCampaign({
                projectId,
                type: generatedCampaigns.primary.type,
                kind: generatedCampaigns.primary.kind,
                subject: generatedCampaigns.primary.subject,
                intent: generatedCampaigns.primary.intent,
                primarySurface: generatedCampaigns.primary.primarySurface,
                confidence: { total: generatedCampaigns.primary.confidence } as any,
                status: 'suggested'
            });

            persistedCampaigns.primary = {
                ...generatedCampaigns.primary,
                campaignId: campaign.id
            };
        }

        for (const opCampaign of generatedCampaigns.operational) {
            const campaign = await createCampaign({
                projectId,
                type: opCampaign.type,
                kind: opCampaign.kind,
                subject: opCampaign.subject,
                intent: opCampaign.intent,
                primarySurface: opCampaign.primarySurface,
                confidence: { total: opCampaign.confidence } as any,
                status: 'suggested'
            });

            persistedCampaigns.operational.push({
                ...opCampaign,
                campaignId: campaign.id
            });
        }

        return NextResponse.json({
            data: persistedCampaigns,
            cached: false,
            itemsAnalyzed: menuItems.length
        }, { status: 200 });

    } catch (error) {
        logger.error('Campaign Generate API error', error, { userId });
        return NextResponse.json({
            error: 'Campaign generation failed',
            message: (error as Error).message
        }, { status: 500 });
    }
});
