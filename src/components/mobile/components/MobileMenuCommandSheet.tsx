'use client'

import { getOwnerLabels } from '@config/businessLabels';
import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LuArrowUpDown, LuCamera, LuDollarSign, LuExternalLink, LuEyeOff, LuFileImage, LuFileText, LuFolderInput, LuLanguages, LuPalette, LuPen, LuPlus, LuPrinter, LuSettings2, LuSparkles, LuTags, LuToggleRight, LuX, LuZap } from 'react-icons/lu';
import { Card, Flex, List, NavBar, Popup, Text } from '../antd';
import { MENU_SHEET_CONTAINER_STYLE, MENU_SHEET_BODY_STYLE } from '../sheets/menuSheetLayout';

type CommandAction = {
    key: string;
    icon: React.ReactNode;
    title: string;
    description?: string;
    onClick?: () => void;
    isNew?: boolean;
};

interface MobileMenuCommandSheetProps {
    businessType?: string;
    labels: OfferingLabels;
    lastUpdatedAt?: any;
    menuVersion?: number;
    onAddItem: () => void;
    onCategories: () => void;
    onChangeAvailability: () => void;
    onClose: () => void;
    onAddImages: () => void;
    onAIDefaults: () => void;
    onGenerateDescriptions: () => void;
    onManageLanguages: () => void;
    onOpenDesignEditor?: () => void;
    onRepairMenu: () => void;
    onPreview: () => void;
    onPrintMenu?: () => void;
    onTextCase: () => void;
    onUploadMenu: () => void;
    onPricing: () => void;
    onReorderMenu: () => void;
    onSmartRecommendations: () => void;
    onShowHide: () => void;
    onMoveCategory: () => void;
    visible: boolean;
}

function formatRelativeDate(timestamp: any): string {
    try {
        const date = timestamp?.toDate?.() || (timestamp instanceof Date ? timestamp : new Date(timestamp));
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Updated today';
        if (diffDays === 1) return 'Updated yesterday';
        if (diffDays < 7) return `Updated ${diffDays} days ago`;
        if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

export default function MobileMenuCommandSheet({
    businessType,
    labels,
    lastUpdatedAt,
    menuVersion,
    onAddItem,
    onCategories,
    onChangeAvailability,
    onClose,
    onAddImages,
    onAIDefaults,
    onGenerateDescriptions,
    onManageLanguages,
    onOpenDesignEditor,
    onRepairMenu,
    onPreview,
    onPrintMenu,
    onTextCase,
    onUploadMenu,
    onPricing,
    onReorderMenu,
    onSmartRecommendations,
    onShowHide,
    onMoveCategory,
    visible,
}: MobileMenuCommandSheetProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const availabilityLabels = getOwnerLabels(businessType);

    const bulkActions = useMemo<CommandAction[]>(() => [
        {
            key: 'availability',
            icon: <LuToggleRight style={{ fontSize: 20 }} />,
            title: t('markAvailableUnavailable'),
            description: t('changeAvailabilityDesc', {
                available: availabilityLabels.available.toLowerCase(),
                unavailable: availabilityLabels.unavailable.toLowerCase(),
            }),
            onClick: onChangeAvailability,
        },
        {
            key: 'pricing',
            icon: <LuDollarSign style={{ fontSize: 20 }} />,
            title: t('editPricesBulk'),
            description: t('updatePricesDesc'),
            onClick: onPricing,
        },
        {
            key: 'show-hide',
            icon: <LuEyeOff style={{ fontSize: 20 }} />,
            title: t('visibility'),
            description: t('visibilityDesc'),
            onClick: onShowHide,
        },
        {
            key: 'move-category',
            icon: <LuFolderInput style={{ fontSize: 20 }} />,
            title: t('moveItems'),
            description: t('moveToCategoryDesc'),
            onClick: onMoveCategory,
        },
        {
            key: 'text-case',
            icon: <LuPen style={{ fontSize: 20 }} />,
            title: t('fixTextCase'),
            description: t('fixTextCaseDesc'),
            onClick: onTextCase,
        },
    ], [availabilityLabels.available, availabilityLabels.unavailable, onChangeAvailability, onMoveCategory, onPricing, onShowHide, onTextCase, t]);

    const aiActions = useMemo<CommandAction[]>(() => [
        {
            key: 'ai-defaults',
            icon: <LuSettings2 style={{ fontSize: 20 }} />,
            title: t('generationDefaults'),
            description: t('generationDefaultsDesc'),
            onClick: onAIDefaults,
        },
        {
            key: 'add-images',
            icon: <LuFileImage style={{ fontSize: 20 }} />,
            title: t('addImages'),
            description: t('addImagesDesc'),
            onClick: onAddImages,
        },
        {
            key: 'repair-menu',
            icon: <LuSparkles style={{ fontSize: 20 }} />,
            title: t('repairMenuAi'),
            description: t('repairMenuAiDesc'),
            onClick: onRepairMenu,
        },
        {
            key: 'description',
            icon: <LuFileText style={{ fontSize: 20 }} />,
            title: t('addMissingDescriptions'),
            description: t('addMissingDescriptionsDesc'),
            onClick: onGenerateDescriptions,
        },
        {
            key: 'language',
            icon: <LuLanguages style={{ fontSize: 20 }} />,
            title: t('menuLanguages'),
            description: t('menuLanguagesManualDesc'),
            onClick: onManageLanguages,
        },
    ], [onAIDefaults, onAddImages, onGenerateDescriptions, onManageLanguages, onRepairMenu, t]);

    const menuSetupActions = useMemo<CommandAction[]>(() => [
        {
            key: 'preview',
            icon: <LuExternalLink style={{ fontSize: 20 }} />,
            title: t('viewUpdatedMenu'),
            description: `See how customers view this ${labels.offeringLower}.`,
            onClick: onPreview,
        },
        ...(onPrintMenu ? [{
            key: 'print-menu',
            icon: <LuPrinter style={{ fontSize: 20 }} />,
            title: 'Print Menu',
            description: 'Preview and create a PDF from this menu.',
            onClick: onPrintMenu,
        }] : []),
        ...(onOpenDesignEditor ? [{
            key: 'design',
            icon: <LuPalette style={{ fontSize: 20 }} />,
            title: t('menuDesignTitle'),
            description: t('menuDesignCommandDesc'),
            onClick: onOpenDesignEditor,
        }] : []),
        {
            key: 'upload-menu',
            icon: <LuCamera style={{ fontSize: 20 }} />,
            title: t('importMenu'),
            description: t('importMenuDesc', { offering: labels.offeringLower }),
            onClick: onUploadMenu,
        },
        {
            key: 'categories',
            icon: <LuTags style={{ fontSize: 20 }} />,
            title: t('editCategories'),
            description: t('editCategoriesDesc'),
            onClick: onCategories,
        },
        {
            key: 'add-item',
            icon: <LuPlus style={{ fontSize: 20 }} />,
            title: t('addItem'),
            description: t('addItemDesc'),
            onClick: onAddItem,
        },
        {
            key: 'reorder-menu',
            icon: <LuArrowUpDown style={{ fontSize: 20 }} />,
            title: t('reorderMenu'),
            description: t('reorderMenuDesc'),
            onClick: onReorderMenu,
        },
        {
            key: 'decision-blocks',
            icon: <LuZap style={{ fontSize: 20 }} />,
            title: t('featuredSections'),
            description: t('featuredSectionsDesc'),
            onClick: onSmartRecommendations,
        },
    ], [labels.offeringLower, onAddItem, onCategories, onOpenDesignEditor, onPreview, onPrintMenu, onReorderMenu, onSmartRecommendations, onUploadMenu, t]);

    const renderIconTile = (icon: React.ReactNode) => (
        <Flex
            align="center"
            justify="center"
            style={{
                background: token.colorPrimaryBg,
                borderRadius: 12,
                color: token.colorPrimary,
                height: 40,
                minWidth: 40,
                width: 40,
            }}
        >
            {icon}
        </Flex>
    );

    const renderActionList = (actions: CommandAction[]) => (
        <List>
            {actions.map((action) => (
                <List.Item
                    arrow
                    description={action.description ? <Text type="secondary">{action.description}</Text> : undefined}
                    key={action.key}
                    onClick={() => {
                        onClose();
                        action.onClick?.();
                    }}
                    prefix={renderIconTile(action.icon)}
                    title={(
                        <Flex align="center" gap={8}>
                            <Text strong>{action.title}</Text>
                            {action.isNew ? <Text style={{ color: token.colorSuccess }}>New</Text> : null}
                        </Flex>
                    )}
                />
            ))}
        </List>
    );

    return (
        <Popup
            bodyStyle={MENU_SHEET_BODY_STYLE}
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                <NavBar
                    right={(
                        <Text
                            onClick={onClose}
                            style={{ alignItems: 'center', color: token.colorText, cursor: 'pointer', display: 'flex', justifyContent: 'center', minHeight: 44, minWidth: 44 }}
                        >
                            <LuX size={18} />
                        </Text>
                    )}
                >
                    {t('manageAndControl', { offering: labels.offeringTitle })}
                </NavBar>
                <Flex gap={16} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px calc(12px + env(safe-area-inset-bottom))' }} vertical>
                    <Flex gap={8} vertical>
                        <Text strong type="secondary">{t('bulkActions')}</Text>
                        {renderActionList(bulkActions)}
                    </Flex>

                    <Flex gap={8} vertical>
                        <Text strong type="secondary">{t('contentGenerationSection')}</Text>
                        {renderActionList(aiActions)}
                    </Flex>

                    <Flex gap={8} vertical>
                        <Text strong type="secondary">{t('menuSetup')}</Text>
                        {renderActionList(menuSetupActions)}
                    </Flex>

                    { (lastUpdatedAt || menuVersion) && (
                        <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, marginTop: 6, paddingTop: 10 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {lastUpdatedAt && formatRelativeDate(lastUpdatedAt)}
                                {menuVersion ? `${lastUpdatedAt ? ' · ' : ''}v${menuVersion}` : ''}
                            </Text>
                        </div>
                    )}
                </Flex>
            </Flex>
        </Popup>
    );
}
