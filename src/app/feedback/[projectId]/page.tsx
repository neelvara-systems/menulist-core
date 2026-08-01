/**
 * Standalone Feedback Page
 * 
 * Public page accessible via QR code scan.
 * URL format: /feedback/{projectId}
 * 
 * Consistent with menu URLs which use projectId.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import GuestFeedbackForm from '@atoms/GuestFeedbackForm';
import feedbackStyles from '@atoms/GuestFeedbackForm/index.module.scss';
import TempStatusBanner from '@atoms/TempStatusBanner';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import MenuBreadcrumb from '@/app/client/[[...slug]]/MenuBreadcrumb';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getBrandStoreLabel } from '@lib/businessIdentity/names';
import { normalizeGuestFeedbackNumericDocumentId, normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';
import { getBoundedPublicFeedbackStringContext, logPublicFeedbackPageFailure } from '@lib/feedback/publicFeedbackDiagnostics';
import { normalizePublicFeedbackDefaults } from '@lib/feedback/feedbackDefaultsBoundary';
import { getPublicStoreById } from '@lib/firestore/clientStoreLookup';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import {
    appendPublicLanguageParam,
    normalizePublicLanguageCode,
    resolveStorePublicLanguage,
} from '@lib/localization/publicRenderLanguage';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveOBPAccentColor } from '@lib/obp/accentColor';
import { getPublicBusinessDescription } from '@lib/obp/getPublicBusinessDescription';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { normalizeMenuListPublicEntityIdentityAliases } from '@lib/publicTruth/entityEligibility';
import {
    projectPublicClientStore,
    type PublicClientStore,
} from '@lib/publicTruth/clientStoreProjection';
import { getMoodWithBrandColor, MenuMood } from '@template/main-app/projects/b2cView/designSystem';
import { FeedbackDefaults } from '@type/guestFeedback';
import type { StoreTemporaryStatus } from '@type/platform/store';
import { notFound } from 'next/navigation';
import { cache } from 'react';

/**
 * Parse projectId to extract tId and sId
 * Format: {tId}-{timestamp}-{sId}
 */
function parseProjectId(projectId: string): {
    tId: number;
    sId: number;
    tenantDocumentId: string;
    storeDocumentId: string;
} | null {
    const parts = projectId.split('-');
    if (parts.length < 3) return null;

    const tenantScope = normalizeGuestFeedbackNumericDocumentId(parts[0]);
    const storeScope = normalizeGuestFeedbackNumericDocumentId(parts[parts.length - 1]);

    if (!tenantScope || !storeScope) return null;

    return {
        tId: tenantScope.numericId,
        sId: storeScope.numericId,
        tenantDocumentId: tenantScope.documentId,
        storeDocumentId: storeScope.documentId,
    };
}

type FeedbackSource = 'menu_footer' | 'feedback_qr' | 'direct_link';

const VALID_SOURCES: FeedbackSource[] = ['menu_footer', 'feedback_qr', 'direct_link'];

function parseSource(raw: string | undefined): FeedbackSource {
    if (raw && (VALID_SOURCES as string[]).includes(raw)) return raw as FeedbackSource;
    return 'feedback_qr';
}

interface PageProps {
    params: Promise<{ projectId: string }>;
    searchParams?: Promise<{
        lang?: string | string[];
        source?: string | string[];
    }>;
}

/**
 * Get project data by projectId
 * Uses correct nested path: projects/{tId}/{sId}/{projectId}
 */
const getProjectData = cache(async (projectId: string) => {
    try {
        const normalizedProjectId = normalizeGuestFeedbackProjectId(projectId);
        if (!normalizedProjectId) {
            return null;
        }

        // Parse tId and sId from projectId
        const parsed = parseProjectId(normalizedProjectId);
        if (!parsed) {
            return null;
        }

        const { tId, sId, tenantDocumentId, storeDocumentId } = parsed;

        // Use correct nested path: projects/{tId}/{sId}/{projectId}
        const projectDoc = await firestoreAdmin
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(tenantDocumentId)
            .collection(storeDocumentId)
            .doc(normalizedProjectId)
            .get();

        if (!projectDoc.exists) {
            return null;
        }

        const data = projectDoc.data();

        // Check if project is active and not deleted
        if (data?.active === false || data?.deleted === true) {
            return null;
        }

        // Check if feedback is disabled at project level
        if (data?.menuSettings?.feedback === false) {
            return null;
        }

        return {
            projectId: projectDoc.id,
            tId,
            sId,
            storeDocumentId,
        };
    } catch (error) {
        logPublicFeedbackPageFailure('public_feedback_page_project_fetch_failed', error, {
            ...getBoundedPublicFeedbackStringContext('projectId', projectId),
        });
        return null;
    }
});

interface StoreInfo {
    accentColor?: string;
    contentLanguage: string;
    storeDetails: PublicClientStore;
    storeName?: string;
    feedbackDefaults: FeedbackDefaults;
    feedbackEnabled: boolean;
    logoUrl?: string;
    officialPageUrl?: string;
    tagline?: string;
    tempStatus?: StoreTemporaryStatus;
}

/**
 * Get store data including name and feedback settings
 * Uses direct doc fetch by sId (storeId is the document ID)
 */
const getStoreInfo = cache(async (
    tId: number,
    sId: number,
    storeDocumentId: string,
    requestedLanguage?: string,
): Promise<StoreInfo | null> => {
    try {
        // Reuse the canonical public lookup so store/tenant activity, identity,
        // blocking, request deduplication, and public cache invalidation stay
        // aligned with the menu and official business page flows.
        const storeData = await getPublicStoreById(storeDocumentId);
        if (!storeData) {
            return null;
        }

        const storeTenantScope = normalizeMenuListPublicEntityIdentityAliases([
            storeData.tenantId,
            storeData.tId,
        ]);
        if (!storeTenantScope || storeTenantScope.numericId !== tId) {
            return null;
        }

        const storeDetails = projectPublicClientStore({
            ...storeData,
            storeId: sId,
            tenantId: tId,
        });
        if (!storeDetails) return null;

        const contentLanguage = resolveStorePublicLanguage(storeData, requestedLanguage);
        const tenantName = typeof storeData.tenantName === 'string' ? storeData.tenantName.trim() : '';
        const businessName = typeof storeData.name === 'string' ? storeData.name.trim() : '';
        const displayStoreName = getBrandStoreLabel(storeData, businessName || tenantName || undefined);

        // Check if feedback is enabled at store level (default: true)
        const feedbackEnabled = storeData.feedbackEnabled !== false;

        return {
            accentColor: resolveOBPAccentColor(storeData.publicPresence),
            contentLanguage,
            storeDetails,
            storeName: displayStoreName,
            feedbackEnabled,
            feedbackDefaults: normalizePublicFeedbackDefaults(storeData.feedbackDefaults),
            logoUrl: typeof storeData.logo === 'string' && storeData.logo.trim()
                ? storeData.logo
                : undefined,
            officialPageUrl: appendPublicLanguageParam(
                generateOBPUrl(storeData.subdomain, storeData.customDomain),
                contentLanguage,
            ),
            tagline: (
                getLocalizedText(
                    storeData.tagline,
                    contentLanguage,
                    getPrimaryLocalizedLanguage(storeData.tagline, contentLanguage),
                    '',
                ) || getPublicBusinessDescription(storeData, contentLanguage) || undefined
            ),
            tempStatus: storeData.tempStatus,
        };
    } catch (error) {
        logPublicFeedbackPageFailure('public_feedback_page_store_fetch_failed', error, {
            ...getBoundedPublicFeedbackStringContext('tenantId', tId),
            ...getBoundedPublicFeedbackStringContext('storeId', sId),
        });
        return null;
    }
});

export default async function FeedbackPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    // Check feature flag
    if (!FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK) {
        notFound();
    }

    const { projectId } = params;
    const requestedLanguage = normalizePublicLanguageCode(searchParams?.lang) || undefined;
    const requestedSource = Array.isArray(searchParams?.source)
        ? searchParams?.source[0]
        : searchParams?.source;

    // Get project data
    const project = await getProjectData(projectId);
    if (!project) {
        notFound();
    }

    // Get store info (name, feedback settings)
    const storeInfo = await getStoreInfo(
        project.tId,
        project.sId,
        project.storeDocumentId,
        requestedLanguage,
    );
    if (!storeInfo || !storeInfo.feedbackEnabled) {
        notFound();
    }

    const headerMoodConfig = getMoodWithBrandColor(MenuMood.CLEAN, storeInfo.accentColor);
    const t = createPublicCustomerTranslator(storeInfo.contentLanguage);
    const languageDirection = getPublicCustomerLanguageDirection(storeInfo.contentLanguage);
    const publicHeaderTheme = {
        background: headerMoodConfig.background,
        textColor: headerMoodConfig.bodyColor,
        headingColor: headerMoodConfig.headingColor,
        mutedColor: headerMoodConfig.descriptionColor || headerMoodConfig.bodyColor,
        accentColor: storeInfo.accentColor,
        borderColor:
            headerMoodConfig.categoryStyle.dividerColor ||
            headerMoodConfig.categoryStyle.borderColor ||
            headerMoodConfig.itemStyle.borderColor,
        fontFamily: headerMoodConfig.bodyFont,
    };

    return (
        <div
            className={feedbackStyles.page}
            data-obp-page="true"
            dir={languageDirection}
            lang={storeInfo.contentLanguage}
        >
            {FEATURE_FLAGS.ENABLE_TEMP_STATUS && storeInfo.tempStatus ? (
                <TempStatusBanner
                    activeLanguage={storeInfo.contentLanguage}
                    tempStatus={storeInfo.tempStatus}
                />
            ) : null}
            <MenuBreadcrumb
                activeLanguage={storeInfo.contentLanguage}
                ariaLabel={t('menu.businessInformation')}
                businessName={storeInfo.storeName || t('common.business')}
                homeHref={storeInfo.officialPageUrl}
                projectName={t('feedback.pageTitle')}
                logoUrl={storeInfo.logoUrl || null}
                variant="identity"
                theme={publicHeaderTheme}
            />
            <div className={feedbackStyles.pageInner}>
                <GuestFeedbackForm
                    activeLanguage={storeInfo.contentLanguage}
                    accentColor={storeInfo.accentColor}
                    tId={project.tId}
                    sId={project.sId}
                    projectId={project.projectId}
                    source={parseSource(requestedSource)}
                    storeName={storeInfo.storeName}
                    storeDetails={storeInfo.storeDetails}
                    feedbackDefaults={storeInfo.feedbackDefaults}
                    officialPageUrl={storeInfo.officialPageUrl}
                    tagline={storeInfo.tagline}
                />
            </div>
        </div>
    );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const requestedLanguage = normalizePublicLanguageCode(searchParams?.lang) || undefined;
    const project = await getProjectData(params.projectId);

    if (!project) {
        return {
            title: createPublicCustomerTranslator(requestedLanguage)('feedback.pageTitle'),
        };
    }

    const storeInfo = await getStoreInfo(
        project.tId,
        project.sId,
        project.storeDocumentId,
        requestedLanguage,
    );
    const t = createPublicCustomerTranslator(storeInfo?.contentLanguage || requestedLanguage);

    return {
        title: t('feedback.metadataTitle', {
            businessName: storeInfo?.storeName || t('common.business'),
        }),
        description: t('feedback.metadataDescription'),
        robots: 'noindex, nofollow', // Don't index feedback pages
    };
}
