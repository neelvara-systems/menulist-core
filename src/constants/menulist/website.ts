import { getProductDeploymentTarget } from "@constant/deploymentTargets";

export const MENULIST_SITE_URL = getProductDeploymentTarget("menulist", "production").url;
export const MENULIST_SITE_TITLE = "MenuList - One Official Menu Source for Customers";
export const MENULIST_SITE_DESCRIPTION =
    "Upload your current menu. Review the prepared version. Publish one official menu, page, QR link, screen, PDF, and customer view from the same owner-approved source.";
export const MENULIST_SITE_IMAGE = "/images/website/menulist-og-official-source.png";
export const MENULIST_SITE_IMAGE_ALT = "MenuList official menu source preview";
export const MENULIST_ENTITY_DESCRIPTION =
    "MenuList is a system that manages official menus and public business information across all customer-facing surfaces.";
