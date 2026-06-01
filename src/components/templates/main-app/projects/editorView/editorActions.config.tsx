import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import React from 'react';
import { LuArrowUpDown, LuImage, LuLanguages, LuLayoutGrid, LuSettings2, LuSparkles, LuZap } from "react-icons/lu";

export type EditorAction = 'aiDefaults' | 'language' | 'description' | 'images' | 'activeInactive' | 'reorder' | 'decisionBlocks' | 'storeCustomization' | 'commandCenter';

export type EditorActionConfig = {
    key: EditorAction;
    icon: React.ReactNode;
    title: string;
    description: string;
    outletOnly?: boolean;
    isNew?: boolean;
};

export function getEditorActions(labels: OfferingLabels): EditorActionConfig[] {
    return [
        {
            key: 'commandCenter',
            icon: <LuLayoutGrid style={{ fontSize: 20 }} />,
            title: labels.commandCenterLabel,
            description: 'Update many items at once: prices, availability, visibility, categories, text, languages, and repair',
            isNew: true,
        },
        {
            key: 'aiDefaults',
            icon: <LuSettings2 style={{ fontSize: 20 }} />,
            title: 'Generation defaults',
            description: 'Set writing and photo style before descriptions, repair, and generated photos',
        },
        {
            key: 'language',
            icon: <LuLanguages style={{ fontSize: 20 }} />,
            title: 'Manage Languages',
            description: labels.languageDesc,
        },
        {
            key: 'description',
            icon: <LuSparkles style={{ fontSize: 20 }} />,
            title: 'Generate Descriptions',
            description: labels.descriptionDesc,
        },
        {
            key: 'images',
            icon: <LuImage style={{ fontSize: 20 }} />,
            title: 'Add Images',
            description: labels.imagesDesc,
        },
        {
            key: 'reorder',
            icon: <LuArrowUpDown style={{ fontSize: 20 }} />,
            title: labels.rearrangeLabel,
            description: 'Move categories and items into the order customers should see',
        },
        {
            key: 'decisionBlocks',
            icon: <LuZap style={{ fontSize: 20 }} />,
            title: 'Featured section',
            description: 'Choose what appears in the Featured section on your public menu',
        },
        {
            key: 'storeCustomization',
            icon: <LuSettings2 style={{ fontSize: 20 }} />,
            title: 'Store Customization',
            description: 'For this outlet only: manage local prices, stock status, and bestsellers',
            outletOnly: true,
            isNew: true,
        },
    ];
}
