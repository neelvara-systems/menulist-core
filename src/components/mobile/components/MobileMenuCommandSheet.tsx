'use client'

import { getOwnerLabels } from '@config/businessLabels';
import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LuArrowUpDown, LuCamera, LuDollarSign, LuExternalLink, LuEyeOff, LuFileImage, LuFolderInput, LuLanguages, LuPen, LuPlus, LuSparkles, LuTags, LuToggleRight, LuX, LuZap } from 'react-icons/lu';
import { Card, Flex, List, NavBar, Popup, Text } from '../antd';

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
    onAddItem: () => void;
    onCategories: () => void;
    onChangeAvailability: () => void;
    onClose: () => void;
    onAddImages: () => void;
    onGenerateDescriptions: () => void;
    onManageLanguages: () => void;
    onPreview: () => void;
    onTextCase: () => void;
    onUploadMenu: () => void;
    onPricing: () => void;
    onReorderMenu: () => void;
    onSmartRecommendations: () => void;
    onShowHide: () => void;
    onMoveCategory: () => void;
    visible: boolean;
}

export default function MobileMenuCommandSheet({
    businessType,
    labels,
    onAddItem,
    onCategories,
    onChangeAvailability,
    onClose,
    onAddImages,
    onGenerateDescriptions,
    onManageLanguages,
    onPreview,
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
            key: 'add-images',
            icon: <LuFileImage style={{ fontSize: 20 }} />,
            title: t('addImages'),
            description: t('addImagesDesc'),
            onClick: onAddImages,
        },
        {
            key: 'description',
            icon: <LuSparkles style={{ fontSize: 20 }} />,
            title: t('generateDescriptionsAi'),
            description: t('generateDescriptionsAiDesc'),
            onClick: onGenerateDescriptions,
        },
        {
            key: 'language',
            icon: <LuLanguages style={{ fontSize: 20 }} />,
            title: t('menuLanguages'),
            description: 'Add or reorder menu languages.',
            onClick: onManageLanguages,
        },
    ], [onAddImages, onGenerateDescriptions, onManageLanguages, onSmartRecommendations, t]);

    const menuSetupActions = useMemo<CommandAction[]>(() => [
        {
            key: 'preview',
            icon: <LuExternalLink style={{ fontSize: 20 }} />,
            title: t('viewUpdatedMenu'),
            description: `See how customers view this ${labels.offeringLower}.`,
            onClick: onPreview,
        },
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
            onClick: onCategories,
        },
        {
            key: 'add-item',
            icon: <LuPlus style={{ fontSize: 20 }} />,
            title: t('addItem'),
            onClick: onAddItem,
        },
        {
            key: 'reorder-menu',
            icon: <LuArrowUpDown style={{ fontSize: 20 }} />,
            title: t('reorderMenu'),
            onClick: onReorderMenu,
        },
        {
            key: 'decision-blocks',
            icon: <LuZap style={{ fontSize: 20 }} />,
            title: t('featuredSections'),
            description: t('featuredSectionsDesc'),
            onClick: onSmartRecommendations,
        },
    ], [labels.offeringLower, onAddItem, onCategories, onPreview, onReorderMenu, onSmartRecommendations, onUploadMenu, t]);

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
            bodyStyle={{ minHeight: '64vh', maxHeight: '92vh', overflowX: 'hidden', overflowY: 'auto', padding: 0 }}
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar
                    right={(
                        <Text
                            onClick={onClose}
                            style={{ alignItems: 'center', color: token.colorText, cursor: 'pointer', display: 'flex', justifyContent: 'center', minHeight: 40, minWidth: 40 }}
                        >
                            <LuX size={18} />
                        </Text>
                    )}
                >
                    {t('manageAndControl', { offering: labels.offeringTitle })}
                </NavBar>
                <Flex gap={16} style={{ overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
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
                </Flex>
            </Flex>
        </Popup>
    );
}
