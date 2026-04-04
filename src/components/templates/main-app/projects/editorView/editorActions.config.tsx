import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import React from 'react';
import { LuArrowUpDown, LuImage, LuLanguages, LuLayoutGrid, LuSettings2, LuSparkles, LuZap } from "react-icons/lu";

export type EditorAction = 'language' | 'description' | 'images' | 'activeInactive' | 'reorder' | 'decisionBlocks' | 'storeCustomization' | 'commandCenter';

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
            description: 'Bulk update prices, availability, and categories for many items at once',
            isNew: true,
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
            description: 'Change the order of categories and items by using Drag & Drop option',
        },
        {
            key: 'decisionBlocks',
            icon: <LuZap style={{ fontSize: 20 }} />,
            title: 'Smart Recommendations',
            description: 'Configure which items appear in Popular, Quick Pick, and Best Value blocks',
        },
        {
            key: 'storeCustomization',
            icon: <LuSettings2 style={{ fontSize: 20 }} />,
            title: 'Store Customization',
            description: 'Manage local prices, stock status, and bestsellers for your store',
            outletOnly: true,
            isNew: true,
        },
    ];
}
