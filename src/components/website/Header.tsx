"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
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
  LuWrench,
  LuX,
  LuZap,
} from "react-icons/lu";
import BrandWordmark from "./shared/BrandWordmark";
import Link from "./shared/WebsiteLink";
import WebsiteThemeSwitcher from "./shared/WebsiteThemeSwitcher";
import { FEATURE_FLAGS } from "@config/features";
import { buildWebsiteSignInPath } from "@/lib/website/signInLinks";
import { DASHBOARD_URL } from "@constant/urls";
import { websiteFeatureNavGroups } from "./features/featureNavigation";
import {
  useWebsiteBasePath,
  withoutWebsiteBasePath,
} from "./shared/WebsiteProductPathProvider";

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
  { href: "/tools", key: "resourceToolsHub", icon: LuWrench },
  { href: "/resources/menu-engineering", key: "resourceMenuEngineering", icon: LuBookOpen },
  { href: "/resources/qr-menu-for-restaurants", key: "resourceQrMenuGuide", icon: LuQrCode },
  { href: "/resources/digital-menu-vs-pdf-menu", key: "resourceDigitalVsPdf", icon: LuFileText },
  { href: "/resources/google-business-profile-menu", key: "resourceGoogleMenuGuide", icon: LuMapPin },
  { href: "/resources/restaurant-menu-seo", key: "resourceRestaurantMenuSeo", icon: LuSearch },
  { href: "/resources/ai-search-menu-discovery", key: "resourceAiSearchDiscovery", icon: LuBot },
  { href: "/resources/official-menu-source", key: "resourceOfficialMenuSource", icon: LuBadgeCheck },
  { href: "/resources", key: "resourceAllResources", icon: LuLayoutGrid },
];

const mobileNavigationGroups = [
  {
    key: "mobileProductLabel",
    links: [
      { href: "/features", key: "featureOverviewTitle", icon: LuLayoutGrid },
      { href: "/how-it-works", key: "howItWorks", icon: LuZap },
      { href: "/multi-location", key: "multiLocation", icon: LuMapPin },
      { href: "/pricing", key: "pricing", icon: LuFileText },
    ],
  },
  {
    key: "mobileLearnLabel",
    links: resourceDropdownLinks,
  },
] as const;

export default function Header() {
  const t = useTranslations("Website");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<"features" | "resources" | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const basePath = useWebsiteBasePath();
  const publicPathname = pathname ? withoutWebsiteBasePath(pathname, basePath) : pathname;

  const openDrawer = () => setIsOpen(true);
  const handleMenuTouch = () => openDrawer();

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);
  const handleSignOut = useCallback(async () => {
    const { signOutSession } = await import("@lib/auth/client");
    await signOutSession("/");
    router.replace("/");
  }, [router]);

  const handleDesktopDropdownKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    const trigger = event.currentTarget.querySelector<HTMLElement>('[aria-controls]');
    setOpenDesktopMenu(null);
    window.requestAnimationFrame(() => trigger?.focus());
  };
  const handleDesktopMenuBlur = (
    event: ReactFocusEvent<HTMLDivElement>,
    menu: "features" | "resources",
  ) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpenDesktopMenu((current) => current === menu ? null : current);
    }
  };

  const isResourcesPath = Boolean(
    publicPathname?.startsWith("/resources")
    || /^\/[a-z]{2}-[A-Z]{2}\/resources/.test(publicPathname || ""),
  );
  const isToolsPath = Boolean(
    publicPathname === "/tools"
    || publicPathname?.startsWith("/tools/")
    || /^\/[a-z]{2}-[A-Z]{2}\/tools(\/|$)/.test(publicPathname || ""),
  );
  const isCurrentPath = (href: string) => publicPathname === href || Boolean(publicPathname?.endsWith(href));

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : mobileMenuButtonRef.current;
    const backgroundElements = Array.from(document.querySelectorAll<HTMLElement>(".ws-header, main, #site-footer"));
    backgroundElements.forEach((element) => {
      element.inert = true;
    });
    window.requestAnimationFrame(() => {
      mobileDrawerRef.current
        ?.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !mobileDrawerRef.current) {
        return;
      }

      const focusable = Array.from(
        mobileDrawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      backgroundElements.forEach((element) => {
        element.inert = false;
      });
      previousFocus?.focus();
    };
  }, [closeDrawer, isOpen]);

  return (
    <>
      <header
        className="ws-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
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
            className="ws-desktop-nav ws-desktop-nav--primary"
          >
            {navItemKeys.map((item) => {
              const isFeaturesPath = Boolean(publicPathname?.startsWith("/features"));
              const isActive = publicPathname === item.href
                || (item.href === "/features" && isFeaturesPath)
                || (item.href === "/resources" && (isResourcesPath || isToolsPath));
              if (item.key === "features") {
                return (
                  <div
                    key={item.href}
                    className="ws-header-feature-menu"
                    onKeyDown={handleDesktopDropdownKeyDown}
                    onMouseEnter={() => setOpenDesktopMenu("features")}
                    onMouseLeave={() => setOpenDesktopMenu(null)}
                    onBlurCapture={(event) => handleDesktopMenuBlur(event, "features")}
                  >
                    <button
                      type="button"
                      className="ws-header-feature-menu__trigger"
                      aria-haspopup="true"
                      aria-expanded={openDesktopMenu === "features"}
                      aria-controls="ws-desktop-features-panel"
                      onClick={(event) => {
                        if (event.detail > 0) {
                          setOpenDesktopMenu("features");
                          return;
                        }
                        setOpenDesktopMenu((current) => current === "features" ? null : "features");
                      }}
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
                    <div
                      id="ws-desktop-features-panel"
                      className="ws-header-feature-menu__panel"
                      aria-label={t("Header.featuresMenuTitle")}
                      aria-hidden={openDesktopMenu !== "features"}
                      data-open={openDesktopMenu === "features" ? "true" : "false"}
                      inert={openDesktopMenu !== "features" ? true : undefined}
                    >
                      <Link href="/features" className="ws-header-feature-menu__overview">
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
                                    className="ws-header-feature-menu__item"
                                  >
                                    <FeatureIcon className="ws-header-feature-menu__item-icon" size={17} aria-hidden="true" />
                                    <span>
                                      <strong>{t(`Header.${featureLink.key}`)}</strong>
                                      <small>{t(`Header.${featureLink.key}Desc`)}</small>
                                    </span>
                                    <span className="ws-header-feature-menu__item-action" aria-hidden="true">
                                      <LuArrowRight size={14} />
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
                  <div
                    key={item.href}
                    className="ws-header-resource-menu"
                    onKeyDown={handleDesktopDropdownKeyDown}
                    onMouseEnter={() => setOpenDesktopMenu("resources")}
                    onMouseLeave={() => setOpenDesktopMenu(null)}
                    onFocusCapture={() => setOpenDesktopMenu("resources")}
                    onBlurCapture={(event) => handleDesktopMenuBlur(event, "resources")}
                  >
                    <Link
                      href="/resources"
                      className="ws-header-resource-menu__trigger"
                      aria-haspopup="true"
                      aria-expanded={openDesktopMenu === "resources"}
                      aria-controls="ws-desktop-resources-panel"
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 500,
                        color: isResourcesPath || isToolsPath
                          ? "var(--ws-text-primary)"
                          : "var(--ws-text-secondary)",
                        textDecoration: "none",
                        transition: "color var(--ws-transition-fast)",
                      }}
                    >
                      {t("Header.resources")}
                      <LuChevronDown size={14} aria-hidden="true" />
                    </Link>
                    <div
                      id="ws-desktop-resources-panel"
                      className="ws-header-resource-menu__panel"
                      aria-label={t("Header.resourcesMenuTitle")}
                      aria-hidden={openDesktopMenu !== "resources"}
                      data-open={openDesktopMenu === "resources" ? "true" : "false"}
                      inert={openDesktopMenu !== "resources" ? true : undefined}
                    >
                      {resourceDropdownLinks.map((resourceLink) => {
                        const ResourceIcon = resourceLink.icon;
                        return (
                          <Link
                            key={resourceLink.href}
                            href={resourceLink.href}
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
            className="ws-desktop-nav ws-desktop-nav--actions"
          >
            {status === "authenticated" && session?.user ? (
              <>
                <Link
                  href={DASHBOARD_URL}
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
                  onClick={() => {
                    void handleSignOut().catch((): undefined => undefined);
                  }}
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
            ref={mobileMenuButtonRef}
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
            aria-label={isOpen ? t("Header.closeMenu") : t("Header.openMenu")}
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
          <div
            ref={mobileDrawerRef}
            className="ws-drawer-panel ws-drawer-panel--open"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ws-mobile-navigation-title"
          >
            <div className="ws-drawer-header">
              <Link
                href="/"
                onClick={closeDrawer}
                className="ws-drawer-brand"
                id="ws-mobile-navigation-title"
                aria-label="MenuList"
              >
                <BrandWordmark
                  className="ws-brand-wordmark"
                  iconHeight={28}
                  textClassName="ws-brand-wordmark__text"
                />
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="ws-drawer-close"
                aria-label={t("Header.closeMenu")}
              >
                <LuX size={20} />
              </button>
            </div>

            <nav
              className="ws-mobile-drawer-nav"
              aria-label={t("Header.mobileNavigationLabel")}
            >
              <div className="ws-mobile-nav-groups">
                {mobileNavigationGroups.map((group, groupIndex) => (
                  <section
                    key={group.key}
                    className="ws-mobile-nav-group"
                    aria-labelledby={`ws-mobile-nav-group-${group.key}`}
                  >
                    <p
                      id={`ws-mobile-nav-group-${group.key}`}
                      className="ws-mobile-nav-group__label"
                    >
                      {t(`Header.${group.key}`)}
                    </p>
                    <div className="ws-mobile-nav-group__links">
                      {group.links.map((item) => {
                        const Icon = item.icon;
                        const isActive = isCurrentPath(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeDrawer}
                            className="ws-mobile-nav-link"
                            aria-current={isActive ? "page" : undefined}
                          >
                            <span className="ws-mobile-nav-link__icon" aria-hidden="true">
                              <Icon size={18} />
                            </span>
                            <span>{t(`Header.${item.key}`)}</span>
                          </Link>
                        );
                      })}
                    </div>
                    {group.key === "mobileProductLabel" && (
                      <div className="ws-mobile-feature-sections" aria-label={t("Header.featuresMenuTitle")}>
                        {websiteFeatureNavGroups.map((featureGroup) => (
                          <section
                            key={featureGroup.key}
                            className="ws-mobile-feature-section"
                            aria-labelledby={`ws-mobile-feature-section-${featureGroup.key}`}
                          >
                            <p
                              id={`ws-mobile-feature-section-${featureGroup.key}`}
                              className="ws-mobile-feature-section__label"
                            >
                              {t(`Header.${featureGroup.key}`)}
                            </p>
                            <div className="ws-mobile-nav-group__links">
                              {featureGroup.links.map((featureLink) => {
                                const FeatureIcon = featureLink.icon;
                                const isFeatureActive = isCurrentPath(featureLink.href);

                                return (
                                  <Link
                                    key={featureLink.href}
                                    href={featureLink.href}
                                    onClick={closeDrawer}
                                    className="ws-mobile-nav-link ws-mobile-nav-link--feature"
                                    aria-current={isFeatureActive ? "page" : undefined}
                                  >
                                    <span className="ws-mobile-nav-link__icon" aria-hidden="true">
                                      <FeatureIcon size={18} />
                                    </span>
                                    <span>{t(`Header.${featureLink.key}`)}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}
                    {groupIndex < mobileNavigationGroups.length - 1 && (
                      <div className="ws-mobile-nav-group__divider" aria-hidden="true" />
                    )}
                  </section>
                ))}
              </div>

              <section className="ws-mobile-account" aria-label={t("Header.mobileAccountLabel")}>
                {status === "authenticated" && session?.user ? (
                  <div className="ws-mobile-account__links">
                    <Link
                      href={DASHBOARD_URL}
                      onClick={closeDrawer}
                      className="ws-mobile-nav-link"
                    >
                      <span className="ws-mobile-nav-link__icon" aria-hidden="true"><LuUser size={18} /></span>
                      <span>{session.user.name || session.user.email || t("Header.dashboard")}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        closeDrawer();
                        void handleSignOut().catch((): undefined => undefined);
                      }}
                      className="ws-mobile-nav-link ws-mobile-nav-link--danger"
                    >
                      <span className="ws-mobile-nav-link__icon" aria-hidden="true"><LuLogOut size={18} /></span>
                      <span>{t("Header.logout")}</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href={buildWebsiteSignInPath('/dashboard')}
                    onClick={closeDrawer}
                    className="ws-mobile-nav-link"
                  >
                    <span className="ws-mobile-nav-link__icon" aria-hidden="true"><LuArrowRight size={18} /></span>
                    <span>{t("Header.login")}</span>
                  </Link>
                )}
              </section>
            </nav>

            {/* CTA */}
            <div className="ws-drawer-cta">
              <WebsiteThemeSwitcher />
              {status !== "authenticated" && (
                <Link
                  href="/create-menu"
                  aria-label={t("Header.ctaAria")}
                  onClick={closeDrawer}
                  className="ws-btn ws-btn--primary ws-drawer-cta__button"
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
