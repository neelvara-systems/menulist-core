'use client'

import { BRAND_COLOR_PRESETS } from '@config/designSystem';
import { FEATURE_FLAGS } from '@config/features';
import type { ObpMenuInfo } from '@/app/client/obp/OBPResolvedSurface';
import useViewportInfo from '@hook/useViewportInfo';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { deleteOBPPhotos, uploadOBPCover, uploadOBPPhoto } from '@database/stores/uploadOBPPhoto';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getBrandName } from '@lib/businessIdentity/names';
import { generateBusinessCoverCandidate } from '@lib/image/projectImageGeneration';
import { updateLocalizedText } from '@lib/localization/text';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { collectObpMediaReferences } from '@lib/media/obpMediaReferences';
import { prepareMediaImage, type MediaImageCropIntent, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import { getMenuSpecialNoteSuggestions } from '@lib/menu/specialNoteSuggestions';
import { buildBusinessCopyManualOverrideMeta } from '@services/ai/businessCopy/metadata';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { normalizeOwnerPublicPresenceLinks } from '@lib/obp/ownerPublicPresenceBoundary';
import { buildVisualProfileCompletion } from '@lib/visualProfile/visualProfileCompletion';
import { getStoreDeepDifference } from '@lib/store/storeNestedUpdateProjection';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { InputNumber, theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import type { StoreDataType } from '@type/platform/store';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuArrowRight,
    LuCalendar,
    LuAlertCircle,
    LuCheckCircle,
    LuCrop,
    LuExternalLink,
    LuEye,
    LuGripVertical,
    LuImagePlus,
    LuMapPin,
    LuMessageSquare,
    LuMessageSquarePlus,
    LuPalette,
    LuShoppingBag,
    LuSmile,
    LuPhone,
    LuSparkles,
    LuStar,
    LuTrash2,
} from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, NavBar, Popup, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileCompliancePagesEditor from '../components/MobileCompliancePagesEditor';
import MobileLocalizedLanguageSelector from '../components/MobileLocalizedLanguageSelector';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import { getLocalizedStoreValue, getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage } from '../utils/localizedStoreContent';
import { openMobilePublicLink } from '../utils/openMobilePublicLink';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
    type MobileOwnerLogContext,
} from '../utils/mobileOwnerDiagnostics';

const MobileOfficialPagePreviewSheet = dynamic(() => import('../sheets/MobileOfficialPagePreviewSheet'), { ssr: false });
const ColorPickerSheet = dynamic(() => import('../sheets/ColorPickerSheet'), { ssr: false });

interface MobileOfficialPageScreenProps {
    embedded?: boolean;
    embeddedPhotoDeleteResetToken?: number;
    embeddedProjectsList?: any[];
    embeddedSelectedProjectId?: string | null;
    embeddedStoreDetails?: StoreDataType | null;
    onEmbeddedPhotoDeleteQueueChange?: (photoUrls: string[]) => void;
    onEmbeddedLanguageChange?: (language: string) => void;
    onEmbeddedStoreDetailsChange?: (storeDetails: StoreDataType) => void;
    onBack: () => void;
}

type PresenceFormData = ReturnType<typeof getInitialPresenceForm>;
type LocalizedPresenceDrafts = ReturnType<typeof buildLocalizedPresenceDrafts>;
type ObpMediaDraft = {
    crop?: MediaImageCropIntent;
    fileName?: string;
    prepared?: PreparedMediaImage;
    previewDataUrl?: string;
    sourceDataUrl?: string;
    uploadFailed?: boolean;
};

const MOBILE_OFFICIAL_PAGE_LINK_COPY_UNAVAILABLE = 'mobile_official_page_link_copy_unavailable';
const MOBILE_OFFICIAL_PAGE_LINK_COPY_FALLBACK_FAILED = 'mobile_official_page_link_copy_fallback_failed';

const hasMobileOfficialPageClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobileOfficialPageCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobileOfficialPageLink = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobileOfficialPageClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobileOfficialPageCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_OFFICIAL_PAGE_LINK_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(MOBILE_OFFICIAL_PAGE_LINK_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

function getFirstImageFile(fileList?: FileList | null): File | null {
    if (!fileList) return null;
    return Array.from(fileList).find((file) => file.type.startsWith('image/')) || null;
}

function getInitialPresenceForm(storeDetails: StoreDataType | null) {
    const initialPresence = storeDetails?.publicPresence || {};
    return {
        accentColor: initialPresence.accentColor || undefined,
        establishedYear: initialPresence.establishedYear,
        googleMapsUrl: initialPresence.googleMapsUrl || '',
        googleRating: initialPresence.googleRating,
        googleReviewCount: initialPresence.googleReviewCount,
        googleReviewUrl: initialPresence.googleReviewUrl || '',
        iconVariant: initialPresence.iconVariant || 'icons',
        orderUrl: initialPresence.orderUrl || '',
        businessCover: initialPresence.businessCover || '',
        photos: initialPresence.photos || [],
        reservationUrl: initialPresence.reservationUrl || '',
        showCall: initialPresence.showCall !== false,
        showDirections: initialPresence.showDirections !== false,
        showFeedback: initialPresence.showFeedback !== false,
        showGoogleReview: initialPresence.showGoogleReview !== false,
        showOrder: initialPresence.showOrder !== false,
        showPrivacyLink: initialPresence.showPrivacyLink !== false,
        showRefundLink: initialPresence.showRefundLink !== false,
        showReservation: initialPresence.showReservation !== false,
        showTermsLink: initialPresence.showTermsLink !== false,
        showWhatsApp: initialPresence.showWhatsApp !== false,
        specialNote: '',
        whatsappNumber: initialPresence.whatsappNumber || '',
    };
}

function buildLocalizedPresenceDrafts(storeDetails: StoreDataType | null, languages: string[]) {
    const initialPresence = storeDetails?.publicPresence || {};
    return Object.fromEntries(
        languages.map((languageCode) => [
            languageCode,
            {
                descriptor: getLocalizedStoreValue(initialPresence.descriptor, languageCode, ''),
                knownFor: getLocalizedStoreValue(initialPresence.knownFor, languageCode, ''),
                specialNote: getLocalizedStoreValue(initialPresence.specialNote, languageCode, ''),
            },
        ]),
    );
}

function buildLocalizedPresence(storeDetails: StoreDataType | null, localizedDrafts: LocalizedPresenceDrafts) {
    return Object.entries(localizedDrafts).reduce((presence, [languageCode, draft]) => ({
        ...presence,
        descriptor: updateLocalizedText(
            presence.descriptor,
            draft.descriptor,
            languageCode,
            'en',
        ),
        knownFor: updateLocalizedText(
            presence.knownFor,
            draft.knownFor,
            languageCode,
            'en',
        ),
        specialNote: updateLocalizedText(
            presence.specialNote,
            draft.specialNote,
            languageCode,
            'en',
        ),
    }), {
        descriptor: storeDetails?.publicPresence?.descriptor,
        knownFor: storeDetails?.publicPresence?.knownFor,
        specialNote: storeDetails?.publicPresence?.specialNote,
    } as any);
}

function buildPublicPresenceDraft(
    storeDetails: StoreDataType | null,
    nextPresence: PresenceFormData,
    localizedDrafts: LocalizedPresenceDrafts,
) {
    const nextLocalizedPresence = buildLocalizedPresence(storeDetails, localizedDrafts);

    return {
        ...(storeDetails?.publicPresence || {}),
        ...nextPresence,
        descriptor: nextLocalizedPresence.descriptor,
        knownFor: nextLocalizedPresence.knownFor,
        specialNote: nextLocalizedPresence.specialNote,
        photos: nextPresence.photos.filter(Boolean),
    };
}

interface SortablePhotoRowProps {
    adjustLabel: string;
    canAdjust: boolean;
    disabled: boolean;
    id: string;
    imageUrl: string;
    index: number;
    isBusy: boolean;
    label: string;
    previewLabel: string;
    removeLabel: string;
    retryLabel?: string;
    uploadFailedLabel?: string;
    onAdjust: () => void;
    onPreview: () => void;
    onRemove: () => void;
    onRetry?: () => void;
}

function SortablePhotoRow({
    adjustLabel,
    canAdjust,
    disabled,
    id,
    imageUrl,
    index,
    isBusy,
    label,
    previewLabel,
    removeLabel,
    retryLabel,
    uploadFailedLabel,
    onAdjust,
    onPreview,
    onRemove,
    onRetry,
}: SortablePhotoRowProps) {
    const { token } = theme.useToken();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ disabled, id });
    const iconButtonStyle: CSSProperties = {
        alignItems: 'center',
        background: token.colorFillQuaternary,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 12,
        color: token.colorTextSecondary,
        cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
        display: 'flex',
        flex: '0 0 44px',
        height: 44,
        justifyContent: 'center',
        opacity: disabled || isBusy ? 0.5 : 1,
        padding: 0,
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                opacity: isDragging ? 0.72 : 1,
                transform: CSS.Transform.toString(transform),
                transition,
            }}
        >
            <Flex
                align="center"
                gap={12}
                style={{
                    background: token.colorBgContainer,
                    border: `1px solid ${isDragging ? token.colorPrimary : token.colorBorderSecondary}`,
                    borderRadius: 16,
                    boxShadow: isDragging ? token.boxShadowSecondary : 'none',
                    minHeight: 104,
                    padding: 12,
                }}
            >
                <button
                    aria-label={`${previewLabel} ${label}`}
                    disabled={disabled || isBusy}
                    onClick={onPreview}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 12,
                        color: 'inherit',
                        cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
                        display: 'block',
                        flex: '0 0 84px',
                        font: 'inherit',
                        height: 84,
                        overflow: 'hidden',
                        padding: 0,
                        position: 'relative',
                    }}
                    type="button"
                >
                    <img
                        alt={label}
                        src={imageUrl}
                        style={{
                            display: 'block',
                            height: '100%',
                            objectFit: 'cover',
                            width: '100%',
                        }}
                    />
                    <div
                        style={{
                            alignItems: 'center',
                            background: token.colorPrimaryBg,
                            border: `1px solid ${token.colorPrimaryBorder}`,
                            borderRadius: 999,
                            color: token.colorPrimaryText,
                            display: 'flex',
                            fontSize: 12,
                            fontWeight: 700,
                            height: 28,
                            justifyContent: 'center',
                            left: 6,
                            position: 'absolute',
                            top: 6,
                            width: 28,
                        }}
                    >
                        {index + 1}
                    </div>
                </button>
                <Flex
                    align="center"
                    gap={8}
                    justify="flex-end"
                    style={{ flex: 1, minWidth: 0 }}
                >
                    {canAdjust ? (
                        <button
                            aria-label={`${adjustLabel} ${label}`}
                            disabled={disabled || isBusy}
                            onClick={onAdjust}
                            style={iconButtonStyle}
                            type="button"
                        >
                            <LuCrop size={20} />
                        </button>
                    ) : null}
                    <button
                        aria-label={`${removeLabel} ${label}`}
                        disabled={disabled || isBusy}
                        onClick={onRemove}
                        style={{
                            ...iconButtonStyle,
                            color: token.colorError,
                        }}
                        type="button"
                    >
                        <LuTrash2 size={20} />
                    </button>
                </Flex>
                <div
                    {...attributes}
                    {...listeners}
                    aria-label="Drag to reorder"
                    role="button"
                    style={{
                        alignItems: 'center',
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 12,
                        color: token.colorTextTertiary,
                        cursor: disabled ? 'not-allowed' : 'grab',
                        display: 'flex',
                        flex: '0 0 42px',
                        height: 64,
                        justifyContent: 'center',
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                    }}
                    tabIndex={0}
                >
                    <LuGripVertical size={22} />
                </div>
            </Flex>
            {uploadFailedLabel && onRetry ? (
                <Flex align="center" justify="space-between" style={{ marginTop: 8 }}>
                    <Text style={{ color: token.colorError, fontSize: 12 }}>{uploadFailedLabel}</Text>
                    <button
                        disabled={disabled || isBusy}
                        onClick={onRetry}
                        style={{
                            background: token.colorErrorBg,
                            border: `1px solid ${token.colorErrorBorder}`,
                            borderRadius: 999,
                            color: token.colorError,
                            cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
                            font: 'inherit',
                            fontSize: 12,
                            fontWeight: 700,
                            minHeight: 44,
                            opacity: disabled || isBusy ? 0.5 : 1,
                            padding: '0 14px',
                        }}
                        type="button"
                    >
                        {retryLabel || 'Retry'}
                    </button>
                </Flex>
            ) : null}
        </div>
    );
}

interface AddPhotoRowProps {
    accept: string;
    description: string;
    disabled: boolean;
    label: string;
    onSelectFile: (file: File) => void;
}

function AddPhotoRow({ accept, description, disabled, label, onSelectFile }: AddPhotoRowProps) {
    const { token } = theme.useToken();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = getFirstImageFile(event.currentTarget.files);
        event.currentTarget.value = '';
        if (!file) return;
        onSelectFile(file);
    };

    return (
        <button
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            style={{
                alignItems: 'center',
                background: token.colorFillQuaternary,
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: 16,
                color: token.colorText,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                font: 'inherit',
                gap: 14,
                minHeight: 92,
                opacity: disabled ? 0.6 : 1,
                padding: 12,
                textAlign: 'left',
                width: '100%',
            }}
            type="button"
        >
            <input
                accept={accept}
                onChange={handleFileChange}
                ref={inputRef}
                style={{ display: 'none' }}
                type="file"
            />
            <div
                style={{
                    alignItems: 'center',
                    background: token.colorBgContainer,
                    borderRadius: 12,
                    color: token.colorTextSecondary,
                    display: 'flex',
                    flex: '0 0 72px',
                    height: 72,
                    justifyContent: 'center',
                }}
            >
                <LuImagePlus size={24} />
            </div>
            <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                <Text strong>{label}</Text>
                <Text type="secondary">{description}</Text>
            </Flex>
            <LuArrowRight color={token.colorTextTertiary} size={20} />
        </button>
    );
}

function MobileOfficialPageScreenContent({
    embedded = false,
    embeddedPhotoDeleteResetToken,
    embeddedProjectsList,
    embeddedSelectedProjectId,
    embeddedStoreDetails,
    onEmbeddedLanguageChange,
    onEmbeddedPhotoDeleteQueueChange,
    onEmbeddedStoreDetailsChange,
    onBack,
}: MobileOfficialPageScreenProps) {
    const t = useTranslations('BusinessSettings');
    const tMobile = useTranslations('MobileSettings');
    const tShare = useTranslations('MobileShare');
    const tDesign = useTranslations('MobileDesignEditor');
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const session = useClientAuthSession();
    const { storeDetails: contextStoreDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const storeDetails = embeddedStoreDetails || contextStoreDetails;
    const mobileProjects = useMobileProjects();
    const projectsList = embedded ? (embeddedProjectsList || []) : mobileProjects.projectsList;
    const selectedProjectId = embedded ? (embeddedSelectedProjectId || null) : mobileProjects.selectedProjectId;
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const [selectedLanguage, setSelectedLanguage] = useState(getStorePreferredLanguage(storeDetails));
    const [isSaving, setIsSaving] = useState(false);
    const [isCoverUploading, setIsCoverUploading] = useState(false);
    const [isCoverGenerating, setIsCoverGenerating] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [coverDraft, setCoverDraft] = useState<ObpMediaDraft | null>(null);
    const [photoDrafts, setPhotoDrafts] = useState<Record<number, ObpMediaDraft>>({});
    const [isCoverAdjustOpen, setIsCoverAdjustOpen] = useState(false);
    const [adjustingPhotoIndex, setAdjustingPhotoIndex] = useState<number | null>(null);
    const [photoDeleteQueue, setPhotoDeleteQueue] = useState<string[]>([]);
    const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const [isPreviewSheetOpen, setIsPreviewSheetOpen] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const coverInputRef = useRef<HTMLInputElement | null>(null);
    const replacePhotoInputRef = useRef<HTMLInputElement | null>(null);
    const lastEmbeddedSyncKeyRef = useRef('');
    const lastEmbeddedPhotoDeleteResetTokenRef = useRef(embeddedPhotoDeleteResetToken);
    const photoDeleteQueueRef = useRef<string[]>([]);
    const persistedPublicPresenceRef = useRef(storeDetails?.publicPresence);
    const componentActiveRef = useRef(true);
    const presenceSaveInFlightRef = useRef(false);
    const officialPageUrl = useMemo(
        () => generateOBPUrl(storeDetails?.subdomain || '', storeDetails?.customDomain),
        [storeDetails?.customDomain, storeDetails?.subdomain]
    );
    const buildMobileOfficialPageLinkLogContext = useCallback((
        flow: string,
        metadata: MobileOwnerLogContext = {},
    ): MobileOwnerLogContext => ({
        surface: 'mobile_official_page',
        flow,
        ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
        ...getBoundedMobileOwnerStringContext('officialPageUrl', officialPageUrl),
        ...getBoundedMobileOwnerStringContext('selectedProjectId', selectedProjectId),
        embedded,
        managedLanguageCount: managedLanguages.length,
        projectCount: projectsList.length,
        selectedLanguagePresent: Boolean(selectedLanguage),
        supportsNativeShare,
        ...metadata,
    }), [
        embedded,
        managedLanguages.length,
        officialPageUrl,
        projectsList.length,
        selectedLanguage,
        selectedProjectId,
        storeDetails?.storeId,
        storeDetails?.tenantId,
        supportsNativeShare,
    ]);

    const [formData, setFormData] = useState(getInitialPresenceForm(storeDetails));
    const [originalFormData, setOriginalFormData] = useState(() => getInitialPresenceForm(storeDetails));
    const [localizedDrafts, setLocalizedDrafts] = useState(() => buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails)));
    const [originalLocalizedDrafts, setOriginalLocalizedDrafts] = useState(() => buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails)));
    const currentLocalizedDraft = localizedDrafts[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' };
    const referenceLanguage = getStorePreferredLanguage(storeDetails);
    const defaultObpAccentColor = '#1677FF';
    const activeAccentColor = formData.accentColor || defaultObpAccentColor;
    const activeAccentColorLabel = formData.accentColor
        ? BRAND_COLOR_PRESETS.find((preset) => preset.color.toUpperCase() === formData.accentColor?.toUpperCase())?.name || formData.accentColor.toUpperCase()
        : defaultObpAccentColor;
    const specialNoteSuggestions = useMemo(() => getMenuSpecialNoteSuggestions(tDesign), [tDesign]);
    const isDirty =
        JSON.stringify(formData) !== JSON.stringify(originalFormData)
        || JSON.stringify(localizedDrafts) !== JSON.stringify(originalLocalizedDrafts)
        || photoDeleteQueue.length > 0;

    const photoList = useMemo(() => formData.photos.filter(Boolean), [formData.photos]);
    const visualProfileCompletion = useMemo(() => buildVisualProfileCompletion({
        businessCategory: storeDetails?.businessCategory,
        businessCover: formData.businessCover,
        businessType: storeDetails?.businessType,
        photos: photoList,
        projects: projectsList,
    }), [formData.businessCover, photoList, projectsList, storeDetails?.businessCategory, storeDetails?.businessType]);
    const sortablePhotoItems = useMemo(() => (
        photoList.map((photo, index) => ({
            id: `photo-${index}`,
            index,
            photo,
        }))
    ), [photoList]);
    const photoSlots = useMemo(() => [...photoList, ''], [photoList]);
    const photoSortSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    );
    const previewStoreDetails = useMemo(() => {
        if (!storeDetails) return null;

        return {
            ...storeDetails,
            publicPresence: buildPublicPresenceDraft(storeDetails, formData, localizedDrafts),
        };
    }, [formData, localizedDrafts, storeDetails]);
    const previewMenuInfo = useMemo<ObpMenuInfo>(() => {
        const empty: ObpMenuInfo = { hasMenu: false, defaultSlug: undefined, projects: [] };
        const entries = (projectsList || []).filter((project: any) => project?.active !== false && project?.deleted !== true);
        const regularProjects = entries.filter((project: any) => project?.isSpecialMenu !== true);
        if (regularProjects.length === 0) return empty;

        const defaultProject = regularProjects.find((project: any) => project?.isDefault === true)
            || regularProjects.find((project: any) => project?.projectId === selectedProjectId)
            || regularProjects[0];
        const activeSpecialProject = entries.find((project: any) => (
            project?.projectId === storeDetails?.activeSpecialMenuId
            && project?.isSpecialMenu === true
            && project?.specialMenuStatus === 'active'
        ));
        const orderedProjects = [
            ...(activeSpecialProject ? [activeSpecialProject] : []),
            defaultProject,
            ...regularProjects.filter((project: any) => project !== defaultProject),
        ];

        return {
            hasMenu: true,
            defaultSlug: defaultProject?.slug || 'menu',
            projects: orderedProjects
                .map((project: any) => ({
                    isDefault: project === defaultProject && project?.isSpecialMenu !== true,
                    isSpecialMenu: project?.isSpecialMenu === true,
                    name: project?.isSpecialMenu ? (project?.specialMenuDisplayName || project?.name) : project?.name,
                    projectId: project?.projectId || 'preview',
                    projectImage: project?.projectImage || null,
                    slug: project?.slug || defaultProject?.slug || 'menu',
                    specialMenuBaseProjectId: project?.specialMenuBaseProjectId,
                    specialMenuDisplayName: project?.specialMenuDisplayName,
                }))
                .filter((project) => project.slug && project.name),
        };
    }, [projectsList, selectedProjectId, storeDetails?.activeSpecialMenuId]);
    const officialPageInfoContent = useMemo(() => (
        <Flex gap={8} style={{ maxWidth: 280 }} vertical>
            <Flex gap={2} vertical>
                <Text strong>{t('officialPage')}</Text>
                <Text type="secondary">{t('officialPageSubtitle')}</Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>What you manage here</Text>
                <Text type="secondary">
                    Short descriptor, known for, customer action links, accent color, ratings, and page photos.
                </Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>Language rule</Text>
                <Text type="secondary">
                    Short descriptor, known for, and the special note can be edited per language. Links, toggles, ratings, and photos stay shared across languages.
                </Text>
            </Flex>
        </Flex>
    ), [t]);

    const queuePhotoDelete = useCallback((photoUrl?: string) => {
        if (!photoUrl || photoUrl.startsWith('data:')) return;
        setPhotoDeleteQueue((previous) => {
            const nextQueue = previous.includes(photoUrl) ? previous : [...previous, photoUrl];
            photoDeleteQueueRef.current = nextQueue;
            return nextQueue;
        });
    }, []);

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    useEffect(() => {
        photoDeleteQueueRef.current = photoDeleteQueue;
    }, [photoDeleteQueue]);

    useEffect(() => () => {
        if (
            embedded
            || presenceSaveInFlightRef.current
            || photoDeleteQueueRef.current.length === 0
        ) return;
        void deleteOBPPhotos(
            photoDeleteQueueRef.current,
            collectObpMediaReferences(persistedPublicPresenceRef.current),
        );
    }, [embedded]);

    const updatePresence = useCallback(async (nextPresence: typeof formData) => {
        if (
            !storeDetails?.storeId
            || !storeDetails?.tenantId
            || presenceSaveInFlightRef.current
        ) return;
        const expectedStoreId = storeDetails.storeId;
        const expectedTenantId = storeDetails.tenantId;
        const publicPresenceDraft = buildPublicPresenceDraft(storeDetails, nextPresence, localizedDrafts);
        const normalizedLinks = normalizeOwnerPublicPresenceLinks(publicPresenceDraft);
        if (normalizedLinks.invalidKeys.length > 0) {
            Toast.show({ content: 'Enter valid HTTPS public-page links before saving.', duration: 1800 });
            return;
        }
        presenceSaveInFlightRef.current = true;
        setIsSaving(true);
        const nextPublicPresence = normalizedLinks.presence;
        const previousBusinessCopyMeta = storeDetails.businessCopyMeta;
        const previousPublicPresence = storeDetails.publicPresence;
        const submittedLocalizedDrafts = localizedDrafts;
        const submittedPhotoDeleteQueue = [...photoDeleteQueue];
        const payload = {
            businessCopyMeta: buildBusinessCopyManualOverrideMeta({
                existingMeta: storeDetails?.businessCopyMeta,
                fieldKeys: ['descriptor', 'knownFor', 'specialNote'],
            }),
            storeId: expectedStoreId,
            publicPresence: nextPublicPresence,
        };

        setStoreDetails((previous: any) => (
            previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId
                ? {
                    ...previous,
                    businessCopyMeta: payload.businessCopyMeta,
                    publicPresence: payload.publicPresence,
                }
                : previous
        ));

        try {
            const writeResult = await updateStore({
                ...getStoreDeepDifference(payload, storeDetails),
                storeId: expectedStoreId,
            });
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_official_page_store_update_rejected',
            );
            const failedPhotoDeletes = await deleteOBPPhotos(
                submittedPhotoDeleteQueue,
                collectObpMediaReferences(nextPublicPresence),
            );
            persistedPublicPresenceRef.current = nextPublicPresence;
            if (!componentActiveRef.current) return;
            photoDeleteQueueRef.current = failedPhotoDeletes;
            setPhotoDeleteQueue(failedPhotoDeletes);
            setOriginalFormData(nextPresence);
            setOriginalLocalizedDrafts(submittedLocalizedDrafts);
            Toast.show({ content: tMobile('saved'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_official_page_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                localizedLanguageCount: Object.keys(localizedDrafts).length,
                photoCount: nextPublicPresence.photos.length,
                photoDeleteCount: photoDeleteQueue.length,
                hasBusinessCover: Boolean(nextPublicPresence.businessCover),
                hasSpecialNote: Boolean(nextPublicPresence.specialNote),
            });
            setStoreDetails((previous: any) => (
                previous?.storeId === expectedStoreId
                && previous?.tenantId === expectedTenantId
                && previous?.businessCopyMeta === payload.businessCopyMeta
                && previous?.publicPresence === payload.publicPresence
                    ? {
                        ...previous,
                        businessCopyMeta: previousBusinessCopyMeta,
                        publicPresence: previousPublicPresence,
                    }
                    : previous
            ));
            if (!componentActiveRef.current) {
                await deleteOBPPhotos(
                    submittedPhotoDeleteQueue,
                    collectObpMediaReferences(previousPublicPresence),
                );
            }
            if (componentActiveRef.current) {
                Toast.show({ content: tMobile('failedToSave'), duration: 1500 });
            }
        } finally {
            presenceSaveInFlightRef.current = false;
            if (componentActiveRef.current) setIsSaving(false);
        }
    }, [localizedDrafts, photoDeleteQueue, setStoreDetails, storeDetails, tMobile]);

    const handleSave = useCallback(() => {
        void updatePresence(formData);
    }, [formData, updatePresence]);

    const savePreparedCover = async (
        prepared: PreparedMediaImage,
        fallbackDraft?: {
            fileName?: string;
            sourceDataUrl?: string;
        },
        successMessage = t('businessCoverUploaded'),
    ) => {
        if (!componentActiveRef.current) return false;
        if (!session?.tId || !session?.sId) {
            Toast.show({ content: t('sessionUnavailable'), duration: 1500 });
            return false;
        }

        setCoverDraft({
            crop: prepared.crop,
            fileName: prepared.sourceName || fallbackDraft?.fileName,
            prepared,
            previewDataUrl: prepared.dataUrl,
            sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
            uploadFailed: false,
        });
        setIsCoverUploading(true);
        try {
            const url = await uploadOBPCover(prepared.blob, { tId: session.tId, sId: session.sId }, prepared);
            if (!componentActiveRef.current) {
                await deleteOBPPhotos([url]);
                return false;
            }
            queuePhotoDelete(url);
            if (formData.businessCover && formData.businessCover !== url) {
                queuePhotoDelete(formData.businessCover);
            }
            setCoverDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || fallbackDraft?.fileName,
                prepared,
                previewDataUrl: prepared.dataUrl,
                sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                uploadFailed: false,
            });
            setFormData((previous) => ({ ...previous, businessCover: url }));
            Toast.show({ content: successMessage, icon: 'success', duration: 1200 });
        } catch (error) {
            logMobileOwnerFailure('mobile_official_page_cover_upload_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('fileName', prepared.sourceName || fallbackDraft?.fileName),
                hasExistingCover: Boolean(formData.businessCover),
                hasSourceDataUrl: Boolean(prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl),
            });
            if (componentActiveRef.current) {
                setCoverDraft((previous) => previous ? {
                    ...previous,
                    prepared,
                    previewDataUrl: prepared.dataUrl,
                    uploadFailed: true,
                } : previous);
                Toast.show({ content: t('businessCoverUploadFailed'), duration: 1500 });
            }
        } finally {
            if (componentActiveRef.current) setIsCoverUploading(false);
        }

        return false;
    };

    const handleCoverUpload = async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'businessCover');
            await savePreparedCover(prepared, {
                fileName: file.name,
                sourceDataUrl: prepared.sourceDataUrl,
            });
        } catch (error) {
            logMobileOwnerFailure('mobile_official_page_cover_prepare_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('fileName', file.name),
            });
            if (componentActiveRef.current) {
                Toast.show({ content: t('businessCoverUploadFailed'), duration: 1500 });
            }
        }

        return false;
    };

    const handleGenerateBusinessCover = async () => {
        if (!storeDetails) return;

        setIsCoverGenerating(true);
        try {
            const candidate = await generateBusinessCoverCandidate({
                businessCategory: storeDetails?.businessCategory,
                businessType: storeDetails?.businessType,
                projects: projectsList as any,
                store: storeDetails as any,
                storeName: getBrandName(storeDetails as any, 'business'),
            });

            if (!candidate?.dataUrl) {
                if (componentActiveRef.current) {
                    Toast.show({ content: t('businessCoverGenerateFailed'), duration: 1800 });
                }
                return;
            }

            const prepared = await prepareMediaImage(candidate.dataUrl, 'businessCover', {
                fileName: candidate.name,
            });
            await savePreparedCover(prepared, {
                fileName: candidate.name,
                sourceDataUrl: prepared.sourceDataUrl,
            }, t('businessCoverGenerated'));
        } catch (error) {
            logMobileOwnerFailure('mobile_official_page_cover_generate_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                projectCount: Array.isArray(projectsList) ? projectsList.length : 0,
                hasBusinessCategory: Boolean(storeDetails?.businessCategory),
                hasBusinessType: Boolean(storeDetails?.businessType),
            });
            if (componentActiveRef.current) {
                Toast.show({ content: t('businessCoverGenerateFailed'), duration: 1800 });
            }
        } finally {
            if (componentActiveRef.current) setIsCoverGenerating(false);
        }
    };

    const handleCoverRemove = () => {
        queuePhotoDelete(formData.businessCover);
        setCoverDraft(null);
        setFormData((previous) => ({ ...previous, businessCover: '' }));
    };

    const handleCoverCardRemove = () => {
        if (coverDraft?.uploadFailed) {
            setCoverDraft(null);
            return;
        }
        handleCoverRemove();
    };

    const handleRetryCoverUpload = () => {
        if (!coverDraft?.prepared) return;
        void savePreparedCover(coverDraft.prepared, coverDraft);
    };

    const savePreparedPhoto = async (
        prepared: PreparedMediaImage,
        index: number,
        fallbackDraft?: {
            fileName?: string;
            sourceDataUrl?: string;
        },
    ) => {
        if (!componentActiveRef.current) return false;
        if (!session?.tId || !session?.sId) {
            Toast.show({ content: t('sessionUnavailable'), duration: 1500 });
            return false;
        }

        setPhotoDrafts((previous) => ({
            ...previous,
            [index]: {
                crop: prepared.crop,
                fileName: prepared.sourceName || fallbackDraft?.fileName,
                prepared,
                previewDataUrl: prepared.dataUrl,
                sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                uploadFailed: false,
            },
        }));
        setUploadingIndex(index);
        try {
            const url = await uploadOBPPhoto(prepared.blob, { tId: session.tId, sId: session.sId }, index, prepared);
            if (!componentActiveRef.current) {
                await deleteOBPPhotos([url]);
                return false;
            }
            queuePhotoDelete(url);
            const nextPhotos = [...formData.photos];
            if (nextPhotos[index] && nextPhotos[index] !== url) {
                queuePhotoDelete(nextPhotos[index]);
            }
            nextPhotos[index] = url;
            setPhotoDrafts((previous) => ({
                ...previous,
                [index]: {
                    crop: prepared.crop,
                    fileName: prepared.sourceName || fallbackDraft?.fileName,
                    prepared,
                    previewDataUrl: prepared.dataUrl,
                    sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                    uploadFailed: false,
                },
            }));
            setFormData((previous) => ({ ...previous, photos: nextPhotos.filter(Boolean) }));
        } catch (error) {
            logMobileOwnerFailure('mobile_official_page_photo_upload_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('fileName', prepared.sourceName || fallbackDraft?.fileName),
                photoIndex: index,
                existingPhotoCount: formData.photos.filter(Boolean).length,
                hasSourceDataUrl: Boolean(prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl),
            });
            if (componentActiveRef.current) {
                setPhotoDrafts((previous) => ({
                    ...previous,
                    [index]: {
                        ...previous[index],
                        prepared,
                        previewDataUrl: prepared.dataUrl,
                        uploadFailed: true,
                    },
                }));
                Toast.show({ content: t('photoUploadFailed'), duration: 1500 });
            }
        } finally {
            if (componentActiveRef.current) setUploadingIndex(null);
        }

        return false;
    };

    const handlePhotoUpload = async (file: File, index: number) => {
        try {
            const prepared = await prepareMediaImage(file, 'galleryImage');
            await savePreparedPhoto(prepared, index, {
                fileName: file.name,
                sourceDataUrl: prepared.sourceDataUrl,
            });
        } catch (error) {
            logMobileOwnerFailure('mobile_official_page_photo_prepare_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('fileName', file.name),
                photoIndex: index,
            });
            if (componentActiveRef.current) {
                Toast.show({ content: t('photoUploadFailed'), duration: 1500 });
            }
        }

        return false;
    };

    const handlePhotoRemove = (index: number) => {
        const nextPhotos = [...formData.photos];
        queuePhotoDelete(nextPhotos[index]);
        nextPhotos[index] = '';
        setPhotoDrafts((previous) => {
            const next = { ...previous };
            delete next[index];
            return next;
        });
        setFormData((previous) => ({ ...previous, photos: nextPhotos.filter(Boolean) }));
    };

    const handlePhotoCardRemove = (index: number) => {
        if (photoDrafts[index]?.uploadFailed) {
            setPhotoDrafts((previous) => {
                const next = { ...previous };
                delete next[index];
                return next;
            });
            return;
        }
        handlePhotoRemove(index);
    };

    const handleRetryPhotoUpload = (index: number) => {
        const draft = photoDrafts[index];
        if (!draft?.prepared) return;
        void savePreparedPhoto(draft.prepared, index, draft);
    };

    const handlePhotoReorder = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= photoList.length || toIndex >= photoList.length) {
            return;
        }

        const nextPhotos = arrayMove(photoList, fromIndex, toIndex);
        setPhotoDrafts((previous) => {
            const draftOrder = photoList.map((_, index) => previous[index]);
            const nextDraftOrder = arrayMove(draftOrder, fromIndex, toIndex);
            const next: typeof previous = {};
            nextDraftOrder.forEach((draft, index) => {
                if (draft) next[index] = draft;
            });
            return next;
        });
        setFormData((previous) => ({ ...previous, photos: nextPhotos }));
    };

    const handlePhotoDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const fromIndex = sortablePhotoItems.findIndex((item) => item.id === String(active.id));
        const toIndex = sortablePhotoItems.findIndex((item) => item.id === String(over.id));
        handlePhotoReorder(fromIndex, toIndex);
    };

    const activePhoto = activePhotoIndex != null
        ? photoDrafts[activePhotoIndex]?.previewDataUrl || photoSlots[activePhotoIndex]
        : '';
    const coverPreviewUrl = coverDraft?.previewDataUrl || formData.businessCover;
    const canAdjustActivePhoto = activePhotoIndex != null && Boolean(photoDrafts[activePhotoIndex]?.sourceDataUrl);
    const handleReset = useCallback(() => {
        const queuedPhotoDeletes = [...photoDeleteQueueRef.current];
        photoDeleteQueueRef.current = [];
        setFormData(originalFormData);
        setLocalizedDrafts(originalLocalizedDrafts);
        setCoverDraft(null);
        setPhotoDrafts({});
        setPhotoDeleteQueue([]);
        if (!embedded && queuedPhotoDeletes.length > 0) {
            void deleteOBPPhotos(
                queuedPhotoDeletes,
                collectObpMediaReferences(storeDetails?.publicPresence),
            ).then((failedPhotoDeletes) => {
                if (failedPhotoDeletes.length === 0) return;
                setPhotoDeleteQueue((previous) => {
                    const nextQueue = Array.from(new Set([...previous, ...failedPhotoDeletes]));
                    photoDeleteQueueRef.current = nextQueue;
                    return nextQueue;
                });
            });
        }
        setIsCoverAdjustOpen(false);
        setAdjustingPhotoIndex(null);
        setActivePhotoIndex(null);
    }, [embedded, originalFormData, originalLocalizedDrafts, storeDetails?.publicPresence]);

    const withSource = useCallback((url: string, src: 'copy' | 'direct' | 'qr' | 'share') => (
        withAnalyticsSource(
            url,
            src === 'copy' ? 'copy_link' : src === 'share' ? 'native_share' : src,
        )
    ), []);

    const handleCopyLink = useCallback(async (value: string, label: string) => {
        try {
            await copyMobileOfficialPageLink(value);
            Toast.show({ content: tShare('copiedLabel', { label }), duration: 1200 });
        } catch (error) {
            logMobileOwnerFailure('mobile_official_page_link_copy_failed', error, buildMobileOfficialPageLinkLogContext('copy_link', {
                ...getBoundedMobileOwnerStringContext('copyLabel', label),
                ...getBoundedMobileOwnerStringContext('copyValue', value),
                hasClipboardWrite: hasMobileOfficialPageClipboardWrite(),
                hasCopyFallback: hasMobileOfficialPageCopyFallback(),
            }));
            Toast.show({ content: tShare('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    }, [buildMobileOfficialPageLinkLogContext, tShare]);

    const handleNativeShare = useCallback(async ({ label, text, url }: { label: string; text?: string; url: string }) => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({ text, title: label, url });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            logMobileOwnerFailure('mobile_official_page_native_share_failed', error, buildMobileOfficialPageLinkLogContext('native_share', {
                ...getBoundedMobileOwnerStringContext('shareLabel', label),
                ...getBoundedMobileOwnerStringContext('shareText', text),
                ...getBoundedMobileOwnerStringContext('shareUrl', url),
            }));
            Toast.show({ content: tShare('couldNotCopy'), duration: 1500 });
        }
    }, [buildMobileOfficialPageLinkLogContext, tShare]);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    useEffect(() => {
        if (!embedded || !selectedLanguage) return;
        onEmbeddedLanguageChange?.(selectedLanguage);
    }, [embedded, onEmbeddedLanguageChange, selectedLanguage]);

    useEffect(() => {
        if (!embedded || !onEmbeddedPhotoDeleteQueueChange) return;
        onEmbeddedPhotoDeleteQueueChange(photoDeleteQueue);
    }, [embedded, onEmbeddedPhotoDeleteQueueChange, photoDeleteQueue]);

    useEffect(() => {
        if (!embedded || embeddedPhotoDeleteResetToken === undefined) return;
        if (lastEmbeddedPhotoDeleteResetTokenRef.current === embeddedPhotoDeleteResetToken) return;
        lastEmbeddedPhotoDeleteResetTokenRef.current = embeddedPhotoDeleteResetToken;
        setPhotoDeleteQueue([]);
    }, [embedded, embeddedPhotoDeleteResetToken]);

    const storeHydrationKey = embedded ? storeDetails?.storeId : storeDetails;

    useEffect(() => {
        if (!storeDetails || (!embedded && isSaving)) return;
        if (!embedded) persistedPublicPresenceRef.current = storeDetails.publicPresence;
        const nextFormData = getInitialPresenceForm(storeDetails);
        const nextLocalizedDrafts = buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails));
        if (embedded) {
            lastEmbeddedSyncKeyRef.current = JSON.stringify({
                localizedDrafts: nextLocalizedDrafts,
                publicPresence: buildPublicPresenceDraft(storeDetails, nextFormData, nextLocalizedDrafts),
            });
        }
        setSelectedLanguage(getStorePreferredLanguage(storeDetails));
        setFormData(nextFormData);
        setOriginalFormData(nextFormData);
        setLocalizedDrafts(nextLocalizedDrafts);
        setOriginalLocalizedDrafts(nextLocalizedDrafts);
        setPhotoDeleteQueue([]);
    }, [embedded, storeHydrationKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!embedded || !storeDetails || !onEmbeddedStoreDetailsChange) return;
        const nextPublicPresence = buildPublicPresenceDraft(storeDetails, formData, localizedDrafts);
        const nextKey = JSON.stringify({
            localizedDrafts,
            publicPresence: nextPublicPresence,
        });
        if (nextKey === lastEmbeddedSyncKeyRef.current) return;
        lastEmbeddedSyncKeyRef.current = nextKey;
        onEmbeddedStoreDetailsChange({
            ...storeDetails,
            publicPresence: nextPublicPresence,
        });
    }, [embedded, formData, localizedDrafts, onEmbeddedStoreDetailsChange, storeDetails]);

    if (!FEATURE_FLAGS.ENABLE_OBP) {
        return null;
    }

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    const renderQuickActionSettingIcon = (emoji: string, icon: ReactNode) => (
        formData.iconVariant === 'emoji'
            ? <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, textAlign: 'center', width: 16 }}>{emoji}</span>
            : icon
    );

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            {!embedded ? (
                <MobileSettingsScreenHeader
                    description={t('officialPageSubtitle')}
                    infoContent={officialPageInfoContent}
                    onBack={onBack}
                    title={t('officialPage')}
                />
            ) : null}
            <Flex gap={12} style={{ padding: embedded ? '0 0 24px' : 16 }} vertical>
                <MobileLocalizedLanguageSelector
                    helperText="Choose which public-content language you want to edit. Links, toggles, ratings, and photos stay shared for all languages."
                    languages={managedLanguages}
                    onChange={setSelectedLanguage}
                    selectedLanguage={selectedLanguage}
                    title="Official page content language"
                />

                {!embedded && officialPageUrl ? (
                    <MobileLinkCard
                        compact={isCompactHandheld}
                        description={tShare('obpShareHint')}
                        icon={<LuExternalLink color={token.colorText} size={18} />}
                        isPrimary
                        label={tShare('officialBusinessLink')}
                        onCopy={() => void handleCopyLink(withSource(officialPageUrl, 'copy'), tShare('officialBusinessLink'))}
                        onOpen={() => openMobilePublicLink(withSource(officialPageUrl, 'direct'), {
                            flow: 'official_page_link_open',
                            metadata: buildMobileOfficialPageLinkLogContext('open_official_page_link'),
                            source: 'mobile_official_page',
                        })}
                        onShare={supportsNativeShare ? () => void handleNativeShare({
                            label: tShare('officialBusinessLink'),
                            text: tShare('obpShareHint'),
                            url: withSource(officialPageUrl, 'share'),
                        }) : undefined}
                        onShowQr={() => setIsQrSheetOpen(true)}
                        value={officialPageUrl}
                    />
                ) : null}

                {FEATURE_FLAGS.ENABLE_VISUAL_PROFILE_COMPLETION ? (
                    <Card
                        style={{
                            backgroundColor: token.colorFillQuaternary,
                            borderColor: visualProfileCompletion.status === 'complete'
                                ? token.colorSuccessBorder
                                : token.colorWarningBorder,
                        }}
                    >
                        <Flex gap={12} vertical>
                            <Flex align="flex-start" gap={10} justify="space-between">
                                <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                    <Text strong>Visual profile</Text>
                                    <Text>{visualProfileCompletion.headline}</Text>
                                    <Text type="secondary">{visualProfileCompletion.helperText}</Text>
                                </Flex>
                                <Tag color={visualProfileCompletion.status === 'complete' ? 'success' : 'warning'}>
                                    {visualProfileCompletion.statusLabel}
                                </Tag>
                            </Flex>
                            <Flex gap={10} vertical>
                                {visualProfileCompletion.tasks.map((task) => {
                                    const isComplete = task.status === 'complete';
                                    return (
                                        <Flex align="flex-start" gap={8} key={task.id}>
                                            {isComplete ? (
                                                <LuCheckCircle color={token.colorSuccess} size={18} style={{ flex: '0 0 auto', marginTop: 2 }} />
                                            ) : (
                                                <LuAlertCircle color={token.colorWarning} size={18} style={{ flex: '0 0 auto', marginTop: 2 }} />
                                            )}
                                            <Flex gap={1} style={{ minWidth: 0 }} vertical>
                                                <Text>{task.label}</Text>
                                                <Text type="secondary">{task.detail}</Text>
                                            </Flex>
                                        </Flex>
                                    );
                                })}
                            </Flex>
                        </Flex>
                    </Card>
                ) : null}

                <Card>
                    <Flex gap={12} vertical>
                        <Flex gap={4} vertical>
                            <Text strong>{t('businessCover')}</Text>
                            <Text type="secondary">{t('businessCoverHelp')}</Text>
                        </Flex>
                        <input
                            accept={getMediaProfileAcceptAttribute('businessCover')}
                            hidden
                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                const file = getFirstImageFile(event.target.files);
                                event.target.value = '';
                                if (file) void handleCoverUpload(file);
                            }}
                            ref={coverInputRef}
                            type="file"
                        />
                        <Flex
                            align="center"
                            gap={10}
                            style={{
                                backgroundColor: token.colorFillAlter,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 12,
                                padding: 12,
                            }}
                        >
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    backgroundColor: token.colorBgContainer,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: coverPreviewUrl ? 12 : 999,
                                    color: formData.businessCover ? token.colorSuccess : token.colorTextTertiary,
                                    flex: '0 0 auto',
                                    height: coverPreviewUrl ? 58 : 38,
                                    overflow: 'hidden',
                                    width: coverPreviewUrl ? 78 : 38,
                                }}
                            >
                                {coverPreviewUrl ? (
                                    <img
                                        alt={t('businessCover')}
                                        src={coverPreviewUrl}
                                        style={{
                                            display: 'block',
                                            height: '100%',
                                            objectFit: 'cover',
                                            width: '100%',
                                        }}
                                    />
                                ) : (
                                    <LuImagePlus size={18} />
                                )}
                            </Flex>
                            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                <Text strong>{formData.businessCover ? t('businessCoverUploaded') : t('businessCoverPlaceholder')}</Text>
                                <Text type="secondary">
                                    {coverDraft?.uploadFailed ? t('businessCoverUploadFailed') : t('businessCoverPlaceholder')}
                                </Text>
                            </Flex>
                        </Flex>
                        {coverDraft?.uploadFailed && coverDraft.prepared ? (
                            <Flex align="center" justify="space-between">
                                <Text style={{ color: token.colorError, fontSize: 12 }}>{t('businessCoverUploadFailed')}</Text>
                                <Button
                                    disabled={isCoverUploading}
                                    loading={isCoverUploading}
                                    onClick={handleRetryCoverUpload}
                                    size="small"
                                >
                                    Retry
                                </Button>
                            </Flex>
                        ) : null}
                        <Flex gap={8} wrap="wrap">
                            <Button
                                disabled={isCoverUploading || isCoverGenerating}
                                fill="outline"
                                loading={isCoverUploading}
                                onClick={() => coverInputRef.current?.click()}
                                size="middle"
                                style={{ flex: '1 1 130px' }}
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuImagePlus size={16} />
                                    <Text>{formData.businessCover ? 'Replace' : 'Upload'}</Text>
                                </Flex>
                            </Button>
                            {FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? (
                                <Button
                                    disabled={isCoverUploading}
                                    fill="outline"
                                    loading={isCoverGenerating}
                                    onClick={() => { void handleGenerateBusinessCover(); }}
                                    size="middle"
                                    style={{ flex: '1 1 130px' }}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuSparkles size={16} />
                                        <Text>{formData.businessCover ? t('regenerateBusinessCover') : t('generateBusinessCover')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                            {coverDraft?.sourceDataUrl ? (
                                <Button
                                    disabled={isCoverUploading || isCoverGenerating}
                                    fill="outline"
                                    onClick={() => setIsCoverAdjustOpen(true)}
                                    size="middle"
                                    style={{ flex: '1 1 130px' }}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuCrop size={16} />
                                        <Text>Adjust</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                            {formData.businessCover || coverDraft?.previewDataUrl ? (
                                <Button
                                    color="danger"
                                    disabled={isCoverUploading || isCoverGenerating}
                                    fill="outline"
                                    onClick={handleCoverCardRemove}
                                    size="middle"
                                    style={{ flex: '1 1 130px' }}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuTrash2 size={16} />
                                        <Text>Remove</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('shortDescriptor')}</Text>
                        <Input
                            maxLength={40}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
                                    descriptor: value,
                                },
                            }))}
                            placeholder={t('shortDescriptorPlaceholder')}
                            value={currentLocalizedDraft.descriptor}
                        />
                        <Text type="secondary">{t('shortDescriptorHelp')}</Text>
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
                                        descriptor: previous[referenceLanguage]?.descriptor || '',
                                    },
                                }))}
                                referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                referenceValue={localizedDrafts[referenceLanguage]?.descriptor || ''}
                            />
                        ) : null}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('knownFor')}</Text>
                        <Input
                            maxLength={40}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
                                    knownFor: value,
                                },
                            }))}
                            placeholder={t('knownForPlaceholder')}
                            value={currentLocalizedDraft.knownFor}
                        />
                        <Text type="secondary">{t('knownForHelp')}</Text>
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
                                        knownFor: previous[referenceLanguage]?.knownFor || '',
                                    },
                                }))}
                                referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                referenceValue={localizedDrafts[referenceLanguage]?.knownFor || ''}
                            />
                        ) : null}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('whatsappNumber')}</Text>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, whatsappNumber: value }))} placeholder="+91 98765 43210" value={formData.whatsappNumber} />
                        <Text type="secondary">{t('whatsappNumberHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleMapsLink')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleMapsUrl: value }))}
                            placeholder="https://maps.google.com/..."
                            value={formData.googleMapsUrl}
                        />
                        <Text type="secondary">{t('googleMapsLinkHelp')}</Text>
                    </Flex>
                </Card>

                <button
                    aria-expanded={isColorPickerOpen}
                    aria-haspopup="dialog"
                    aria-label={t('accentColor')}
                    onClick={() => setIsColorPickerOpen(true)}
                    style={{ background: 'none', border: 0, color: 'inherit', minHeight: 44, padding: 0, textAlign: 'inherit', width: '100%' }}
                    type="button"
                >
                    <Card>
                        <Flex align="center" justify="space-between" gap={12}>
                            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                <Text strong>{t('accentColor')}</Text>
                                <Text type="secondary">{t('accentColorHelp')}</Text>
                            </Flex>
                            <Flex align="center" gap={10} style={{ flex: '0 0 auto' }}>
                                <span
                                    aria-hidden
                                    style={{
                                        backgroundColor: activeAccentColor,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 999,
                                        display: 'inline-block',
                                        height: 32,
                                        width: 32,
                                    }}
                                />
                                <Text strong>{activeAccentColorLabel}</Text>
                                <LuPalette color={token.colorTextTertiary} size={18} />
                            </Flex>
                        </Flex>
                    </Card>
                </button>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('establishedYear')}</Text>
                        <InputNumber
                            max={new Date().getFullYear()}
                            min={1900}
                            onChange={(value) => setFormData((previous) => ({ ...previous, establishedYear: typeof value === 'number' ? value : undefined }))}
                            placeholder="2015"
                            style={{ width: '100%' }}
                            value={formData.establishedYear}
                        />
                        <Text type="secondary">{t('establishedYearHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('reservationUrl')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, reservationUrl: value }))}
                            placeholder="https://..."
                            value={formData.reservationUrl}
                        />
                        <Text type="secondary">{t('reservationUrlHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('orderUrl')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, orderUrl: value }))}
                            placeholder="https://..."
                            value={formData.orderUrl}
                        />
                        <Text type="secondary">{t('orderUrlHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleReviewUrl')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleReviewUrl: value }))}
                            placeholder={t('googleReviewUrlPlaceholder')}
                            value={formData.googleReviewUrl}
                        />
                        <Text type="secondary">{t('googleReviewUrlDesc')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleRating')}</Text>
                        <InputNumber
                            max={5}
                            min={1}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleRating: typeof value === 'number' ? value : undefined }))}
                            placeholder="4.5"
                            precision={1}
                            step={0.1}
                            style={{ width: '100%' }}
                            value={formData.googleRating}
                        />
                        <Text type="secondary">{t('googleRatingHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleReviewCount')}</Text>
                        <InputNumber
                            min={0}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleReviewCount: typeof value === 'number' ? value : undefined }))}
                            placeholder="320"
                            style={{ width: '100%' }}
                            value={formData.googleReviewCount}
                        />
                        <Text type="secondary">{t('googleReviewCountHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('businessPhotos')}</Text>
                        <Text type="secondary">{t('businessPhotosHelp')}</Text>
                        <Flex gap={10} vertical>
                            {sortablePhotoItems.length > 0 ? (
                                <DndContext
                                    collisionDetection={closestCenter}
                                    onDragEnd={handlePhotoDragEnd}
                                    sensors={photoSortSensors}
                                >
                                    <SortableContext
                                        items={sortablePhotoItems.map((item) => item.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <Flex gap={10} vertical>
                                            {sortablePhotoItems.map((item) => {
                                                const label = t('photoLabel', { index: item.index + 1 });
                                                const draft = photoDrafts[item.index];
                                                return (
                                                    <SortablePhotoRow
                                                        adjustLabel="Adjust"
                                                        canAdjust={Boolean(draft?.sourceDataUrl)}
                                                        disabled={uploadingIndex != null}
                                                        id={item.id}
                                                        imageUrl={draft?.previewDataUrl || item.photo}
                                                        index={item.index}
                                                        isBusy={uploadingIndex === item.index}
                                                        key={item.id}
                                                        label={label}
                                                        onAdjust={() => setAdjustingPhotoIndex(item.index)}
                                                        onPreview={() => setActivePhotoIndex(item.index)}
                                                        onRemove={() => handlePhotoCardRemove(item.index)}
                                                        onRetry={draft?.uploadFailed && draft.prepared ? () => handleRetryPhotoUpload(item.index) : undefined}
                                                        previewLabel={tDesign('preview')}
                                                        removeLabel={tDesign('remove')}
                                                        retryLabel="Retry"
                                                        uploadFailedLabel={draft?.uploadFailed ? t('photoUploadFailed') : undefined}
                                                    />
                                                );
                                            })}
                                        </Flex>
                                    </SortableContext>
                                </DndContext>
                            ) : null}
                            {photoDrafts[photoList.length]?.previewDataUrl ? (
                                <Flex gap={8} vertical>
                                    <MediaImageCard
                                        accept={getMediaProfileAcceptAttribute('galleryImage')}
                                        alt={t('photoLabel', { index: photoList.length + 1 })}
                                        aspectRatio="4 / 3"
                                        canAdjust={Boolean(photoDrafts[photoList.length]?.sourceDataUrl)}
                                        imageType="galleryImage"
                                        imageUrl={photoDrafts[photoList.length]?.previewDataUrl}
                                        isBusy={uploadingIndex === photoList.length}
                                        onAdjust={() => setAdjustingPhotoIndex(photoList.length)}
                                        onRemove={() => handlePhotoCardRemove(photoList.length)}
                                        onSelectFile={(file) => { void handlePhotoUpload(file, photoList.length); }}
                                        placeholderTitle={t('photoLabel', { index: photoList.length + 1 })}
                                        showDropHint={false}
                                    />
                                    {photoDrafts[photoList.length]?.uploadFailed && photoDrafts[photoList.length]?.prepared ? (
                                        <Flex align="center" justify="space-between">
                                            <Text style={{ color: token.colorError, fontSize: 12 }}>{t('photoUploadFailed')}</Text>
                                            <Button
                                                disabled={uploadingIndex != null}
                                                loading={uploadingIndex === photoList.length}
                                                onClick={() => handleRetryPhotoUpload(photoList.length)}
                                                size="small"
                                            >
                                                Retry
                                            </Button>
                                        </Flex>
                                    ) : null}
                                </Flex>
                            ) : (
                                <AddPhotoRow
                                    accept={getMediaProfileAcceptAttribute('galleryImage')}
                                    description="Tap to add your next business photo"
                                    disabled={uploadingIndex != null}
                                    label={t('photoLabel', { index: photoList.length + 1 })}
                                    onSelectFile={(file) => { void handlePhotoUpload(file, photoList.length); }}
                                />
                            )}
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Text strong>{t('obpIconVariant')}</Text>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuSmile size={16} />
                                <Text>{t('obpUseEmojiIcons')}</Text>
                            </Flex>
                            <Switch
                                aria-label={t('obpUseEmojiIcons')}
                                checked={formData.iconVariant === 'emoji'}
                                onChange={(value) => setFormData((previous) => ({ ...previous, iconVariant: value ? 'emoji' : 'icons' }))}
                            />
                        </Flex>
                        <Text type="secondary">{t('obpIconVariantHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Text strong>{t('quickActionButtons')}</Text>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('☎️', <LuPhone size={16} />)}
                                <Text>{t('showCallButton')}</Text>
                            </Flex>
                            <Switch aria-label={t('showCallButton')} checked={formData.showCall} onChange={(value) => setFormData((previous) => ({ ...previous, showCall: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('🟢', <LuMessageSquare size={16} />)}
                                <Text>{t('showWhatsAppButton')}</Text>
                            </Flex>
                            <Switch aria-label={t('showWhatsAppButton')} checked={formData.showWhatsApp} onChange={(value) => setFormData((previous) => ({ ...previous, showWhatsApp: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('📍', <LuMapPin size={16} />)}
                                <Text>{t('showDirectionsButton')}</Text>
                            </Flex>
                            <Switch aria-label={t('showDirectionsButton')} checked={formData.showDirections} onChange={(value) => setFormData((previous) => ({ ...previous, showDirections: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('📅', <LuCalendar size={16} />)}
                                <Text>{t('showReservationButton')}</Text>
                            </Flex>
                            <Switch aria-label={t('showReservationButton')} checked={formData.showReservation} onChange={(value) => setFormData((previous) => ({ ...previous, showReservation: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('🛍️', <LuShoppingBag size={16} />)}
                                <Text>{t('showOrderButton')}</Text>
                            </Flex>
                            <Switch aria-label={t('showOrderButton')} checked={formData.showOrder} onChange={(value) => setFormData((previous) => ({ ...previous, showOrder: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('⭐', <LuStar size={16} />)}
                                <Text>{t('showGoogleReviewButton')}</Text>
                            </Flex>
                            <Switch aria-label={t('showGoogleReviewButton')} checked={formData.showGoogleReview} onChange={(value) => setFormData((previous) => ({ ...previous, showGoogleReview: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('💬', <LuMessageSquarePlus size={16} />)}
                                <Text>{t('showFeedbackButton')}</Text>
                            </Flex>
                            <Switch aria-label={t('showFeedbackButton')} checked={formData.showFeedback} onChange={(value) => setFormData((previous) => ({ ...previous, showFeedback: value }))} />
                        </Flex>
                    </Flex>
                </Card>

                {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES ? (
                    <>
                        <Card>
                            <Flex gap={12} vertical>
                                <Text strong>{t('publicPolicyLinks')}</Text>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <MobileCompliancePagesEditor
                                            baseUrl={officialPageUrl}
                                            compact={isCompactHandheld}
                                            storeId={storeDetails?.storeId}
                                            tenantId={storeDetails?.tenantId}
                                            type="privacy"
                                        />
                                        <Text>{t('showPrivacyLink')}</Text>
                                    </Flex>
                                    <Switch aria-label={t('showPrivacyLink')} checked={formData.showPrivacyLink} onChange={(value) => setFormData((previous) => ({ ...previous, showPrivacyLink: value }))} />
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <MobileCompliancePagesEditor
                                            baseUrl={officialPageUrl}
                                            compact={isCompactHandheld}
                                            storeId={storeDetails?.storeId}
                                            tenantId={storeDetails?.tenantId}
                                            type="terms"
                                        />
                                        <Text>{t('showTermsLink')}</Text>
                                    </Flex>
                                    <Switch aria-label={t('showTermsLink')} checked={formData.showTermsLink} onChange={(value) => setFormData((previous) => ({ ...previous, showTermsLink: value }))} />
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <MobileCompliancePagesEditor
                                            baseUrl={officialPageUrl}
                                            compact={isCompactHandheld}
                                            storeId={storeDetails?.storeId}
                                            tenantId={storeDetails?.tenantId}
                                            type="refund"
                                        />
                                        <Text>{t('showRefundLink')}</Text>
                                    </Flex>
                                    <Switch aria-label={t('showRefundLink')} checked={formData.showRefundLink} onChange={(value) => setFormData((previous) => ({ ...previous, showRefundLink: value }))} />
                                </Flex>
                            </Flex>
                        </Card>
                    </>
                ) : null}

                <SectionCard title={t('officialPageSpecialNote')} subtitle={t('officialPageSpecialNoteHelp')}>
                    <TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        maxLength={140}
                        onChange={(value) => setLocalizedDrafts((previous) => ({
                            ...previous,
                            [selectedLanguage]: {
                                ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
                                specialNote: value,
                            },
                        }))}
                        placeholder={t('officialPageSpecialNotePlaceholder')}
                        showCount
                        value={currentLocalizedDraft.specialNote}
                    />
                    <Flex gap={8} style={{ marginTop: 12 }} wrap="wrap">
                        {specialNoteSuggestions.map((suggestion) => (
                            <Tag
                                key={suggestion}
                                color={currentLocalizedDraft.specialNote === suggestion ? 'primary' : undefined}
                                onClick={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
                                        specialNote: suggestion,
                                    },
                                }))}
                                style={{ cursor: 'pointer', marginInlineEnd: 0 }}
                            >
                                {suggestion}
                            </Tag>
                        ))}
                    </Flex>
                    <Text type="secondary" style={{ marginTop: 8 }}>
                        {tDesign('specialNoteHelper')}
                    </Text>
                    {selectedLanguage !== referenceLanguage ? (
                        <LocalizedReferenceHint
                            onUseReference={() => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
                                    specialNote: previous[referenceLanguage]?.specialNote || '',
                                },
                            }))}
                            referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                            referenceValue={localizedDrafts[referenceLanguage]?.specialNote || ''}
                        />
                    ) : null}
                </SectionCard>

                {!embedded ? (
                    <Flex
                        gap={8}
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            bottom: 0,
                            marginInline: -16,
                            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                            position: 'sticky',
                            zIndex: 20,
                        }}
                        vertical
                    >
                        <Button
                            block
                            color="primary"
                            disabled={isSaving}
                            fill="outline"
                            icon={<LuEye size={18} />}
                            onClick={() => setIsPreviewSheetOpen(true)}
                            size="large"
                        >
                            {isDirty ? tDesign('previewChanges') : tDesign('previewOfficialPage')}
                        </Button>
                        {isDirty ? (
                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35, textAlign: 'center' }}>
                                {tDesign('previewUnsavedHint')}
                            </Text>
                        ) : null}
                        <Flex gap={12}>
                            <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large">
                                {tMobile('reset')}
                            </Button>
                            <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={handleSave} size="large">
                                {tMobile('saveChanges')}
                            </Button>
                        </Flex>
                    </Flex>
                ) : null}
            </Flex>
            {previewStoreDetails ? (
                <MobileOfficialPagePreviewSheet
                    activeLanguage={selectedLanguage}
                    menuInfo={previewMenuInfo}
                    onClose={() => setIsPreviewSheetOpen(false)}
                    storeDetails={previewStoreDetails as any}
                    visible={isPreviewSheetOpen}
                />
            ) : null}
            <input
                accept={getMediaProfileAcceptAttribute('galleryImage')}
                onChange={(event) => {
                    const file = Array.from(event.currentTarget.files || []).find((item) => item.type.startsWith('image/'));
                    const index = activePhotoIndex;
                    event.currentTarget.value = '';
                    if (!file || index == null) return;
                    setActivePhotoIndex(null);
                    void handlePhotoUpload(file, index);
                }}
                ref={replacePhotoInputRef}
                style={{ display: 'none' }}
                type="file"
            />
            <Popup
                bodyStyle={{ maxHeight: '90vh', padding: 0 }}
                destroyOnClose
                onMaskClick={() => setActivePhotoIndex(null)}
                visible={activePhotoIndex != null && Boolean(activePhoto)}
            >
                <Flex style={{ maxHeight: '90vh' }} vertical>
                    <NavBar onBack={() => setActivePhotoIndex(null)}>
                        {activePhotoIndex != null ? t('photoLabel', { index: activePhotoIndex + 1 }) : t('businessPhotos')}
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 16 }} vertical>
                        {activePhoto ? (
                            <div
                                style={{
                                    alignItems: 'center',
                                    background: token.colorBgLayout,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 12,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    maxHeight: '68vh',
                                    minHeight: 240,
                                    overflow: 'hidden',
                                    padding: 8,
                                }}
                            >
                                <img
                                    alt={activePhotoIndex != null ? t('photoLabel', { index: activePhotoIndex + 1 }) : t('businessPhotos')}
                                    src={activePhoto}
                                    style={{
                                        display: 'block',
                                        height: 'auto',
                                        maxHeight: 'calc(68vh - 16px)',
                                        maxWidth: '100%',
                                        objectFit: 'contain',
                                        width: 'auto',
                                    }}
                                />
                            </div>
                        ) : null}
                        <Flex gap={8}>
                            <Button
                                block
                                disabled={uploadingIndex != null}
                                fill="outline"
                                onClick={() => replacePhotoInputRef.current?.click()}
                                size="large"
                                style={{ flex: 1, minWidth: 0, paddingInline: 8 }}
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuImagePlus size={18} />
                                    <Text>Replace</Text>
                                </Flex>
                            </Button>
                            {canAdjustActivePhoto ? (
                                <Button
                                    block
                                    disabled={uploadingIndex != null}
                                    fill="outline"
                                    onClick={() => {
                                        const index = activePhotoIndex;
                                        setActivePhotoIndex(null);
                                        if (index != null) setAdjustingPhotoIndex(index);
                                    }}
                                    size="large"
                                    style={{ flex: 1, minWidth: 0, paddingInline: 8 }}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuCrop size={18} />
                                        <Text>Adjust</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                            <Button
                                block
                                color="danger"
                                disabled={uploadingIndex != null}
                                fill="outline"
                                onClick={() => {
                                    const index = activePhotoIndex;
                                    setActivePhotoIndex(null);
                                    if (index != null) handlePhotoRemove(index);
                                }}
                                size="large"
                                style={{ flex: 1, minWidth: 0, paddingInline: 8 }}
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuTrash2 size={18} />
                                    <Text>Remove</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
            <MobileQrCodeSheet
                activePlanType={(storeDetails as any)?.activePlanType}
                copyErrorMessage={tShare('couldNotCopy')}
                copySuccessMessage={tShare('linkCopied')}
                diagnosticSource="mobile_official_page_qr"
                downloadSuccessMessage={tShare('qrDownloaded')}
                filename={buildQrCodeFilename(`${getBrandName(storeDetails as any, 'business')}-official-page`, 'qr')}
                generatingLabel={tShare('generatingQr')}
                helperText={tShare('obpShareHint')}
                imageAlt={tShare('officialBusinessLink')}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={tShare('qrFailed')}
                title={tShare('officialBusinessLink')}
                url={withSource(officialPageUrl, 'qr')}
                visible={isQrSheetOpen}
            />
            <MediaImageAdjustModal
                fileName={coverDraft?.fileName}
                imageType="businessCover"
                initialCrop={coverDraft?.crop}
                onApply={async (prepared) => {
                    await savePreparedCover(prepared, coverDraft || undefined);
                }}
                onClose={() => setIsCoverAdjustOpen(false)}
                open={isCoverAdjustOpen}
                sourceDataUrl={coverDraft?.sourceDataUrl}
            />
            <MediaImageAdjustModal
                fileName={adjustingPhotoIndex != null ? photoDrafts[adjustingPhotoIndex]?.fileName : undefined}
                imageType="galleryImage"
                initialCrop={adjustingPhotoIndex != null ? photoDrafts[adjustingPhotoIndex]?.crop : undefined}
                onApply={async (prepared) => {
                    if (adjustingPhotoIndex == null) return;
                    await savePreparedPhoto(prepared, adjustingPhotoIndex, photoDrafts[adjustingPhotoIndex]);
                }}
                onClose={() => setAdjustingPhotoIndex(null)}
                open={adjustingPhotoIndex != null}
                sourceDataUrl={adjustingPhotoIndex != null ? photoDrafts[adjustingPhotoIndex]?.sourceDataUrl : undefined}
            />
            <ColorPickerSheet
                currentToneLabel={t('officialPage')}
                defaultMoodColor={defaultObpAccentColor}
                onChange={(color) => setFormData((previous) => ({ ...previous, accentColor: color }))}
                onClose={() => setIsColorPickerOpen(false)}
                showDefaultColorOption
                value={formData.accentColor}
                visible={isColorPickerOpen}
            />
        </Flex>
    );
}

export default function MobileOfficialPageScreen(props: MobileOfficialPageScreenProps) {
    const { storeDetails: contextStoreDetails } = useContext(PlatformGlobalDataContext);
    const storeDetails = props.embeddedStoreDetails || contextStoreDetails;
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}`;

    return <MobileOfficialPageScreenContent key={scopeKey} {...props} />;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex gap={2} vertical>
                    <Text strong>{title}</Text>
                    {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
                </Flex>
                {children}
            </Flex>
        </Card>
    );
}

function LocalizedReferenceHint({
    onUseReference,
    referenceLabel,
    referenceValue,
}: {
    onUseReference: () => void;
    referenceLabel: string;
    referenceValue: string;
}) {
    const { token } = theme.useToken();

    return (
        <Flex
            align="center"
            justify="space-between"
            style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 12,
                padding: '8px 10px',
            }}
        >
            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                <Text type="secondary">{`${referenceLabel} reference`}</Text>
                <Text style={{ wordBreak: 'break-word' }}>
                    {referenceValue || 'No content yet in the primary language.'}
                </Text>
            </Flex>
            {referenceValue ? (
                <Button fill="outline" onClick={onUseReference} size="small">
                    Use
                </Button>
            ) : null}
        </Flex>
    );
}
