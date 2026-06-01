import {
    DefaultWebsiteResourceLocaleBoundary,
    ResourceHubPageShell,
    buildResourceHubMetadata,
} from '@/components/website/resources/ResourcePageShell';
import { WEBSITE_RESOURCE_DEFAULT_LOCALE } from '@/content/websiteResources';
import type { Metadata } from 'next';

export const metadata: Metadata = buildResourceHubMetadata(WEBSITE_RESOURCE_DEFAULT_LOCALE);

export default function ResourcesPage() {
    return (
        <DefaultWebsiteResourceLocaleBoundary>
            <ResourceHubPageShell locale={WEBSITE_RESOURCE_DEFAULT_LOCALE} />
        </DefaultWebsiteResourceLocaleBoundary>
    );
}
