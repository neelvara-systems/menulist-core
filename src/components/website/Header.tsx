"use client";

import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LuArrowRight,
  LuBadgeCheck,
  LuBookOpen,
  LuBot,
  LuChevronDown,
  LuFileText,
  LuLayoutGrid,
  LuLogOut,
  LuMapPin,
  LuMenu,
  LuQrCode,
  LuSearch,
  LuUser,
  LuX,
  LuZap,
} from "react-icons/lu";
import BrandWordmark from "./shared/BrandWordmark";
import { FEATURE_FLAGS } from "@config/features";
import { buildWebsiteSignInPath } from "@/lib/website/signInLinks";
import { websiteFeatureNavGroups } from "./features/featureNavigation";

const navItemKeys = [
  { href: "/features", key: "features", icon: LuLayoutGrid },
  { href: "/ai-menu-manager", key: "aiMenuManager", icon: LuBot },
  { href: "/how-it-works", key: "howItWorks", icon: LuZap },
  { href: "/multi-location", key: "multiLocation", icon: LuMapPin },
  { href: "/pricing", key: "pricing", icon: LuFileText },
  ...(FEATURE_FLAGS.ENABLE_WEBSITE_RESOURCES
    ? [{ href: "/resources", key: "resources", icon: LuBookOpen }]
    : []),
];

const resourceDropdownLinks = [
  { href: "/resources/menu-engineering", key: "resourceMenuEngineering", icon: LuBookOpen },
  { href: "/resources/qr-menu-for-restaurants", key: "resourceQrMenuGuide", icon: LuQrCode },
  { href: "/resources/digital-menu-vs-pdf-menu", key: "resourceDigitalVsPdf", icon: LuFileText },
  { href: "/resources/google-business-profile-menu", key: "resourceGoogleMenuGuide", icon: LuMapPin },
  { href: "/resources/restaurant-menu-seo", key: "resourceRestaurantMenuSeo", icon: LuSearch },
  { href: "/resources/ai-search-menu-discovery", key: "resourceAiSearchDiscovery", icon: LuBot },
  { href: "/resources/official-menu-source", key: "resourceOfficialMenuSource", icon: LuBadgeCheck },
  { href: "/resources", key: "resourceAllResources", icon: LuLayoutGrid },
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

  const isResourcesPath = Boolean(
    pathname?.startsWith("/resources")
    || /^\/[a-z]{2}-[A-Z]{2}\/resources/.test(pathname || ""),
  );

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
          backgroundColor: "var(--ws-bg-primary)",
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
            {navItemKeys.map((item) => {
              const isFeaturesPath = Boolean(pathname?.startsWith("/features"));
              const isActive = pathname === item.href
                || (item.href === "/features" && isFeaturesPath)
                || (item.href === "/resources" && isResourcesPath);
              if (item.key === "features") {
                return (
                  <div key={item.href} className="ws-header-feature-menu">
                    <button
                      type="button"
                      className="ws-header-feature-menu__trigger"
                      aria-label={t("Header.featuresMenuAria")}
                      aria-haspopup="true"
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 500,
                        color: isFeaturesPath
                          ? "var(--ws-text-primary)"
                          : "var(--ws-text-secondary)",
                        textDecoration: "none",
                        transition: "color var(--ws-transition-fast)",
                      }}
                    >
                      {t("Header.features")}
                      <LuChevronDown size={14} aria-hidden="true" />
                    </button>
                    <div className="ws-header-feature-menu__panel" role="menu" aria-label={t("Header.featuresMenuTitle")}>
                      <Link href="/features" role="menuitem" className="ws-header-feature-menu__overview">
                        <span>
                          <LuLayoutGrid size={18} aria-hidden="true" />
                        </span>
                        <div className="ws-header-feature-menu__overview-text">
                          <strong>{t("Header.featureOverviewTitle")}</strong>
                          <small>{t("Header.featureOverviewDesc")}</small>
                        </div>
                        <LuArrowRight size={18} aria-hidden="true" />
                      </Link>
                      <div className="ws-header-feature-menu__grid">
                        {websiteFeatureNavGroups.map((group) => (
                          <section key={group.key} className="ws-header-feature-menu__group" aria-label={t(`Header.${group.key}`)}>
                            <p>{t(`Header.${group.key}`)}</p>
                            <div>
                              {group.links.map((featureLink) => {
                                const FeatureIcon = featureLink.icon;
                                return (
                                  <Link
                                    key={featureLink.href}
                                    href={featureLink.href}
                                    role="menuitem"
                                    className="ws-header-feature-menu__item"
                                  >
                                    <FeatureIcon size={17} aria-hidden="true" />
                                    <span>
                                      <strong>{t(`Header.${featureLink.key}`)}</strong>
                                      <small>{t(`Header.${featureLink.key}Desc`)}</small>
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>

                      <aside className="ws-header-feature-menu__proof" aria-label={t("Header.featureProofTitle")}>
                        <span>
                          <LuBadgeCheck size={18} aria-hidden="true" />
                        </span>
                        <div className="ws-header-feature-menu__proof-copy">
                          <strong>{t("Header.featureProofTitle")}</strong>
                          <small>{t("Header.featureProofDesc")}</small>
                        </div>
                        <Link href="/create-menu">
                          {t("Header.featureProofCta")}
                          <LuArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </aside>
                    </div>
                  </div>
                );
              }

              if (item.key === "resources") {
                return (
                  <div key={item.href} className="ws-header-resource-menu">
                    <Link
                      href="/resources"
                      className="ws-header-resource-menu__trigger"
                      aria-label={t("Header.resourcesMenuAria")}
                      aria-haspopup="true"
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 500,
                        color: isResourcesPath
                          ? "var(--ws-text-primary)"
                          : "var(--ws-text-secondary)",
                        textDecoration: "none",
                        transition: "color var(--ws-transition-fast)",
                      }}
                    >
                      {t("Header.resources")}
                      <LuChevronDown size={14} aria-hidden="true" />
                    </Link>
                    <div className="ws-header-resource-menu__panel" role="menu" aria-label={t("Header.resourcesMenuTitle")}>
                      {resourceDropdownLinks.map((resourceLink) => {
                        const ResourceIcon = resourceLink.icon;
                        return (
                          <Link
                            key={resourceLink.href}
                            href={resourceLink.href}
                            role="menuitem"
                            className="ws-header-resource-menu__item"
                          >
                            <ResourceIcon size={16} aria-hidden="true" />
                            <span>{t(`Header.${resourceLink.key}`)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color:
                      isActive
                        ? "var(--ws-text-primary)"
                        : "var(--ws-text-secondary)",
                    textDecoration: "none",
                    transition: "color var(--ws-transition-fast)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--ws-text-primary)")
                  }
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.color = "var(--ws-text-secondary)";
                  }}
                >
                  {t(`Header.${item.key}`)}
                </Link>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--ws-space-3)",
            }}
            className="ws-desktop-nav"
          >
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
                <Link
                  href={buildWebsiteSignInPath('/dashboard')}
                  aria-label={t("Header.login")}
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
                </Link>
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
                  color: "var(--ws-text-muted)",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--ws-bg-subtle)")
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
                const isFeaturesPath = Boolean(pathname?.startsWith("/features"));
                const isActive = pathname === item.href
                  || (item.href === "/features" && isFeaturesPath)
                  || (item.href === "/resources" && isResourcesPath);
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeDrawer}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px 12px",
                        fontSize: "0.9375rem",
                        fontWeight: isActive ? 600 : 500,
                        color: isActive
                          ? "var(--ws-brand-secondary)"
                          : "var(--ws-text-primary)",
                        textDecoration: "none",
                        borderRadius: "10px",
                        backgroundColor: isActive ? "var(--ws-bg-accent)" : "transparent",
                        transition: "background-color 0.15s",
                        marginBottom: "2px",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          e.currentTarget.style.backgroundColor = "var(--ws-bg-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Icon
                        size={18}
                        color={
                          isActive
                            ? "var(--ws-brand-secondary)"
                            : "var(--ws-text-muted)"
                        }
                      />
                      {t(`Header.${item.key}`)}
                    </Link>
                    {item.key === "features" && (
                      <div className="ws-mobile-feature-links" aria-label={t("Header.featuresMenuTitle")}>
                        {websiteFeatureNavGroups.map((group) => (
                          <div key={group.key} className="ws-mobile-feature-links__group">
                            <p>{t(`Header.${group.key}`)}</p>
                            {group.links.map((featureLink) => {
                              const FeatureIcon = featureLink.icon;
                              return (
                                <Link
                                  key={featureLink.href}
                                  href={featureLink.href}
                                  onClick={closeDrawer}
                                  className="ws-mobile-feature-link"
                                >
                                  <FeatureIcon size={15} aria-hidden="true" />
                                  {t(`Header.${featureLink.key}`)}
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.key === "resources" && (
                      <div className="ws-mobile-resource-links" aria-label={t("Header.resourcesMenuTitle")}>
                        {resourceDropdownLinks.map((resourceLink) => {
                          const ResourceIcon = resourceLink.icon;
                          return (
                            <Link
                              key={resourceLink.href}
                              href={resourceLink.href}
                              onClick={closeDrawer}
                              className="ws-mobile-resource-link"
                            >
                              <ResourceIcon size={15} aria-hidden="true" />
                              {t(`Header.${resourceLink.key}`)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div
                style={{
                  height: "1px",
                  backgroundColor: "var(--ws-border-subtle)",
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
                      color: "var(--ws-brand-secondary)",
                      textDecoration: "none",
                      borderRadius: "10px",
                      backgroundColor: "var(--ws-bg-accent)",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <LuUser size={18} color="var(--ws-brand-secondary)" />
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
                      color: "var(--ws-error)",
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
                      (e.currentTarget.style.backgroundColor = "var(--ws-bg-danger-soft)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <LuLogOut size={18} color="var(--ws-error)" />
                    {t("Header.logout")}
                  </button>
                </>
              ) : (
                <Link
                  href={buildWebsiteSignInPath('/dashboard')}
                  onClick={closeDrawer}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 12px",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: "var(--ws-text-secondary)",
                    textDecoration: "none",
                    borderRadius: "10px",
                    width: "100%",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--ws-bg-subtle)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <LuArrowRight size={18} color="var(--ws-text-muted)" />
                  {t("Header.login")}
                </Link>
              )}
            </nav>

            {/* CTA */}
            <div style={{ padding: "1rem 1.25rem 1.5rem", flexShrink: 0 }}>
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
