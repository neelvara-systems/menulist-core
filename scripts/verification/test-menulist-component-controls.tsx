#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import Module from 'node:module';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';

const { JSDOM } = require('jsdom') as {
    JSDOM: new (html: string, options: { url: string }) => {
        window: Window & typeof globalThis & { close: () => void };
    };
};

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:3000/component-controls?lang=en',
});
const browserWindow = dom.window;
const browserGetComputedStyle = browserWindow.getComputedStyle.bind(browserWindow);
const legacyEventElementPrototype = browserWindow.HTMLElement.prototype as typeof browserWindow.HTMLElement.prototype & {
    attachEvent?: () => void;
    detachEvent?: () => void;
};
legacyEventElementPrototype.attachEvent = () => undefined;
legacyEventElementPrototype.detachEvent = () => undefined;
Object.defineProperty(legacyEventElementPrototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
});
Object.defineProperty(browserWindow, 'getComputedStyle', {
    configurable: true,
    value: (element: Element) => browserGetComputedStyle(element),
});
Object.defineProperty(browserWindow, 'scrollTo', {
    configurable: true,
    value: () => undefined,
});

Object.assign(globalThis, {
    CustomEvent: browserWindow.CustomEvent,
    DocumentFragment: browserWindow.DocumentFragment,
    Element: browserWindow.Element,
    HTMLElement: browserWindow.HTMLElement,
    HTMLInputElement: browserWindow.HTMLInputElement,
    HTMLSelectElement: browserWindow.HTMLSelectElement,
    HTMLTextAreaElement: browserWindow.HTMLTextAreaElement,
    MutationObserver: browserWindow.MutationObserver,
    Node: browserWindow.Node,
    NodeFilter: browserWindow.NodeFilter,
    ShadowRoot: browserWindow.ShadowRoot,
    SVGElement: browserWindow.SVGElement,
    document: browserWindow.document,
    getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
    localStorage: browserWindow.localStorage,
    sessionStorage: browserWindow.sessionStorage,
    window: browserWindow,
});
Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: browserWindow.navigator,
});
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
});
Object.defineProperty(browserWindow, 'matchMedia', {
    configurable: true,
    value: () => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: false,
        media: '',
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
    }),
});
Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class ResizeObserver {
        disconnect() {}
        observe() {}
        unobserve() {}
    },
});
Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
});
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (handle: number) => clearTimeout(handle),
});
Object.defineProperty(browserWindow, 'requestAnimationFrame', {
    configurable: true,
    value: globalThis.requestAnimationFrame,
});
Object.defineProperty(browserWindow, 'cancelAnimationFrame', {
    configurable: true,
    value: globalThis.cancelAnimationFrame,
});
const { createRoot } = require('react-dom/client') as typeof import('react-dom/client');

const moduleWithLoad = Module as typeof Module & {
    _load: (request: string, parent: NodeModule | undefined, isMain: boolean) => unknown;
};
const originalModuleLoad = moduleWithLoad._load;
let clipboardWriteCount = 0;
let sessionUser: { email: string; platformRole?: string } | null = null;
let masterUpdateMode: 'banner' | 'history' = 'banner';
let masterAcknowledgeCount = 0;
let promptShownCount = 0;
let schedulerSnapshotReadCount = 0;
let reorderActivatorCount = 0;
const billingDocumentEmailRequests: string[] = [];
const isolatedBrowserOpenRequests: string[] = [];
const routerPushRequests: string[] = [];
moduleWithLoad._load = function loadForComponentControlTest(
    request: string,
    parent: NodeModule | undefined,
    isMain: boolean,
) {
    if (request === 'antd') {
        const antd = originalModuleLoad.call(this, request, parent, isMain) as Record<string, unknown>;
        if (parent?.filename.endsWith('/antdComponent/loadingMessage/index.tsx')) {
            return {
                ...antd,
                message: {
                    useMessage: () => {
                        const [content, setContent] = React.useState<React.ReactNode>(null);
                        const api = React.useMemo(() => ({
                            destroy: () => { setContent(null); },
                            open: ({ content: nextContent }: { content: React.ReactNode }) => { setContent(nextContent); },
                        }), []);
                        return [api, React.createElement(React.Fragment, null, content)];
                    },
                },
            };
        }
        if (parent?.filename.endsWith('/projects/LanguageSelector.tsx')) {
            return {
                ...antd,
                Select: ({ 'aria-label': ariaLabel, onChange, options }: {
                    'aria-label'?: string;
                    onChange?: (value: string) => void;
                    options?: Array<{ label: string; value: string }>;
                }) => React.createElement(
                    'select',
                    { 'aria-label': ariaLabel, defaultValue: '', onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange?.(event.target.value) },
                    React.createElement('option', { value: '' }, 'Select'),
                    options?.map((option) => React.createElement('option', { key: option.value, value: option.value }, option.label)),
                ),
            };
        }
        return {
            ...antd,
            message: {
                error: () => undefined,
                info: () => undefined,
                success: () => undefined,
                warning: () => undefined,
            },
        };
    }
    if (request === 'next-intl') {
        return {
            useLocale: () => 'en',
            useFormatter: () => ({
                dateTime: (value: Date | number) => new Date(value).toISOString(),
            }),
            useTranslations: () => (key: string) => ({
                createCatalog: 'Create menu',
                default: 'Default',
                statusActive: 'Active',
                statusDeleted: 'Deleted',
                statusInactive: 'Inactive',
                untitled: 'Untitled menu',
            }[key] || key),
        };
    }
    if (request === 'next-auth/react') {
        return { useSession: () => ({ data: sessionUser ? { user: sessionUser } : null }) };
    }
    if (request === 'next/navigation') {
        return {
            useRouter: () => ({
                back: () => undefined,
                push: (href: string) => { routerPushRequests.push(href); },
                replace: () => undefined,
            }),
        };
    }
    if (request === '@hook/useDeviceType') {
        return { __esModule: true, default: () => ({ isMobile: false }) };
    }
    if (request === '@hook/useAppSelector') {
        return { useAppSelector: () => false };
    }
    if (request === '@emoji-mart/data') {
        return {};
    }
    if (request === 'emoji-mart') {
        return {
            init: async () => undefined,
            Picker: class PickerFixture {},
            SearchIndex: {
                search: async () => [{ id: 'coffee', name: 'Coffee', skins: [{ native: '☕' }] }],
            },
        };
    }
    if (request === '@lib/browser/openIsolatedBrowserUrl') {
        return { openIsolatedBrowserUrl: (url: string) => { isolatedBrowserOpenRequests.push(url); } };
    }
    if (request === '@/components/shared/printableAssets/CampaignPosterModal') {
        return {
            __esModule: true,
            default: ({ input, open }: { input?: { campaignContent?: { offer?: string }; menuUrl?: string } | null; open: boolean }) => (
                open
                    ? React.createElement(
                        'div',
                        { 'aria-label': 'Campaign Poster fixture', role: 'dialog' },
                        `${input?.campaignContent?.offer || ''}|${input?.menuUrl || ''}`,
                    )
                    : null
            ),
        };
    }
    if (request === '@lib/billing/billingDocumentsClient') {
        return { requestBillingDocumentEmail: async (id: string) => {
            billingDocumentEmailRequests.push(id);
            return { status: 'sent' };
        } };
    }
    if (request === '@hook/paymentDiagnostics') {
        return { getBoundedPaymentStringContext: () => ({}), logPaymentFailure: () => undefined };
    }
    if (request === '@dnd-kit/sortable') {
        return {
            useSortable: () => ({
                attributes: {},
                listeners: { onClick: () => { reorderActivatorCount += 1; } },
                setActivatorNodeRef: () => undefined,
                setNodeRef: () => undefined,
                transform: null,
                transition: undefined,
            }),
        };
    }
    if (request === '@dnd-kit/utilities') {
        return { CSS: { Transform: { toString: () => undefined } } };
    }
    if (request === '@hook/useOfferingLabels') {
        return {
            useOfferingLabels: () => ({
                aiExtractsDesc: 'MenuList extracts the fixture items.',
                digitalLabel: 'digital menu',
                editorWelcome: 'Welcome to your menu editor',
                editorWelcomeDesc: 'Review the fixture menu before publishing.',
                itemsPlural: 'items',
                offeringLower: 'menu',
                offeringPhrase: 'menu',
                outletLinkedLabel: 'This outlet is linked',
                publishLabel: 'Publish and Share',
                uploadDesc: 'Upload a clear fixture menu.',
                uploadLabel: 'Upload Your Menu',
            }),
        };
    }
    if (request === '@database/aiSearchHistory') {
        return {
            assertAiSearchHistoryFeedbackUpdateSucceeded: () => undefined,
            updateAiSearchHistoryWithFeedback: async () => ({ success: true }),
        };
    }
    if (request === '@hook/answerlattice/useAnswerlatticeCacheScope') {
        return { useAnswerlatticeCacheScope: () => 'fixture-scope' };
    }
    if (request === '@hook/useArticleCache') {
        return {
            useArticleCache: () => ({
                addArticleToCache: () => undefined,
                cacheScopeKey: 'fixture-article-scope',
                getArticle: async () => null,
            }),
        };
    }
    if (request === '@hook/useMasterUpdateAwareness') {
        return function useMasterUpdateAwarenessFixture() {
            const diff = { addedItems: [], removedItems: [], changedItems: [] };
            return {
                acknowledge: async () => { masterAcknowledgeCount += 1; },
                diff: masterUpdateMode === 'banner' ? diff : null,
                hasHistory: masterUpdateMode === 'history',
                isAcknowledging: false,
                lastDiff: masterUpdateMode === 'history' ? diff : null,
                showBanner: masterUpdateMode === 'banner',
            };
        };
    }
    if (request === '@lib/multiOutlet/masterUpdateDiff') {
        return { buildSummaryText: () => '1 calm update' };
    }
    if (request === '@providers/projectsDataProvider') {
        return {
            ProjectsDataContext: React.createContext({
                activeProject: { masterProjectId: 'master-menu', projectId: 'outlet-menu' },
                setActiveProject: () => undefined,
            }),
        };
    }
    if (request === '@providers/platformProviders/platformGlobalDataProvider') {
        return {
            PlatformGlobalDataContext: React.createContext({ storeDetails: null }),
        };
    }
    if (request === './MasterUpdateDetailModal' && parent?.filename.endsWith('/MasterUpdateBanner/index.tsx')) {
        return function MasterUpdateDetailModalFixture({ open }: { open: boolean }) {
            return open ? React.createElement('div', { role: 'dialog' }, 'Master update details') : null;
        };
    }
    if (request === '@database/knowledgeBase/articles') {
        return {
            getArticleById: async (id: string) => ({
                id,
                active: true,
                categoryId: 'getting-started',
                categoryTitle: 'Getting started',
                content: { type: 'doc', content: [] },
                index: 0,
                jobId: 'fixture-job',
                sectionId: 'hours',
                status: 'published',
                tags: [],
                title: 'Help article',
                url: '/help/article',
            }),
        };
    }
    if (request === '@organisms/ArticleView') {
        return function ArticleViewFixture() {
            return React.createElement('div', null, 'Resolved article preview');
        };
    }
    if (request === 'framer-motion') {
        const motion = new Proxy({}, {
            get: (_target, property) => {
                const tagName = String(property);
                const MotionFixture = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
                    const {
                        animate: _animate,
                        children,
                        exit: _exit,
                        initial: _initial,
                        layout: _layout,
                        transition: _transition,
                        whileHover: _whileHover,
                        ...domProps
                    } = props;
                    return React.createElement(tagName, { ...domProps, ref }, children as React.ReactNode);
                });
                MotionFixture.displayName = `MotionFixture(${tagName})`;
                return MotionFixture;
            },
        });
        return {
            AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
            motion,
        };
    }
    if (request === '@lib/answerlattice/supportClipboard') {
        return {
            copyAnswerlatticeSupportTextToClipboard: async () => { clipboardWriteCount += 1; },
            hasAnswerlatticeSupportClipboardWrite: () => true,
            hasAnswerlatticeSupportCopyFallback: () => false,
        };
    }
    if (request === '@lib/analytics/session') {
        return { getSessionId: () => 'fixture-session' };
    }
    if (request === '@lib/analytics/unified') {
        return {
            TrackingEvent: {
                CUSTOMER_APP_INSTALL_STARTED: 'customer_app_install_started',
                CUSTOMER_APP_PROMPT_DISMISSED: 'customer_app_prompt_dismissed',
                CUSTOMER_APP_PROMPT_SHOWN: 'customer_app_prompt_shown',
            },
            trackEvent: async () => undefined,
        };
    }
    if (request === '@lib/pwa/installTracker') {
        return { recordPromptShown: () => { promptShownCount += 1; } };
    }
    if (request === '@lib/pwa/platformDetection') {
        return { detectPlatform: () => ({ browser: 'fixture', platform: 'other' }) };
    }
    if (request === '@database/ops/scheduler') {
        return {
            getSchedulerDashboardSnapshot: async () => {
                schedulerSnapshotReadCount += 1;
                return { health: null, runHistory: [], settlement: null };
            },
        };
    }
    if (request === '@hook/usePlatformStoreSummaryOptions') {
        const stores = [
            { name: 'Fixture One', sId: '101', tId: '201' },
            { name: 'Fixture Two', sId: '102', tId: '201' },
        ];
        const selectOptions = stores.map((store) => ({ label: store.name, value: store.sId }));
        return {
            usePlatformStoreSummaryOptions: () => {
                const [selectedStoreId, setSelectedStoreId] = React.useState('101');
                return {
                    error: false,
                    loading: false,
                    selectedStore: stores.find((store) => store.sId === selectedStoreId),
                    selectedStoreId,
                    selectOptions,
                    setSelectedStoreId,
                    stores,
                };
            },
        };
    }
    if (request === '../antd' && parent?.filename.endsWith('/mobile/components/MobileCompliancePagesEditor.tsx')) {
        const mobileAntd = originalModuleLoad.call(this, request, parent, isMain) as Record<string, unknown>;
        return {
            ...mobileAntd,
            Popup: ({ 'aria-label': ariaLabel, children, onMaskClick, visible }: {
                'aria-label'?: string;
                children: React.ReactNode;
                onMaskClick?: () => void;
                visible?: boolean;
            }) => visible ? React.createElement(
                'div',
                { 'aria-label': ariaLabel, role: 'dialog' },
                React.createElement('button', { 'aria-label': 'Dismiss compliance sheet', onClick: onMaskClick, type: 'button' }),
                children,
            ) : null,
        };
    }
    if (request === '../antd' && parent?.filename.endsWith('/mobile/screens/MobileSchedulerMonitorScreen.tsx')) {
        const mobileAntd = originalModuleLoad.call(this, request, parent, isMain) as Record<string, unknown>;
        return {
            ...mobileAntd,
            Select: ({ 'aria-label': ariaLabel, onChange, options, value }: {
                'aria-label'?: string;
                onChange?: (value: string) => void;
                options?: Array<{ label: string; value: string }>;
                value?: string;
            }) => React.createElement(
                'select',
                { 'aria-label': ariaLabel, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange?.(event.target.value), value },
                options?.map((option) => React.createElement('option', { key: option.value, value: option.value }, option.label)),
            ),
        };
    }
    if (request === '../antd' && parent?.filename.endsWith('/mobile/components/MobileLocalizedLanguageSelector.tsx')) {
        const mobileAntd = originalModuleLoad.call(this, request, parent, isMain) as Record<string, unknown>;
        return {
            ...mobileAntd,
            Select: ({ 'aria-label': ariaLabel, onChange, options, value }: {
                'aria-label'?: string;
                onChange?: (value: string) => void;
                options?: Array<{ label: string; value: string }>;
                value?: string;
            }) => React.createElement(
                'select',
                { 'aria-label': ariaLabel, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange?.(event.target.value), value },
                options?.map((option) => React.createElement('option', { key: option.value, value: option.value }, option.label)),
            ),
        };
    }
    if (request === '@util/razorpay') {
        return { hasValidSubscriptionAccess: (subscription: unknown) => Boolean(subscription) };
    }
    if (request === '.' && parent?.filename.endsWith('/website/pricing-pages/CreditPackCard.tsx')) {
        return { formatCurrencyOnPricingPage: (price: number) => `INR ${price}` };
    }
    if (request === './FeedbackModal' && parent?.filename.includes('/AISearchModal/ActionButtons')) {
        return function FeedbackModalFixture({ visible }: { visible: boolean }) {
            return visible ? React.createElement('div', { role: 'dialog' }, 'Feedback details') : null;
        };
    }
    if (request === '@atoms/CategoryIcon') {
        return function CategoryIconFixture() {
            return React.createElement('span', { 'aria-hidden': 'true' }, 'category');
        };
    }
    if (request === '@atoms/ChatHighlight') {
        return function ChatHighlightFixture({ text }: { text: string }) {
            return React.createElement('span', null, text);
        };
    }
    if (request.endsWith('.svg')) {
        return function SvgFixture() {
            return React.createElement('svg', { 'aria-hidden': 'true' });
        };
    }
    if (request.endsWith('.scss') || request.endsWith('.css')) {
        const styleTokens = new Proxy<Record<string, string>>({}, {
            get: (_target, property) => String(property),
        });
        const styleModule = { __esModule: true, default: styleTokens };
        return new Proxy(styleModule, {
            get: (target, property) => (
                property in target
                    ? target[property as keyof typeof target]
                    : String(property)
            ),
        });
    }
    return originalModuleLoad.call(this, request, parent, isMain);
};

const { ExportButton } = require('../../src/components/analytics/ExportButton') as typeof import('../../src/components/analytics/ExportButton');
const { ProjectConfirmModal } = require('../../src/components/templates/main-app/projects/ProjectDetails/ProjectConfirmModal') as typeof import('../../src/components/templates/main-app/projects/ProjectDetails/ProjectConfirmModal');
const ErrorRecoveryAlert = require('../../src/components/templates/main-app/projects/ErrorRecoveryAlert').default as typeof import('../../src/components/templates/main-app/projects/ErrorRecoveryAlert').default;
const { ProjectSelectorList, ProjectSelectorTrigger } = require('../../src/components/shared/ProjectSelector') as typeof import('../../src/components/shared/ProjectSelector');
const AiSearchActionButtons = require('../../src/components/organisms/AISearchModal/ActionButtons').default as typeof import('../../src/components/organisms/AISearchModal/ActionButtons').default;
const AiSearchSearchBar = require('../../src/components/organisms/AISearchModal/SearchBar').default as typeof import('../../src/components/organisms/AISearchModal/SearchBar').default;
const AiSearchLocalResults = require('../../src/components/organisms/AISearchModal/LocalSearchResults').default as typeof import('../../src/components/organisms/AISearchModal/LocalSearchResults').default;
const { WelcomeModal } = require('../../src/components/templates/main-app/projects/WelcomeModal') as typeof import('../../src/components/templates/main-app/projects/WelcomeModal');
const UpgradeConfirmationModal = require('../../src/components/templates/main-app/billing/UpgradeConfirmationModal').default as typeof import('../../src/components/templates/main-app/billing/UpgradeConfirmationModal').default;
const MessageReferences = require('../../src/components/templates/main-app/helpChat/MessageReferences').default as typeof import('../../src/components/templates/main-app/helpChat/MessageReferences').default;
const { App: AntApp } = require('antd') as typeof import('antd');
const CreditPackCard = require('../../src/components/website/pricing-pages/CreditPackCard').default as typeof import('../../src/components/website/pricing-pages/CreditPackCard').default;
const PricingPlansModal = require('../../src/components/templates/main-app/billing/PricingPlansModal').default as typeof import('../../src/components/templates/main-app/billing/PricingPlansModal').default;
const EditSpecialMenuScheduleModal = require('../../src/components/templates/main-app/projects/EditSpecialMenuScheduleModal').default as typeof import('../../src/components/templates/main-app/projects/EditSpecialMenuScheduleModal').default;
const MenuFilters = require('../../src/components/templates/main-app/projects/b2cView/output/MenuFilters').default as typeof import('../../src/components/templates/main-app/projects/b2cView/output/MenuFilters').default;
const { MENU_MOODS, MenuMood } = require('../../src/components/templates/main-app/projects/b2cView/designSystem') as typeof import('../../src/components/templates/main-app/projects/b2cView/designSystem');
const MenuLanguageSwitcher = require('../../src/components/templates/main-app/projects/b2cView/output/MenuLanguageSwitcher').default as typeof import('../../src/components/templates/main-app/projects/b2cView/output/MenuLanguageSwitcher').default;
const TransactionDetailsModal = require('../../src/components/templates/main-app/transactions/TransactionDetailsModal').default as typeof import('../../src/components/templates/main-app/transactions/TransactionDetailsModal').default;
const ArticleViewModal = require('../../src/components/organisms/ArticleViewModal').default as typeof import('../../src/components/organisms/ArticleViewModal').default;
const PublicCookieConsentBanner = require('../../src/components/shared/publicCookieConsent/PublicCookieConsentBanner').default as typeof import('../../src/components/shared/publicCookieConsent/PublicCookieConsentBanner').default;
const MasterUpdateBanner = require('../../src/components/organisms/MasterUpdateBanner').default as typeof import('../../src/components/organisms/MasterUpdateBanner').default;
const { DateRangeSelector } = require('../../src/components/analytics/DateRangeSelector') as typeof import('../../src/components/analytics/DateRangeSelector');
const InstallInstructions = require('../../src/components/customerApp/InstallInstructions').default as typeof import('../../src/components/customerApp/InstallInstructions').default;
const InstallPrompt = require('../../src/components/customerApp/InstallPrompt').default as typeof import('../../src/components/customerApp/InstallPrompt').default;
const LucideIconGrid = require('../../src/components/atoms/IconPicker/LucideIconGrid').default as typeof import('../../src/components/atoms/IconPicker/LucideIconGrid').default;
const MobileTempStatusConfigurator = require('../../src/components/mobile/components/MobileTempStatusConfigurator').default as typeof import('../../src/components/mobile/components/MobileTempStatusConfigurator').default;
const MobileMenuCommandSheet = require('../../src/components/mobile/components/MobileMenuCommandSheet').default as typeof import('../../src/components/mobile/components/MobileMenuCommandSheet').default;
const SmartRecommendationsSheet = require('../../src/components/mobile/sheets/SmartRecommendationsSheet').default as typeof import('../../src/components/mobile/sheets/SmartRecommendationsSheet').default;
const MobileCompliancePagesEditor = require('../../src/components/mobile/components/MobileCompliancePagesEditor').default as typeof import('../../src/components/mobile/components/MobileCompliancePagesEditor').default;
const MobileSchedulerMonitorScreen = require('../../src/components/mobile/screens/MobileSchedulerMonitorScreen').default as typeof import('../../src/components/mobile/screens/MobileSchedulerMonitorScreen').default;
const ActiveInactiveAction = require('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/ActiveInactiveAction').default as typeof import('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/ActiveInactiveAction').default;
const AvailabilityAction = require('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/AvailabilityAction').default as typeof import('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/AvailabilityAction').default;
const PricingAction = require('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/PricingAction').default as typeof import('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/PricingAction').default;
const TextCaseAction = require('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/TextCaseAction').default as typeof import('../../src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/TextCaseAction').default;
const { LanguageSelector } = require('../../src/components/templates/main-app/projects/LanguageSelector') as typeof import('../../src/components/templates/main-app/projects/LanguageSelector');
const OwnerAppUpdatePrompt = require('../../src/components/common/OwnerAppUpdatePrompt').default as typeof import('../../src/components/common/OwnerAppUpdatePrompt').default;
const StarRating = require('../../src/components/atoms/GuestFeedbackForm/StarRating').default as typeof import('../../src/components/atoms/GuestFeedbackForm/StarRating').default;
const MediaAspectRatioSelector = require('../../src/components/shared/media/MediaAspectRatioSelector').default as typeof import('../../src/components/shared/media/MediaAspectRatioSelector').default;
const { OwnerAssistantInput } = require('../../src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantInput') as typeof import('../../src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantInput');
const ReorderSortableItem = require('../../src/components/templates/main-app/projects/editorView/ReorderSortableItem').default as typeof import('../../src/components/templates/main-app/projects/editorView/ReorderSortableItem').default;
const BillingHistory = require('../../src/components/templates/main-app/billing/BillingHistory').default as typeof import('../../src/components/templates/main-app/billing/BillingHistory').default;
const { EmptyState } = require('../../src/components/analytics/EmptyState') as typeof import('../../src/components/analytics/EmptyState');
const { RefreshButton } = require('../../src/components/analytics/RefreshButton') as typeof import('../../src/components/analytics/RefreshButton');
const { MetricCard } = require('../../src/components/analytics/MetricCard') as typeof import('../../src/components/analytics/MetricCard');
const { StatCard } = require('../../src/components/analytics/StatCard') as typeof import('../../src/components/analytics/StatCard');
const MobileLocalizedLanguageSelector = require('../../src/components/mobile/components/MobileLocalizedLanguageSelector').default as typeof import('../../src/components/mobile/components/MobileLocalizedLanguageSelector').default;
const SearchSuggestions = require('../../src/components/molecules/SearchSuggestions').default as typeof import('../../src/components/molecules/SearchSuggestions').default;
const { BusinessHealthSuggestedQuestions } = require('../../src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthSuggestedQuestions') as typeof import('../../src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthSuggestedQuestions');
const { OwnerAssistantSourceDisclosure } = require('../../src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantSourceDisclosure') as typeof import('../../src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantSourceDisclosure');
const MobileLinkCard = require('../../src/components/mobile/components/MobileLinkCard').default as typeof import('../../src/components/mobile/components/MobileLinkCard').default;
const MenuFilterChips = require('../../src/components/templates/main-app/projects/b2cView/output/MenuFilterChips').default as typeof import('../../src/components/templates/main-app/projects/b2cView/output/MenuFilterChips').default;
const { DataTable } = require('../../src/components/analytics/DataTable') as typeof import('../../src/components/analytics/DataTable');
const { FeedbackList } = require('../../src/components/analytics/FeedbackList') as typeof import('../../src/components/analytics/FeedbackList');
const { KnowledgeGaps } = require('../../src/components/analytics/KnowledgeGaps') as typeof import('../../src/components/analytics/KnowledgeGaps');
const { TopQuestions } = require('../../src/components/analytics/TopQuestions') as typeof import('../../src/components/analytics/TopQuestions');
const SkipToContentLink = require('../../src/components/shared/accessibility/SkipToContentLink').default as typeof import('../../src/components/shared/accessibility/SkipToContentLink').default;
const ScrollToBottomButton = require('../../src/components/atoms/ScrollToBottomButton/ScrollToBottomButton').default as typeof import('../../src/components/atoms/ScrollToBottomButton/ScrollToBottomButton').default;
const BackToTop = require('../../src/components/templates/main-app/projects/b2cView/output/BackToTop').default as typeof import('../../src/components/templates/main-app/projects/b2cView/output/BackToTop').default;
const EmojiGrid = require('../../src/components/atoms/IconPicker/EmojiGrid').default as typeof import('../../src/components/atoms/IconPicker/EmojiGrid').default;
const PrimaryCard = require('../../src/components/templates/main-app/today/components/PrimaryCard').default as typeof import('../../src/components/templates/main-app/today/components/PrimaryCard').default;
const { BusinessHealthHeader } = require('../../src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthHeader') as typeof import('../../src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthHeader');
const LoadingMessage = require('../../src/components/antdComponent/loadingMessage').default as typeof import('../../src/components/antdComponent/loadingMessage').default;
const AIButtonIcon = require('../../src/components/atoms/aiButtonIcon').default as typeof import('../../src/components/atoms/aiButtonIcon').default;
const KbSourceFile = require('../../src/components/atoms/KbSourceFile').default as typeof import('../../src/components/atoms/KbSourceFile').default;
const OperationalSection = require('../../src/components/templates/main-app/today/components/OperationalSection').default as typeof import('../../src/components/templates/main-app/today/components/OperationalSection').default;
const NoSubscriptionView = require('../../src/components/templates/main-app/billing/NoSubscriptionView').default as typeof import('../../src/components/templates/main-app/billing/NoSubscriptionView').default;
const { EmptyProjectState } = require('../../src/components/templates/main-app/projects/EmptyProjectState') as typeof import('../../src/components/templates/main-app/projects/EmptyProjectState');
const { FeedbackIntelligenceCard } = require('../../src/components/analytics/FeedbackIntelligenceCard') as typeof import('../../src/components/analytics/FeedbackIntelligenceCard');
const DrawerElement = require('../../src/components/antdComponent/drawerElement').default as typeof import('../../src/components/antdComponent/drawerElement').default;
const MobileBusinessHealthCard = require('../../src/components/mobile/components/MobileBusinessHealthCard').default as typeof import('../../src/components/mobile/components/MobileBusinessHealthCard').default;
const { ProcessGuideModal } = require('../../src/components/templates/main-app/projects/ProcessGuideModal') as typeof import('../../src/components/templates/main-app/projects/ProcessGuideModal');
const { OwnerAssistantMessageList } = require('../../src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantMessageList') as typeof import('../../src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantMessageList');
const EditorWelcomeBanner = require('../../src/components/templates/main-app/projects/editorView/EditorWelcomeBanner').default as typeof import('../../src/components/templates/main-app/projects/editorView/EditorWelcomeBanner').default;
const ExtractionJobFailureModal = require('../../src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal').default as typeof import('../../src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal').default;
const ExtractionJobSuccessModal = require('../../src/components/templates/main-app/projects/jobScreens/ExtractionJobSuccessModal').default as typeof import('../../src/components/templates/main-app/projects/jobScreens/ExtractionJobSuccessModal').default;
const FeatureComparisonTable = require('../../src/components/website/pricing-pages/FeatureComparisonTable').default as typeof import('../../src/components/website/pricing-pages/FeatureComparisonTable').default;
const SubscriptionPayementSuccessModal = require('../../src/components/website/pricing-pages/SubscriptionPayementSuccessModal').default as typeof import('../../src/components/website/pricing-pages/SubscriptionPayementSuccessModal').default;

const flush = async (): Promise<void> => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
    });
};

const findButton = (root: ParentNode, name: string): HTMLButtonElement => {
    const normalizedName = name.toLocaleLowerCase();
    const buttons = Array.from(root.querySelectorAll('button'));
    const exactButton = buttons.find((candidate) => {
        const accessibleName = candidate.getAttribute('aria-label') || candidate.textContent || '';
        return accessibleName.trim().toLocaleLowerCase() === normalizedName;
    });
    const button = exactButton || buttons.find((candidate) => {
        const accessibleName = candidate.getAttribute('aria-label') || candidate.textContent || '';
        return accessibleName.trim().toLocaleLowerCase().includes(normalizedName);
    });
    assert.ok(button, `Expected button ${name}.`);
    return button;
};

const createHost = async (element: React.ReactElement): Promise<{ host: HTMLDivElement; root: Root }> => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(element));
    return { host, root };
};

const clickLabelContaining = async (root: ParentNode, textValue: string): Promise<void> => {
    const label = Array.from(root.querySelectorAll('label')).find((candidate) => candidate.textContent?.includes(textValue)) as HTMLLabelElement | undefined;
    assert.ok(label, `Expected labelled control ${textValue}.`);
    await act(async () => label.click());
    await flush();
};

const cleanupHost = async (host: HTMLElement, root: Root): Promise<void> => {
    await act(async () => root.unmount());
    host.remove();
    document.querySelectorAll('.ant-dropdown, .ant-modal-root, .ant-message').forEach((node) => node.remove());
};

async function testExportButton(): Promise<void> {
    const exportFormats: string[] = [];
    const single = await createHost(
        <ExportButton
            data={[{ name: 'Masala tea', amount: 125 }]}
            formats={['csv']}
            onExport={(format) => { exportFormats.push(format); }}
        />,
    );
    await act(async () => findButton(single.host, 'Export CSV').click());
    await flush();
    assert.deepEqual(exportFormats, ['csv'], 'Single-format export must call the handler once.');
    await cleanupHost(single.host, single.root);

    const multiple = await createHost(
        <ExportButton
            data={[{ name: 'Masala tea', amount: 125 }]}
            formats={['csv', 'json', 'pdf']}
            onExport={(format) => { exportFormats.push(format); }}
        />,
    );
    await act(async () => findButton(multiple.host, 'Export').click());
    await flush();
    const menuItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find((candidate) =>
        candidate.textContent?.trim() === 'JSON',
    ) as HTMLElement | undefined;
    assert.ok(menuItem, 'Multiple-format export must expose its JSON menu action.');
    await act(async () => menuItem.click());
    await flush();
    assert.deepEqual(exportFormats, ['csv', 'json'], 'Dropdown export must dispatch the selected format once.');
    await cleanupHost(multiple.host, multiple.root);

    const empty = await createHost(<ExportButton data={[]} formats={['csv']} />);
    assert.equal(findButton(empty.host, 'Export CSV').disabled, true, 'Empty export must remain disabled.');
    await cleanupHost(empty.host, empty.root);
}

async function testProjectConfirmModal(): Promise<void> {
    let cancelCount = 0;
    let deleteCount = 0;
    let resetCount = 0;
    const modal = await createHost(
        <ProjectConfirmModal
            actionType="delete"
            fileCount={2}
            isOpen
            onCancel={() => { cancelCount += 1; }}
            onDelete={() => { deleteCount += 1; }}
            onReset={() => { resetCount += 1; }}
            projectName="Lunch menu"
        />,
    );
    assert.ok(document.querySelector('[role="dialog"]'), 'Delete confirmation must render an accessible dialog surface.');
    await act(async () => findButton(document, 'Cancel').click());
    await act(async () => findButton(document, 'Delete Menu').click());
    assert.equal(cancelCount, 1);
    assert.equal(deleteCount, 1);

    await act(async () => modal.root.render(
        <ProjectConfirmModal
            actionType="reset"
            isOpen
            onCancel={() => { cancelCount += 1; }}
            onDelete={() => { deleteCount += 1; }}
            onReset={() => { resetCount += 1; }}
        />,
    ));
    await act(async () => findButton(document, 'Reset Menu').click());
    assert.equal(resetCount, 1, 'Reset confirmation must invoke only its reset callback.');
    await cleanupHost(modal.host, modal.root);
}

async function testErrorRecoveryAlert(): Promise<void> {
    let dismissCount = 0;
    let retryAllCount = 0;
    const retried: string[] = [];
    const alert = await createHost(
        <ErrorRecoveryAlert
            failedFiles={[{
                uid: 'file-1',
                name: 'menu.pdf',
                error: 'Upload interrupted',
                timestamp: Date.UTC(2026, 7, 31, 12, 0, 0),
            }]}
            onDismiss={() => { dismissCount += 1; }}
            onRetry={(uid) => { retried.push(uid); }}
            onRetryAll={() => { retryAllCount += 1; }}
        />,
    );
    const disclosure = document.querySelector('.ant-collapse-header') as HTMLElement | null;
    assert.ok(disclosure, 'Failed-file details disclosure must render.');
    await act(async () => disclosure.click());
    await act(async () => disclosure.click());
    await act(async () => findButton(alert.host, 'Dismiss').click());
    await act(async () => findButton(alert.host, 'Retry All').click());
    await act(async () => findButton(alert.host, 'Retry').click());
    assert.equal(dismissCount, 1);
    assert.equal(retryAllCount, 1);
    assert.deepEqual(retried, ['file-1']);
    await cleanupHost(alert.host, alert.root);
}

async function testProjectSelectorControls(): Promise<void> {
    let triggerCount = 0;
    const selected: string[] = [];
    const managed: string[] = [];
    let createCount = 0;
    const trigger = await createHost(
        <ProjectSelectorTrigger
            clickable
            currentProject={{ id: 'menu-1', name: 'Lunch menu', isDefault: true }}
            onClick={() => { triggerCount += 1; }}
        />,
    );
    await act(async () => findButton(trigger.host, 'Lunch menu').click());
    assert.equal(triggerCount, 1);
    await cleanupHost(trigger.host, trigger.root);

    const list = await createHost(
        <ProjectSelectorList
            currentProjectId="menu-1"
            onCreate={() => { createCount += 1; }}
            onManage={(id) => { managed.push(id); }}
            onSelect={(id) => { selected.push(id); }}
            projects={[
                { id: 'menu-1', name: 'Lunch menu', isDefault: true },
                { id: 'menu-2', name: 'Dinner menu', active: false },
            ]}
        />,
    );
    await act(async () => findButton(list.host, 'Manage Lunch menu').click());
    await act(async () => findButton(list.host, 'Select Dinner menu').click());
    await act(async () => findButton(list.host, 'Create menu').click());
    assert.deepEqual(managed, ['menu-1']);
    assert.deepEqual(selected, ['menu-2']);
    assert.equal(createCount, 1);
    await cleanupHost(list.host, list.root);
}

async function testAiSearchActionButtons(): Promise<void> {
    let regenerateCount = 0;
    const actions = await createHost(
        <AiSearchActionButtons
            answer="Your hours are current."
            isTyping={false}
            onRegenerate={() => { regenerateCount += 1; }}
            searchHistoryId={null}
        />,
    );
    await act(async () => findButton(actions.host, 'Copy answer').click());
    await act(async () => findButton(actions.host, 'Regenerate response').click());
    await act(async () => findButton(actions.host, 'Mark response as good').click());
    await act(async () => findButton(actions.host, 'Mark response as bad').click());
    await flush();
    assert.equal(clipboardWriteCount, 1, 'Copy must reach the bounded clipboard adapter once.');
    assert.equal(regenerateCount, 1, 'Regenerate must invoke its callback once.');
    assert.ok(document.querySelector('[role="dialog"]'), 'Negative feedback must open the feedback dialog.');
    await cleanupHost(actions.host, actions.root);
}

async function testAiSearchBar(): Promise<void> {
    const queries: string[] = [];
    const searches: string[] = [];
    let clearCount = 0;
    const focusStates: boolean[] = [];
    const search = await createHost(
        <AiSearchSearchBar
            handleClear={() => { clearCount += 1; }}
            isFocused={false}
            isSearching={false}
            onSearch={({ query }) => { searches.push(query); }}
            query="hours"
            setIsFocused={(focused) => { focusStates.push(focused); }}
            setQuery={(query) => { queries.push(query); }}
            showAnimatedBorder
        />,
    );
    const input = search.host.querySelector('input') as HTMLInputElement | null;
    const form = search.host.querySelector('form') as HTMLFormElement | null;
    assert.ok(input && form, 'AI search input and form must render.');
    await act(async () => {
        input.dispatchEvent(new browserWindow.Event('focusin', { bubbles: true }));
        input.value = 'menu hours';
        input.dispatchEvent(new browserWindow.Event('input', { bubbles: true }));
        input.dispatchEvent(new browserWindow.Event('focusout', { bubbles: true }));
    });
    await act(async () => findButton(search.host, 'Clear search').click());
    await act(async () => form.dispatchEvent(new browserWindow.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(clearCount, 1);
    assert.deepEqual(searches, ['hours'], 'Form submit must use the current controlled query exactly once.');
    assert.ok(focusStates.includes(true) && focusStates.includes(false), 'Focus and blur must report both states.');
    assert.ok(queries.length <= 1, 'A single input event must not duplicate query updates.');
    await cleanupHost(search.host, search.root);
}

async function testAiSearchLocalResults(): Promise<void> {
    let closeCount = 0;
    const results = await createHost(
        <AiSearchLocalResults
            categoriesData={{
                categories: {
                    help: {
                        id: 'help',
                        title: 'Help',
                        icon: 'book',
                        description: 'Help category',
                        active: true,
                        index: 0,
                        url: '/help',
                        articles: [{ id: 'hours', title: 'Hours help', active: true, index: 0, url: '/help/hours' }],
                        sections: [{
                            id: 'menu-help',
                            title: 'Menu help',
                            description: 'Help for your menu',
                            active: true,
                            index: 0,
                            url: '/help/menu',
                            articles: [{ id: 'prices', title: 'Price help', active: true, index: 0, url: '/help/prices' }],
                        }],
                    },
                },
            }}
            onClose={() => { closeCount += 1; }}
            query="help"
        />,
    );
    await flush();
    const resultItems = Array.from(results.host.querySelectorAll('.ant-list-item')) as HTMLElement[];
    assert.equal(resultItems.length, 3, 'Category article, section, and nested article actions must render.');
    for (const item of resultItems) {
        await act(async () => item.click());
    }
    assert.equal(closeCount, 3, 'Each local-result action must close the modal exactly once.');
    await cleanupHost(results.host, results.root);
}

async function testWelcomeModal(): Promise<void> {
    let closeCount = 0;
    let startCount = 0;
    const welcome = await createHost(
        <WelcomeModal
            isOpen
            onClose={() => { closeCount += 1; }}
            onStart={() => { startCount += 1; }}
        />,
    );
    assert.ok(document.querySelector('[role="dialog"]'), 'Welcome flow must render an accessible dialog surface.');
    assert.match(document.body.textContent || '', /3 clear steps/);
    assert.match(document.body.textContent || '', /Nothing is public until you approve it\./);
    assert.equal(document.querySelectorAll('.ant-steps-item').length, 3, 'Welcome flow must keep the owner journey to three clear steps.');
    await act(async () => findButton(document, 'Skip').click());
    await act(async () => findButton(document, 'Get Started').click());
    assert.equal(closeCount, 1);
    assert.equal(startCount, 1);
    await cleanupHost(welcome.host, welcome.root);
}

async function testUpgradeConfirmationModal(): Promise<void> {
    let closeCount = 0;
    let confirmCount = 0;
    const upgrade = await createHost(
        <UpgradeConfirmationModal
            activeSubscription={null}
            currency="INR"
            isOpen
            newPlan={{
                billingInterval: 'MONTH',
                description: 'Owner plan',
                featuresList: {},
                name: 'Pro',
                planId: 'pro-monthly',
                priceINR: { monthlyCredits: 100, price: 999 },
                priceUSD: { monthlyCredits: 100, price: 15 },
                type: 'B2C',
            }}
            onClose={() => { closeCount += 1; }}
            onConfirm={() => { confirmCount += 1; }}
        />,
    );
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Provider-boundary purchase must render a confirmation dialog.');
    assert.match(document.body.textContent || '', /tax-inclusive total before payment/i);
    await act(async () => findButton(document, 'Cancel').click());
    await act(async () => findButton(document, 'Confirm Purchase').click());
    assert.equal(closeCount, 1);
    assert.equal(confirmCount, 1, 'Confirmation must stop at the supplied pre-provider callback.');
    await cleanupHost(upgrade.host, upgrade.root);
}

async function testMessageReferences(): Promise<void> {
    let modalOpenCount = 0;
    const references = await createHost(
        <AntApp>
            <MessageReferences
                onArticleModalOpen={() => { modalOpenCount += 1; }}
                references={[{
                    categoryTitle: 'Getting started',
                    id: 'help-article',
                    sectionTitle: 'Hours',
                    similarityScore: 0.92,
                    title: 'Help article',
                }]}
                showConfidenceScores
            />
        </AntApp>,
    );
    const titleAction = Array.from(references.host.querySelectorAll('span')).find((candidate) =>
        candidate.textContent?.trim() === 'Help article',
    ) as HTMLElement | undefined;
    assert.ok(titleAction, 'Reference title action must render.');
    await act(async () => titleAction.click());
    await flush();
    assert.match(references.host.textContent || '', /Resolved article preview/);
    await act(async () => findButton(references.host, 'View full article').click());
    assert.equal(modalOpenCount, 1);
    await act(async () => findButton(references.host, 'Hide Help article').click());
    await flush();
    await act(async () => findButton(references.host, 'Preview Help article').click());
    await flush();
    await act(async () => findButton(references.host, 'View full article: Help article').click());
    assert.equal(modalOpenCount, 2, 'Both full-article entry controls must invoke the modal callback.');
    await cleanupHost(references.host, references.root);
}

async function testCreditPackCard(): Promise<void> {
    const pack = {
        creditAmount: 500,
        description: 'Content credits',
        name: 'Enhancement pack',
        packId: 'enhancement',
        priceINR: { monthlyCredits: null, price: 49900 },
        priceUSD: { monthlyCredits: null, price: 700 },
    };
    const purchases: string[] = [];
    sessionUser = null;
    const card = await createHost(
        <CreditPackCard
            currency="INR"
            onPurchase={(selectedPack) => { purchases.push(selectedPack.packId); }}
            pack={pack}
        />,
    );
    assert.ok(findButton(card.host, 'creditPackSignIn'), 'Signed-out pack must expose its sign-in boundary.');

    sessionUser = { email: 'owner@example.test' };
    await act(async () => card.root.render(
        <CreditPackCard
            activeSubscription={{} as import('../../src/types/razorpay').FirestoreSubscriptionDoc}
            currency="INR"
            onPurchase={(selectedPack) => { purchases.push(selectedPack.packId); }}
            pack={pack}
        />,
    ));
    await act(async () => findButton(card.host, 'creditPackAdd').click());
    assert.deepEqual(purchases, ['enhancement']);

    const subscriptionPlans = document.createElement('div');
    subscriptionPlans.id = 'subscription-plans';
    document.body.appendChild(subscriptionPlans);
    let scrollCount = 0;
    const originalScrollTo = browserWindow.scrollTo;
    browserWindow.scrollTo = () => { scrollCount += 1; };
    try {
        await act(async () => card.root.render(
            <CreditPackCard
                currency="INR"
                onPurchase={(selectedPack) => { purchases.push(selectedPack.packId); }}
                pack={pack}
            />,
        ));
        await act(async () => findButton(card.host, 'creditPackChoosePlan').click());
        assert.equal(scrollCount, 1, 'Unsubscribed owner must move to the plan selector once.');
    } finally {
        browserWindow.scrollTo = originalScrollTo;
        subscriptionPlans.remove();
        sessionUser = null;
    }
    await cleanupHost(card.host, card.root);
}

async function testPricingPlansModal(): Promise<void> {
    const plans: import('../../src/data/common').Plan[] = [
        {
            billingInterval: 'YEAR',
            description: 'Yearly owner plan',
            featuresList: {},
            name: 'Yearly Pro',
            planId: 'fixture-yearly',
            priceINR: { monthlyCredits: 1200, price: 999900 },
            priceUSD: { monthlyCredits: 1200, price: 15000 },
            type: 'B2C',
        },
        {
            billingInterval: 'MONTH',
            description: 'Monthly owner plan',
            featuresList: {},
            name: 'Monthly Pro',
            planId: 'fixture-monthly',
            priceINR: { monthlyCredits: 100, price: 99900 },
            priceUSD: { monthlyCredits: 100, price: 1500 },
            type: 'B2C',
        },
    ];
    let providerCallbackCount = 0;
    const pricing = await createHost(
        <PricingPlansModal
            action="new"
            currencyOverride="INR"
            handleConfirmUpgrade={() => { providerCallbackCount += 1; }}
            isOpen
            onClose={() => undefined}
            plansOverride={plans}
            renderFeatureItems={() => null}
        />,
    );
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Pricing plan selector must render a dialog.');
    assert.ok(findButton(document, 'Get started with Yearly Pro'));
    await act(async () => findButton(document, 'Billing interval').click());
    await flush();
    const monthlyAction = findButton(document, 'Get started with Monthly Pro');
    await act(async () => monthlyAction.click());
    await flush();
    assert.ok(findButton(document, 'Confirm Purchase'), 'Plan choice must stop at confirmation before provider execution.');
    assert.equal(providerCallbackCount, 0, 'Provider callback must not run before explicit confirmation.');
    await act(async () => findButton(document, 'Cancel').click());
    assert.equal(providerCallbackCount, 0, 'Cancellation must remain provider-free.');
    await cleanupHost(pricing.host, pricing.root);
}

async function testEditSpecialMenuScheduleModal(): Promise<void> {
    let closeCount = 0;
    const submissions: Array<{ startsAt: string; endsAt: string }> = [];
    const schedule = await createHost(
        <EditSpecialMenuScheduleModal
            item={{
                displayName: 'Festival menu',
                endsAt: '2026-09-10T00:00:00.000Z',
                mode: 'replace',
                projectId: 'festival-menu',
                startsAt: '2026-09-05T00:00:00.000Z',
                status: 'scheduled',
            }}
            onClose={() => { closeCount += 1; }}
            onSubmit={async (data) => {
                submissions.push({ startsAt: data.startsAt, endsAt: data.endsAt });
                return { success: true };
            }}
            open
            specialMenus={[]}
        />,
    );
    await flush();
    const dialog = document.querySelector('[role="dialog"]');
    const form = document.querySelector('form');
    const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
    assert.ok(dialog && form, 'Schedule editor must render its dialog and form surfaces.');
    assert.equal(inputs.length, 2, 'Schedule editor must expose start and end controls.');
    const endInput = inputs[1];
    const valueSetter = Object.getOwnPropertyDescriptor(browserWindow.HTMLInputElement.prototype, 'value')?.set;
    assert.ok(valueSetter, 'Native input value setter must be available.');
    await act(async () => {
        valueSetter.call(endInput, '2026-09-11');
        endInput.dispatchEvent(new browserWindow.InputEvent('input', {
            bubbles: true,
            data: '2026-09-11',
            inputType: 'insertText',
        }));
        endInput.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    await flush();
    const save = findButton(document, 'Save schedule');
    assert.equal(save.disabled, false, 'A material valid schedule change must enable Save schedule.');
    await act(async () => save.click());
    await flush();
    assert.equal(submissions.length, 1);
    assert.equal(closeCount, 1, 'Successful schedule save must close once.');
    await cleanupHost(schedule.host, schedule.root);
}

async function testMenuFilters(): Promise<void> {
    const categories = [
        { id: 'drinks', name: { en: 'Drinks' }, icon: 'LuCupSoda' },
        { id: 'food', name: { en: 'Food' }, icon: 'LuUtensils' },
    ];
    const selected: string[] = [];
    const filters = await createHost(
        <MenuFilters
            activeCategory={categories[0]}
            activeLanguage="en"
            categories={categories}
            moodConfig={MENU_MOODS[MenuMood.CLEAN]}
            onSelectCategory={(category) => { if (category) selected.push(category.id); }}
            triggerVariant="inline"
        />,
    );
    await flush();
    const inlineTrigger = findButton(filters.host, 'sections');
    await act(async () => inlineTrigger.click());
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Inline menu-sections trigger must open its panel.');
    await act(async () => findButton(document, 'close').click());
    await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null, 'Close control must recover the inline panel.');
    await act(async () => inlineTrigger.click());
    await flush();
    const foodLink = document.querySelector('a[href="#cat-food"]') as HTMLAnchorElement | null;
    assert.ok(foodLink, 'Category link must render in the open panel.');
    await act(async () => foodLink.click());
    await flush();
    assert.deepEqual(selected, ['food']);

    await act(async () => filters.root.render(
        <MenuFilters
            activeCategory={categories[0]}
            activeLanguage="en"
            categories={categories}
            moodConfig={MENU_MOODS[MenuMood.CLEAN]}
            onSelectCategory={(category) => { if (category) selected.push(category.id); }}
            triggerVariant="floating"
        />,
    ));
    await flush();
    await act(async () => findButton(filters.host, 'sections').click());
    await flush();
    const backdrop = document.querySelector('div.fixed.inset-0') as HTMLElement | null;
    assert.ok(backdrop, 'Floating panel must render its dismiss backdrop.');
    await act(async () => backdrop.click());
    await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null, 'Backdrop action must close the floating panel.');
    await cleanupHost(filters.host, filters.root);
}

async function testMenuLanguageSwitcher(): Promise<void> {
    const selected: string[] = [];
    const language = await createHost(
        <MenuLanguageSwitcher
            activeLanguage="en"
            moodConfig={MENU_MOODS[MenuMood.CLEAN]}
            projectData={{ languages: ['en', 'hi'], projectId: 'fixture-menu' }}
            restoreStoredLanguage={false}
            setActiveLanguage={(nextLanguage) => { selected.push(nextLanguage); }}
        />,
    );
    await flush();
    const trigger = findButton(language.host, 'select language');
    await act(async () => trigger.click());
    await flush();
    const hindi = Array.from(document.querySelectorAll('button[dir]')).find((candidate) =>
        candidate.textContent?.includes('Hindi') || candidate.textContent?.includes('हिन्दी'),
    ) as HTMLButtonElement | undefined;
    assert.ok(hindi, 'Hindi language action must render.');
    await act(async () => hindi.click());
    assert.deepEqual(selected, ['hi']);

    await act(async () => trigger.click());
    await flush();
    const backdrop = document.querySelector('div.fixed.inset-0') as HTMLElement | null;
    assert.ok(backdrop, 'Language dropdown must render its dismiss backdrop.');
    await act(async () => backdrop.click());
    await flush();
    assert.equal(document.querySelector('button[dir]'), null, 'Backdrop must close the language dropdown.');
    await cleanupHost(language.host, language.root);
}

async function testTransactionDetailsModal(): Promise<void> {
    sessionUser = { email: 'operator@example.test', platformRole: 'PLATFORM' };
    let closeCount = 0;
    const transaction = await createHost(
        <TransactionDetailsModal
            isOpen
            onClose={() => { closeCount += 1; }}
            transaction={{
                action: 'fixture_action',
                createdOn: '2026-09-01T10:00:00.000Z',
                id: 'fixture-transaction',
                model: 'fixture-model',
                unitsConsumed: 0,
            }}
        />,
    );
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Transaction details must render a dialog surface.');
    const disclosure = document.querySelector('.ant-collapse-header') as HTMLElement | null;
    assert.ok(disclosure, 'Platform transaction must expose its debug disclosure.');
    await act(async () => disclosure.click());
    await flush();
    assert.match(document.body.textContent || '', /fixture-model/);
    await act(async () => findButton(document, 'close').click());
    assert.equal(closeCount, 1);
    sessionUser = null;
    await cleanupHost(transaction.host, transaction.root);
}

async function testArticleViewModalRecovery(): Promise<void> {
    let closeCount = 0;
    const article = await createHost(
        <ArticleViewModal
            article={null}
            onClose={() => { closeCount += 1; }}
            open
        />,
    );
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Unavailable article must retain a dialog surface.');
    assert.match(document.body.textContent || '', /Article Not Available/);
    await act(async () => findButton(document, 'Explore Other Articles').click());
    await act(async () => findButton(document, 'Close').click());
    assert.equal(closeCount, 2, 'Both recovery actions must invoke the supplied close callback.');
    await cleanupHost(article.host, article.root);
}

async function testPublicCookieConsentBanner(): Promise<void> {
    const storageKey = 'menulist-component-control-consent';
    localStorage.removeItem(storageKey);
    const choices: string[] = [];
    const consent = await createHost(
        <PublicCookieConsentBanner
            acceptLabel="Accept analytics"
            closeLabel="Close preferences"
            message="Choose analytics preferences."
            onConsentChange={(choice) => { choices.push(choice); }}
            preferenceEventName="menulist-open-cookie-preferences"
            privacyHref="/privacy-policy"
            privacyLabel="Read privacy policy"
            statusAccepted="Analytics accepted"
            storageKey={storageKey}
        >
            <div>Optional analytics runtime</div>
        </PublicCookieConsentBanner>,
    );
    await flush();
    assert.equal((consent.host.querySelector('a') as HTMLAnchorElement | null)?.getAttribute('href'), '/privacy-policy');
    await act(async () => findButton(consent.host, 'Accept analytics').click());
    await flush();
    assert.deepEqual(choices, ['accepted']);
    assert.equal(localStorage.getItem(storageKey), 'accepted');
    assert.match(consent.host.textContent || '', /Optional analytics runtime/);
    await act(async () => browserWindow.dispatchEvent(new browserWindow.Event('menulist-open-cookie-preferences')));
    await flush();
    await act(async () => findButton(consent.host, 'Close preferences').click());
    await flush();
    assert.equal(consent.host.querySelector('[role="dialog"]'), null);
    localStorage.removeItem(storageKey);
    await cleanupHost(consent.host, consent.root);
}

async function testMasterUpdateBanner(): Promise<void> {
    masterUpdateMode = 'banner';
    masterAcknowledgeCount = 0;
    const banner = await createHost(<MasterUpdateBanner key="banner" />);
    await act(async () => findButton(banner.host, 'Review').click());
    assert.ok(document.querySelector('[role="dialog"]'), 'Review must open the update detail surface.');
    await act(async () => findButton(banner.host, 'Got it').click());
    await flush();
    assert.equal(masterAcknowledgeCount, 1);

    masterUpdateMode = 'history';
    await act(async () => banner.root.render(<MasterUpdateBanner key="history" />));
    const historyAction = Array.from(banner.host.querySelectorAll('span')).find((candidate) =>
        candidate.textContent?.trim() === 'Last main menu changes',
    ) as HTMLElement | undefined;
    assert.ok(historyAction, 'Acknowledged history action must render.');
    await act(async () => historyAction.click());
    assert.ok(document.querySelector('[role="dialog"]'), 'History action must open the shared detail surface.');
    await cleanupHost(banner.host, banner.root);
}

async function testDateRangeSelector(): Promise<void> {
    const ranges: Array<{ start: Date; end: Date }> = [];
    const selector = await createHost(
        <DateRangeSelector onChange={(range) => { ranges.push(range); }} />,
    );
    await act(async () => findButton(selector.host, 'Last 7 Days').click());
    assert.equal(ranges.length, 1, 'Preset selection must emit exactly one bounded UTC range.');
    assert.equal(
        Math.round((ranges[0].end.getTime() - ranges[0].start.getTime()) / 86_400_000),
        6,
        'The seven-day preset must include seven UTC calendar days.',
    );

    const inputs = Array.from(selector.host.querySelectorAll('input')) as HTMLInputElement[];
    assert.equal(inputs.length, 2, 'Range selection must expose start and end inputs.');
    await act(async () => inputs[0].click());
    await flush();
    assert.ok(document.querySelector('.ant-picker-dropdown'), 'Range selection must open its governed calendar surface.');
    await cleanupHost(selector.host, selector.root);
}

async function testInstallInstructions(): Promise<void> {
    let closeCount = 0;
    const instructions = await createHost(
        <InstallInstructions
            activeLanguage="en"
            onClose={() => { closeCount += 1; }}
            open
            storeName="Fixture Cafe"
        />,
    );
    const dialog = instructions.host.querySelector('[role="dialog"]') as HTMLElement | null;
    assert.ok(dialog, 'iOS install fallback must render an accessible dialog.');
    const content = dialog.querySelector(':scope > div:last-child') as HTMLElement | null;
    assert.ok(content, 'Install instructions content must render inside the dismiss backdrop.');
    await act(async () => content.click());
    assert.equal(closeCount, 0, 'Clicks inside the instruction sheet must not dismiss it.');
    await act(async () => {
        document.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await act(async () => findButton(instructions.host, 'Got it').click());
    await act(async () => dialog.click());
    assert.equal(closeCount, 3, 'Escape, Got it, and backdrop dismissal must each reach onClose once.');
    await cleanupHost(instructions.host, instructions.root);
}

async function testInstallPrompt(): Promise<void> {
    let dismissCount = 0;
    let acceptedCount = 0;
    promptShownCount = 0;
    const prompt = await createHost(
        <InstallPrompt
            deferredPrompt={null}
            onDismiss={() => { dismissCount += 1; }}
            onInstallAccepted={() => { acceptedCount += 1; }}
            storeId="101"
            storeName="Fixture Cafe"
            tenantId="202"
            trackingEnabled={false}
        />,
    );
    await flush();
    assert.equal(promptShownCount, 1, 'Prompt impression storage must be recorded exactly once.');
    const promptButtons = Array.from(prompt.host.querySelectorAll('button')) as HTMLButtonElement[];
    assert.equal(promptButtons.length, 2, 'Install banner must expose dismiss and install controls.');
    await act(async () => promptButtons[0].click());
    assert.equal(dismissCount, 1);
    await act(async () => promptButtons[1].click());
    await flush();
    assert.ok(prompt.host.querySelectorAll('[role="dialog"]').length >= 2, 'Provider-free fallback must open manual install instructions.');
    assert.equal(acceptedCount, 0, 'Manual fallback must not claim native installation acceptance.');
    await cleanupHost(prompt.host, prompt.root);
}

async function testLucideIconGrid(): Promise<void> {
    const selected: string[] = [];
    const grid = await createHost(
        <LucideIconGrid
            onSelect={(icon) => { selected.push(icon); }}
            searchQuery=""
            suggestedIcons={['LuCoffee']}
        />,
    );
    await act(async () => findButton(grid.host, 'Select LuCoffee icon').click());
    await act(async () => findButton(grid.host, 'Load more icons').click());
    assert.match(grid.host.textContent || '', /Showing 240 of/);

    await act(async () => grid.root.render(
        <LucideIconGrid
            onSelect={(icon) => { selected.push(icon); }}
            searchQuery="Coffee"
        />,
    ));
    const result = Array.from(grid.host.querySelectorAll('button')).find((button) =>
        button.getAttribute('aria-label')?.startsWith('Select LuCoffee'),
    ) as HTMLButtonElement | undefined;
    assert.ok(result, 'Filtered Lucide result must expose its named selection action.');
    await act(async () => result.click());
    assert.deepEqual(selected, ['lu:LuCoffee', result.getAttribute('aria-label')?.replace(/^Select /, 'lu:').replace(/ icon$/, '')]);
    await cleanupHost(grid.host, grid.root);
}

async function testMobileTempStatusConfigurator(): Promise<void> {
    let clearCount = 0;
    const expiryHours: number[] = [];
    const exactExpiryValues: string[] = [];
    const baseProps = {
        activeStatusLabel: 'Temporary status active',
        clearStatusLabel: 'Clear status',
        customMessage: '',
        customMessageLabel: 'Message',
        customPlaceholder: 'Add a message',
        exactExpiryAt: '2026-09-03T12:00',
        exactExpiryLabel: 'Exact expiry',
        expiryLabel: 'Expires',
        expiresLabel: 'Expires',
        isLoading: false,
        onClear: () => { clearCount += 1; },
        onCustomMessageChange: () => undefined,
        onExactExpiryAtChange: (value: string) => { exactExpiryValues.push(value); },
        onExpiryHoursChange: (value: number) => { expiryHours.push(value); },
        onSet: () => undefined,
        onStatusTypeChange: () => undefined,
        previewLabel: 'Preview',
        previewMessage: 'Closed today',
        selectedExpiryHours: null,
        setStatusLabel: 'Set status',
        statusType: 'closed_today',
        statusTypeLabel: 'Status type',
    };
    const configurator = await createHost(
        <MobileTempStatusConfigurator
            {...baseProps}
            currentStatus={{ expiresAt: '2026-09-03T12:00:00.000Z', message: 'Closed today', type: 'closed_today' }}
            isActive
        />,
    );
    await act(async () => findButton(configurator.host, 'Clear status').click());
    assert.equal(clearCount, 1);

    await act(async () => configurator.root.render(
        <MobileTempStatusConfigurator {...baseProps} isActive={false} />,
    ));
    await act(async () => findButton(configurator.host, '2 hours').click());
    assert.deepEqual(expiryHours, [2]);
    const dateInput = configurator.host.querySelector('input[type="datetime-local"]') as HTMLInputElement | null;
    assert.ok(dateInput, 'Temporary-status expiry must expose the exact date-time input.');
    const valueSetter = Object.getOwnPropertyDescriptor(browserWindow.HTMLInputElement.prototype, 'value')?.set;
    assert.ok(valueSetter);
    await act(async () => {
        valueSetter.call(dateInput, '2026-09-04T12:15');
        dateInput.dispatchEvent(new browserWindow.InputEvent('input', { bubbles: true, data: '2026-09-04T12:15', inputType: 'insertText' }));
        dateInput.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    assert.deepEqual(exactExpiryValues, ['2026-09-04T12:15']);
    await cleanupHost(configurator.host, configurator.root);
}

async function testMobileMenuCommandSheet(): Promise<void> {
    let closeCount = 0;
    const selected: string[] = [];
    const noOp = () => undefined;
    const sheet = await createHost(
        <MobileMenuCommandSheet
            labels={{ offeringLower: 'menu', offeringTitle: 'Menu' } as import('../../src/lib/menu-kit/businessTypeLabels').OfferingLabels}
            onAIDefaults={noOp}
            onAddImages={noOp}
            onAddItem={noOp}
            onCategories={noOp}
            onChangeAvailability={noOp}
            onClose={() => { closeCount += 1; }}
            onGenerateDescriptions={() => { selected.push('descriptions'); }}
            onManageLanguages={noOp}
            onMoveCategory={noOp}
            onPreview={() => { selected.push('preview'); }}
            onPricing={noOp}
            onRepairMenu={() => { selected.push('repair'); }}
            onReorderMenu={noOp}
            onShowHide={noOp}
            onTextCase={noOp}
            onUploadMenu={noOp}
            visible
        />,
    );
    await flush();
    for (const label of ['repairMenuAi', 'addMissingDescriptions', 'viewUpdatedMenu']) {
        const textNode = Array.from(document.querySelectorAll('.ant-list-item')).find((node) => node.textContent?.includes(label)) as HTMLElement | undefined;
        assert.ok(textNode, `Command action ${label} must render.`);
        await act(async () => textNode.click());
    }
    assert.deepEqual(selected, ['repair', 'descriptions', 'preview']);
    assert.equal(closeCount, 3, 'Each command must close the sheet before invoking its action.');
    await cleanupHost(sheet.host, sheet.root);
}

async function testSmartRecommendationsCampaignPoster(): Promise<void> {
    const projectData = {
        active: true,
        defaultLanguage: 'en',
        files: [{
            active: true,
            extractedData: {
                data: {
                    categories: [{ active: true, id: 'qa-drinks', name: { en: 'Drinks' } }],
                    items: [{
                        active: true,
                        category: 'qa-drinks',
                        description: { en: 'Deterministic local fixture item' },
                        id: 'qa-filter-coffee',
                        name: { en: 'Filter Coffee' },
                        price: '80',
                    }],
                },
            },
            name: 'local-certification-menu.json',
        }],
        menuSettings: {
            decisionBlocks: {
                enableBestValue: true,
                enablePopular: true,
                enableQuickPick: true,
                pinnedPopular: 'qa-filter-coffee',
            },
        },
        name: { en: 'Menu' },
        projectId: '99601-default-99611',
    } as any;
    const storeDetails = {
        activePlanType: 'menulist_pro',
        businessCategory: 'Restaurant',
        businessType: 'Restaurant',
        customDomain: 'qa.example.test',
        defaultLanguage: 'en',
        name: 'MenuList Local Browser QA',
        subdomain: 'menulist-local-browser-qa',
    } as any;
    const sheet = await createHost(
        <SmartRecommendationsSheet
            businessCategory="Restaurant"
            businessType="Restaurant"
            onClose={() => undefined}
            onSaved={async () => undefined}
            projectData={projectData}
            storeDetails={storeDetails}
            visible
        />,
    );
    await flush();
    const posterButton = findButton(document, 'download Campaign Poster');
    assert.equal(posterButton.disabled, false, 'Saved Featured choice Campaign Poster action must be enabled.');
    await act(async () => posterButton.click());
    await flush();
    const posterDialog = document.querySelector('[role="dialog"][aria-label="Campaign Poster fixture"]');
    assert.ok(posterDialog, 'Mobile saved-choice action must open the Campaign Poster workflow.');
    assert.match(posterDialog.textContent || '', /Filter Coffee/, 'Campaign Poster must use the saved current item.');
    assert.match(
        posterDialog.textContent || '',
        /https:\/\/qa\.example\.test\/menu\?item=qa-filter-coffee/,
        'Campaign Poster must retain the exact item destination.',
    );
    await cleanupHost(sheet.host, sheet.root);
}

async function testMobileCompliancePagesEditor(): Promise<void> {
    const editor = await createHost(<MobileCompliancePagesEditor type="privacy" />);
    await act(async () => findButton(editor.host, 'Manage Privacy Policy').click());
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Compliance editor must open its full-height sheet.');
    const baseline = findButton(document, 'Show MenuList baseline content');
    await act(async () => baseline.click());
    assert.equal(baseline.getAttribute('aria-expanded'), 'true');
    assert.match(document.body.textContent || '', /generated automatically from your business information/);
    await act(async () => findButton(document, 'Dismiss compliance sheet').click());
    await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null, 'Mask dismissal must recover the underlying screen.');
    await cleanupHost(editor.host, editor.root);
}

async function testMobileSchedulerMonitorScreen(): Promise<void> {
    schedulerSnapshotReadCount = 0;
    sessionUser = { email: 'platform@example.test', platformRole: 'PLATFORM' };
    const monitor = await createHost(<MobileSchedulerMonitorScreen onBack={() => undefined} />);
    await flush();
    assert.equal(schedulerSnapshotReadCount, 1, 'Platform scheduler monitor must perform one initial bounded snapshot read.');
    await act(async () => findButton(monitor.host, 'Refresh').click());
    await flush();
    assert.equal(schedulerSnapshotReadCount, 2, 'Refresh must perform exactly one additional bounded snapshot read.');
    const selector = monitor.host.querySelector('select[aria-label="Store"]') as HTMLSelectElement | null;
    assert.ok(selector, 'Scheduler monitor must expose the governed store selector.');
    await act(async () => {
        selector.value = '102';
        selector.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    await flush();
    assert.match(monitor.host.textContent || '', /Store 102/);
    assert.equal(findButton(monitor.host, 'Run Nightly Recovery').disabled, false, 'Selected store must enable the guarded recovery boundary.');
    sessionUser = null;
    await cleanupHost(monitor.host, monitor.root);
}

async function testCommandCenterActionControls(): Promise<void> {
    const selectedItems = [{
        active: true,
        available: true,
        category: 'drinks',
        categoryName: 'Drinks',
        fileUid: 'file-1',
        id: 'item-1',
        isLocked: false,
        name: 'Masala Tea',
        price: '100',
    }];

    const activeConfigs: Array<string | null> = [];
    const active = await createHost(
        <ActiveInactiveAction
            onConfigReady={(config) => { activeConfigs.push(config); }}
            onPreviewChange={() => undefined}
            selectedItems={selectedItems}
        />,
    );
    await clickLabelContaining(active.host, 'Show to customers');
    await clickLabelContaining(active.host, 'Hide from customers');
    assert.deepEqual(activeConfigs.slice(-2), ['show', 'hide']);
    await cleanupHost(active.host, active.root);

    const availabilityConfigs: Array<string | null> = [];
    const availability = await createHost(
        <AvailabilityAction
            onConfigReady={(config) => { availabilityConfigs.push(config); }}
            onPreviewChange={() => undefined}
            selectedItems={selectedItems}
        />,
    );
    await clickLabelContaining(availability.host, 'Mark as Available');
    await clickLabelContaining(availability.host, 'Mark as Unavailable');
    assert.deepEqual(availabilityConfigs.slice(-2), ['available', 'unavailable']);
    await cleanupHost(availability.host, availability.root);

    const pricingConfigs: Array<{ method: string; value: number } | null> = [];
    const pricing = await createHost(
        <PricingAction
            currencySymbol="₹"
            onConfigReady={(config) => { pricingConfigs.push(config); }}
            onPreviewChange={() => undefined}
            selectedItems={selectedItems}
        />,
    );
    for (const method of ['Decrease by %', 'Add flat amount', 'Reduce flat amount', 'Set fixed price', 'Increase by %']) {
        await clickLabelContaining(pricing.host, method);
    }
    const numberInput = pricing.host.querySelector('input[role="spinbutton"]') as HTMLInputElement | null;
    assert.ok(numberInput, 'Pricing action must expose its bounded numeric input.');
    const valueSetter = Object.getOwnPropertyDescriptor(browserWindow.HTMLInputElement.prototype, 'value')?.set;
    assert.ok(valueSetter);
    await act(async () => {
        valueSetter.call(numberInput, '10');
        numberInput.dispatchEvent(new browserWindow.InputEvent('input', { bubbles: true, data: '10', inputType: 'insertText' }));
        numberInput.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    await flush();
    assert.deepEqual(pricingConfigs.at(-1), { method: 'increasePercent', value: 10 });
    await cleanupHost(pricing.host, pricing.root);

    const textConfigs: Array<{ mode: string } | null> = [];
    const textCase = await createHost(
        <TextCaseAction
            onConfigReady={(config) => { textConfigs.push(config); }}
            onPreviewChange={() => undefined}
            projectData={{ files: [] } as import('../../src/components/templates/main-app/projects/types').Project}
        />,
    );
    for (const mode of ['Sentence case', 'lowercase', 'UPPERCASE', 'Title Case']) {
        await clickLabelContaining(textCase.host, mode);
    }
    for (const label of ['Apply to category names', 'Apply to item names', 'Apply to attribute names', 'Apply to descriptions']) {
        await act(async () => findButton(textCase.host, label).click());
        await flush();
    }
    assert.equal(textConfigs.at(-1)?.mode, 'title');
    assert.ok(textConfigs.includes(null), 'Disabling every text area must emit a null configuration.');
    await cleanupHost(textCase.host, textCase.root);
}

async function testLanguageSelector(): Promise<void> {
    const updates: string[][] = [];
    const selector = await createHost(
        <AntApp>
            <LanguageSelector onLanguageToggle={(languages) => { updates.push(languages); }} selectedLanguages={['en', 'hi']} />
        </AntApp>,
    );
    const removeHindi = selector.host.querySelector('[aria-label="Remove Hindi language"]') as HTMLElement | null;
    assert.ok(removeHindi, 'Selected Hindi language must expose its named removal action.');
    await act(async () => removeHindi.click());
    assert.deepEqual(updates, [['en']]);

    await act(async () => selector.root.render(
        <AntApp>
            <LanguageSelector onLanguageToggle={(languages) => { updates.push(languages); }} selectedLanguages={['en']} />
        </AntApp>,
    ));
    const addLanguage = selector.host.querySelector('select') as HTMLSelectElement | null;
    assert.ok(addLanguage, 'Language selector must expose its governed add-language control.');
    assert.ok(Array.from(addLanguage.options).some((option) => option.value === 'hi'), 'Hindi must remain available for governed addition.');
    await act(async () => {
        addLanguage.value = 'hi';
        addLanguage.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    await flush();
    assert.deepEqual(updates.at(-1), ['en', 'hi']);
    await cleanupHost(selector.host, selector.root);
}

async function testOwnerAppUpdatePrompt(): Promise<void> {
    const previousBuildId = process.env.NEXT_PUBLIC_BUILD_ID;
    const originalFetch = globalThis.fetch;
    process.env.NEXT_PUBLIC_BUILD_ID = 'local-build-1';
    globalThis.fetch = async () => new Response(JSON.stringify({
        buildCreatedAt: '2026-09-02T00:00:00.000Z',
        buildId: 'server-build-2',
        buildProvenance: 'verified',
        env: 'qa',
        shortBuildId: 'server-',
    }), { headers: { 'content-type': 'application/json' }, status: 200 });
    sessionStorage.removeItem('menulist_owner_update_dismissed_build');
    try {
        const prompt = await createHost(<OwnerAppUpdatePrompt />);
        await flush();
        assert.match(prompt.host.textContent || '', /Update available/);
        assert.ok(findButton(prompt.host, 'Refresh now'), 'Browser-native refresh boundary must remain visible.');
        await act(async () => findButton(prompt.host, 'Dismiss update prompt').click());
        await flush();
        assert.equal(sessionStorage.getItem('menulist_owner_update_dismissed_build'), 'server-build-2');
        assert.equal(prompt.host.textContent, '', 'Dismissal must recover the owner workflow without reloading.');
        await cleanupHost(prompt.host, prompt.root);
    } finally {
        globalThis.fetch = originalFetch;
        if (previousBuildId === undefined) delete process.env.NEXT_PUBLIC_BUILD_ID;
        else process.env.NEXT_PUBLIC_BUILD_ID = previousBuildId;
        sessionStorage.removeItem('menulist_owner_update_dismissed_build');
    }
}

async function testSmallInteractionControls(): Promise<void> {
    const ratings: number[] = [];
    const rating = await createHost(<StarRating onChange={(value) => { ratings.push(value); }} value={2} />);
    const ratingButtons = Array.from(rating.host.querySelectorAll('button'));
    assert.equal(ratingButtons.length, 5, 'Star rating must expose five governed radio actions.');
    const fourStars = ratingButtons[3];
    await act(async () => fourStars.click());
    assert.deepEqual(ratings, [4]);
    await cleanupHost(rating.host, rating.root);

    const ratios: string[] = [];
    const aspectRatio = await createHost(
        <MediaAspectRatioSelector
            allowedAspectRatios={['1:1', '4:3']}
            onChange={(value) => { ratios.push(value); }}
            selectedAspectRatio="1:1"
        />,
    );
    await act(async () => findButton(aspectRatio.host, 'Landscape').click());
    assert.deepEqual(ratios, ['4:3']);
    await cleanupHost(aspectRatio.host, aspectRatio.root);

    const questions: string[] = [];
    const assistant = await createHost(<OwnerAssistantInput onAsk={(question) => { questions.push(question); }} />);
    const questionInput = assistant.host.querySelector('input') as HTMLInputElement | null;
    assert.ok(questionInput, 'Owner assistant must expose its question input.');
    const valueSetter = Object.getOwnPropertyDescriptor(browserWindow.HTMLInputElement.prototype, 'value')?.set;
    assert.ok(valueSetter);
    await act(async () => {
        valueSetter.call(questionInput, '  How is my menu health?  ');
        questionInput.dispatchEvent(new browserWindow.InputEvent('input', { bubbles: true, data: 'How is my menu health?', inputType: 'insertText' }));
        questionInput.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    await flush();
    await act(async () => findButton(assistant.host, 'businessHealth.assistant.send').click());
    assert.deepEqual(questions, ['How is my menu health?']);
    assert.equal(questionInput.value, '', 'Successful assistant submission must clear the draft.');
    await cleanupHost(assistant.host, assistant.root);

    let selectedCount = 0;
    reorderActivatorCount = 0;
    const reorder = await createHost(
        <ReorderSortableItem
            index={0}
            isSelected
            label="Drinks"
            onClick={() => { selectedCount += 1; }}
            uid="category-drinks"
        />,
    );
    await act(async () => findButton(reorder.host, 'Reorder Drinks').click());
    await act(async () => {
        const selectButton = Array.from(reorder.host.querySelectorAll('button')).find((button) => button.getAttribute('aria-pressed') === 'true');
        assert.ok(selectButton, 'Reorder item must expose its selected row action.');
        selectButton.click();
    });
    assert.equal(reorderActivatorCount, 1, 'Drag activator must retain its bound interaction listener.');
    assert.equal(selectedCount, 1, 'Selected reorder row must call its supplied handler once.');
    await cleanupHost(reorder.host, reorder.root);
}

async function testBillingHistoryControls(): Promise<void> {
    billingDocumentEmailRequests.length = 0;
    isolatedBrowserOpenRequests.length = 0;
    let historyRefreshCount = 0;
    const billing = await createHost(
        <AntApp>
            <BillingHistory
                billingHistory={[{
                    amount: 49900,
                    billingCycle: 'Monthly',
                    billingDocumentDeliveryStatus: 'not_requested',
                    billingDocumentId: 'document-1',
                    billingDocumentNumber: 'ML-QA-1',
                    billingDocumentUrl: 'https://billing.example.test/document-1',
                    credits: 0,
                    currency: 'INR',
                    date: Date.UTC(2026, 8, 1),
                    description: 'Provider-free QA subscription fixture',
                    id: 'history-1',
                    status: 'paid',
                    type: 'Subscription Payment',
                }]}
                fetchBillingHistory={async () => { historyRefreshCount += 1; return 'loaded'; }}
            />
        </AntApp>,
    );
    await act(async () => findButton(billing.host, 'Download billing document').click());
    assert.deepEqual(isolatedBrowserOpenRequests, ['https://billing.example.test/document-1'], 'Invoice action must hand the exact URL to the isolated-browser boundary.');
    await act(async () => findButton(billing.host, 'Email billing document').click());
    await flush();
    assert.deepEqual(billingDocumentEmailRequests, ['document-1'], 'Email action must request the exact admitted billing document once.');
    assert.equal(historyRefreshCount, 1, 'Successful email acknowledgement must refresh billing history once.');
    await cleanupHost(billing.host, billing.root);

}

async function testAnalyticsAndSearchControls(): Promise<void> {
    let emptyActionCount = 0;
    const empty = await createHost(
        <EmptyState
            action={{ onClick: () => { emptyActionCount += 1; }, text: 'Create report' }}
            description="Add your first report"
            title="No reports"
        />,
    );
    await act(async () => findButton(empty.host, 'Create report').click());
    assert.equal(emptyActionCount, 1, 'Empty-state recovery action must invoke its supplied handler once.');
    await cleanupHost(empty.host, empty.root);

    let refreshResolve: (() => void) | null = null;
    let refreshCount = 0;
    const refresh = await createHost(
        <RefreshButton
            onRefresh={() => {
                refreshCount += 1;
                return new Promise<void>((resolve) => { refreshResolve = resolve; });
            }}
            showText
        />,
    );
    const refreshAction = findButton(refresh.host, 'Refresh');
    await act(async () => {
        refreshAction.click();
        refreshAction.click();
    });
    assert.equal(refreshCount, 1, 'Refresh control must suppress repeated clicks while one refresh is in flight.');
    await act(async () => { refreshResolve?.(); });
    await flush();
    await cleanupHost(refresh.host, refresh.root);

    let metricCount = 0;
    const metric = await createHost(<MetricCard onClick={() => { metricCount += 1; }} title="Menu views" value={24} />);
    const metricAction = metric.host.querySelector('[role="button"]') as HTMLElement | null;
    assert.ok(metricAction, 'Clickable metric card must expose button semantics.');
    assert.equal(metricAction.tabIndex, 0, 'Clickable metric card must participate in keyboard order.');
    await act(async () => metricAction.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })));
    assert.equal(metricCount, 1, 'Enter must activate the metric card exactly once.');
    await cleanupHost(metric.host, metric.root);

    let statCount = 0;
    const stat = await createHost(<StatCard onClick={() => { statCount += 1; }} title="Published items" total={20} value={10} />);
    const statAction = stat.host.querySelector('[role="button"]') as HTMLElement | null;
    assert.ok(statAction, 'Clickable statistic card must expose button semantics.');
    assert.equal(statAction.tabIndex, 0, 'Clickable statistic card must participate in keyboard order.');
    await act(async () => statAction.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: ' ' })));
    assert.equal(statCount, 1, 'Space must activate the statistic card exactly once.');
    await cleanupHost(stat.host, stat.root);

    const selectedLanguages: string[] = [];
    const languages = await createHost(
        <MobileLocalizedLanguageSelector
            languages={['en', 'hi']}
            onChange={(value) => { selectedLanguages.push(value); }}
            selectedLanguage="en"
            title="Content language"
        />,
    );
    const languageSelect = languages.host.querySelector('select[aria-label="Content language"]') as HTMLSelectElement | null;
    assert.ok(languageSelect, 'Mobile localized content must expose its named language selector.');
    await act(async () => {
        languageSelect.value = 'hi';
        languageSelect.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    assert.deepEqual(selectedLanguages, ['hi']);
    await cleanupHost(languages.host, languages.root);

    const selectedArticles: string[] = [];
    let suggestionsCloseCount = 0;
    const suggestions = await createHost(
        <SearchSuggestions
            onArticleSelect={(article) => { selectedArticles.push(article.id); }}
            onClose={() => { suggestionsCloseCount += 1; }}
            searchTerm="hours"
            suggestions={[{
                active: true,
                id: 'article-hours',
                index: 0,
                title: 'Update business hours',
                url: '/help/update-business-hours',
            }]}
        />,
    );
    const suggestionAction = suggestions.host.querySelector('[role="button"][aria-label="Open Update business hours"]') as HTMLElement | null;
    assert.ok(suggestionAction, 'Search suggestion must expose a named keyboard action.');
    assert.equal(suggestionAction.tabIndex, 0, 'Search suggestion must participate in keyboard order.');
    await act(async () => suggestionAction.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })));
    assert.deepEqual(selectedArticles, ['article-hours']);
    assert.equal(suggestionsCloseCount, 1, 'Selecting a suggestion must close the results once.');
    await cleanupHost(suggestions.host, suggestions.root);
}

async function testOwnerAndPublicChoiceControls(): Promise<void> {
    const askedQuestions: string[] = [];
    const question = {
        domain: 'analytics' as const,
        id: 'today_stats',
        intent: 'analytics_period_summary' as const,
        label: 'How is today going?',
        question: 'How is today going?',
    };
    const suggested = await createHost(
        <BusinessHealthSuggestedQuestions
            onAsk={(value) => { askedQuestions.push(value.id); }}
            questions={[question]}
        />,
    );
    await act(async () => findButton(suggested.host, 'businessHealth.assistant.questions.today_stats').click());
    assert.deepEqual(askedQuestions, ['today_stats']);
    await cleanupHost(suggested.host, suggested.root);

    const sources = await createHost(
        <OwnerAssistantSourceDisclosure sources={[{ id: 'projects_summary', source: 'projects' }]} />,
    );
    const sourceDisclosure = sources.host.querySelector('.ant-collapse-header') as HTMLElement | null;
    assert.ok(sourceDisclosure, 'Owner assistant sources must expose their disclosure control.');
    await act(async () => sourceDisclosure.click());
    await flush();
    assert.equal(sourceDisclosure.getAttribute('aria-expanded'), 'true');
    assert.match(sources.host.textContent || '', /businessHealth\.sources\.menuProjects/);
    await cleanupHost(sources.host, sources.root);

    const linkActions: string[] = [];
    const linkCard = await createHost(
        <MobileLinkCard
            description="Customer menu"
            icon={<span>Menu</span>}
            label="Menu link"
            onCopy={() => { linkActions.push('copy'); }}
            onOpen={() => { linkActions.push('open'); }}
            onShare={() => { linkActions.push('share'); }}
            onShowQr={() => { linkActions.push('qr'); }}
            value="https://fixture.menulist.test/menu"
        />,
    );
    for (const label of ['Copy Menu link', 'Share Menu link', 'Show QR code for Menu link', 'Open Menu link']) {
        await act(async () => findButton(linkCard.host, label).click());
    }
    assert.deepEqual(linkActions, ['copy', 'share', 'qr', 'open']);
    await cleanupHost(linkCard.host, linkCard.root);

    const filterChanges: Array<string | null> = [];
    const filterIntents: Array<string | null> = [];
    const chips = await createHost(
        <MenuFilterChips
            activeFilter={null}
            businessType="Restaurant"
            items={[
                { active: true, available: true, dietaryTags: ['vegetarian'] },
                { active: true, available: true, dietaryTags: ['non-veg'] },
                { active: true, available: true, isBestSeller: true },
            ]}
            moodConfig={MENU_MOODS[MenuMood.CLEAN]}
            onFilterChange={(value) => { filterChanges.push(value); }}
            onFilterIntentChange={(value) => { filterIntents.push(value); }}
        />,
    );
    assert.ok(chips.host.querySelectorAll('button').length > 0, 'Menu filter fixture must render its eligible controls.');
    await act(async () => findButton(chips.host, 'Vegetarian').click());
    assert.deepEqual(filterChanges, ['veg']);
    assert.deepEqual(filterIntents, ['veg']);
    await cleanupHost(chips.host, chips.root);
}

async function testAnalyticsListControls(): Promise<void> {
    const table = await createHost(
        <DataTable
            columns={[{ dataIndex: 'name', key: 'name', title: 'Name' }]}
            data={[{ id: 'one', name: 'Masala tea' }, { id: 'two', name: 'Cold coffee' }]}
            rowKey="id"
            showPagination={false}
            showSearch
        />,
    );
    const searchInput = table.host.querySelector('input[placeholder="Search..."]') as HTMLInputElement | null;
    assert.ok(searchInput, 'Analytics table must expose its search input.');
    const valueSetter = Object.getOwnPropertyDescriptor(browserWindow.HTMLInputElement.prototype, 'value')?.set;
    assert.ok(valueSetter);
    await act(async () => {
        valueSetter.call(searchInput, 'coffee');
        searchInput.dispatchEvent(new browserWindow.InputEvent('input', { bubbles: true, data: 'coffee', inputType: 'insertText' }));
        searchInput.dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    await flush();
    assert.match(table.host.textContent || '', /Cold coffee/);
    assert.doesNotMatch(table.host.textContent || '', /Masala tea/);
    await cleanupHost(table.host, table.root);

    const feedbackSelections: string[] = [];
    const feedback = await createHost(
        <FeedbackList
            data={[{ count: 2, id: 'feedback-1', isPositive: true, message: 'Clear menu' }]}
            onItemClick={(item) => { feedbackSelections.push(item.id); }}
        />,
    );
    const feedbackAction = feedback.host.querySelector('[role="button"]') as HTMLElement | null;
    assert.ok(feedbackAction, 'Clickable feedback item must expose button semantics.');
    await act(async () => feedbackAction.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })));
    assert.deepEqual(feedbackSelections, ['feedback-1']);
    await cleanupHost(feedback.host, feedback.root);

    const gapSelections: string[] = [];
    const gaps = await createHost(
        <KnowledgeGaps
            data={[{ count: 3, examples: ['When do you close?'], question: 'Closing time', severity: 'high' }]}
            onItemClick={(item) => { gapSelections.push(item.question); }}
        />,
    );
    const gapAction = gaps.host.querySelector('[role="button"]') as HTMLElement | null;
    assert.ok(gapAction, 'Clickable knowledge gap must expose button semantics.');
    await act(async () => gapAction.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: ' ' })));
    assert.deepEqual(gapSelections, ['Closing time']);
    await cleanupHost(gaps.host, gaps.root);

    const questionSelections: string[] = [];
    const questions = await createHost(
        <TopQuestions
            data={[{ count: 4, question: 'Are you open today?' }]}
            onItemClick={(item) => { questionSelections.push(item.question); }}
        />,
    );
    const questionAction = questions.host.querySelector('[role="button"]') as HTMLElement | null;
    assert.ok(questionAction, 'Clickable top question must expose button semantics.');
    await act(async () => questionAction.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })));
    assert.deepEqual(questionSelections, ['Are you open today?']);
    await cleanupHost(questions.host, questions.root);
}

async function testNavigationRecoveryControls(): Promise<void> {
    const mainTarget = document.createElement('main');
    document.body.appendChild(mainTarget);
    const skip = await createHost(<SkipToContentLink />);
    await flush();
    const skipLink = skip.host.querySelector('a[href="#main-content"]') as HTMLAnchorElement | null;
    assert.ok(skipLink, 'Skip link must target the governed main-content anchor.');
    await act(async () => skipLink.click());
    assert.equal(document.activeElement, mainTarget, 'Skip link must move focus to main content.');
    assert.equal(mainTarget.id, 'main-content');
    assert.equal(mainTarget.getAttribute('tabindex'), '-1');
    await cleanupHost(skip.host, skip.root);
    mainTarget.remove();

    let scrollBottomCount = 0;
    const scrollBottom = await createHost(
        <ScrollToBottomButton onClick={() => { scrollBottomCount += 1; }} visible />,
    );
    await act(async () => findButton(scrollBottom.host, 'Scroll to bottom').click());
    assert.equal(scrollBottomCount, 1);
    await cleanupHost(scrollBottom.host, scrollBottom.root);

    const scrollContainer = document.createElement('div');
    scrollContainer.scrollTop = 420;
    Object.defineProperty(scrollContainer, 'scrollTo', {
        configurable: true,
        value: ({ top }: { top?: number }) => { scrollContainer.scrollTop = top || 0; },
    });
    document.body.appendChild(scrollContainer);
    const backToTop = await createHost(
        <BackToTop
            moodConfig={MENU_MOODS[MenuMood.CLEAN]}
            scrollContainerRef={{ current: scrollContainer }}
        />,
    );
    await flush();
    await act(async () => findButton(backToTop.host, 'Back to top').click());
    assert.equal(scrollContainer.scrollTop, 0, 'Back to top must recover the supplied scroll container.');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 750)); });
    await cleanupHost(backToTop.host, backToTop.root);
    scrollContainer.remove();
}

async function testEmojiSearchSelection(): Promise<void> {
    const selectedEmoji: string[] = [];
    const emojiGrid = await createHost(
        <EmojiGrid onSelect={(value) => { selectedEmoji.push(value); }} searchQuery="coffee" />,
    );
    await flush();
    await act(async () => findButton(emojiGrid.host, 'Select Coffee emoji').click());
    assert.deepEqual(selectedEmoji, ['emoji:☕']);
    await cleanupHost(emojiGrid.host, emojiGrid.root);
}

async function testTodayAndBusinessHealthControls(): Promise<void> {
    const completedCampaigns: unknown[][] = [];
    const skippedCampaigns: unknown[][] = [];
    const campaign = {
        campaignId: 'campaign-1',
        confidence: 0.8,
        intent: 'in_store_reinforcement' as const,
        kind: 'active' as const,
        primarySurface: 'print_poster' as const,
        projectId: 'project-1',
        status: 'suggested' as const,
        subject: { itemId: 'item-1', itemName: 'Masala tea' },
        type: 'bestseller_boost' as const,
    };
    const primary = await createHost(
        <PrimaryCard
            campaign={campaign}
            isProcessing={false}
            onComplete={(...args) => { completedCampaigns.push(args); }}
            onSkip={(...args) => { skippedCampaigns.push(args); }}
        />,
    );
    const primaryButtons = Array.from(primary.host.querySelectorAll('button'));
    assert.equal(primaryButtons.length, 2, 'Today primary card must expose one completion action and one skip action.');
    await act(async () => primaryButtons[0].click());
    await act(async () => findButton(primary.host, 'Skip').click());
    assert.deepEqual(completedCampaigns, [[
        'campaign-1',
        'project-1',
        'bestseller_boost',
        'print_poster',
        'download',
        'Masala tea',
    ]]);
    assert.deepEqual(skippedCampaigns, [['campaign-1', 'bestseller_boost']]);
    await cleanupHost(primary.host, primary.root);

    const operationalCompletions: unknown[][] = [];
    const operational = await createHost(
        <OperationalSection
            campaigns={[{ ...campaign, kind: 'passive', type: 'now_available' }]}
            isProcessing={false}
            onComplete={(...args) => { operationalCompletions.push(args); }}
            onSkip={() => undefined}
        />,
    );
    await act(async () => operational.host.querySelector('button')?.click());
    assert.deepEqual(operationalCompletions, [[
        'campaign-1',
        'project-1',
        'now_available',
        'print_poster',
        'download',
        'Masala tea',
    ]]);
    await cleanupHost(operational.host, operational.root);

    let refreshCount = 0;
    const health = await createHost(
        <BusinessHealthHeader current={null} onRefresh={() => { refreshCount += 1; }} />,
    );
    await act(async () => findButton(health.host, 'businessHealth.page.refresh').click());
    assert.equal(refreshCount, 1, 'Business health refresh must invoke its supplied recovery handler once.');
    await cleanupHost(health.host, health.root);
}

async function testSmallReusableActionControls(): Promise<void> {
    let cancelCount = 0;
    const loading = await createHost(
        <LoadingMessage message="Preparing menu" onCancel={() => { cancelCount += 1; }} open progress={42} />,
    );
    await flush();
    assert.match(loading.host.textContent || '', /Preparing menu \(42%\)/);
    await act(async () => findButton(loading.host, 'Cancel operation').click());
    assert.equal(cancelCount, 1, 'Loading-message cancellation must invoke the supplied recovery callback once.');
    await cleanupHost(loading.host, loading.root);

    let aiActionCount = 0;
    const aiAction = await createHost(
        <AIButtonIcon label="Improve description" onClick={() => { aiActionCount += 1; }} tooltip="Use menu assistant" />,
    );
    await act(async () => findButton(aiAction.host, 'Improve description').click());
    assert.equal(aiActionCount, 1, 'Reusable AI action button must invoke its supplied handler once.');
    await cleanupHost(aiAction.host, aiAction.root);

    const sourceUrls: string[] = [];
    const source = await createHost(
        <KbSourceFile
            file={{ downloadURL: 'https://fixture.invalid/source.pdf', name: 'Menu source', type: 'application/pdf' }}
            onClickSource={(url) => { sourceUrls.push(url); }}
        />,
    );
    await act(async () => findButton(source.host, 'Menu source').click());
    assert.deepEqual(sourceUrls, ['https://fixture.invalid/source.pdf']);
    await cleanupHost(source.host, source.root);

    routerPushRequests.length = 0;
    const noSubscription = await createHost(<NoSubscriptionView />);
    assert.match(noSubscription.host.textContent || '', /noStoreSelected/);
    await act(async () => findButton(noSubscription.host, 'viewPlans').click());
    assert.deepEqual(routerPushRequests, ['/billing'], 'Plans & Billing recovery must route the unpaid owner to the internal billing screen exactly once.');
    await cleanupHost(noSubscription.host, noSubscription.root);

    let createMenuCount = 0;
    const emptyProject = await createHost(<EmptyProjectState onCreate={() => { createMenuCount += 1; }} />);
    await act(async () => findButton(emptyProject.host, 'Create Menu').click());
    assert.equal(createMenuCount, 1, 'Empty project recovery must invoke menu creation exactly once.');
    await cleanupHost(emptyProject.host, emptyProject.root);

    const feedbackIntelligence = await createHost(
        <FeedbackIntelligenceCard
            data={{
                date: '2026-09-01',
                generatedAt: '2026-09-01T12:00:00.000Z',
                recommendations: ['Clarify closing time'],
                summary: 'One recurring customer question needs attention.',
                themes: [{
                    count: 3,
                    examples: ['When do you close?'],
                    severity: 'medium',
                    suggestedActions: ['Publish closing time'],
                    theme: 'Business hours',
                }],
                topIssues: ['Closing time is unclear'],
            }}
        />,
    );
    const feedbackDisclosure = feedbackIntelligence.host.querySelector('.ant-collapse-header') as HTMLElement | null;
    assert.ok(feedbackDisclosure, 'Feedback intelligence theme must expose its disclosure control.');
    await act(async () => feedbackDisclosure.click());
    await flush();
    assert.equal(feedbackDisclosure.getAttribute('aria-expanded'), 'true');
    assert.match(feedbackIntelligence.host.textContent || '', /Publish closing time/);
    await cleanupHost(feedbackIntelligence.host, feedbackIntelligence.root);
}


async function testRemainingModalAndOwnerControls(): Promise<void> {
    let closeCount = 0;
    let footerCount = 0;
    const drawer = await createHost(
        <DrawerElement
            aria-label="Fixture drawer"
            footerActions={[<button key="save" onClick={() => { footerCount += 1; }} type="button">Save fixture</button>]}
            onClose={() => { closeCount += 1; }}
            open
            title="Fixture drawer"
        >
            Drawer content
        </DrawerElement>,
    );
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Drawer must expose its dialog surface.');
    await act(async () => findButton(document, 'Close drawer').click());
    await act(async () => findButton(document, 'Save fixture').click());
    assert.equal(closeCount, 1);
    assert.equal(footerCount, 1);
    await cleanupHost(drawer.host, drawer.root);

    const healthFixture: import('../../src/lib/ownerBusinessAssistant/types').OwnerBusinessHealthCurrentDoc = {
        version: 1,
        tId: '201',
        sId: '101',
        localDate: '2026-09-02',
        generatedAt: '2026-09-02T03:00:00.000Z',
        sourceWindow: { today: '2026-09-02', timeZone: 'Asia/Kolkata' },
        status: 'stable',
        summary: { headline: 'Customer facts are current', ownerMessage: 'No urgent action is required.', noActionNeeded: true, actionCount: 0 },
        blocks: {},
        suggestedChecks: [],
        suggestedQuestions: [],
        supportedIntents: [],
        unsupportedData: {},
        sourceRefs: [{ id: 'fixture-source', source: 'fixture', generatedAt: '2026-09-02T03:00:00.000Z' }],
        cost: { builderReadCount: 1, builderWriteCount: 1, chatHotPathReadCount: 0 },
    };
    let healthOpenCount = 0;
    const mobileHealth = await createHost(
        <MobileBusinessHealthCard current={healthFixture} onClick={() => { healthOpenCount += 1; }} />,
    );
    await act(async () => mobileHealth.host.querySelector('button')?.click());
    assert.equal(healthOpenCount, 1, 'Mobile Business Health must invoke its owner navigation callback once.');
    await cleanupHost(mobileHealth.host, mobileHealth.root);

    let guideCloseCount = 0;
    const guide = await createHost(<ProcessGuideModal isOpen onClose={() => { guideCloseCount += 1; }} />);
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'), 'Process guide must expose an accessible dialog surface.');
    await act(async () => findButton(document, "Got It, Let's Start!").click());
    assert.equal(guideCloseCount, 1);
    await cleanupHost(guide.host, guide.root);

    const selectedQuestions: string[] = [];
    const question: import('../../src/lib/ownerBusinessAssistant/types').OwnerBusinessHealthQuestion = {
        id: 'hours-question',
        label: 'Check hours',
        question: 'Are our hours current?',
        intent: 'business_status',
        domain: 'business_health',
    };
    const assistant = await createHost(
        <OwnerAssistantMessageList
            answer={{
                answerId: 'answer-1',
                confidence: 'high',
                freshnessLabel: 'Current today',
                sourceFactIds: ['fixture-source'],
                status: 'answered',
                suggestedQuestions: [question],
                text: 'Your published hours need review.',
            }}
            onSuggestedQuestion={(selected) => { selectedQuestions.push(selected.id); }}
        />,
    );
    await act(async () => assistant.host.querySelector('button')?.click());
    assert.deepEqual(selectedQuestions, ['hours-question']);
    await cleanupHost(assistant.host, assistant.root);

    localStorage.clear();
    const welcome = await createHost(<EditorWelcomeBanner isMasterLinked={false} storeId="101" tenantId="201" />);
    await flush();
    await act(async () => findButton(welcome.host, 'Got it').click());
    await flush();
    assert.equal(welcome.host.querySelector('button'), null, 'Dismissing the editor welcome must remove its action.');
    await cleanupHost(welcome.host, welcome.root);

    let failureCloseCount = 0;
    const failure = await createHost(
        <ExtractionJobFailureModal message="Fixture extraction failed safely." onClose={() => { failureCloseCount += 1; }} open />,
    );
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'));
    await act(async () => findButton(document, 'Try Again').click());
    assert.equal(failureCloseCount, 1);
    await cleanupHost(failure.host, failure.root);

    let successCloseCount = 0;
    const success = await createHost(
        <ExtractionJobSuccessModal
            extractionStats={{ categoriesCount: 2, itemsCount: 4, qualityScore: 80 }}
            onClose={() => { successCloseCount += 1; }}
            open
        />,
    );
    await flush();
    assert.ok(document.querySelector('[role="dialog"]'));
    await act(async () => findButton(document, 'View in Editor').click());
    assert.equal(successCloseCount, 1);
    await cleanupHost(success.host, success.root);
}

async function testRemainingPricingControls(): Promise<void> {
    const plan: import('../../src/data/common').Plan = {
        billingInterval: 'MONTH',
        description: 'Fixture plan',
        featuresList: {},
        name: 'Fixture Pro',
        planId: 'fixture-plan',
        priceINR: { monthlyCredits: 100, price: 99900 },
        priceUSD: { monthlyCredits: 100, price: 1500 },
        type: 'B2C',
    };
    const feature: import('../../src/data/common').Feature = {
        category: 'Core Platform',
        description: 'Fixture description',
        id: 'fixture-feature',
        name: 'Fixture feature',
        valueLabel: 'Included',
        values: { 'fixture-plan': true },
    };
    const comparison = await createHost(
        <FeatureComparisonTable allFeaturesList={[feature]} plans={[plan]} planType="B2C" />,
    );
    const disclosure = comparison.host.querySelector('button[aria-expanded]') as HTMLButtonElement | null;
    assert.ok(disclosure, 'Feature comparison must expose a named description disclosure.');
    await act(async () => disclosure.click());
    assert.equal(disclosure.getAttribute('aria-expanded'), 'true');
    await act(async () => disclosure.click());
    assert.equal(disclosure.getAttribute('aria-expanded'), 'false');
    await cleanupHost(comparison.host, comparison.root);

    isolatedBrowserOpenRequests.length = 0;
    let closeCount = 0;
    const success = await createHost(
        <SubscriptionPayementSuccessModal
            isOpen
            onClose={() => { closeCount += 1; }}
            paymentDetails={{ activationStatus: 'processing' }}
            purchaseIntent={null}
        />,
    );
    await flush();
    await act(async () => findButton(document, 'Pricing.successDashboardCta').click());
    assert.deepEqual(isolatedBrowserOpenRequests, ['http://localhost:3000/dashboard']);
    assert.equal(closeCount, 1, 'Dashboard handoff must close the success dialog once.');
    await cleanupHost(success.host, success.root);

    const stay = await createHost(
        <SubscriptionPayementSuccessModal
            isOpen
            onClose={() => { closeCount += 1; }}
            paymentDetails={{ activationStatus: 'active' }}
            purchaseIntent={null}
        />,
    );
    await flush();
    await act(async () => findButton(document, 'Pricing.successStayCta').click());
    assert.equal(closeCount, 2, 'Stay-here recovery must close the dialog exactly once.');
    await cleanupHost(stay.host, stay.root);
}

async function main(): Promise<void> {
    await testExportButton();
    await testProjectConfirmModal();
    await testErrorRecoveryAlert();
    await testProjectSelectorControls();
    await testAiSearchActionButtons();
    await testAiSearchBar();
    await testAiSearchLocalResults();
    await testWelcomeModal();
    await testUpgradeConfirmationModal();
    await testMessageReferences();
    await testCreditPackCard();
    await testPricingPlansModal();
    await testEditSpecialMenuScheduleModal();
    await testMenuFilters();
    await testMenuLanguageSwitcher();
    await testTransactionDetailsModal();
    await testArticleViewModalRecovery();
    await testPublicCookieConsentBanner();
    await testMasterUpdateBanner();
    await testDateRangeSelector();
    await testInstallInstructions();
    await testInstallPrompt();
    await testLucideIconGrid();
    await testMobileTempStatusConfigurator();
    await testMobileMenuCommandSheet();
    await testSmartRecommendationsCampaignPoster();
    await testMobileCompliancePagesEditor();
    await testMobileSchedulerMonitorScreen();
    await testCommandCenterActionControls();
    await testLanguageSelector();
    await testOwnerAppUpdatePrompt();
    await testSmallInteractionControls();
    await testBillingHistoryControls();
    await testAnalyticsAndSearchControls();
    await testOwnerAndPublicChoiceControls();
    await testAnalyticsListControls();
    await testNavigationRecoveryControls();
    await testEmojiSearchSelection();
    await testTodayAndBusinessHealthControls();
    await testSmallReusableActionControls();
    await testRemainingModalAndOwnerControls();
    await testRemainingPricingControls();
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stdout.write('MenuList focused component-control runtime tests passed.\n');
    process.exit(0);
}

main().catch((error: unknown) => {
    moduleWithLoad._load = originalModuleLoad;
    dom.window.close();
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exit(1);
});
