'use client';

import { WEBSITE_LANGUAGES } from '@/config/websiteLanguages';
import { setUserLocale } from '@lib/localization';
import { Locale } from '@lib/localization/config';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LuChevronDown, LuGlobe } from 'react-icons/lu';

interface WebsiteLanguageSwitcherProps {
    surface?: 'default' | 'footer';
}

export default function WebsiteLanguageSwitcher({ surface = 'default' }: WebsiteLanguageSwitcherProps) {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('Website');
    const [open, setOpen] = useState(false);
    const [openUp, setOpenUp] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const currentLang = WEBSITE_LANGUAGES.find(l => l.code === locale) || WEBSITE_LANGUAGES[0];
    const isFooter = surface === 'footer';

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

    const handleSelect = async (code: string) => {
        setOpen(false);
        await setUserLocale(code as Locale);
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
                    background: isFooter ? 'rgba(15, 23, 42, 0.62)' : 'none',
                    border: isFooter ? '1px solid rgba(148, 163, 184, 0.28)' : '1px solid var(--ws-border-default)',
                    borderRadius: 'var(--ws-radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: isFooter ? 700 : 500,
                    color: isFooter ? '#cbd5e1' : 'var(--ws-text-secondary)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.borderColor = isFooter ? '#60a5fa' : 'var(--ws-brand-secondary)';
                    e.currentTarget.style.color = isFooter ? '#ffffff' : 'var(--ws-text-primary)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isFooter ? 'rgba(148, 163, 184, 0.28)' : 'var(--ws-border-default)';
                    e.currentTarget.style.color = isFooter ? '#cbd5e1' : 'var(--ws-text-secondary)';
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
                            ? { bottom: 'calc(100% + 4px)' }
                            : { top: 'calc(100% + 4px)' }
                        ),
                        right: 0,
                        minWidth: '180px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        backgroundColor: isFooter ? '#111827' : 'var(--ws-bg-elevated)',
                        border: isFooter ? '1px solid rgba(148, 163, 184, 0.28)' : '1px solid var(--ws-border-default)',
                        borderRadius: 'var(--ws-radius-lg)',
                        boxShadow: 'var(--ws-shadow-lg)',
                        zIndex: 100,
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
                                    width: '100%',
                                    padding: '8px 14px',
                                    background: isActive ? (isFooter ? 'rgba(96, 165, 250, 0.16)' : 'var(--ws-bg-accent)') : 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? (isFooter ? '#bfdbfe' : 'var(--ws-brand-secondary)') : (isFooter ? '#e2e8f0' : 'var(--ws-text-primary)'),
                                    textAlign: 'left',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.background = isFooter ? 'rgba(148, 163, 184, 0.14)' : 'var(--ws-bg-subtle)';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.background = 'none';
                                }}
                            >
                                <span>{lang.nativeName}</span>
                                <span style={{ fontSize: '0.75rem', color: isFooter ? '#94a3b8' : 'var(--ws-text-muted)', fontWeight: 400 }}>
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
