const MENULIST_OWNER_APP_ORIGINS_BY_PROJECT: Readonly<Record<string, string>> = {
  menulist: "https://app.menulist.ai",
  "menulist-qa": "https://app.menulist.digital",
};

const MENULIST_TENANT_BASE_DOMAINS_BY_PROJECT: Readonly<Record<string, string>> = {
  menulist: "menulist.online",
  "menulist-qa": "menulist.digital",
};

const normalizeProjectId = (value: unknown): string => (
  typeof value === "string" ? value.trim().toLowerCase() : ""
);

const normalizeOwnerAppOrigin = (value: unknown): string | null => {
  if (typeof value !== "string" || !value || value !== value.trim() || value.length > 2048) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== "/" && url.pathname !== "")
    ) {
      return null;
    }

    return Object.values(MENULIST_OWNER_APP_ORIGINS_BY_PROJECT).includes(url.origin)
      ? url.origin
      : null;
  } catch {
    return null;
  }
};

export function resolveMenuListOwnerAppUrl(options: {
  configuredUrl?: unknown;
  projectId?: unknown;
} = {}): string | null {
  const projectId = normalizeProjectId(
    options.projectId
      ?? process.env.GCLOUD_PROJECT
      ?? process.env.GOOGLE_CLOUD_PROJECT,
  );
  const expectedOrigin = MENULIST_OWNER_APP_ORIGINS_BY_PROJECT[projectId] || null;
  const configuredOrigin = normalizeOwnerAppOrigin(
    options.configuredUrl ?? process.env.NEXT_PUBLIC_APP_URL,
  );

  if (configuredOrigin && expectedOrigin && configuredOrigin !== expectedOrigin) {
    return null;
  }

  return configuredOrigin || expectedOrigin;
}

export function resolveMenuListOwnerSignInUrl(options: {
  configuredUrl?: unknown;
  projectId?: unknown;
} = {}): string | null {
  const ownerAppUrl = resolveMenuListOwnerAppUrl(options);
  return ownerAppUrl ? `${ownerAppUrl}/signin` : null;
}

export function resolveMenuListTenantBaseDomain(options: {
  configuredDomain?: unknown;
  projectId?: unknown;
} = {}): string | null {
  const projectId = normalizeProjectId(
    options.projectId
      ?? process.env.GCLOUD_PROJECT
      ?? process.env.GOOGLE_CLOUD_PROJECT,
  );
  const expectedDomain = MENULIST_TENANT_BASE_DOMAINS_BY_PROJECT[projectId] || null;
  const configuredValue = options.configuredDomain ?? process.env.MENULIST_TENANT_BASE_DOMAIN;
  const configuredDomain = typeof configuredValue === "string"
    ? configuredValue.trim().toLowerCase()
    : "";

  if (!configuredDomain || !Object.values(MENULIST_TENANT_BASE_DOMAINS_BY_PROJECT).includes(configuredDomain)) {
    return null;
  }
  if (expectedDomain && configuredDomain !== expectedDomain) return null;
  return configuredDomain;
}
