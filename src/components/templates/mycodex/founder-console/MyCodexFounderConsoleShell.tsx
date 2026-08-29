'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
    LuBookOpen,
    LuBoxes,
    LuHome,
    LuLogOut,
    LuMenu,
    LuMoon,
    LuSettings,
    LuShieldCheck,
    LuSun,
    LuX,
} from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { projectPersistedThemeBoolean } from '@lib/antd/themeBoundary';
import { MYCODEX_FOUNDER_CONSOLE_BASE_PATH } from '@lib/mycodex/founderConsoleCatalog';
import { getDarkModeState, toggleDarkMode } from '@reduxSlices/clientThemeConfig';

interface MyCodexFounderConsoleShellProps {
    children: ReactNode;
}

const NAV_ITEMS = [
    { href: MYCODEX_FOUNDER_CONSOLE_BASE_PATH, icon: LuHome, label: 'Today', exact: true },
    { href: `${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/products`, icon: LuBoxes, label: 'Products' },
    { href: `${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/systems`, icon: LuShieldCheck, label: 'Systems' },
    { href: '/__mycodex', icon: LuBookOpen, label: 'Documents' },
    { href: `${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/settings`, icon: LuSettings, label: 'Settings' },
] as const;

export default function MyCodexFounderConsoleShell({ children }: MyCodexFounderConsoleShellProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const dispatch = useAppDispatch();
    const isDarkMode = projectPersistedThemeBoolean(useAppSelector(getDarkModeState));
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => setMenuOpen(false), [pathname]);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const toggleTheme = () => dispatch(toggleDarkMode(!isDarkMode));
    const themeActionLabel = isDarkMode ? 'Use light mode' : 'Use dark mode';
    const ThemeIcon = isDarkMode ? LuSun : LuMoon;

    const isActive = (item: typeof NAV_ITEMS[number]) => {
        if ('exact' in item && item.exact) return pathname === item.href;
        if (item.href === '/__mycodex') {
            return !pathname.startsWith(MYCODEX_FOUNDER_CONSOLE_BASE_PATH)
                && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        }
        return pathname === item.href || pathname.startsWith(`${item.href}/`);
    };

    const navigation = (
        <nav aria-label="Founder console" className="mycodex-founder-nav">
            {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                    <Link
                        aria-current={isActive(item) ? 'page' : undefined}
                        className={`mycodex-founder-nav-link${isActive(item) ? ' is-active' : ''}`}
                        href={item.href}
                        key={item.label}
                    >
                        <Icon aria-hidden="true" size={19} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <div className="mycodex-founder-shell">
            <aside className="mycodex-founder-sidebar">
                <Link className="mycodex-founder-brand" href={MYCODEX_FOUNDER_CONSOLE_BASE_PATH}>
                    <span className="mycodex-founder-brand-mark">MC</span>
                    <span>
                        <strong>MyCodex</strong>
                        <small>Founder Console</small>
                    </span>
                </Link>
                {navigation}
                <button
                    aria-label={themeActionLabel}
                    className="mycodex-founder-theme-toggle"
                    onClick={toggleTheme}
                    type="button"
                >
                    <ThemeIcon aria-hidden="true" size={19} />
                    <span>{themeActionLabel}</span>
                </button>
                <div className="mycodex-founder-profile">
                    <span className="mycodex-founder-avatar">{session?.user?.name?.slice(0, 1) || 'N'}</span>
                    <span>
                        <strong title={session?.user?.name || undefined}>Platform owner</strong>
                        <small>{session?.user?.email || 'Private session'}</small>
                    </span>
                </div>
            </aside>

            <header className="mycodex-founder-mobile-header">
                <button aria-label="Open navigation" onClick={() => setMenuOpen(true)} type="button">
                    <LuMenu size={22} />
                </button>
                <Link href={MYCODEX_FOUNDER_CONSOLE_BASE_PATH}>MyCodex</Link>
                <button aria-label={themeActionLabel} onClick={toggleTheme} type="button">
                    <ThemeIcon aria-hidden="true" size={20} />
                </button>
            </header>

            {menuOpen ? (
                <div className="mycodex-founder-mobile-drawer" role="dialog" aria-modal="true" aria-label="Founder console navigation">
                    <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} type="button">
                        <LuX size={22} />
                    </button>
                    {navigation}
                    <button
                        className="mycodex-founder-signout"
                        onClick={() => void signOut({ callbackUrl: '/signin' })}
                        type="button"
                    >
                        <LuLogOut size={18} /> Sign out
                    </button>
                </div>
            ) : null}

            <main className="mycodex-founder-main">{children}</main>

            <nav aria-label="Founder console mobile shortcuts" className="mycodex-founder-bottom-nav">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            aria-current={isActive(item) ? 'page' : undefined}
                            className={isActive(item) ? 'is-active' : ''}
                            href={item.href}
                            key={item.label}
                        >
                            <Icon aria-hidden="true" size={19} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
