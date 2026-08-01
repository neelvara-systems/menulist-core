import {
    ANSWERLATTICE_PROCEDURE_ACTIONS,
    type AnswerlatticeProcedure,
} from '@type/answerlattice';

export const MENULIST_ANSWERLATTICE_TARGETS = {
    MENU_IMPORT_CHOOSE_SOURCE: 'menulist.menu_import.choose_source',
    MENU_IMPORT_START: 'menulist.menu_import.start',
    MENU_IMPORT_REVIEW_APPLY: 'menulist.menu_import.review_apply',
    MENU_IMPORT_RETRY: 'menulist.menu_import.retry',
    MENU_PUBLISH: 'menulist.menu_publish',
    MENU_SHARE: 'menulist.menu_share',
    MENU_PUBLIC_LINK: 'menulist.menu_public_link',
} as const;

export const MENULIST_ANSWERLATTICE_EVENTS = {
    MENU_IMPORT_STARTED: 'menulist.menu_import.started',
    MENU_IMPORT_REVIEW_READY: 'menulist.menu_import.review_ready',
    MENU_IMPORT_COMPLETED: 'menulist.menu_import.completed',
    MENU_IMPORT_FAILED: 'menulist.menu_import.failed',
    MENU_PUBLISH_COMPLETED: 'menulist.menu_publish.completed',
    MENU_PUBLISH_VERIFIED: 'menulist.menu_publish.verified',
    MENU_SHARE_OPENED: 'menulist.menu_share.opened',
    MENU_PUBLIC_LINK_OPENED: 'menulist.menu_public_link.opened',
} as const;

export type MenuListAnswerlatticeTarget = typeof MENULIST_ANSWERLATTICE_TARGETS[keyof typeof MENULIST_ANSWERLATTICE_TARGETS];
export type MenuListAnswerlatticeEvent = typeof MENULIST_ANSWERLATTICE_EVENTS[keyof typeof MENULIST_ANSWERLATTICE_EVENTS];

type MenuListAnswerlatticeRuntimeWindow = Window & {
    AnswerlatticeWidget?: {
        emitWorkflowEvent?: (eventName: string) => boolean;
    };
};

export const getMenuListAnswerlatticeTargetProps = (target: MenuListAnswerlatticeTarget) => ({
    'data-answerlattice-target': target,
});

export const emitMenuListAnswerlatticeWorkflowEvent = (
    eventName: MenuListAnswerlatticeEvent,
): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        return (window as MenuListAnswerlatticeRuntimeWindow)
            .AnswerlatticeWidget
            ?.emitWorkflowEvent?.(eventName) === true;
    } catch {
        return false;
    }
};

export const isVerifiedMenuPublishResult = (
    value: unknown,
): value is { status: 'OK' } => (
    Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as { status?: unknown }).status === 'OK'
);

export type MenuListAnswerlatticeReferenceProcedureDraft = Readonly<{
    answer: string;
    feature: 'projects';
    procedure: AnswerlatticeProcedure;
    question: string;
    title: string;
    workflow: string;
}>;

export const MENULIST_ANSWERLATTICE_REFERENCE_PROCEDURES: readonly MenuListAnswerlatticeReferenceProcedureDraft[] = [
    {
        title: 'Import your first menu',
        question: 'How do I upload or import my first menu?',
        answer: 'Choose menu photos, a PDF, or an approved public menu link, then review the extracted changes before they update your menu.',
        feature: 'projects',
        workflow: 'import_menu',
        procedure: {
            procedureSlug: 'menulist_import_first_menu',
            prerequisites: [
                {
                    description: 'You must be able to edit the selected MenuList menu.',
                    type: 'role',
                    value: 'owner_or_editor',
                },
            ],
            steps: [
                {
                    stepOrder: 1,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.OPEN,
                    instruction: 'Open Menu and choose the upload or import area.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_CHOOSE_SOURCE,
                },
                {
                    stepOrder: 2,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.UPLOAD,
                    instruction: 'Choose menu photos, a PDF, or an approved public menu link.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_CHOOSE_SOURCE,
                },
                {
                    stepOrder: 3,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.SUBMIT,
                    instruction: 'Start the import after checking the selected source.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_START,
                    expectedEvent: MENULIST_ANSWERLATTICE_EVENTS.MENU_IMPORT_STARTED,
                    expectedResult: 'MenuList accepts the import job.',
                },
                {
                    stepOrder: 4,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.CONFIRM,
                    instruction: 'Review and apply only the extracted changes you want.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_REVIEW_APPLY,
                    expectedEvent: MENULIST_ANSWERLATTICE_EVENTS.MENU_IMPORT_COMPLETED,
                    expectedResult: 'The approved changes are saved to the menu.',
                },
            ],
        },
    },
    {
        title: 'Recover a failed menu import',
        question: 'What should I do when my menu import fails?',
        answer: 'Retry the import from the failure state, then review the extracted changes before applying them.',
        feature: 'projects',
        workflow: 'recover_menu_import',
        procedure: {
            procedureSlug: 'menulist_recover_menu_import',
            steps: [
                {
                    stepOrder: 1,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.CLICK,
                    instruction: 'Choose Try Again on the failed import.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_RETRY,
                },
                {
                    stepOrder: 2,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.SUBMIT,
                    instruction: 'Start the import again after checking the source.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_START,
                    expectedEvent: MENULIST_ANSWERLATTICE_EVENTS.MENU_IMPORT_STARTED,
                    expectedResult: 'MenuList accepts a new or existing active import job.',
                },
                {
                    stepOrder: 3,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.CONFIRM,
                    instruction: 'Review and apply only the extracted changes you want.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_REVIEW_APPLY,
                    expectedEvent: MENULIST_ANSWERLATTICE_EVENTS.MENU_IMPORT_COMPLETED,
                    expectedResult: 'The approved changes are saved to the menu.',
                },
            ],
        },
    },
    {
        title: 'Publish and check your menu',
        question: 'How do I publish my menu and check the public link?',
        answer: 'Publish the saved menu changes, open Share, and then open the public menu link to check the result.',
        feature: 'projects',
        workflow: 'publish_menu',
        procedure: {
            procedureSlug: 'menulist_publish_and_check_menu',
            steps: [
                {
                    stepOrder: 1,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.SUBMIT,
                    instruction: 'Publish the saved menu changes.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_PUBLISH,
                    expectedEvent: MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLISH_COMPLETED,
                    expectedResult: 'MenuList confirms the public changes were published.',
                },
                {
                    stepOrder: 2,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.OPEN,
                    instruction: 'Open Share to find the public menu link.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_SHARE,
                    expectedEvent: MENULIST_ANSWERLATTICE_EVENTS.MENU_SHARE_OPENED,
                },
                {
                    stepOrder: 3,
                    action: ANSWERLATTICE_PROCEDURE_ACTIONS.OPEN,
                    instruction: 'Open the public menu link and check the published result.',
                    target: MENULIST_ANSWERLATTICE_TARGETS.MENU_PUBLIC_LINK,
                    expectedEvent: MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLIC_LINK_OPENED,
                    expectedResult: 'The public menu opens in the browser.',
                },
            ],
        },
    },
];
