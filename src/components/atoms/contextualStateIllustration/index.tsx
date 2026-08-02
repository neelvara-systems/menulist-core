import type { ComponentType, CSSProperties, SVGProps } from 'react';

import AccessDeniedContextIllustration from './assets/access-denied-context.svg';
import AnalyticsContextIllustration from './assets/analytics-context.svg';
import EmptyWorkspaceIllustration from './assets/empty-workspace.svg';
import FeedbackContextIllustration from './assets/feedback-context.svg';
import NotFoundContextIllustration from './assets/not-found-context.svg';
import OnboardingSuccessContextIllustration from './assets/onboarding-success-context.svg';
import PhotoErrorContextIllustration from './assets/photo-error-context.svg';
import PhotoLoadingContextIllustration from './assets/photo-loading-context.svg';
import PhotoSuccessContextIllustration from './assets/photo-success-context.svg';
import RoleStructureContextIllustration from './assets/role-structure-context.svg';
import ScheduleContextIllustration from './assets/schedule-context.svg';
import ServerErrorContextIllustration from './assets/server-error-context.svg';
import TeamContextIllustration from './assets/team-context.svg';
import UploadContextIllustration from './assets/upload-context.svg';
import WarningContextIllustration from './assets/warning-context.svg';

const STATE_ILLUSTRATIONS = {
    accessDeniedContext: AccessDeniedContextIllustration,
    analyticsContext: AnalyticsContextIllustration,
    emptyWorkspace: EmptyWorkspaceIllustration,
    feedbackContext: FeedbackContextIllustration,
    notFoundContext: NotFoundContextIllustration,
    onboardingSuccessContext: OnboardingSuccessContextIllustration,
    photoErrorContext: PhotoErrorContextIllustration,
    photoLoadingContext: PhotoLoadingContextIllustration,
    photoSuccessContext: PhotoSuccessContextIllustration,
    roleStructureContext: RoleStructureContextIllustration,
    scheduleContext: ScheduleContextIllustration,
    serverErrorContext: ServerErrorContextIllustration,
    teamContext: TeamContextIllustration,
    uploadContext: UploadContextIllustration,
    warningContext: WarningContextIllustration,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export type ContextualStateIllustrationVariant = keyof typeof STATE_ILLUSTRATIONS;
export type ContextualStateIllustrationTreatment = 'plain' | 'softHalo';

interface ContextualStateIllustrationProps {
    className?: string;
    color?: string;
    size?: number;
    style?: CSSProperties;
    treatment?: ContextualStateIllustrationTreatment;
    variant: ContextualStateIllustrationVariant;
}

/**
 * Decorative artwork for spacious first-use, empty, outcome, and recovery states.
 * Interactive controls continue to use the product's standard Lucide icons.
 */
export default function ContextualStateIllustration({
    className,
    color = 'currentColor',
    size = 112,
    style,
    treatment = 'plain',
    variant,
}: ContextualStateIllustrationProps) {
    const Illustration = STATE_ILLUSTRATIONS[variant];
    const hasSoftHalo = treatment === 'softHalo';

    return (
        <span
            aria-hidden="true"
            className={className}
            style={{
                background: hasSoftHalo
                    ? 'radial-gradient(circle at 50% 48%, color-mix(in srgb, currentColor 16%, transparent) 0%, color-mix(in srgb, currentColor 7%, transparent) 48%, transparent 74%)'
                    : undefined,
                borderRadius: hasSoftHalo ? '50%' : undefined,
                boxSizing: 'border-box',
                color,
                display: 'inline-flex',
                flex: '0 0 auto',
                lineHeight: 0,
                maxWidth: '100%',
                padding: hasSoftHalo ? Math.max(6, Math.round(size * 0.075)) : undefined,
                width: size,
                ...style,
            }}
        >
            <Illustration
                focusable="false"
                style={{ display: 'block', height: 'auto', width: '100%' }}
            />
        </span>
    );
}
