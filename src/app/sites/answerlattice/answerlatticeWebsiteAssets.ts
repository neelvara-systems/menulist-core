export type AnswerlatticeWebsiteAsset = {
    src: string;
    width: number;
    height: number;
    alt: string;
};

export type AnswerlatticeWebsiteMotionAsset = AnswerlatticeWebsiteAsset & {
    fallbackSrc: string;
    poster: string;
};

const DUMMY_ASSET_BASE = '/answerlattice-website-assets/dummy';
const DESKTOP_SCREEN_WIDTH = 1440;
const DESKTOP_SCREEN_HEIGHT = 1200;
const MOTION_WIDTH = 1280;
const MOTION_HEIGHT = 720;

function desktopScreen(fileName: string, alt: string): AnswerlatticeWebsiteAsset {
    return {
        src: `${DUMMY_ASSET_BASE}/${fileName}`,
        width: DESKTOP_SCREEN_WIDTH,
        height: DESKTOP_SCREEN_HEIGHT,
        alt,
    };
}

function publicScreen(fileName: string, alt: string): AnswerlatticeWebsiteAsset {
    return {
        src: `/${fileName}`,
        width: DESKTOP_SCREEN_WIDTH,
        height: DESKTOP_SCREEN_HEIGHT,
        alt,
    };
}

function motionAsset(src: string, fallbackSrc: string, poster: string, alt: string): AnswerlatticeWebsiteMotionAsset {
    return {
        src,
        fallbackSrc,
        poster,
        width: MOTION_WIDTH,
        height: MOTION_HEIGHT,
        alt,
    };
}

export const ANSWERLATTICE_HOME_HERO_ASSET = desktopScreen(
    'answerlattice-home-hero-workspace.png',
    'Sample AnswerLattice workspace showing billing support, safe context, and review queue'
);

export const ANSWERLATTICE_HOME_SUPPORT_CONTROL_MOTION = motionAsset(
    '/answerlattice-support-control-motion.webm',
    '/answerlattice-support-control-motion.mp4',
    '/answerlattice-support-control-motion-poster.png',
    'Governed AnswerLattice answer layer connecting product sources to approved support surfaces'
);

export const ANSWERLATTICE_AUTHORITY_TRANSFER_MOTION = motionAsset(
    '/answerlattice-authority-transfer.webm',
    '/answerlattice-authority-transfer.mp4',
    '/answerlattice-authority-transfer-poster.png',
    'AnswerLattice authority transfer from incoming support questions to reviewed support knowledge'
);

export const ANSWERLATTICE_PAGE_AWARE_WIDGET_MOTION = motionAsset(
    '/answerlattice-page-aware-widget-clip.webm',
    '/answerlattice-page-aware-widget-clip.mp4',
    '/answerlattice-page-aware-widget-clip-poster.png',
    'AnswerLattice page-aware widget using safe page context and approved answers'
);

export const ANSWERLATTICE_OWNER_DECISION_ASSET = publicScreen(
    'answerlattice-owner-decision-system.webp',
    'Sample AnswerLattice Daily Brief routing qualified work to evidence and owner review'
);

export const ANSWERLATTICE_KNOWLEDGE_MAP_ASSET = publicScreen(
    'answerlattice-knowledge-map.webp',
    'Sample AnswerLattice Knowledge Map showing curated product hierarchy, answer coverage, drift, and review state'
);

export const ANSWERLATTICE_RELEASE_ASSURANCE_ASSET = publicScreen(
    'answerlattice-release-assurance.webp',
    'Sample AnswerLattice release impact and Answer Tests review before owner-controlled activation'
);

export const ANSWERLATTICE_ARTICLE_TOPIC_MAP_ASSET = publicScreen(
    'answerlattice-article-topic-map.webp',
    'Sample public article topic map built from published guide headings'
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
    'knowledge-base': ANSWERLATTICE_ARTICLE_TOPIC_MAP_ASSET,
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
