import type { MenuCardTemplate } from '../models/templateTypes';
import { classicTemplate } from './classic.template';
import { compactTemplate } from './compact.template';
import { drinksTemplate } from './drinks.template';
import { premiumTemplate } from './premium.template';
import { takeawayTemplate } from './takeaway.template';

export const menuCardTemplateRegistry: MenuCardTemplate[] = [
    classicTemplate,
    compactTemplate,
    premiumTemplate,
    takeawayTemplate,
    drinksTemplate,
];

export const exposedMenuCardTemplates = [classicTemplate, compactTemplate, premiumTemplate];

export function getMenuCardTemplate(templateId: string): MenuCardTemplate {
    return menuCardTemplateRegistry.find((template) => template.id === templateId) || classicTemplate;
}
