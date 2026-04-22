import { executeSurface, generateWhatsAppMessage } from '@lib/campaigns/executionSurfaces';
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

export function buildTodayMenuLink(
    subdomain?: string,
    customDomain?: string,
    projectName?: string,
): string | undefined {
    if (!subdomain && !customDomain) return undefined;

    try {
        return generateProjectUrl(subdomain, customDomain, projectName, false);
    } catch (error) {
        console.error('[TodayActionExecutor] Failed to build project link:', error);
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

    if (!result.success) {
        throw new Error(result.error || 'Action failed');
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

    const openedWindow = window.open(shareUrl, '_blank');

    let copied = false;
    try {
        await copyToClipboard(message);
        copied = true;
    } catch (error) {
        console.error('[TodayActionExecutor] Failed to copy WhatsApp message:', error);
    }

    if (!openedWindow && !copied) {
        throw new Error('WhatsApp did not open. Please allow pop-ups and try again.');
    }

    if (surface === 'whatsapp_status') {
        return {
            title: openedWindow ? 'WhatsApp opened' : 'Message copied',
            description: copied
                ? 'A ready message was copied and WhatsApp was opened. Finish sharing inside WhatsApp.'
                : 'WhatsApp was opened with a ready message. Finish sharing inside WhatsApp.',
        };
    }

    return {
        title: openedWindow ? 'WhatsApp opened' : 'Message copied',
        description: copied
            ? 'Your message was copied and WhatsApp was opened. Choose the chat and send it when ready.'
            : 'WhatsApp was opened with a ready message. Choose the chat and send it when ready.',
    };
}

async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}
