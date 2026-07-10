/**
 * Menu Presence Monitor — Types
 *
 * @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
 */

export type SurfaceStatus = 'active' | 'missing';

export type ManualSurfaceId = 'googleBusiness' | 'appleBusiness' | 'bingPlaces' | 'instagramBio' | 'whatsappProfile';
export type AutoSurfaceId = 'tableQr' | 'digitalScreens' | 'feedbackQr';
export type SurfaceId = ManualSurfaceId | AutoSurfaceId;

export interface PresenceSurface {
    id: SurfaceId;
    label: string;
    status: SurfaceStatus;
    isAutoDetected: boolean;
    description: string;
    guide?: string;
}
