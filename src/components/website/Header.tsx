"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LuArrowRight,
  LuEye,
  LuFileText,
  LuLayoutGrid,
  LuLogOut,
  LuMapPin,
  LuMenu,
  LuUser,
  LuX,
  LuZap,
} from "react-icons/lu";
import BrandWordmark from "./shared/BrandWordmark";
import WebsiteLanguageSwitcher from "./shared/WebsiteLanguageSwitcher";

const navItemKeys = [
  { href: "/how-it-works", key: "howItWorks", icon: LuZap },
  { href: "/#customer-demo", key: "demo", icon: LuEye },
  { href: "/features", key: "features", icon: LuLayoutGrid },
  { href: "/pricing", key: "pricing", icon: LuFileText },
  { href: "/multi-location", key: "multiLocation", icon: LuMapPin },
];

export default function Header() {
  const t = useTranslations("Website");
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const openDrawer = () => setIsOpen(true);
  const handleMenuTouch = () => openDrawer();

  const closeDrawer = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header
        className="ws-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--ws-border-default)",
        }}
      >
        <nav
          className="ws-container ws-header__nav"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "4rem",
            padding: "0 var(--ws-space-6)",
          }}
        >
          <Link
            href="/"
            className="ws-header__brand"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--ws-space-2)",
              textDecoration: "none",
              color: "var(--ws-text-primary)",
            }}
          >
            <BrandWordmark
              className="ws-brand-wordmark"
              iconHeight={28}
              textClassName="ws-brand-wordmark__text"
            />
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--ws-space-8)",
            }}
            className="ws-desktop-nav"
          >
            {navItemKeys.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color:
                    pathname === item.href
                      ? "var(--ws-text-primary)"
                      : "var(--ws-text-secondary)",
                  textDecoration: "none",
                  transition: "color var(--ws-transition-fast)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--ws-text-primary)")
                }
                onMouseLeave={(e) => {
                  if (pathname !== item.href)
                    e.currentTarget.style.color = "var(--ws-text-secondary)";
                }}
              >
                {t(`Header.${item.key}`)}
              </Link>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--ws-space-3)",
            }}
            className="ws-desktop-nav"
          >
            <WebsiteLanguageSwitcher />
            {status === "authenticated" && session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="ws-btn ws-btn--secondary"
                  style={{
                    padding: "0.625rem 1.25rem",
                    fontSize: "0.9375rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--ws-space-2)",
                  }}
                >
                  <LuUser size={16} />
                  {session.user.name ||
                    session.user.email ||
                    t("Header.dashboard")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="ws-btn ws-btn--secondary"
                  style={{
                    padding: "0.625rem 1.25rem",
                    fontSize: "0.9375rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--ws-space-2)",
                    background: "transparent",
                    border: "1px solid var(--ws-border-default)",
                    cursor: "pointer",
                  }}
                >
                  <LuLogOut size={16} />
                  {t("Header.logout")}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label={t("Header.login")}
                  onClick={() =>
                    signIn("google", { callbackUrl: "/dashboard" })
                  }
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: "var(--ws-text-secondary)",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    textDecoration: "none",
                    padding: "0.5rem 0.75rem",
                    transition: "color var(--ws-transition-fast)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--ws-text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--ws-text-secondary)")
                  }
                >
                  {t("Header.login")}
                </button>
                <Link
                  href="/create-menu"
                  aria-label={t("Header.ctaAria")}
                  className="ws-btn ws-btn--primary"
                  style={{ padding: "0.625rem 1.25rem", fontSize: "0.9375rem" }}
                >
                  {t("Header.cta")}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={openDrawer}
            onTouchStart={handleMenuTouch}
            className="ws-mobile-nav-toggle"
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "var(--ws-space-2)",
              color: "var(--ws-text-primary)",
              touchAction: "manipulation",
            }}
            aria-label={t("Header.openMenu")}
            aria-expanded={isOpen}
          >
            <LuMenu size={24} />
          </button>
        </nav>
      </header>

      {isOpen && (
        <>
          <div
            onClick={closeDrawer}
            className="ws-drawer-backdrop ws-drawer-backdrop--open"
            aria-hidden="true"
          />
          <div className="ws-drawer-panel ws-drawer-panel--open">
            {/* Close button row */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "1rem 1rem 0.5rem",
              }}
            >
              <button
                onClick={closeDrawer}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  color: "#94a3b8",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f1f5f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
                aria-label={t("Header.closeMenu")}
              >
                <LuX size={20} />
              </button>
            </div>

            {/* Nav links */}
            <nav
              style={{ flex: 1, padding: "0.25rem 0.75rem", overflowY: "auto" }}
            >
              {navItemKeys.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeDrawer}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 12px",
                      fontSize: "0.9375rem",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#2563eb" : "#0f172a",
                      textDecoration: "none",
                      borderRadius: "10px",
                      backgroundColor: isActive ? "#eff6ff" : "transparent",
                      transition: "background-color 0.15s",
                      marginBottom: "2px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Icon size={18} color={isActive ? "#2563eb" : "#94a3b8"} />
                    {t(`Header.${item.key}`)}
                  </Link>
                );
              })}

              <div
                style={{
                  height: "1px",
                  backgroundColor: "#f1f5f9",
                  margin: "8px 12px",
                }}
              />

              {status === "authenticated" && session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={closeDrawer}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 12px",
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      color: "#2563eb",
                      textDecoration: "none",
                      borderRadius: "10px",
                      backgroundColor: "#eff6ff",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <LuUser size={18} color="#2563eb" />
                    {session.user.name ||
                      session.user.email ||
                      t("Header.dashboard")}
                  </Link>
                  <button
                    onClick={() => {
                      closeDrawer();
                      signOut({ callbackUrl: "/" });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 12px",
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      color: "#dc2626",
                      textDecoration: "none",
                      borderRadius: "10px",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "left",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#fef2f2")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <LuLogOut size={18} color="#dc2626" />
                    {t("Header.logout")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    signIn("google", { callbackUrl: "/dashboard" });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 12px",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: "#64748b",
                    textDecoration: "none",
                    borderRadius: "10px",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <LuArrowRight size={18} color="#94a3b8" />
                  {t("Header.login")}
                </button>
              )}
            </nav>

            {/* CTA */}
            <div style={{ padding: "1rem 1.25rem 1.5rem", flexShrink: 0 }}>
              <div
                style={{
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <WebsiteLanguageSwitcher />
              </div>
              {status !== "authenticated" && (
                <Link
                  href="/create-menu"
                  aria-label={t("Header.ctaAria")}
                  onClick={closeDrawer}
                  className="ws-btn ws-btn--primary"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    fontSize: "0.9375rem",
                    padding: "0.875rem",
                    borderRadius: "10px",
                  }}
                >
                  {t("Header.cta")}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
