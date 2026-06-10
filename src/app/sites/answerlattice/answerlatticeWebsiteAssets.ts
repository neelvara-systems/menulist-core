export type AnswerlatticeWebsiteAsset = {
    src: string;
    width: number;
    height: number;
    alt: string;
};

const DUMMY_ASSET_BASE = '/answerlattice-website-assets/dummy';
const DESKTOP_SCREEN_WIDTH = 1440;
const DESKTOP_SCREEN_HEIGHT = 1200;

function desktopScreen(fileName: string, alt: string): AnswerlatticeWebsiteAsset {
    return {
        src: `${DUMMY_ASSET_BASE}/${fileName}`,
        width: DESKTOP_SCREEN_WIDTH,
        height: DESKTOP_SCREEN_HEIGHT,
        alt,
    };
}

export const ANSWERLATTICE_HOME_HERO_ASSET = desktopScreen(
    'answerlattice-home-hero-workspace.png',
    'Sample AnswerLattice workspace showing billing support, safe context, and review queue'
);

export const ANSWERLATTICE_WIDGET_RUNTIME_ASSET = desktopScreen(
    'answerlattice-widget-runtime.png',
    'Sample AnswerLattice widget runtime screen showing billing support and widget controls'
);

export const ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS = {
    'Product setup': desktopScreen(
        'answerlattice-product-preview-activation.png',
        'Sample AnswerLattice activation command center'
    ),
    'Key product pages': desktopScreen(
        'answerlattice-product-preview-surfaces.png',
        'Sample AnswerLattice product surfaces'
    ),
    'Widget install': desktopScreen(
        'answerlattice-product-preview-widget.png',
        'Sample AnswerLattice widget install screen'
    ),
    'Feedback review': desktopScreen(
        'answerlattice-product-preview-feedback.png',
        'Sample AnswerLattice feedback review screen'
    ),
    'Answer review': desktopScreen(
        'answerlattice-product-preview-governance.png',
        'Sample AnswerLattice answer review screen'
    ),
} as const;

export type AnswerlatticeProductPreviewAssetKey = keyof typeof ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS;

export const ANSWERLATTICE_PRODUCT_AREA_ASSETS = {
    'Set up support': desktopScreen(
        'answerlattice-product-area-launch-setup.png',
        'Sample AnswerLattice launch setup product area'
    ),
    'In-app help widget': desktopScreen(
        'answerlattice-product-area-widget.png',
        'Sample AnswerLattice in-app widget product area'
    ),
    'Help center and tickets': desktopScreen(
        'answerlattice-product-area-support-control.png',
        'Sample AnswerLattice help center and tickets product area'
    ),
    'Review approved answers': desktopScreen(
        'answerlattice-product-area-governance.png',
        'Sample AnswerLattice approved answer review product area'
    ),
} as const;

export const ANSWERLATTICE_FEATURE_ASSETS: Record<string, AnswerlatticeWebsiteAsset> = {
    'team-access': desktopScreen(
        'answerlattice-feature-team-access.png',
        'Sample AnswerLattice Team Access feature screen'
    ),
    'knowledge-intake': desktopScreen(
        'answerlattice-feature-knowledge-intake.png',
        'Sample AnswerLattice Knowledge Intake feature screen'
    ),
    'knowledge-base': desktopScreen(
        'answerlattice-feature-knowledge-base.png',
        'Sample AnswerLattice Knowledge Base feature screen'
    ),
    'faq-management': desktopScreen(
        'answerlattice-feature-faq-management.png',
        'Sample AnswerLattice FAQ Management feature screen'
    ),
    changelog: desktopScreen(
        'answerlattice-feature-changelog.png',
        'Sample AnswerLattice Changelog feature screen'
    ),
    tickets: desktopScreen(
        'answerlattice-feature-tickets.png',
        'Sample AnswerLattice Tickets feature screen'
    ),
    'support-board': desktopScreen(
        'answerlattice-feature-support-board.png',
        'Sample AnswerLattice Support Board feature screen'
    ),
    'feedback-review': desktopScreen(
        'answerlattice-feature-feedback-review.png',
        'Sample AnswerLattice Feedback Review feature screen'
    ),
    'workflow-notifications': desktopScreen(
        'answerlattice-feature-workflow-notifications.png',
        'Sample AnswerLattice Workflow Notifications feature screen'
    ),
    'proactive-help': desktopScreen(
        'answerlattice-feature-proactive-help.png',
        'Sample AnswerLattice Proactive Help feature screen'
    ),
};

export const ANSWERLATTICE_DEMO_SURFACE_ASSETS = {
    billing: desktopScreen(
        'answerlattice-demo-surface-billing.png',
        'Sample AnswerLattice billing support-loop demo'
    ),
    onboarding: desktopScreen(
        'answerlattice-demo-surface-onboarding.png',
        'Sample AnswerLattice onboarding support-loop demo'
    ),
    settings: desktopScreen(
        'answerlattice-demo-surface-settings.png',
        'Sample AnswerLattice team settings support-loop demo'
    ),
    release: desktopScreen(
        'answerlattice-demo-surface-release.png',
        'Sample AnswerLattice release support-loop demo'
    ),
} as const;
