'use client'

import { getEditorActions } from '../../templates/main-app/projects/editorView/editorActions.config';
import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LuDollarSign, LuEyeOff, LuFolderInput, LuPlus, LuTags, LuToggleRight } from 'react-icons/lu';
import { Card, Flex, List, NavBar, Popup, Text, Title } from '../antd';

type CommandAction = {
    key: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick?: () => void;
    isNew?: boolean;
};

interface MobileMenuCommandSheetProps {
    labels: OfferingLabels;
    onAddItem: () => void;
    onCategories: () => void;
    onChangeAvailability: () => void;
    onClose: () => void;
    onGenerateDescriptions: () => void;
    onManageLanguages: () => void;
    onPricing: () => void;
    onShowHide: () => void;
    onMoveCategory: () => void;
    visible: boolean;
}

export default function MobileMenuCommandSheet({
    labels,
    onAddItem,
    onCategories,
    onChangeAvailability,
    onClose,
    onGenerateDescriptions,
    onManageLanguages,
    onPricing,
    onShowHide,
    onMoveCategory,
    visible,
}: MobileMenuCommandSheetProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const languageAction = useMemo(
        () => getEditorActions(labels).find((action) => action.key === 'language'),
        [labels]
    );
    const descriptionAction = useMemo(
        () => getEditorActions(labels).find((action) => action.key === 'description'),
        [labels]
    );

    const commandActions = useMemo<CommandAction[]>(() => [
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
            title: 'Change Availability',
            description: 'Mark selected items as available or sold out',
            onClick: onChangeAvailability,
        },
        {
            key: 'pricing',
            icon: <LuDollarSign style={{ fontSize: 20 }} />,
            title: 'Update Prices',
            description: 'Increase, reduce, or set prices for selected items',
            onClick: onPricing,
        },
        {
            key: 'move-category',
            icon: <LuFolderInput style={{ fontSize: 20 }} />,
            title: 'Move Items to Category',
            description: 'Move selected items into another category in one step',
            onClick: onMoveCategory,
        },
        {
            key: 'show-hide',
            icon: <LuEyeOff style={{ fontSize: 20 }} />,
            title: 'Show or Hide Items',
            description: 'Control whether customers can see selected items',
            onClick: onShowHide,
        },
        {
            key: 'categories',
            icon: <LuTags style={{ fontSize: 20 }} />,
            title: t('categories'),
            description: 'Manage categories, visibility, and category order',
            onClick: onCategories,
        },
        {
            key: 'language',
            icon: languageAction?.icon || null,
            title: languageAction?.title || 'Manage Languages',
            description: languageAction?.description || labels.languageDesc,
            onClick: onManageLanguages,
        },
        {
            key: 'description',
            icon: descriptionAction?.icon || null,
            title: descriptionAction?.title || 'Generate Descriptions',
            description: descriptionAction?.description || labels.descriptionDesc,
            onClick: onGenerateDescriptions,
        },
    ], [descriptionAction, labels.descriptionDesc, labels.languageDesc, languageAction, onAddItem, onCategories, onChangeAvailability, onGenerateDescriptions, onManageLanguages, onMoveCategory, onPricing, onShowHide, t]);

    const desktopOnlyActions = useMemo<CommandAction[]>(() => {
        const desktopActions = getEditorActions(labels).filter((action) =>
            ['reorder', 'decisionBlocks'].includes(action.key)
        );

        return [
            ...desktopActions,
        ];
    }, [labels]);

    const renderIconTile = (icon: React.ReactNode, isDesktopOnly = false) => (
        <Flex
            align="center"
            justify="center"
            style={{
                background: isDesktopOnly ? token.colorBgTextHover : token.colorPrimaryBg,
                borderRadius: 12,
                color: isDesktopOnly ? token.colorTextSecondary : token.colorPrimary,
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
            bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '78vh', overflowY: 'auto' }}
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex gap={16} vertical>
                <NavBar onBack={onClose}>{`Manage & Control Your ${labels.offeringTitle}`}</NavBar>
                <Text type="secondary">
                    Customize content and organize {labels.itemsPlural}
                </Text>

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
                        <Text strong>More advanced tools</Text>
                        <Text type="secondary">
                            These editor actions are available in desktop mode.
                        </Text>
                    </Flex>
                </Card>

                <Card size="small" style={{ borderRadius: 16, opacity: 0.78 }}>
                    <List>
                        {desktopOnlyActions.map((action) => (
                            <List.Item
                                description={<Text type="secondary">{action.description}</Text>}
                                key={`desktop-${action.key}`}
                                prefix={renderIconTile(action.icon, true)}
                                title={<Text strong>{action.title}</Text>}
                            />
                        ))}
                    </List>
                </Card>
            </Flex>
        </Popup>
    );
}
