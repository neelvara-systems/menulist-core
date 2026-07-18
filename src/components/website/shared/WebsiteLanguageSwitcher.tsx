'use client';

import { WEBSITE_LANGUAGES } from '@/config/websiteLanguages';
import {
    WEBSITE_RESOURCE_DEFAULT_LOCALE,
    WEBSITE_RESOURCE_HUB_PATH,
    buildWebsiteResourcePath,
    isReviewedWebsiteResourceLocale,
} from '@/content/websiteResources/routing';
import { setUserLocale } from '@lib/localization';
import { Locale } from '@lib/localization/config';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { LuChevronDown, LuGlobe } from 'react-icons/lu';
import {
    useWebsiteBasePath,
    withoutWebsiteBasePath,
    withWebsiteBasePath,
} from './WebsiteProductPathProvider';

interface WebsiteLanguageSwitcherProps {
    surface?: 'default' | 'footer';
}

export default function WebsiteLanguageSwitcher({ surface = 'default' }: WebsiteLanguageSwitcherProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const basePath = useWebsiteBasePath();
    const searchParams = useSearchParams();
    const t = useTranslations('Website');
    const [open, setOpen] = useState(false);
    const [openUp, setOpenUp] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const currentLang = WEBSITE_LANGUAGES.find(l => l.code === locale) || WEBSITE_LANGUAGES[0];
    const isFooter = surface === 'footer';
    const menuMaxHeight = openUp ? 'min(360px, calc(100vh - 96px))' : '300px';

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!open) return;

        const focusFrame = window.requestAnimationFrame(() => {
            const options = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
            const selectedOption = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]');
            (selectedOption || options?.[0])?.focus();
        });
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            setOpen(false);
            btnRef.current?.focus();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

        const options = Array.from(
            menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || [],
        );
        if (options.length === 0) return;

        event.preventDefault();
        const activeIndex = options.findIndex((option) => option === document.activeElement);
        if (event.key === 'Home') {
            options[0].focus();
            return;
        }
        if (event.key === 'End') {
            options[options.length - 1].focus();
            return;
        }

        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = activeIndex < 0
            ? 0
            : (activeIndex + direction + options.length) % options.length;
        options[nextIndex].focus();
    };

    const handleToggle = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUp(spaceBelow < 320);
        }
        setOpen(!open);
    };

    const getLocalizedResourcePath = (targetLocale: string) => {
        if (!pathname) return null;

        const publicPathname = withoutWebsiteBasePath(pathname, basePath);
        const pathParts = publicPathname.split('/').filter(Boolean);
        const firstPart = pathParts[0];
        const isLocalizedResourcePath = isReviewedWebsiteResourceLocale(firstPart)
            && pathParts[1] === WEBSITE_RESOURCE_HUB_PATH.replace('/', '');
        const isDefaultResourcePath = firstPart === WEBSITE_RESOURCE_HUB_PATH.replace('/', '');

        if (!isLocalizedResourcePath && !isDefaultResourcePath) {
            return null;
        }

        const slug = isLocalizedResourcePath ? pathParts[2] : pathParts[1];
        const nextPath = targetLocale === WEBSITE_RESOURCE_DEFAULT_LOCALE
            ? buildWebsiteResourcePath(slug, WEBSITE_RESOURCE_DEFAULT_LOCALE)
            : buildWebsiteResourcePath(slug, targetLocale);
        const queryString = searchParams.toString();

        const aliasedNextPath = withWebsiteBasePath(nextPath, basePath);
        return queryString ? `${aliasedNextPath}?${queryString}` : aliasedNextPath;
    };

    const handleSelect = async (code: string) => {
        setOpen(false);
        await setUserLocale(code as Locale);
        const localizedResourcePath = getLocalizedResourcePath(code);

        if (localizedResourcePath && localizedResourcePath !== pathname) {
            router.push(localizedResourcePath);
            return;
        }

        router.refresh();
    };

    return (
        <div ref={ref} style={{ position: 'relative' }} className={isFooter ? 'ws-language-switcher--footer' : undefined}>
            <button
                type="button"
                ref={btnRef}
                onClick={handleToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: isFooter ? '0 0.75rem' : '6px 10px',
                    minHeight: isFooter ? '2.5rem' : undefined,
                    background: isFooter ? 'var(--ws-panel-contrast-raised)' : 'none',
                    border: isFooter ? '1px solid var(--ws-panel-contrast-border)' : '1px solid var(--ws-border-default)',
                    borderRadius: 'var(--ws-radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: isFooter ? 700 : 500,
                    color: isFooter ? 'var(--ws-panel-contrast-secondary)' : 'var(--ws-text-secondary)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.borderColor = isFooter ? 'var(--ws-panel-contrast-icon)' : 'var(--ws-brand-secondary)';
                    e.currentTarget.style.color = isFooter ? 'var(--ws-panel-contrast-text)' : 'var(--ws-text-primary)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isFooter ? 'var(--ws-panel-contrast-border)' : 'var(--ws-border-default)';
                    e.currentTarget.style.color = isFooter ? 'var(--ws-panel-contrast-secondary)' : 'var(--ws-text-secondary)';
                }}
                aria-label={t('LanguageSwitcher.label')}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls="website-language-menu"
            >
                <LuGlobe size={14} aria-hidden="true" />
                <span>{currentLang.nativeName}</span>
                <LuChevronDown aria-hidden="true" size={12} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>

            {open && (
                <div
                    ref={menuRef}
                    id="website-language-menu"
                    role="menu"
                    aria-label={t('LanguageSwitcher.label')}
                    onKeyDown={handleMenuKeyDown}
                    style={{
                        position: 'absolute',
                        ...(openUp
                            ? { bottom: 'calc(100% + 12px)' }
                            : { top: 'calc(100% + 4px)' }
                        ),
                        right: 0,
                        minWidth: '180px',
                        maxHeight: menuMaxHeight,
                        overflowY: 'auto',
                        backgroundColor: isFooter ? 'var(--ws-panel-contrast-raised)' : 'var(--ws-bg-elevated)',
                        border: isFooter ? '1px solid var(--ws-panel-contrast-border)' : '1px solid var(--ws-border-default)',
                        borderRadius: 'var(--ws-radius-lg)',
                        boxShadow: 'var(--ws-shadow-lg)',
                        zIndex: isFooter ? 1000 : 100,
                        padding: '4px 0',
                    }}
                >
                    {WEBSITE_LANGUAGES.map(lang => {
                        const isActive = lang.code === locale;
                        return (
                            <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={isActive}
                                key={lang.code}
                                onClick={() => handleSelect(lang.code)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1rem',
                                    width: '100%',
                                    padding: '8px 14px',
                                    background: isActive ? (isFooter ? 'var(--ws-brand-light)' : 'var(--ws-bg-accent)') : 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? (isFooter ? 'var(--ws-panel-contrast-accent)' : 'var(--ws-brand-secondary)') : (isFooter ? 'var(--ws-panel-contrast-secondary)' : 'var(--ws-text-primary)'),
                                    textAlign: 'left',
                                    transition: 'background 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.background = isFooter ? 'var(--ws-panel-contrast-soft)' : 'var(--ws-bg-subtle)';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.background = 'none';
                                }}
                            >
                                <span style={{ minWidth: 0 }}>{lang.nativeName}</span>
                                <span style={{ flexShrink: 0, fontSize: '0.75rem', color: isFooter ? 'var(--ws-panel-contrast-muted)' : 'var(--ws-text-muted)', fontWeight: 400 }}>
                                    {lang.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
