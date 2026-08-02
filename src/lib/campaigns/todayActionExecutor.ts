import {
    copyCampaignTextToClipboard,
    executeSurface,
    generateWhatsAppMessage,
    getCampaignClipboardSupportContext,
    type SurfaceExecutionResult,
} from '@lib/campaigns/executionSurfaces';
import { getBoundedCampaignStringContext, logCampaignFailure } from '@lib/campaigns/campaignDiagnostics';
import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import { generateProjectUrl } from '@lib/utils/slugify';
import { ExecutionSurface } from '@type/campaigns';

export interface TodayActionFeedback {
    title: string;
    description: string;
}

export interface PerformTodaySurfaceActionParams {
    surface: ExecutionSurface;
    itemName: string;
    menuLink?: string;
    imageUrl?: string;
}

type TodayDownloadSurface = Exclude<ExecutionSurface, 'whatsapp_message' | 'whatsapp_status'>;

const isAcknowledgedTodayDownloadSurfaceResult = (
    result: SurfaceExecutionResult,
    expectedSurface: TodayDownloadSurface,
) => (
    result.success === true
    && result.surface === expectedSurface
    && result.method === 'download'
);

export function buildTodayMenuLink(
    subdomain?: string,
    customDomain?: string,
    projectName?: string,
): string | undefined {
    if (!subdomain && !customDomain) return undefined;

    try {
        return generateProjectUrl(subdomain, customDomain, projectName, false);
    } catch (error) {
        logCampaignFailure('today_campaign_project_link_build_failed', error, {
            ...getBoundedCampaignStringContext('subdomain', subdomain),
            ...getBoundedCampaignStringContext('customDomain', customDomain),
            ...getBoundedCampaignStringContext('projectName', projectName),
        });
        return undefined;
    }
}

export async function performTodaySurfaceAction(
    params: PerformTodaySurfaceActionParams,
): Promise<TodayActionFeedback> {
    const { surface, itemName, menuLink, imageUrl } = params;

    if (surface === 'whatsapp_status' || surface === 'whatsapp_message') {
        return await handleWhatsAppAction(surface, itemName, menuLink);
    }

    const result = await executeSurface({
        surface,
        imageUrl,
        itemName,
        menuLink,
    });

    if (!isAcknowledgedTodayDownloadSurfaceResult(result, surface)) {
        if (result.success) {
            logCampaignFailure('today_campaign_surface_acknowledgement_invalid', undefined, {
                ...getBoundedCampaignStringContext('expectedSurface', surface),
                ...getBoundedCampaignStringContext('resultSurface', result.surface),
                ...getBoundedCampaignStringContext('resultMethod', result.method),
            });
        }
        throw new Error('Campaign action failed');
    }

    if (surface === 'print_poster') {
        return {
            title: 'Poster download started',
            description: 'Your poster file is downloading now. Place it where customers can see it today.',
        };
    }

    if (surface === 'qr_tent') {
        return {
            title: 'Tent card download started',
            description: 'Your tent card file is downloading now. Print it and place it on tables or counters.',
        };
    }

    return {
        title: 'Screen image download started',
        description: 'Your screen image is downloading now. Add it to your in-store screen when ready.',
    };
}

async function handleWhatsAppAction(
    surface: 'whatsapp_status' | 'whatsapp_message',
    itemName: string,
    menuLink?: string,
): Promise<TodayActionFeedback> {
    const message = generateWhatsAppMessage(itemName, menuLink);
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    let openRequested = false;
    try {
        openRequested = openIsolatedBrowserUrl(shareUrl);
    } catch (error) {
        logCampaignFailure('today_campaign_whatsapp_open_failed', error, {
            ...getBoundedCampaignStringContext('surface', surface),
            ...getBoundedCampaignStringContext('itemName', itemName),
            hasMenuLink: Boolean(menuLink),
            messageLength: message.length,
            shareUrlLength: shareUrl.length,
        });
    }

    let copied = false;
    try {
        await copyCampaignTextToClipboard(message, {
            documentUnavailable: 'today_campaign_clipboard_document_unavailable',
            fallbackFailed: 'today_campaign_textarea_copy_returned_false',
        });
        copied = true;
    } catch (error) {
        logCampaignFailure('today_campaign_whatsapp_message_copy_failed', error, {
            ...getBoundedCampaignStringContext('surface', surface),
            ...getBoundedCampaignStringContext('itemName', itemName),
            hasMenuLink: Boolean(menuLink),
            messageLength: message.length,
            ...getCampaignClipboardSupportContext(),
        });
    }

    if (!openRequested && !copied) {
        throw new Error('WhatsApp did not open. Please allow pop-ups and try again.');
    }

    if (surface === 'whatsapp_status') {
        return {
            title: openRequested ? 'WhatsApp opened' : 'Message copied',
            description: copied
                ? 'A ready message was copied and WhatsApp was opened. Finish sharing inside WhatsApp.'
                : 'WhatsApp was opened with a ready message. Finish sharing inside WhatsApp.',
        };
    }

    return {
        title: openRequested ? 'WhatsApp opened' : 'Message copied',
        description: copied
            ? 'Your message was copied and WhatsApp was opened. Choose the chat and send it when ready.'
            : 'WhatsApp was opened with a ready message. Choose the chat and send it when ready.',
    };
}
