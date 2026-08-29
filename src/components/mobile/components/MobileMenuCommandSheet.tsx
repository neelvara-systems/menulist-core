'use client'

import { getOwnerLabels } from '@config/businessLabels';
import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { normalizeMobileMenuUpdatedAt, normalizeMobileMenuVersion } from '@lib/mobile/menuCommandMetadata';
import { timeAgo } from '@util/dateTime/timeAgo';
import { theme } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LuArrowUpDown, LuCamera, LuDollarSign, LuExternalLink, LuEyeOff, LuFileImage, LuFileText, LuFolderInput, LuLanguages, LuPalette, LuPen, LuPlus, LuPrinter, LuSettings2, LuSparkles, LuTags, LuToggleRight, LuX, LuZap } from 'react-icons/lu';
import { Button, Flex, List, NavBar, Popup, Text } from '../antd';
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
    businessCategory?: string;
    labels: OfferingLabels;
    lastUpdatedAt?: unknown;
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
    onSmartRecommendations?: () => void;
    onShowHide: () => void;
    onMoveCategory: () => void;
    visible: boolean;
}

function formatRelativeDate(timestamp: unknown, locale: string): string {
    try {
        const date = normalizeMobileMenuUpdatedAt(timestamp);
        if (!date) return '';
        return timeAgo(date, locale);
    } catch {
        return '';
    }
}

export default function MobileMenuCommandSheet({
    businessType,
    businessCategory,
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
    const tMenuStatus = useTranslations('BusinessSettings.publicCustomer.menu');
    const tPrint = useTranslations('MobileShare');
    const tPosSync = useTranslations('PosSync');
    const locale = useLocale();
    const availabilityLabels = getOwnerLabels(businessType, businessCategory);
    const lastUpdatedLabel = formatRelativeDate(lastUpdatedAt, locale);
    const normalizedMenuVersion = normalizeMobileMenuVersion(menuVersion);

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
            description: t('menuCompletionReadyDesc'),
            onClick: onPreview,
        },
        ...(onPrintMenu ? [{
            key: 'print-menu',
            icon: <LuPrinter style={{ fontSize: 20 }} />,
            title: tPrint('menuPdf'),
            description: tPrint('menuPdfDesc'),
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
        ...(onSmartRecommendations ? [{
            key: 'decision-blocks',
            icon: <LuZap style={{ fontSize: 20 }} />,
            title: t('featuredSections'),
            description: t('featuredSectionsDesc'),
            onClick: onSmartRecommendations,
        }] : []),
    ], [labels.offeringLower, onAddItem, onCategories, onOpenDesignEditor, onPreview, onPrintMenu, onReorderMenu, onSmartRecommendations, onUploadMenu, t, tPrint]);

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
            aria-label={t('manageAndControl', { offering: labels.offeringTitle })}
            bodyStyle={MENU_SHEET_BODY_STYLE}
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                <NavBar
                    right={(
                        <Button
                            aria-label={t('close')}
                            fill="none"
                            onClick={onClose}
                            style={{ alignItems: 'center', color: token.colorText, cursor: 'pointer', display: 'flex', justifyContent: 'center', minHeight: 44, minWidth: 44 }}
                        >
                            <LuX size={18} />
                        </Button>
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

                    {(lastUpdatedLabel || normalizedMenuVersion) && (
                        <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, marginTop: 6, paddingTop: 10 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {lastUpdatedLabel ? tMenuStatus('updated', { when: lastUpdatedLabel }) : ''}
                                {normalizedMenuVersion
                                    ? `${lastUpdatedLabel ? ' · ' : ''}${tPosSync('menuVersion')} ${normalizedMenuVersion}`
                                    : ''}
                            </Text>
                        </div>
                    )}
                </Flex>
            </Flex>
        </Popup>
    );
}
