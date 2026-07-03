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
import { getBoundedPublicFeedbackStringContext, logPublicFeedbackPageFailure } from '@lib/feedback/publicFeedbackDiagnostics';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveOBPAccentColor } from '@lib/obp/accentColor';
import { getPublicBusinessDescription } from '@lib/obp/getPublicBusinessDescription';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { getMoodWithBrandColor, MenuMood } from '@template/main-app/projects/b2cView/designSystem';
import { DEFAULT_FEEDBACK_SETTINGS, FeedbackDefaults } from '@type/guestFeedback';
import { notFound } from 'next/navigation';

/**
 * Parse projectId to extract tId and sId
 * Format: {tId}-{timestamp}-{sId}
 */
function parseProjectId(projectId: string): { tId: number; sId: number } | null {
    const parts = projectId.split('-');
    if (parts.length < 3) return null;

    const tId = parseInt(parts[0], 10);
    const sId = parseInt(parts[parts.length - 1], 10);

    if (isNaN(tId) || isNaN(sId)) return null;

    return { tId, sId };
}

type FeedbackSource = 'menu_footer' | 'feedback_qr' | 'direct_link';

const VALID_SOURCES: FeedbackSource[] = ['menu_footer', 'feedback_qr', 'direct_link'];

function parseSource(raw: string | undefined): FeedbackSource {
    if (raw && (VALID_SOURCES as string[]).includes(raw)) return raw as FeedbackSource;
    return 'feedback_qr';
}

interface PageProps {
    params: { projectId: string };
    searchParams?: { source?: string };
}

/**
 * Get project data by projectId
 * Uses correct nested path: projects/{tId}/{sId}/{projectId}
 */
async function getProjectData(projectId: string) {
    try {
        // Parse tId and sId from projectId
        const parsed = parseProjectId(projectId);
        if (!parsed) {
            return null;
        }

        const { tId, sId } = parsed;

        // Use correct nested path: projects/{tId}/{sId}/{projectId}
        const projectDoc = await firestoreAdmin
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(String(tId))
            .collection(String(sId))
            .doc(projectId)
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
        };
    } catch (error) {
        logPublicFeedbackPageFailure('public_feedback_page_project_fetch_failed', error, {
            ...getBoundedPublicFeedbackStringContext('projectId', projectId),
        });
        return null;
    }
}

interface StoreInfo {
    accentColor?: string;
    storeDetails: Record<string, any>;
    storeName?: string;
    feedbackDefaults: FeedbackDefaults;
    feedbackEnabled: boolean;
    logoUrl?: string;
    officialPageUrl?: string;
    tagline?: string;
    tempStatus?: any;
}

/**
 * Get store data including name and feedback settings
 * Uses direct doc fetch by sId (storeId is the document ID)
 */
async function getStoreInfo(tId: number, sId: number): Promise<StoreInfo | null> {
    try {
        // Direct doc fetch - storeId is the document ID
        const storeDoc = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .doc(String(sId))
            .get();

        if (!storeDoc.exists) {
            return null;
        }

        const storeData = storeDoc.data() || {};
        if (storeData.active === false || storeData.deleted === true || isPlatformEntityBlocked(storeData)) {
            return null;
        }

        const contentLanguage = storeData.defaultLanguage || storeData.activeLanguages?.[0] || storeData.language || 'en';
        const tenantName = typeof storeData.tenantName === 'string' ? storeData.tenantName.trim() : '';
        const businessName = typeof storeData.name === 'string' ? storeData.name.trim() : '';
        const displayStoreName = getBrandStoreLabel(storeData, businessName || tenantName || undefined);
        const storeDetails = {
            storeId: Number(storeData.storeId || sId),
            storeKey: String(storeData.storeKey || sId),
            tenantId: Number(storeData.tenantId || tId),
            tenantName,
            active: storeData.active !== false,
            deleted: storeData.deleted === true,
            name: businessName || displayStoreName,
            email: storeData.email || '',
            countryCode: storeData.countryCode || '',
            dialCode: storeData.dialCode || '',
            phoneNumber: storeData.phoneNumber || '',
            logo: storeData.logo || '',
            addressLine: storeData.addressLine || '',
            area: storeData.area || '',
            city: storeData.city || '',
            state: storeData.state || '',
            postalCode: storeData.postalCode || '',
            country: storeData.country || '',
            currencyCode: storeData.currencyCode || 'INR',
            currencySymbol: storeData.currencySymbol || '₹',
            businessType: storeData.businessType || '',
            businessCategory: storeData.businessCategory || '',
            contactPersonName: storeData.contactPersonName || '',
            contactPersonEmail: storeData.contactPersonEmail || '',
            contactPersonNumber: storeData.contactPersonNumber || '',
            roles: [],
            socialMedia: storeData.socialMedia || {},
            publicPresence: storeData.publicPresence || {},
            feedbackEnabled: storeData.feedbackEnabled !== false,
            subdomain: storeData.subdomain || '',
            customDomain: storeData.customDomain || '',
            domainVerified: Boolean(storeData.domainVerified),
            timeZone: storeData.timeZone || '',
            businessDayEndTime: storeData.businessDayEndTime || '',
        };

        // Check if feedback is enabled at store level (default: true)
        const feedbackEnabled = storeData.feedbackEnabled !== false;

        return {
            accentColor: resolveOBPAccentColor(storeData.publicPresence),
            storeDetails,
            storeName: displayStoreName,
            feedbackEnabled,
            feedbackDefaults: {
                ...DEFAULT_FEEDBACK_SETTINGS,
                ...storeData.feedbackDefaults,
            },
            logoUrl: (storeData.logo || '') as string | undefined,
            officialPageUrl: generateOBPUrl(storeData.subdomain, storeData.customDomain),
            tagline: (
                getLocalizedText(
                    storeData.tagline,
                    contentLanguage,
                    getPrimaryLocalizedLanguage(storeData.tagline, contentLanguage),
                    '',
                ) || getPublicBusinessDescription(storeData) || ''
            ) as string | undefined,
            tempStatus: storeData.tempStatus,
        };
    } catch (error) {
        logPublicFeedbackPageFailure('public_feedback_page_store_fetch_failed', error, {
            ...getBoundedPublicFeedbackStringContext('tenantId', tId),
            ...getBoundedPublicFeedbackStringContext('storeId', sId),
        });
        return null;
    }
}

export default async function FeedbackPage({ params, searchParams }: PageProps) {
    // Check feature flag
    if (!FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK) {
        notFound();
    }

    const { projectId } = params;

    // Get project data
    const project = await getProjectData(projectId);
    if (!project) {
        notFound();
    }

    // Get store info (name, feedback settings)
    const storeInfo = await getStoreInfo(project.tId, project.sId);
    if (!storeInfo || !storeInfo.feedbackEnabled) {
        notFound();
    }

    const headerMoodConfig = getMoodWithBrandColor(MenuMood.CLEAN, storeInfo.accentColor);
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
        <div className={feedbackStyles.page} data-obp-page="true">
            {FEATURE_FLAGS.ENABLE_TEMP_STATUS && storeInfo.tempStatus ? (
                <TempStatusBanner tempStatus={storeInfo.tempStatus} />
            ) : null}
            <MenuBreadcrumb
                businessName={storeInfo.storeName || 'Business'}
                projectName="Feedback"
                logoUrl={storeInfo.logoUrl || null}
                variant="identity"
                theme={publicHeaderTheme}
            />
            <div className={feedbackStyles.pageInner}>
                <GuestFeedbackForm
                    accentColor={storeInfo.accentColor}
                    tId={project.tId}
                    sId={project.sId}
                    projectId={project.projectId}
                    source={parseSource(searchParams?.source)}
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
export async function generateMetadata({ params }: PageProps) {
    const project = await getProjectData(params.projectId);

    if (!project) {
        return {
            title: 'Feedback',
        };
    }

    const storeInfo = await getStoreInfo(project.tId, project.sId);

    return {
        title: `Share Feedback | ${storeInfo?.storeName || 'Restaurant'}`,
        description: 'Share private feedback with the business.',
        robots: 'noindex, nofollow', // Don't index feedback pages
    };
}
