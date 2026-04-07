'use client'

import { getOwnerLabels } from '@config/businessLabels';
import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LuArrowUpDown, LuCamera, LuDollarSign, LuEyeOff, LuFolderInput, LuPlus, LuTags, LuToggleRight, LuX } from 'react-icons/lu';
import { getEditorActions } from '../../templates/main-app/projects/editorView/editorActions.config';
import { Card, Flex, List, NavBar, Popup, Text } from '../antd';

type CommandAction = {
    key: string;
    icon: React.ReactNode;
    title: string;
    description: string;
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
    onGenerateDescriptions: () => void;
    onManageLanguages: () => void;
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
    onGenerateDescriptions,
    onManageLanguages,
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
    const languageAction = useMemo(
        () => getEditorActions(labels).find((action) => action.key === 'language'),
        [labels]
    );
    const descriptionAction = useMemo(
        () => getEditorActions(labels).find((action) => action.key === 'description'),
        [labels]
    );
    const decisionBlocksAction = useMemo(
        () => getEditorActions(labels).find((action) => action.key === 'decisionBlocks'),
        [labels]
    );

    const commandActions = useMemo<CommandAction[]>(() => [
        {
            key: 'upload-menu',
            icon: <LuCamera style={{ fontSize: 20 }} />,
            title: t('uploadMenuPhoto', { offering: labels.offeringTitle }),
            description: t('createYourMenuDesc', { offering: labels.offeringLower }),
            onClick: onUploadMenu,
        },
        {
            key: 'add-item',
            icon: <LuPlus style={{ fontSize: 20 }} />,
            title: t('addItem'),
            description: t('addItemTitle'),
            onClick: onAddItem,
        },
        {
            key: 'availability',
            icon: <LuToggleRight style={{ fontSize: 20 }} />,
            title: t('changeAvailability'),
            description: t('changeAvailabilityDesc', {
                available: availabilityLabels.available.toLowerCase(),
                unavailable: availabilityLabels.unavailable.toLowerCase(),
            }),
            onClick: onChangeAvailability,
        },
        {
            key: 'pricing',
            icon: <LuDollarSign style={{ fontSize: 20 }} />,
            title: t('updatePrices'),
            description: t('updatePricesDesc'),
            onClick: onPricing,
        },
        {
            key: 'move-category',
            icon: <LuFolderInput style={{ fontSize: 20 }} />,
            title: t('moveToCategory'),
            description: t('moveToCategoryDesc'),
            onClick: onMoveCategory,
        },
        {
            key: 'show-hide',
            icon: <LuEyeOff style={{ fontSize: 20 }} />,
            title: t('showAndHideItems'),
            description: t('showAndHideItemsDesc'),
            onClick: onShowHide,
        },
        {
            key: 'categories',
            icon: <LuTags style={{ fontSize: 20 }} />,
            title: t('categories'),
            description: t('categoriesManageDesc'),
            onClick: onCategories,
        },
        {
            key: 'reorder-menu',
            icon: <LuArrowUpDown style={{ fontSize: 20 }} />,
            title: t('reorderMenu'),
            description: t('reorderMenuHelp'),
            onClick: onReorderMenu,
        },
        {
            key: 'language',
            icon: languageAction?.icon || null,
            title: languageAction?.title || t('manageLanguages'),
            description: languageAction?.description || labels.languageDesc,
            onClick: onManageLanguages,
        },
        {
            key: 'description',
            icon: descriptionAction?.icon || null,
            title: descriptionAction?.title || t('generateDescriptions'),
            description: descriptionAction?.description || labels.descriptionDesc,
            onClick: onGenerateDescriptions,
        },
        {
            key: 'decision-blocks',
            icon: decisionBlocksAction?.icon || null,
            title: decisionBlocksAction?.title || t('smartRecommendationsTitle'),
            description: decisionBlocksAction?.description || t('smartRecommendationsDesc'),
            onClick: onSmartRecommendations,
        },
    ], [availabilityLabels.available, availabilityLabels.unavailable, decisionBlocksAction, descriptionAction, labels.descriptionDesc, labels.languageDesc, labels.offeringLower, labels.offeringTitle, languageAction, onAddItem, onCategories, onChangeAvailability, onGenerateDescriptions, onManageLanguages, onMoveCategory, onPricing, onReorderMenu, onShowHide, onSmartRecommendations, onUploadMenu, t]);

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
                <Flex gap={12} style={{ overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    <Card size="small" style={{ borderRadius: 16 }}>
                        <List>
                            {commandActions.map((action) => (
                                <List.Item
                                    arrow
                                    description={<Text type="secondary">{action.description}</Text>}
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
                    </Card>

                    <Card size="small" style={{ backgroundColor: token.colorBgLayout, borderRadius: 16 }}>
                        <Flex gap={4} vertical>
                            <Text strong>{t('desktopNoteTitle')}</Text>
                            <Text type="secondary">
                                {t('desktopNoteDesc')}
                            </Text>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        </Popup>
    );
}
