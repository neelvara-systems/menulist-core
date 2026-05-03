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
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getPublicBusinessDescription } from '@lib/obp/getPublicBusinessDescription';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
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
            console.error('[FeedbackPage] Invalid projectId format:', projectId);
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
        console.error('[FeedbackPage] Error fetching project:', error);
        return null;
    }
}

interface StoreInfo {
    accentColor?: string;
    storeName?: string;
    feedbackDefaults: FeedbackDefaults;
    feedbackEnabled: boolean;
    logoUrl?: string;
    officialPageUrl?: string;
    phoneNumber?: string;
    tagline?: string;
    whatsappNumber?: string;
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

        const storeData = storeDoc.data();
        const contentLanguage = storeData.defaultLanguage || storeData.activeLanguages?.[0] || storeData.language || 'en';
        const tenantName = typeof storeData.tenantName === 'string' ? storeData.tenantName.trim() : '';
        const businessName = typeof storeData.name === 'string' ? storeData.name.trim() : '';
        const publicDisplayName = getLocalizedText(
            storeData.publicPresence?.displayName,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeData.publicPresence?.displayName, contentLanguage),
            businessName || tenantName || '',
        );
        const displayStoreName = tenantName && businessName
            ? `${tenantName} - ${publicDisplayName || businessName}`
            : publicDisplayName || businessName || tenantName || undefined;

        // Check if feedback is enabled at store level (default: true)
        const feedbackEnabled = storeData.feedbackEnabled !== false;

        return {
            accentColor: storeData.publicPresence?.accentColor as string | undefined,
            storeName: displayStoreName,
            feedbackEnabled,
            feedbackDefaults: {
                ...DEFAULT_FEEDBACK_SETTINGS,
                ...storeData.feedbackDefaults,
            },
            logoUrl: (storeData.logo || '') as string | undefined,
            officialPageUrl: generateOBPUrl(storeData.subdomain, storeData.customDomain),
            phoneNumber: (storeData.phoneNumber || '') as string | undefined,
            tagline: (
                getLocalizedText(
                    storeData.tagline,
                    contentLanguage,
                    getPrimaryLocalizedLanguage(storeData.tagline, contentLanguage),
                    '',
                ) || getPublicBusinessDescription(storeData) || ''
            ) as string | undefined,
            whatsappNumber: (storeData.publicPresence?.whatsappNumber || '') as string | undefined,
        };
    } catch (error) {
        console.error('[FeedbackPage] Error fetching store info:', error);
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

    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.35),_transparent_35%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_55%,_#eef2ff_100%)] px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-xl">
                <GuestFeedbackForm
                    accentColor={storeInfo.accentColor}
                    tId={project.tId}
                    sId={project.sId}
                    projectId={project.projectId}
                    source={parseSource(searchParams?.source)}
                    storeName={storeInfo.storeName}
                    feedbackDefaults={storeInfo.feedbackDefaults}
                    logoUrl={storeInfo.logoUrl}
                    officialPageUrl={storeInfo.officialPageUrl}
                    phoneNumber={storeInfo.phoneNumber}
                    tagline={storeInfo.tagline}
                    whatsappNumber={storeInfo.whatsappNumber}
                />
                <PublicMenuListAttribution />
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
        description: `Share your feedback. Your feedback is private and helps us improve.`,
        robots: 'noindex, nofollow', // Don't index feedback pages
    };
}
