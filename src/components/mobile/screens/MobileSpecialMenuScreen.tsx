'use client'

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
/**
 * MobileSpecialMenuScreen — Mobile screen for managing and creating special menus.
 *
 * Reuses the same special menu DAL as desktop for create, edit, and lifecycle actions.
 */

import { getSpecialMenuCapabilities } from '@config/specialMenuConfig';
import { assertProjectUpdateSucceeded, getProjectDataWithoutLoader, updateProjectWithoutLoader, type ProjectExpectedScope } from '@database/projects';
import type { SpecialMenuListItem } from '@hook/useSpecialMenus';
import { useSpecialMenus } from '@hook/useSpecialMenus';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { applyLocalizedProjectDraftMap, getLocalizedProjectValue, getProjectLanguageLabel, getProjectManagedLanguages, getProjectPreferredLanguage } from '@lib/localization/projectContent';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { normalizeMultiOutletProjectId } from '@lib/multiOutlet/projectIdBoundary';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import translateProjectPublicContent from '@services/ai/projectPublicContent/translateProjectPublicContent';
import {
    formatDateTime,
    formatDateTimeRange,
    fromNativeDateInputValue,
    fromNativeDateTimeInputValue,
    type IntlFormatter,
    toNativeDateInputValue,
    toNativeDateTimeInputValue,
} from '@util/dateTime';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCalendar, LuMonitor, LuPause, LuPencil, LuPlus, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Empty, Flex, Input, NavBar, Popup, Select, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileLocalizedLanguageSelector from '../components/MobileLocalizedLanguageSelector';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileSpecialMenuScreenProps {
    onBack: () => void;
    onOpenMenuTab?: () => void;
}

type BaseProjectOption = {
    label: string;
    value: string;
};

type ProjectNameValue = string | Record<string, string> | undefined;

type SpecialMenuConflictCheckParams = {
    endsAt: string;
    projectId?: string;
    startsAt: string;
};

function resolveStoreProjectScope(
    storeDetails: { storeId?: unknown; tenantId?: unknown } | null | undefined,
): ProjectExpectedScope | null {
    const storeId = Number(storeDetails?.storeId);
    const tenantId = Number(storeDetails?.tenantId);
    return Number.isSafeInteger(storeId)
        && storeId > 0
        && Number.isSafeInteger(tenantId)
        && tenantId > 0
        ? { sId: storeId, tId: tenantId }
        : null;
}

function formatDate(iso: string, formatter: IntlFormatter): string {
    if (!iso) return '';
    return formatDateTime(iso, 'date', formatter);
}

function formatScheduleRange(startsAt: string, endsAt: string, formatter: IntlFormatter): string {
    if (!startsAt || !endsAt) return '';
    return formatDateTimeRange(startsAt, endsAt, formatter, '');
}

function toInputValue(
    iso: string | null | undefined,
    allowTimeScheduling: boolean,
    timeZone?: string,
): string {
    if (!iso) return '';
    return allowTimeScheduling
        ? toNativeDateTimeInputValue(iso, timeZone)
        : toNativeDateInputValue(iso, timeZone);
}

function toIsoValue(rawValue: string, allowTimeScheduling: boolean, timeZone?: string): string {
    return allowTimeScheduling
        ? fromNativeDateTimeInputValue(rawValue, timeZone)
        : fromNativeDateInputValue(rawValue, timeZone);
}

function getScheduledStartsAtValue(allowTimeScheduling: boolean, timeZone?: string): string {
    const date = new Date();
    date.setTime(date.getTime() + (allowTimeScheduling ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
    return toInputValue(date.toISOString(), allowTimeScheduling, timeZone);
}

function getDefaultScheduledEndsAtValue(
    allowTimeScheduling: boolean,
    timeZone?: string,
): string {
    const date = new Date();
    date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
    return toInputValue(date.toISOString(), allowTimeScheduling, timeZone);
}

function getNativeScheduleMs(
    value: string,
    allowTimeScheduling: boolean,
    timeZone?: string,
): number {
    const iso = toIsoValue(value, allowTimeScheduling, timeZone);
    const date = new Date(iso);
    return date.getTime();
}

function resolveProjectName(name: ProjectNameValue, fallback: string): string {
    return getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback);
}

function buildLocalizedDrafts(
    value: string | Record<string, string> | undefined,
    languages: string[],
): Record<string, string> {
    return Object.fromEntries(
        languages.map((languageCode) => [
            languageCode,
            getLocalizedProjectValue(value, languageCode, ''),
        ])
    );
}

function getScheduleConflict(
    specialMenus: SpecialMenuListItem[],
    params: SpecialMenuConflictCheckParams,
): SpecialMenuListItem | null {
    const nextStart = new Date(params.startsAt).getTime();
    const nextEnd = new Date(params.endsAt).getTime();

    return specialMenus.find((menu) => {
        if (menu.projectId === params.projectId) return false;
        if (menu.status === 'expired' || menu.status === 'cancelled') return false;

        const existingStart = new Date(menu.startsAt).getTime();
        const existingEnd = new Date(menu.endsAt).getTime();

        return nextStart < existingEnd && nextEnd > existingStart;
    }) || null;
}

function StatusTag({ status }: { status: string }) {
    const config: Record<string, { color: string; text: string }> = {
        active: { color: 'success', text: 'Active' },
        scheduled: { color: 'processing', text: 'Scheduled' },
        expired: { color: 'default', text: 'Ended' },
        cancelled: { color: 'default', text: 'Cancelled' },
    };
    const current = config[status] || config.scheduled;
    return <Tag color={current.color}>{current.text}</Tag>;
}

function CreateSpecialMenuSheet({
    baseProjectOptions,
    defaultBaseProjectId,
    onClose,
    onResolveOverlap,
    resolveProjectDetails,
    onSubmit,
    open,
}: {
    baseProjectOptions: BaseProjectOption[];
    defaultBaseProjectId: string;
    onClose: () => void;
    onResolveOverlap?: (payload: SpecialMenuConflictCheckParams) => Promise<boolean | null>;
    resolveProjectDetails: (projectId: string) => Promise<any | null>;
    onSubmit: (payload: {
        baseProjectId: string;
        displayName: string;
        localizedDisplayName?: Record<string, string>;
        endsAt: string;
        mode: 'replace' | 'overlay';
        startsAt: string;
    }) => Promise<void>;
    open: boolean;
}) {
    const t = useTranslations('MobileSpecialMenu');
    const { storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const canTranslatePublicContent = userPermissions?.canGenerateDescriptions === true;
    const capabilities = useMemo(
        () => getSpecialMenuCapabilities(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory]
    );
    const { token } = theme.useToken();
    const [baseProjectId, setBaseProjectId] = useState(defaultBaseProjectId);
    const [managedLanguages, setManagedLanguages] = useState<string[]>([storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE);
    const [displayNameDrafts, setDisplayNameDrafts] = useState<Record<string, string>>({});
    const [mode, setMode] = useState<'replace' | 'overlay'>(capabilities.availableModes[0] || 'overlay');
    const [startsAt, setStartsAt] = useState(() => toInputValue(
        new Date().toISOString(),
        capabilities.allowTimeScheduling,
        storeDetails?.timeZone,
    ));
    const [endsAt, setEndsAt] = useState(() => getDefaultScheduledEndsAtValue(
        capabilities.allowTimeScheduling,
        storeDetails?.timeZone,
    ));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTranslatingPublicContent, setIsTranslatingPublicContent] = useState(false);
    const isMountedRef = useRef(true);
    const submitInFlightRef = useRef(false);
    const translationInFlightRef = useRef(false);
    const currentScopeRef = useRef<ProjectExpectedScope | null>(resolveStoreProjectScope(storeDetails));
    const displayNameDraftsRef = useRef(displayNameDrafts);
    currentScopeRef.current = resolveStoreProjectScope(storeDetails);
    displayNameDraftsRef.current = displayNameDrafts;
    const isExpectedScope = (expectedScope: ProjectExpectedScope) => (
        isMountedRef.current
        && currentScopeRef.current?.tId === expectedScope.tId
        && currentScopeRef.current?.sId === expectedScope.sId
    );
    const isActiveToggleOn = startsAt
        ? getNativeScheduleMs(startsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone) <= Date.now()
        : false;

    const resetForm = () => {
        const defaultLanguage = storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE;
        setBaseProjectId(defaultBaseProjectId);
        setManagedLanguages([defaultLanguage]);
        setSelectedLanguage(defaultLanguage);
        setDisplayNameDrafts({ [defaultLanguage]: '' });
        setMode(capabilities.availableModes[0] || 'overlay');
        setStartsAt(toInputValue(
            new Date().toISOString(),
            capabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
        setEndsAt(getDefaultScheduledEndsAtValue(
            capabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
    };

    useEffect(() => {
        if (!open) return;
        setStartsAt(toInputValue(
            new Date().toISOString(),
            capabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
        setEndsAt(getDefaultScheduledEndsAtValue(
            capabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
    }, [capabilities.allowTimeScheduling, open, storeDetails?.timeZone]);

    useEffect(() => {
        if (!open || !baseProjectId) return;
        let cancelled = false;

        void resolveProjectDetails(baseProjectId).then((projectDetails) => {
            if (cancelled || !projectDetails) return;
            const languages = getProjectManagedLanguages(projectDetails, storeDetails);
            const preferredLanguage = getProjectPreferredLanguage(projectDetails, storeDetails);
            setManagedLanguages(languages);
            setSelectedLanguage(preferredLanguage);
            setDisplayNameDrafts((previous) => (
                Object.keys(previous).length > 0 ? previous : { [preferredLanguage]: '' }
            ));
        });

        return () => {
            cancelled = true;
        };
    }, [baseProjectId, open, resolveProjectDetails, storeDetails]);

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        const trimmedName = (displayNameDrafts[selectedLanguage] || '').trim();
        const localizedDisplayName = applyLocalizedProjectDraftMap(undefined, displayNameDrafts);

        if (!baseProjectId) {
            Toast.show({ content: t('baseMenuRequired'), duration: 1800 });
            return;
        }

        if (!trimmedName || !localizedDisplayName) {
            Toast.show({ content: t('nameRequired'), duration: 1800 });
            return;
        }

        if (!startsAt || !endsAt) {
            Toast.show({ content: t('scheduleRequired'), duration: 1800 });
            return;
        }

        const startsAtIso = toIsoValue(startsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone);
        const endsAtIso = toIsoValue(endsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone);

        if (
            !startsAtIso
            || !endsAtIso
            || new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()
        ) {
            Toast.show({ content: t('endAfterStart'), duration: 2000 });
            return;
        }

        const expectedScope = currentScopeRef.current;
        if (!expectedScope || !isExpectedScope(expectedScope) || submitInFlightRef.current) return;
        const submittedBaseProjectId = baseProjectId;
        const submittedMode = mode;
        submitInFlightRef.current = true;
        setIsSubmitting(true);
        try {
            const overlapResolution = await onResolveOverlap?.({
                endsAt: endsAtIso,
                startsAt: startsAtIso,
            }) ?? null;
            if (!isExpectedScope(expectedScope) || overlapResolution === false) return;
            await onSubmit({
                baseProjectId: submittedBaseProjectId,
                displayName: trimmedName,
                localizedDisplayName,
                endsAt: endsAtIso,
                mode: submittedMode,
                startsAt: startsAtIso,
            });
            if (!isExpectedScope(expectedScope)) return;
            resetForm();
        } finally {
            submitInFlightRef.current = false;
            if (isExpectedScope(expectedScope)) {
                setIsSubmitting(false);
            }
        }
    };

    const handleTranslatePublicContent = async () => {
        const expectedScope = currentScopeRef.current;
        if (
            !canTranslatePublicContent
            || !expectedScope
            || !isExpectedScope(expectedScope)
            || translationInFlightRef.current
        ) return;
        const sourceDisplayNameDrafts = displayNameDrafts;
        const sourceManagedLanguages = managedLanguages;
        const sourceSelectedLanguage = selectedLanguage;
        const sourceBaseProjectId = baseProjectId || defaultBaseProjectId;
        const sourceStoreDetails = storeDetails;
        translationInFlightRef.current = true;
        try {
            setIsTranslatingPublicContent(true);
            const translated = await translateProjectPublicContent({
                projectDetails: {
                    languages: sourceManagedLanguages,
                    _specialMenu: {
                        displayName: applyLocalizedProjectDraftMap(undefined, sourceDisplayNameDrafts),
                    },
                },
                projectId: sourceBaseProjectId,
                storeDetails: sourceStoreDetails,
            });
            if (
                !isExpectedScope(expectedScope)
                || displayNameDraftsRef.current !== sourceDisplayNameDrafts
            ) return;

            if (!translated?.specialMenuDisplayName) {
                Toast.show({ content: 'No missing special menu name translations found.', duration: 1800 });
                return;
            }

            const nextDrafts = Object.fromEntries(
                sourceManagedLanguages.map((languageCode) => [
                    languageCode,
                    typeof translated.specialMenuDisplayName?.[languageCode] === 'string'
                        ? translated.specialMenuDisplayName[languageCode]
                        : sourceDisplayNameDrafts[languageCode] || '',
                ]),
            );
            setDisplayNameDrafts(nextDrafts);
            Toast.show({ content: 'Special menu name translations added.', duration: 1800 });
        } catch (error) {
            logMobileOwnerFailure('mobile_special_menu_name_translation_failed', error, {
                ...getMobileOwnerStoreLogContext(sourceStoreDetails?.storeId, sourceStoreDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('baseProjectId', sourceBaseProjectId),
                ...getBoundedMobileOwnerStringContext('defaultBaseProjectId', defaultBaseProjectId),
                ...getBoundedMobileOwnerStringContext('selectedLanguage', sourceSelectedLanguage),
                managedLanguageCount: sourceManagedLanguages.length,
                displayNameLength: String(sourceDisplayNameDrafts[sourceSelectedLanguage] || '').length,
            });
            if (isExpectedScope(expectedScope)) {
                Toast.show({ content: 'Could not translate the special menu name.', duration: 1800 });
            }
        } finally {
            translationInFlightRef.current = false;
            if (isExpectedScope(expectedScope)) {
                setIsTranslatingPublicContent(false);
            }
        }
    };

    const handleLifecycleToggle = (nextValue: boolean) => {
        if (nextValue) {
            setStartsAt(toInputValue(
                new Date().toISOString(),
                capabilities.allowTimeScheduling,
                storeDetails?.timeZone,
            ));
            return;
        }

        setStartsAt(getScheduledStartsAtValue(capabilities.allowTimeScheduling, storeDetails?.timeZone));
    };

    return (
        <Popup
            bodyStyle={{
                maxHeight: '92vh',
                minHeight: '60vh',
                overflow: 'hidden',
                padding: 0,
            }}
            destroyOnClose
            onMaskClick={handleClose}
            visible={open}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={handleClose}>{t('createTitle')}</NavBar>

                <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex gap={14} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{t('baseMenuLabel')}</Text>
                                <Text type="secondary">Choose which existing menu this special menu should start from.</Text>
                                <Select
                                    onChange={setBaseProjectId}
                                    options={baseProjectOptions}
                                    showSearch={false}
                                    value={baseProjectId}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{t('nameLabel')}</Text>
                                <Text type="secondary">Give the special menu a clear public name like Summer Specials or Weekend Brunch.</Text>
                                <MobileLocalizedLanguageSelector
                                    helperText="Edit this special menu name one language at a time."
                                    languages={managedLanguages}
                                    onChange={setSelectedLanguage}
                                    selectedLanguage={selectedLanguage}
                                    title="Project content language"
                                />
                                {canTranslatePublicContent ? (
                                    <Button
                                        fill="outline"
                                        loading={isTranslatingPublicContent}
                                        onClick={() => { void handleTranslatePublicContent(); }}
                                        size="small"
                                    >
                                        Translate missing public content
                                    </Button>
                                ) : null}
                                <Input
                                    maxLength={100}
                                    onChange={(value) => setDisplayNameDrafts((previous) => ({
                                        ...previous,
                                        [selectedLanguage]: value,
                                    }))}
                                    placeholder={t('namePlaceholder')}
                                    value={displayNameDrafts[selectedLanguage] || ''}
                                />
                            </Flex>

                            {capabilities.availableModes.length > 1 ? (
                                <Flex gap={4} vertical>
                                    <Text strong>{t('modeLabel')}</Text>
                                    <Text type="secondary">
                                        This controls what customers see when the special menu is live: replace the regular menu completely, or show it as an extra section alongside the regular menu.
                                    </Text>
                                    <Select
                                        onChange={(value: string) => {
                                            if (value === 'replace' || value === 'overlay') {
                                                setMode(value);
                                            }
                                        }}
                                        options={capabilities.availableModes.map((value) => ({
                                            label: value === 'replace' ? t('replaceOption') : t('overlayOption'),
                                            value,
                                        }))}
                                        showSearch={false}
                                        value={mode}
                                    />
                                    <Text type="secondary">
                                        {mode === 'replace' ? t('replaceDescription') : t('overlayDescription')}
                                    </Text>
                                </Flex>
                            ) : (
                                <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                                    <Flex gap={4} vertical>
                                        <Text strong>{t('modeLabel')}</Text>
                                        <Text type="secondary">
                                            {mode === 'replace'
                                                ? 'Customers will see only the special menu while it is live.'
                                                : 'Customers will see the special menu as an extra section alongside the regular menu.'}
                                        </Text>
                                    </Flex>
                                </Card>
                            )}

                            <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                                <Flex align="center" gap={12} justify="space-between">
                                    <Flex gap={4} style={{ flex: 1 }} vertical>
                                        <Text strong>Active now</Text>
                                        <Text type="secondary">
                                            Turn this on to make the special menu active immediately. Turn it off to keep it scheduled.
                                        </Text>
                                    </Flex>
                                    <Switch checked={isActiveToggleOn} onChange={handleLifecycleToggle} />
                                </Flex>
                            </Card>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('startsLabel')} ${capabilities.allowTimeScheduling ? 'Date & Time' : 'Date'}`}</Text>
                                <Text type="secondary">Choose when this special menu should start appearing.</Text>
                                <Input
                                    onChange={setStartsAt}
                                    type={capabilities.allowTimeScheduling ? 'datetime-local' : 'date'}
                                    value={startsAt}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('endsLabel')} ${capabilities.allowTimeScheduling ? 'Date & Time' : 'Date'}`}</Text>
                                <Text type="secondary">Choose when this special menu should stop appearing automatically.</Text>
                                <Input
                                    onChange={setEndsAt}
                                    type={capabilities.allowTimeScheduling ? 'datetime-local' : 'date'}
                                    value={endsAt}
                                />
                            </Flex>
                            {storeDetails?.timeZone ? (
                                <Text type="secondary">{`Schedule uses ${storeDetails.timeZone}.`}</Text>
                            ) : null}
                        </Flex>
                    </Card>

                    <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Text type="secondary">{t('createHelp')}</Text>
                    </Card>
                </Flex>

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        padding: '12px 16px',
                    }}
                >
                    <Button block disabled={isSubmitting} fill="outline" onClick={handleClose} size="large">
                        {t('cancelAction')}
                    </Button>
                    <Button block loading={isSubmitting} onClick={() => { void handleSubmit(); }} size="large">
                        {t('createShort')}
                    </Button>
                </Flex>
            </Flex>
        </Popup>
    );
}

function EditSpecialMenuSheet({
    item,
    onClose,
    onResolveOverlap,
    resolveProjectDetails,
    onSubmit,
    open,
}: {
    item: SpecialMenuListItem | null;
    onClose: () => void;
    onResolveOverlap?: (payload: SpecialMenuConflictCheckParams) => Promise<boolean | null>;
    resolveProjectDetails: (projectId: string) => Promise<any | null>;
    onSubmit: (payload: {
        projectId: string;
        description?: string;
        displayName: string;
        localizedDescription?: Record<string, string>;
        localizedDisplayName?: Record<string, string>;
        endsAt: string;
        startsAt: string;
    }) => Promise<void>;
    open: boolean;
}) {
    const t = useTranslations('MobileSpecialMenu');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const tSettings = useTranslations('Settings');
    const { storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const canTranslatePublicContent = userPermissions?.canGenerateDescriptions === true;
    const capabilities = useMemo(
        () => getSpecialMenuCapabilities(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory],
    );
    const { token } = theme.useToken();
    const [managedLanguages, setManagedLanguages] = useState<string[]>(['en']);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
    const [displayNameDrafts, setDisplayNameDrafts] = useState<Record<string, string>>({});
    const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({});
    const [initialDisplayNameDrafts, setInitialDisplayNameDrafts] = useState<Record<string, string>>({});
    const [initialDescriptionDrafts, setInitialDescriptionDrafts] = useState<Record<string, string>>({});
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTranslatingPublicContent, setIsTranslatingPublicContent] = useState(false);
    const isMountedRef = useRef(true);
    const submitInFlightRef = useRef(false);
    const translationInFlightRef = useRef(false);
    const currentScopeRef = useRef<ProjectExpectedScope | null>(resolveStoreProjectScope(storeDetails));
    const currentItemRef = useRef(item);
    const displayNameDraftsRef = useRef(displayNameDrafts);
    const descriptionDraftsRef = useRef(descriptionDrafts);
    currentScopeRef.current = resolveStoreProjectScope(storeDetails);
    currentItemRef.current = item;
    displayNameDraftsRef.current = displayNameDrafts;
    descriptionDraftsRef.current = descriptionDrafts;
    const isExpectedScope = (
        expectedScope: ProjectExpectedScope,
        expectedItem: SpecialMenuListItem,
    ) => (
        isMountedRef.current
        && currentScopeRef.current?.tId === expectedScope.tId
        && currentScopeRef.current?.sId === expectedScope.sId
        && currentItemRef.current === expectedItem
    );

    useEffect(() => {
        let cancelled = false;

        if (!item?.projectId) {
            setDisplayNameDrafts({});
            setDescriptionDrafts({});
            setInitialDisplayNameDrafts({});
            setInitialDescriptionDrafts({});
            setManagedLanguages(['en']);
            setSelectedLanguage('en');
            setStartsAt('');
            setEndsAt('');
            return () => {
                cancelled = true;
            };
        }

        void resolveProjectDetails(item.projectId).then((projectDetails) => {
            if (cancelled || !projectDetails) return;
            const languages = getProjectManagedLanguages(projectDetails);
            const preferredLanguage = getProjectPreferredLanguage(projectDetails);
            const nextDisplayNameDrafts = buildLocalizedDrafts(
                projectDetails?._specialMenu?.displayName || item.displayName,
                languages,
            );
            const nextDescriptionDrafts = buildLocalizedDrafts(
                projectDetails?.description || item.description,
                languages,
            );
            setManagedLanguages(languages);
            setSelectedLanguage(preferredLanguage);
            setDisplayNameDrafts(nextDisplayNameDrafts);
            setDescriptionDrafts(nextDescriptionDrafts);
            setInitialDisplayNameDrafts(nextDisplayNameDrafts);
            setInitialDescriptionDrafts(nextDescriptionDrafts);
            setStartsAt(toInputValue(item?.startsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone));
            setEndsAt(toInputValue(item?.endsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone));
        });

        return () => {
            cancelled = true;
        };
    }, [capabilities.allowTimeScheduling, item, resolveProjectDetails, storeDetails?.timeZone]);

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const resetForm = () => {
        setDisplayNameDrafts(initialDisplayNameDrafts);
        setDescriptionDrafts(initialDescriptionDrafts);
        setSelectedLanguage(getProjectPreferredLanguage({ languages: managedLanguages }));
        setStartsAt(toInputValue(item?.startsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone));
        setEndsAt(toInputValue(item?.endsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone));
    };

    const initialName = initialDisplayNameDrafts[selectedLanguage] || '';
    const initialDescription = initialDescriptionDrafts[selectedLanguage] || '';
    const displayName = displayNameDrafts[selectedLanguage] || '';
    const description = descriptionDrafts[selectedLanguage] || '';
    const initialStartsAt = toInputValue(item?.startsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone);
    const initialEndsAt = toInputValue(item?.endsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone);
    const referenceLanguage = getProjectPreferredLanguage({ languages: managedLanguages });
    const isActiveToggleOn = startsAt
        ? getNativeScheduleMs(startsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone) <= Date.now()
        : false;
    const hasChanges = JSON.stringify(displayNameDrafts) !== JSON.stringify(initialDisplayNameDrafts)
        || JSON.stringify(descriptionDrafts) !== JSON.stringify(initialDescriptionDrafts)
        || startsAt !== initialStartsAt
        || endsAt !== initialEndsAt;

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        const trimmedName = displayName.trim();
        const trimmedDescription = description.trim();
        const localizedDisplayName = applyLocalizedProjectDraftMap(undefined, displayNameDrafts);
        const localizedDescription = applyLocalizedProjectDraftMap(undefined, descriptionDrafts);

        if (!item?.projectId) return;

        if (!trimmedName || !localizedDisplayName) {
            Toast.show({ content: t('nameRequired'), duration: 1800 });
            return;
        }

        if (!startsAt || !endsAt) {
            Toast.show({ content: t('scheduleRequired'), duration: 1800 });
            return;
        }

        const startsAtIso = toIsoValue(startsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone);
        const endsAtIso = toIsoValue(endsAt, capabilities.allowTimeScheduling, storeDetails?.timeZone);

        if (
            !startsAtIso
            || !endsAtIso
            || new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()
        ) {
            Toast.show({ content: t('endAfterStart'), duration: 2000 });
            return;
        }

        const expectedScope = currentScopeRef.current;
        const submittedItem = item;
        if (
            !expectedScope
            || !isExpectedScope(expectedScope, submittedItem)
            || submitInFlightRef.current
        ) return;
        submitInFlightRef.current = true;
        setIsSubmitting(true);
        try {
            const overlapResolution = await onResolveOverlap?.({
                endsAt: endsAtIso,
                projectId: submittedItem.projectId,
                startsAt: startsAtIso,
            }) ?? null;
            if (
                !isExpectedScope(expectedScope, submittedItem)
                || overlapResolution === false
            ) return;
            await onSubmit({
                projectId: submittedItem.projectId,
                description: trimmedDescription || undefined,
                displayName: trimmedName,
                localizedDescription,
                localizedDisplayName,
                endsAt: endsAtIso,
                startsAt: startsAtIso,
            });
            if (!isExpectedScope(expectedScope, submittedItem)) return;
            resetForm();
        } finally {
            submitInFlightRef.current = false;
            if (isExpectedScope(expectedScope, submittedItem)) {
                setIsSubmitting(false);
            }
        }
    };

    const handleTranslatePublicContent = async () => {
        const expectedScope = currentScopeRef.current;
        const sourceItem = item;
        if (
            !canTranslatePublicContent
            || !sourceItem?.projectId
            || !expectedScope
            || !isExpectedScope(expectedScope, sourceItem)
            || translationInFlightRef.current
        ) return;

        const hasUnsavedContentChanges =
            JSON.stringify(displayNameDrafts) !== JSON.stringify(initialDisplayNameDrafts)
            || JSON.stringify(descriptionDrafts) !== JSON.stringify(initialDescriptionDrafts);

        if (hasUnsavedContentChanges) {
            Toast.show({ content: 'Save the current project content first, then translate the missing public content.', duration: 2000 });
            return;
        }

        const sourceDisplayNameDrafts = displayNameDrafts;
        const sourceDescriptionDrafts = descriptionDrafts;
        const sourceManagedLanguages = managedLanguages;
        const sourceSelectedLanguage = selectedLanguage;
        const sourceReferenceLanguage = referenceLanguage;
        const sourceStoreDetails = storeDetails;
        translationInFlightRef.current = true;
        try {
            setIsTranslatingPublicContent(true);
            const projectDetails = await resolveProjectDetails(sourceItem.projectId);
            if (!isExpectedScope(expectedScope, sourceItem) || !projectDetails) return;
            const translated = await translateProjectPublicContent({
                projectDetails,
                projectId: sourceItem.projectId,
            });
            if (
                !isExpectedScope(expectedScope, sourceItem)
                || displayNameDraftsRef.current !== sourceDisplayNameDrafts
                || descriptionDraftsRef.current !== sourceDescriptionDrafts
            ) return;

            if (!translated) {
                Toast.show({ content: 'No missing project public content translations found.', duration: 1800 });
                return;
            }

            const projectTranslationResult = await updateProjectWithoutLoader(
                {
                    projectId: sourceItem.projectId,
                    ...(translated.name ? { name: translated.name } : {}),
                    ...(translated.description ? { description: translated.description } : {}),
                    ...(translated.specialNote ? {
                        menuSettings: {
                            ...(projectDetails?.menuSettings || {}),
                            specialNote: translated.specialNote,
                        },
                    } : {}),
                    ...(translated.specialMenuDisplayName && projectDetails?._specialMenu ? {
                        _specialMenu: {
                            ...projectDetails._specialMenu,
                            displayName: translated.specialMenuDisplayName,
                        },
                    } : {}),
                } as any,
                {
                    expectedScope,
                    syncPublicSummary: true,
                },
            );
            assertProjectUpdateSucceeded(
                projectTranslationResult,
                sourceItem.projectId,
                'mobile_special_menu_public_content_translation_project_update_rejected',
            );

            const nextDisplayNameDrafts = buildLocalizedDrafts(
                translated.specialMenuDisplayName || projectDetails?._specialMenu?.displayName || sourceItem.displayName,
                sourceManagedLanguages,
            );
            const nextDescriptionDrafts = buildLocalizedDrafts(
                translated.description || projectDetails?.description || sourceItem.description,
                sourceManagedLanguages,
            );
            if (!isExpectedScope(expectedScope, sourceItem)) return;
            setDisplayNameDrafts(nextDisplayNameDrafts);
            setDescriptionDrafts(nextDescriptionDrafts);
            setInitialDisplayNameDrafts(nextDisplayNameDrafts);
            setInitialDescriptionDrafts(nextDescriptionDrafts);
            Toast.show({ content: 'Project public content translations added.', duration: 1800 });
        } catch (error) {
            logMobileOwnerFailure('mobile_special_menu_project_public_content_translation_failed', error, {
                ...getMobileOwnerStoreLogContext(sourceStoreDetails?.storeId, sourceStoreDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('projectId', sourceItem?.projectId),
                ...getBoundedMobileOwnerStringContext('selectedLanguage', sourceSelectedLanguage),
                ...getBoundedMobileOwnerStringContext('referenceLanguage', sourceReferenceLanguage),
                managedLanguageCount: sourceManagedLanguages.length,
                displayNameLength: String(sourceDisplayNameDrafts[sourceSelectedLanguage] || '').length,
                descriptionLength: String(sourceDescriptionDrafts[sourceSelectedLanguage] || '').length,
                hasInitialDisplayNameDrafts: Object.keys(initialDisplayNameDrafts).length > 0,
                hasInitialDescriptionDrafts: Object.keys(initialDescriptionDrafts).length > 0,
            });
            if (isExpectedScope(expectedScope, sourceItem)) {
                Toast.show({ content: 'Could not translate project public content.', duration: 1800 });
            }
        } finally {
            translationInFlightRef.current = false;
            if (isExpectedScope(expectedScope, sourceItem)) {
                setIsTranslatingPublicContent(false);
            }
        }
    };

    const handleLifecycleToggle = (nextValue: boolean) => {
        if (nextValue) {
            setStartsAt(toInputValue(
                new Date().toISOString(),
                capabilities.allowTimeScheduling,
                storeDetails?.timeZone,
            ));
            return;
        }

        setStartsAt(getScheduledStartsAtValue(capabilities.allowTimeScheduling, storeDetails?.timeZone));
    };

    if (!item) return null;

    return (
        <Popup
            bodyStyle={{
                maxHeight: '92vh',
                minHeight: '60vh',
                overflow: 'hidden',
                padding: 0,
            }}
            destroyOnClose
            onMaskClick={isSubmitting ? undefined : handleClose}
            visible={open}
        >
            <Flex style={{ height: '100%', position: 'relative' }} vertical>
                <NavBar
                    right={(
                        <Button
                            fill="none"
                            onClick={handleClose}
                            style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                        >
                            <LuX size={18} />
                        </Button>
                    )}
                >
                    {t('editAction')}
                </NavBar>

                <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex gap={14} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{t('nameLabel')}</Text>
                                <Text type="secondary">Use the public-facing name customers should see for this special menu.</Text>
                                <MobileLocalizedLanguageSelector
                                    helperText="Edit this special menu one language at a time."
                                    languages={managedLanguages}
                                    onChange={setSelectedLanguage}
                                    selectedLanguage={selectedLanguage}
                                    title="Project content language"
                                />
                                {canTranslatePublicContent ? (
                                    <Button
                                        fill="outline"
                                        loading={isTranslatingPublicContent}
                                        onClick={() => { void handleTranslatePublicContent(); }}
                                        size="small"
                                    >
                                        Translate missing public content
                                    </Button>
                                ) : null}
                                <Input
                                    maxLength={100}
                                    onChange={(value) => setDisplayNameDrafts((previous) => ({
                                        ...previous,
                                        [selectedLanguage]: value,
                                    }))}
                                    placeholder={t('namePlaceholder')}
                                    value={displayName}
                                />
                                {selectedLanguage !== referenceLanguage ? (
                                    <MobileProjectReferenceCard
                                        onUseReference={() => setDisplayNameDrafts((previous) => ({
                                            ...previous,
                                            [selectedLanguage]: previous[referenceLanguage] || '',
                                        }))}
                                        referenceLabel={getProjectLanguageLabel(referenceLanguage)}
                                        referenceValue={displayNameDrafts[referenceLanguage] || ''}
                                        token={token}
                                    />
                                ) : null}
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{tProjectSelector('description')}</Text>
                                <Text type="secondary">Optional short note to explain what is included or why this menu is special.</Text>
                                <TextArea
                                    maxLength={300}
                                    onChange={(value) => setDescriptionDrafts((previous) => ({
                                        ...previous,
                                        [selectedLanguage]: value,
                                    }))}
                                    placeholder={tProjectSelector('descriptionPlaceholder')}
                                    rows={3}
                                    showCount
                                    value={description}
                                />
                                {selectedLanguage !== referenceLanguage ? (
                                    <MobileProjectReferenceCard
                                        onUseReference={() => setDescriptionDrafts((previous) => ({
                                            ...previous,
                                            [selectedLanguage]: previous[referenceLanguage] || '',
                                        }))}
                                        referenceLabel={getProjectLanguageLabel(referenceLanguage)}
                                        referenceValue={descriptionDrafts[referenceLanguage] || ''}
                                        token={token}
                                    />
                                ) : null}
                            </Flex>

                            <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                                <Flex align="center" justify="space-between" gap={12}>
                                    <Flex gap={4} style={{ flex: 1 }} vertical>
                                        <Text strong>Activate now</Text>
                                        <Text type="secondary">
                                            Turn this on to make the special menu active immediately. Turn it off to keep it scheduled.
                                        </Text>
                                    </Flex>
                                    <Switch checked={isActiveToggleOn} onChange={handleLifecycleToggle} />
                                </Flex>
                            </Card>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('startsLabel')} ${capabilities.allowTimeScheduling ? 'Date & Time' : 'Date'}`}</Text>
                                <Text type="secondary">This controls when customers first see the special menu.</Text>
                                <Input
                                    onChange={setStartsAt}
                                    type={capabilities.allowTimeScheduling ? 'datetime-local' : 'date'}
                                    value={startsAt}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('endsLabel')} ${capabilities.allowTimeScheduling ? 'Date & Time' : 'Date'}`}</Text>
                                <Text type="secondary">This controls when the special menu automatically stops showing.</Text>
                                <Input
                                    onChange={setEndsAt}
                                    type={capabilities.allowTimeScheduling ? 'datetime-local' : 'date'}
                                    value={endsAt}
                                />
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Text type="secondary">{t('editInMenuTab')}</Text>
                    </Card>
                </Flex>

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        padding: '12px 16px',
                    }}
                >
                    <Button block disabled={!hasChanges || isSubmitting} fill="outline" onClick={resetForm} size="large">
                        {tSettings('reset')}
                    </Button>
                    <Button block disabled={!hasChanges || isSubmitting} onClick={() => { void handleSubmit(); }} size="large">
                        {tSettings('saveChanges')}
                    </Button>
                </Flex>

                {isSubmitting ? (
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            backgroundColor: token.colorBgMask,
                            inset: 0,
                            position: 'absolute',
                            zIndex: 2,
                        }}
                    >
                        <Flex align="center" gap={12} vertical>
                            <DotLoading color="primary" />
                            <Text>{tSettings('saveChanges')}</Text>
                        </Flex>
                    </Flex>
                ) : null}
            </Flex>
        </Popup>
    );
}

function SpecialMenuItem({
    baseProjectName,
    item,
    onCancel,
    onDeactivate,
    onEdit,
}: {
    baseProjectName?: string;
    item: SpecialMenuListItem;
    onCancel: (id: string) => Promise<void>;
    onDeactivate: (id: string) => Promise<void>;
    onEdit: (item: SpecialMenuListItem) => Promise<void> | void;
}) {
    const t = useTranslations('MobileSpecialMenu');
    const formatter = useFormatter();
    const { token } = theme.useToken();
    const [isWorking, setIsWorking] = useState(false);
    const isMountedRef = useRef(true);
    const actionInFlightRef = useRef(false);
    const modeLabel = item.mode === 'replace' ? t('replaceOption') : t('overlayOption');
    const actionButtonStyle = {
        minWidth: 108,
        borderRadius: 999,
    };

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const handleEdit = async () => {
        if (!isMountedRef.current || actionInFlightRef.current) return;
        actionInFlightRef.current = true;
        setIsWorking(true);
        try {
            await onEdit(item);
        } finally {
            actionInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsWorking(false);
            }
        }
    };

    const handleEnd = async () => {
        const confirmed = await Dialog.confirm({
            cancelText: t('keepActive'),
            confirmText: t('endNow'),
            content: t('endConfirm', { name: item.displayName }),
        });
        if (!confirmed || !isMountedRef.current || actionInFlightRef.current) return;

        actionInFlightRef.current = true;
        setIsWorking(true);
        try {
            await onDeactivate(item.projectId);
        } finally {
            actionInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsWorking(false);
            }
        }
    };

    const handleCancel = async () => {
        const confirmed = await Dialog.confirm({
            cancelText: t('keepScheduled'),
            confirmText: t('cancelAction'),
            content: t('cancelConfirm', { date: formatDate(item.startsAt, formatter), name: item.displayName }),
        });
        if (!confirmed || !isMountedRef.current || actionInFlightRef.current) return;

        actionInFlightRef.current = true;
        setIsWorking(true);
        try {
            await onCancel(item.projectId);
        } finally {
            actionInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsWorking(false);
            }
        }
    };

    return (
        <Card
            size="small"
            style={{
                backgroundColor: token.colorBgContainer,
                borderColor: item.status === 'active' ? token.colorPrimaryBorder : token.colorBorderSecondary,
                boxShadow: 'none',
            }}
        >
            <Flex gap={14} vertical>
                <Flex align="flex-start" gap={12} justify="space-between">
                    <Flex gap={10} style={{ flex: 1, minWidth: 0 }} vertical>
                        <Flex align="center" gap={8} justify="space-between" wrap="wrap">
                            <Text strong style={{ fontSize: 16 }}>{item.displayName}</Text>
                            <StatusTag status={item.status} />
                        </Flex>

                        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                            <LuCalendar color={token.colorTextTertiary} size={13} />
                            <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                                {formatScheduleRange(item.startsAt, item.endsAt, formatter)}
                            </Text>
                        </Flex>

                        <Flex align="center" gap={8} wrap="wrap">
                            <Tag style={{ marginInlineEnd: 0 }}>{modeLabel}</Tag>
                            {baseProjectName ? <Tag style={{ marginInlineEnd: 0 }}>{t('baseMenuValue', { name: baseProjectName })}</Tag> : null}
                        </Flex>

                        {item.description ? (
                            <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                                {item.description}
                            </Text>
                        ) : null}
                    </Flex>
                </Flex>

                <Flex gap={8} justify="flex-end" wrap="wrap">
                    {(item.status === 'active' || item.status === 'scheduled') ? (
                        <Button fill="outline" loading={isWorking} onClick={() => { void handleEdit(); }} size="small" style={actionButtonStyle}>
                            <Flex align="center" gap={6}>
                                <LuPencil size={14} />
                                <Text>{t('editAction')}</Text>
                            </Flex>
                        </Button>
                    ) : null}

                    {item.status === 'active' ? (
                        <Button color="danger" fill="outline" loading={isWorking} onClick={() => { void handleEnd(); }} size="small" style={actionButtonStyle}>
                            <Flex align="center" gap={6}>
                                <LuPause size={14} />
                                <Text>{t('endNow')}</Text>
                            </Flex>
                        </Button>
                    ) : null}

                    {item.status === 'scheduled' ? (
                        <Button fill="outline" loading={isWorking} onClick={() => { void handleCancel(); }} size="small" style={actionButtonStyle}>
                            <Flex align="center" gap={6}>
                                <LuX size={14} />
                                <Text>{t('cancelAction')}</Text>
                            </Flex>
                        </Button>
                    ) : null}
                </Flex>
            </Flex>
        </Card>
    );
}

function MobileSpecialMenuScreenContent({ onBack, onOpenMenuTab }: MobileSpecialMenuScreenProps) {
    const t = useTranslations('MobileSpecialMenu');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const {
        projectsById,
        selectProject,
        selectedProjectId,
        selectedProjectSummary,
        projectsList,
        upsertCachedProject,
    } = useMobileProjects();
    const {
        specialMenus,
        activeMenu,
        scheduledMenus,
        expiredMenus,
        isLoading,
        createSpecialMenu,
        updateSpecialMenu,
        deactivateMenu,
        cancelMenu,
    } = useSpecialMenus();
    const [showExpired, setShowExpired] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<SpecialMenuListItem | null>(null);
    const isMountedRef = useRef(true);
    const currentScopeRef = useRef<ProjectExpectedScope | null>(null);
    currentScopeRef.current = resolveStoreProjectScope(storeDetails);
    const isExpectedScope = useCallback((expectedScope: ProjectExpectedScope) => (
        isMountedRef.current
        && currentScopeRef.current?.tId === expectedScope.tId
        && currentScopeRef.current?.sId === expectedScope.sId
    ), []);

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const capabilities = useMemo(
        () => getSpecialMenuCapabilities(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory]
    );

    const baseProjectOptions = useMemo(
        () => (projectsList || [])
            .filter((project: any) => project.active !== false && project.isSpecialMenu !== true)
            .map((project: any) => ({
                label: project.isDefault
                    ? `${resolveProjectName(project.name, t('untitledProject'))} (${t('defaultMenuSuffix')})`
                    : resolveProjectName(project.name, t('untitledProject')),
                value: project.projectId,
            })),
        [projectsList, t]
    );

    const defaultBaseProjectId = useMemo(() => {
        const currentSelectedIsBase = baseProjectOptions.some((project) => project.value === selectedProjectId);
        if (currentSelectedIsBase && selectedProjectId) {
            return selectedProjectId;
        }

        const defaultProject = (projectsList || []).find((project: any) => project.active !== false && project.isDefault && project.isSpecialMenu !== true);
        return defaultProject?.projectId || baseProjectOptions[0]?.value || '';
    }, [baseProjectOptions, projectsList, selectedProjectId]);

    const projectNameById = useMemo(
        () => Object.fromEntries((projectsList || []).map((project: any) => [project.projectId, resolveProjectName(project.name, t('untitledProject'))])),
        [projectsList, t]
    );

    const getConflictMessage = useCallback((payload: SpecialMenuConflictCheckParams) => {
        const conflict = getScheduleConflict(specialMenus, payload);
        if (!conflict) return null;

        return `Schedule conflicts with "${conflict.displayName}" (${conflict.startsAt} — ${conflict.endsAt})`;
    }, [specialMenus]);

    const resolveOverlap = useCallback(async (payload: SpecialMenuConflictCheckParams) => {
        const conflictMessage = getConflictMessage(payload);
        if (!conflictMessage) return null;

        await Dialog.alert({
            confirmText: 'Back',
            content: `${conflictMessage}. Adjust the dates so only one special menu can be active.`,
        });
        return false;
    }, [getConflictMessage]);

    const handleOpenSpecialProject = async (
        projectId: string,
        expectedScope: ProjectExpectedScope,
    ) => {
        if (!isExpectedScope(expectedScope)) return;
        await selectProject(projectId);
        if (isExpectedScope(expectedScope)) {
            onOpenMenuTab?.();
        }
    };

    const resolveProjectDetails = useCallback(async (projectId: string) => {
        if (!projectId) return null;
        const expectedScope = currentScopeRef.current;
        const projectScope = normalizeMultiOutletProjectId(projectId);
        if (
            !expectedScope
            || !projectScope
            || projectScope.tId !== expectedScope.tId
            || projectScope.sId !== expectedScope.sId
        ) {
            return null;
        }
        if (projectsById[projectId]) {
            return projectsById[projectId];
        }

        const summaryProject = (projectsList || []).find((project: any) => project.projectId === projectId) || null;
        const detailedProject = await getProjectDataWithoutLoader(projectId, expectedScope);
        if (!isExpectedScope(expectedScope)) return null;
        upsertCachedProject({
            ...(summaryProject || {}),
            ...(detailedProject || {}),
            projectId,
        });
        return detailedProject;
    }, [isExpectedScope, projectsById, projectsList, upsertCachedProject]);

    const handleCreateSpecialMenu = async (payload: {
        baseProjectId: string;
        displayName: string;
        localizedDisplayName?: Record<string, string>;
        endsAt: string;
        mode: 'replace' | 'overlay';
        startsAt: string;
    }) => {
        const expectedScope = currentScopeRef.current;
        if (!expectedScope || !isExpectedScope(expectedScope)) return;
        const result = await createSpecialMenu(payload);
        if (!isExpectedScope(expectedScope)) return;

        if (!result.success || !result.projectId) {
            Toast.show({ content: t('failedToCreate'), duration: 2200 });
            return;
        }

        setIsCreateOpen(false);
        Toast.show({ content: t('specialMenuCreated'), icon: 'success', duration: 1600 });
        await handleOpenSpecialProject(result.projectId, expectedScope);
    };

    const handleOpenEditSheet = (item: SpecialMenuListItem) => {
        setEditingMenu(item);
    };

    const handleUpdateSpecialMenu = async (payload: {
        projectId: string;
        description?: string;
        displayName: string;
        localizedDescription?: Record<string, string>;
        localizedDisplayName?: Record<string, string>;
        endsAt: string;
        startsAt: string;
    }) => {
        const expectedScope = currentScopeRef.current;
        if (!expectedScope || !isExpectedScope(expectedScope)) return;
        const result = await updateSpecialMenu(payload);
        if (!isExpectedScope(expectedScope)) return;

        if (!result.success) {
            Toast.show({ content: tProjectSelector('saveFailed'), duration: 2200 });
            return;
        }

        setEditingMenu(null);
        Toast.show({ content: tProjectSelector('catalogUpdated'), icon: 'success', duration: 1600 });
    };

    const handleDeactivate = async (projectId: string) => {
        const expectedScope = currentScopeRef.current;
        if (!expectedScope || !isExpectedScope(expectedScope)) return;
        const result = await deactivateMenu(projectId);
        if (!isExpectedScope(expectedScope)) return;
        if (result.success) {
            Toast.show({ content: t('specialMenuEnded'), icon: 'success', duration: 1500 });
            return;
        }
        Toast.show({ content: t('failedToEnd'), duration: 2000 });
    };

    const handleCancel = async (projectId: string) => {
        const expectedScope = currentScopeRef.current;
        if (!expectedScope || !isExpectedScope(expectedScope)) return;
        const result = await cancelMenu(projectId);
        if (!isExpectedScope(expectedScope)) return;
        if (result.success) {
            Toast.show({ content: t('specialMenuCancelled'), icon: 'success', duration: 1500 });
            return;
        }
        Toast.show({ content: t('failedToCancel'), duration: 2000 });
    };

    const activeOrScheduled = [...(activeMenu ? [activeMenu] : []), ...scheduledMenus];
    const hasAny = specialMenus.length > 0;
    const selectedBaseProjectName = selectedProjectSummary?.isSpecialMenu !== true
        ? resolveProjectName(selectedProjectSummary?.name, t('untitledProject'))
        : projectNameById[defaultBaseProjectId];

    return (
        <Flex style={{ height: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                {selectedBaseProjectName ? (
                    <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Text type="secondary">{t('currentBaseMenu', { name: selectedBaseProjectName })}</Text>
                    </Card>
                ) : null}

                {isLoading ? (
                    <Card>
                        <Flex align="center" gap={12} justify="center" vertical>
                            <DotLoading />
                            <Text type="secondary">{t('loading')}</Text>
                        </Flex>
                    </Card>
                ) : null}

                {!isLoading && !hasAny ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <Empty
                                description={t('noSpecialMenus')}
                                image={(
                                    <ContextualStateIllustration
                                        color={token.colorPrimary}
                                        size={88}
                                        treatment="softHalo"
                                        variant="scheduleContext"
                                    />
                                )}
                                imageStyle={{ height: 88 }}
                            />
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                {t('createFirstHelp')}
                            </Text>
                        </Flex>
                    </Card>
                ) : null}

                {activeOrScheduled.map((item) => (
                    <SpecialMenuItem
                        baseProjectName={item.baseProjectId ? projectNameById[item.baseProjectId] : undefined}
                        item={item}
                        key={item.projectId}
                        onCancel={handleCancel}
                        onDeactivate={handleDeactivate}
                        onEdit={handleOpenEditSheet}
                    />
                ))}

                {expiredMenus.length > 0 ? (
                    <Button fill="none" onClick={() => setShowExpired(!showExpired)} size="small">
                        {showExpired ? t('hidePastMenus') : t('showPastMenus', { count: expiredMenus.length })}
                    </Button>
                ) : null}

                {showExpired ? expiredMenus.slice(0, 5).map((item) => (
                    <SpecialMenuItem
                        baseProjectName={item.baseProjectId ? projectNameById[item.baseProjectId] : undefined}
                        item={item}
                        key={item.projectId}
                        onCancel={handleCancel}
                        onDeactivate={handleDeactivate}
                        onEdit={handleOpenEditSheet}
                    />
                )) : null}

                <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                    <Flex align="flex-start" gap={10}>
                        <LuMonitor color={token.colorTextTertiary} size={18} />
                        <Text type="secondary">{t('editInMenuTab')}</Text>
                    </Flex>
                </Card>
            </Flex>

            <Flex
                style={{
                    backdropFilter: 'blur(10px)',
                    backgroundColor: token.colorBgContainer,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    padding: '12px 16px',
                }}
            >
                <Button
                    block
                    color="primary"
                    disabled={!baseProjectOptions.length}
                    onClick={() => setIsCreateOpen(true)}
                    size="large"
                >
                    <Flex align="center" gap={8} justify="center">
                        <LuPlus size={16} />
                        <Text>{t('createTitle')}</Text>
                    </Flex>
                </Button>
            </Flex>

            <CreateSpecialMenuSheet
                baseProjectOptions={baseProjectOptions}
                defaultBaseProjectId={defaultBaseProjectId}
                onClose={() => setIsCreateOpen(false)}
                onResolveOverlap={resolveOverlap}
                resolveProjectDetails={resolveProjectDetails}
                onSubmit={handleCreateSpecialMenu}
                open={isCreateOpen}
            />

            <EditSpecialMenuSheet
                item={editingMenu}
                onClose={() => setEditingMenu(null)}
                onResolveOverlap={resolveOverlap}
                resolveProjectDetails={resolveProjectDetails}
                onSubmit={handleUpdateSpecialMenu}
                open={Boolean(editingMenu)}
            />
        </Flex>
    );
}

export default function MobileSpecialMenuScreen(props: MobileSpecialMenuScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}`;

    return <MobileSpecialMenuScreenContent key={scopeKey} {...props} />;
}

function MobileProjectReferenceCard({
    onUseReference,
    referenceLabel,
    referenceValue,
    token,
}: {
    onUseReference: () => void;
    referenceLabel: string;
    referenceValue: string;
    token: any;
}) {
    return (
        <Card
            style={{
                background: token.colorFillAlter,
                borderColor: token.colorBorderSecondary,
            }}
        >
            <Flex align="center" gap={12} justify="space-between" style={{ padding: 12 }}>
                <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                    <Text type="secondary">{`${referenceLabel} reference`}</Text>
                    <Text>{referenceValue || 'No content yet in the primary language.'}</Text>
                </Flex>
                {referenceValue ? (
                    <Button fill="outline" onClick={onUseReference} size="small">
                        Use reference
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}
