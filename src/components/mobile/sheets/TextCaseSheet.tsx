'use client'

import type { Project } from '../../templates/main-app/projects/types';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button, Card, Flex, NavBar, Popup, Switch, Text } from '../antd';
import { MENU_SHEET_CONTAINER_STYLE, MENU_SHEET_BODY_STYLE } from './menuSheetLayout';
import { applyTextCaseToProject, type TextCaseMode } from '../../templates/main-app/projects/editorView/textCase.shared';

interface TextCaseSheetProps {
    onClose: () => void;
    onSaved: (updatedProject: Project) => void;
    projectData: Project;
    visible: boolean;
}

export default function TextCaseSheet({
    onClose,
    onSaved,
    projectData,
    visible,
}: TextCaseSheetProps) {
    const t = useTranslations('MobileMenu');
    const labels = useOfferingLabels();
    const { token } = theme.useToken();
    const [caseMode, setCaseMode] = useState<TextCaseMode>('title');
    const [applyToCategories, setApplyToCategories] = useState(true);
    const [applyToItems, setApplyToItems] = useState(true);
    const [applyToDescriptions, setApplyToDescriptions] = useState(false);
    const [applyToAttributes, setApplyToAttributes] = useState(true);

    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
    } as const;

    const options = useMemo(() => ([
        { value: 'title' as const, label: t('textCaseTitleOption'), description: 'Chicken Tikka Masala' },
        { value: 'sentence' as const, label: t('textCaseSentenceOption'), description: 'Chicken tikka masala' },
        { value: 'lower' as const, label: t('textCaseLowerOption'), description: 'chicken tikka masala' },
        { value: 'upper' as const, label: t('textCaseUpperOption'), description: 'CHICKEN TIKKA MASALA' },
    ]), [t]);

    const handleApply = () => {
        const updated = applyTextCaseToProject(projectData, {
            applyToAttributes,
            applyToCategories,
            applyToDescriptions,
            applyToItems,
            mode: caseMode,
        });

        onSaved(updated);
    };

    if (!visible) return null;

    return (
        <Popup
            bodyStyle={MENU_SHEET_BODY_STYLE}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                <NavBar onBack={onClose}>{t('fixTextCase')}</NavBar>

                <Flex gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    <Card size="small" style={sectionCardStyle}>
                        <Text type="secondary">
                            {t('textCaseIntro', { offering: labels.offeringPhrase })}
                        </Text>
                    </Card>

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={10} vertical>
                            <Text strong>{t('chooseTextStyle')}</Text>
                            <Flex gap={8} vertical>
                                {options.map((option) => {
                                    const selected = caseMode === option.value;

                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => setCaseMode(option.value)}
                                            style={{
                                                backgroundColor: token.colorBgContainer,
                                                border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                padding: '12px 14px',
                                            }}
                                        >
                                            <Flex align="center" gap={12} justify="space-between">
                                                <Flex gap={3} style={{ flex: 1, minWidth: 0 }} vertical>
                                                    <Text strong style={{ color: selected ? token.colorPrimary : undefined }}>
                                                        {option.label}
                                                    </Text>
                                                    <Text type="secondary">{option.description}</Text>
                                                </Flex>
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        backgroundColor: selected ? token.colorPrimary : 'transparent',
                                                        border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                        borderRadius: '999px',
                                                        color: selected ? token.colorTextLightSolid : token.colorTextQuaternary,
                                                        height: 20,
                                                        width: 20,
                                                    }}
                                                >
                                                    {selected ? '•' : null}
                                                </Flex>
                                            </Flex>
                                        </div>
                                    );
                                })}
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={10} vertical>
                            <Text strong>{t('applyToLabel')}</Text>
                            {[
                                { checked: applyToCategories, label: t('categoryNames'), onChange: setApplyToCategories },
                                { checked: applyToItems, label: t('itemNames'), onChange: setApplyToItems },
                                { checked: applyToAttributes, label: t('attributeNames'), onChange: setApplyToAttributes },
                                { checked: applyToDescriptions, label: t('descriptionLabel'), onChange: setApplyToDescriptions },
                            ].map((entry) => (
                                <Flex align="center" justify="space-between" key={entry.label}>
                                    <Text>{entry.label}</Text>
                                    <Switch checked={entry.checked} onChange={entry.onChange} />
                                </Flex>
                            ))}
                        </Flex>
                    </Card>

                </Flex>

                <div
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        flexShrink: 0,
                        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        zIndex: 5,
                    }}
                >
                    <Flex gap={8}>
                        <Button block fill="outline" onClick={onClose} size="large">
                            Cancel
                        </Button>
                        <Button
                            block
                            color="primary"
                            disabled={!applyToCategories && !applyToItems && !applyToDescriptions && !applyToAttributes}
                            onClick={handleApply}
                            size="large"
                        >
                            {t('applyTextCaseChanges')}
                        </Button>
                    </Flex>
                </div>
            </Flex>
        </Popup>
    );
}
