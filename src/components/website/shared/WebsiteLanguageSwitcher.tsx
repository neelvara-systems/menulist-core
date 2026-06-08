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
import { useEffect, useRef, useState } from 'react';
import { LuChevronDown, LuGlobe } from 'react-icons/lu';

interface WebsiteLanguageSwitcherProps {
    surface?: 'default' | 'footer';
}

export default function WebsiteLanguageSwitcher({ surface = 'default' }: WebsiteLanguageSwitcherProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('Website');
    const [open, setOpen] = useState(false);
    const [openUp, setOpenUp] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

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

        const pathParts = pathname.split('/').filter(Boolean);
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

        return queryString ? `${nextPath}?${queryString}` : nextPath;
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
            >
                <LuGlobe size={14} />
                <span>{currentLang.nativeName}</span>
                <LuChevronDown size={12} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>

            {open && (
                <div
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
