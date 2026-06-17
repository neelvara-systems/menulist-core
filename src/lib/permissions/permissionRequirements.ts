import { PermissionKey, PERMISSIONS } from "@constant/permissions";
import type { RolePermissions } from "@type/platform/roles";

export type PermissionRequirement = {
    anyOf: PermissionKey[];
    label: string;
};

const routeRequirements: Array<{
    matcher: (pathname: string) => boolean;
    requirement: PermissionRequirement;
}> = [
    {
        matcher: (pathname) => pathname === "/dashboard",
        requirement: { anyOf: [PERMISSIONS.VIEW_ANALYTICS], label: "Analytics" },
    },
    {
        matcher: (pathname) => pathname === "/today" || pathname.startsWith("/today/"),
        requirement: {
            anyOf: [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU],
            label: "Today actions",
        },
    },
    {
        matcher: (pathname) => pathname === "/growth-kits" || pathname.startsWith("/growth-kits/"),
        requirement: {
            anyOf: [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU],
            label: "Growth Kits",
        },
    },
    {
        matcher: (pathname) => pathname === "/projects" || pathname.startsWith("/projects/"),
        requirement: {
            anyOf: [
                PERMISSIONS.MANAGE_MENU,
                PERMISSIONS.PUBLISH_MENU,
                PERMISSIONS.USE_MENU_EXTRACTION,
                PERMISSIONS.GENERATE_DESCRIPTIONS,
                PERMISSIONS.GENERATE_IMAGES,
            ],
            label: "Menu management",
        },
    },
    {
        matcher: (pathname) => pathname === "/users/permissions",
        requirement: { anyOf: [PERMISSIONS.ASSIGN_ROLES], label: "Roles and permissions" },
    },
    {
        matcher: (pathname) => pathname === "/users" || pathname === "/users/list",
        requirement: { anyOf: [PERMISSIONS.MANAGE_USERS], label: "Staff management" },
    },
    {
        matcher: (pathname) => pathname === "/use-menulist" || pathname === "/qr-code" || pathname === "/qrCode",
        requirement: {
            anyOf: [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU],
            label: "Sharing and QR",
        },
    },
    {
        matcher: (pathname) => pathname === "/menu-manager",
        requirement: {
            anyOf: [PERMISSIONS.MANAGE_MENU],
            label: "Menu Manager",
        },
    },
    {
        matcher: (pathname) => pathname === "/feedback",
        requirement: { anyOf: [PERMISSIONS.MANAGE_FEEDBACK], label: "Feedback" },
    },
    {
        matcher: (pathname) => pathname === "/business-settings",
        requirement: { anyOf: [PERMISSIONS.MANAGE_STORE], label: "Business settings" },
    },
    {
        matcher: (pathname) => pathname === "/transactions" || pathname === "/billing",
        requirement: { anyOf: [PERMISSIONS.ACCESS_BILLING], label: "Billing" },
    },
    {
        matcher: (pathname) => pathname === "/locations",
        requirement: { anyOf: [PERMISSIONS.MANAGE_OUTLETS], label: "Locations" },
    },
];

export const hasAnyPermission = (
    permissions: RolePermissions | null | undefined,
    keys: PermissionKey[],
) => keys.some((key) => permissions?.[key] === true);

export const satisfiesPermissionRequirement = (
    permissions: RolePermissions | null | undefined,
    requirement: PermissionRequirement | null | undefined,
) => {
    if (!requirement) return true;
    return hasAnyPermission(permissions, requirement.anyOf);
};

export const getPermissionRequirementForPath = (
    pathname: string | null | undefined,
): PermissionRequirement | null => {
    const normalized = pathname === "/" ? "/" : (pathname || "").replace(/\/+$/, "");
    return routeRequirements.find((entry) => entry.matcher(normalized))?.requirement || null;
};
