import GlobalLanguagesList from '@data/languages';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuChevronDown, LuGlobe } from 'react-icons/lu';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import { Project } from '../../types';
import { MenuMoodConfig } from '../designSystem';
import { menuFadeTransition, menuPanelMotion, menuSpringTransition } from './menuMotion';

type MenuLanguageStorageOperation = 'read' | 'write';

const reportedMenuLanguageStorageFailures = new Set<MenuLanguageStorageOperation>();

interface MenuLanguageSwitcherProps {
    projectData: Project;
    activeLanguage: string;
    setActiveLanguage: (lang: string) => void;
    moodConfig: MenuMoodConfig;
    restoreStoredLanguage?: boolean;
    compact?: boolean;
    style?: React.CSSProperties;
}

function logMenuLanguageStorageFailure(
    operation: MenuLanguageStorageOperation,
    error: unknown,
    context: {
        languageStorageKey: string | null;
        activeLanguage?: string;
        projectLanguageCount?: number;
        restoreStoredLanguage?: boolean;
    },
): void {
    if (reportedMenuLanguageStorageFailures.has(operation)) return;
    reportedMenuLanguageStorageFailures.add(operation);

    const projectLanguageCount = Number(context.projectLanguageCount || 0);
    const failureCode = operation === 'read'
        ? 'public_menu_language_storage_read_failed'
        : 'public_menu_language_storage_write_failed';

    logRuntimeFailure(failureCode, error, {
        operation,
        ...getBoundedRuntimeStringContext('languageStorageKey', context.languageStorageKey),
        ...getBoundedRuntimeStringContext('activeLanguage', context.activeLanguage),
        projectLanguageCount: Number.isFinite(projectLanguageCount) ? projectLanguageCount : 0,
        restoreStoredLanguage: Boolean(context.restoreStoredLanguage),
        hasWindow: typeof window !== 'undefined',
    });
}

function MenuLanguageSwitcher({
    projectData,
    activeLanguage,
    setActiveLanguage,
    moodConfig,
    restoreStoredLanguage = true,
    compact = false,
    style,
}: MenuLanguageSwitcherProps) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const languageDirection = getPublicCustomerLanguageDirection(activeLanguage);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [anchorPosition, setAnchorPosition] = useState({ top: 64, right: 12 });
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const didCheckStoredLanguageRef = useRef(false);
    const hasMultipleLanguages = projectData.languages?.length > 1;
    const currentLangCode = activeLanguage?.toUpperCase().slice(0, 2) || 'EN';
    const languageStorageKey = useMemo(() => {
        const projectId = projectData?.projectId || (projectData as any)?.id || (projectData as any)?.slug;
        return projectId ? `menulist_preferred_language_${projectId}` : null;
    }, [projectData?.projectId, (projectData as any)?.id, (projectData as any)?.slug]);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const updateAnchorPosition = useCallback(() => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;

        setAnchorPosition({
            top: Math.min(rect.bottom + 4, window.innerHeight - 160),
            right: Math.max(12, window.innerWidth - rect.right),
        });
    }, []);

    useEffect(() => {
        if (activeLanguage && languageStorageKey) {
            if (restoreStoredLanguage && !didCheckStoredLanguageRef.current) return;
            try {
                localStorage.setItem(languageStorageKey, activeLanguage);
            } catch (error) {
                logMenuLanguageStorageFailure('write', error, {
                    languageStorageKey,
                    activeLanguage,
                    projectLanguageCount: projectData.languages?.length || 0,
                    restoreStoredLanguage,
                });
            }
        }
    }, [activeLanguage, languageStorageKey, restoreStoredLanguage]);

    useEffect(() => {
        if (!restoreStoredLanguage || !languageStorageKey) {
            didCheckStoredLanguageRef.current = true;
            return;
        }

        try {
            const savedLang = localStorage.getItem(languageStorageKey);
            if (savedLang && projectData.languages?.includes(savedLang) && savedLang !== activeLanguage) {
                setActiveLanguage(savedLang);
            }
        } catch (error) {
            logMenuLanguageStorageFailure('read', error, {
                languageStorageKey,
                activeLanguage,
                projectLanguageCount: projectData.languages?.length || 0,
                restoreStoredLanguage,
            });
        } finally {
            didCheckStoredLanguageRef.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectData.languages, restoreStoredLanguage, languageStorageKey]);

    const toggleDropdown = () => {
        if (!showLangDropdown) {
            updateAnchorPosition();
        }
        setShowLangDropdown(!showLangDropdown);
    };

    useEffect(() => {
        if (!showLangDropdown) return;

        const handlePositionChange = () => updateAnchorPosition();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowLangDropdown(false);
        };

        window.addEventListener('resize', handlePositionChange);
        window.addEventListener('scroll', handlePositionChange, { passive: true });
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('resize', handlePositionChange);
            window.removeEventListener('scroll', handlePositionChange);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showLangDropdown, updateAnchorPosition]);

    const languageDropdown = mounted ? createPortal(
        <AnimatePresence>
            {showLangDropdown && (
                <>
                    <motion.div
                        className="fixed inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={menuFadeTransition}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10018,
                        }}
                        onClick={() => setShowLangDropdown(false)}
                    />
                    <motion.div
                        dir={languageDirection}
                        lang={activeLanguage}
                        className="py-1 rounded-lg shadow-lg"
                        initial={menuPanelMotion.initial}
                        animate={menuPanelMotion.animate}
                        exit={menuPanelMotion.exit}
                        transition={menuSpringTransition}
                        style={{
                            position: 'fixed',
                            right: anchorPosition.right,
                            top: anchorPosition.top,
                            zIndex: 10019,
                            minWidth: 148,
                            maxWidth: 'calc(100vw - 24px)',
                            padding: 4,
                            borderRadius: 10,
                            background: moodConfig.background,
                            border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.2)',
                            transformOrigin: 'top right',
                        }}
                    >
                        {projectData.languages?.map((lang: string) => {
                            const langInfo = GlobalLanguagesList.find(gl => gl.code === lang);
                            const isActive = lang === activeLanguage;
                            return (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => {
                                        setActiveLanguage(lang);
                                        setShowLangDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2.5 min-h-[44px] flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    style={{
                                        width: '100%',
                                        minHeight: 44,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 12px',
                                        border: 0,
                                        borderRadius: 8,
                                        color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                        fontWeight: isActive ? 600 : 400,
                                        background: isActive ? `${moodConfig.accentColor}10` : 'transparent',
                                        fontFamily: moodConfig.bodyFont,
                                        cursor: 'pointer',
                                        textAlign: 'start',
                                    }}
                                    dir={langInfo?.direction || 'ltr'}
                                >
                                    <span className="text-sm">{langInfo?.nativeName || lang}</span>
                                    {langInfo?.name && langInfo.name !== langInfo.nativeName && (
                                        <span className="text-xs opacity-60">({langInfo.name})</span>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    ) : null;

    if (!hasMultipleLanguages) return null;

    return (
        <div
            className="relative"
            style={{
                position: 'relative',
                flex: '0 0 auto',
                ...style,
            }}
        >
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleDropdown}
                className="flex items-center gap-1.5 rounded-lg text-sm min-h-[44px]"
                style={{
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: compact ? 0 : 6,
                    minWidth: compact ? 44 : undefined,
                    padding: compact ? '8px 9px' : '8px 12px',
                    borderRadius: 10,
                    background: moodConfig.itemStyle.background,
                    color: moodConfig.bodyColor,
                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                    fontFamily: moodConfig.bodyFont,
                    fontSize: 14,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    WebkitTapHighlightColor: 'transparent',
                }}
                aria-label={t('menu.selectLanguage')}
                aria-expanded={showLangDropdown}
            >
                {!compact && <LuGlobe size={16} />}
                <span className="font-medium">{currentLangCode}</span>
                {!compact && (
                    <LuChevronDown
                        size={14}
                        className={`transition-transform ${showLangDropdown ? 'rotate-180' : ''}`}
                    />
                )}
            </button>

            {languageDropdown}
        </div>
    );
}

export default MenuLanguageSwitcher;
