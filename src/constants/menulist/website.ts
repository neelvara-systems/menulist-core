import { getProductDeploymentTarget } from "@constant/deploymentTargets";

export const MENULIST_SITE_URL = getProductDeploymentTarget("menulist", "production").url;
export const MENULIST_TAGLINE = "The official customer-facing version of your business.";
export const MENULIST_SUPPORTING_LINE =
    "Publish your menu, hours, links, and business information from one owner-approved source.";
export const MENULIST_SITE_TITLE = "MenuList - One Official Customer Link for Menus and Services";
export const MENULIST_SITE_DESCRIPTION =
    MENULIST_SUPPORTING_LINE;
export const MENULIST_SITE_IMAGE = "/images/website/menulist-og-official-source.png";
export const MENULIST_SITE_IMAGE_ALT = "MenuList official customer link preview";
export const MENULIST_ENTITY_DESCRIPTION =
    "MenuList turns a current menu or service list into an owner-approved customer link and keeps public offerings, business information, QR, print files, actions, feedback, and health checks connected.";
