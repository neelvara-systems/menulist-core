'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { LANGUAGE_CONSTANTS } from '@constant/languages';
import GlobalLanguagesList from '@data/languages';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getAvailableLanguagesForMaster, getAvailableLanguagesForOutlet } from '@lib/localization/languageResolver';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { AICapacityError } from '@services/ai/capacityError';
import { removeObjRef } from '@util/utils';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useMemo, useState } from 'react';
import { LuCheck, LuLanguages, LuTrash2 } from 'react-icons/lu';
import type { Project } from '../../templates/main-app/projects/types';
import { translateFile } from '../../templates/main-app/projects/utils/translationsUtils';
import { Button, Card, Dialog, Flex, NavBar, Popup, Select, Text, Toast } from '../antd';
import AiActionProgressPanel from '../components/AiActionProgressPanel';

interface ManageLanguagesSheetProps {
    projectData: Project;
    visible: boolean;
    onClose: () => void;
    onSaved: (updatedProject: Project) => void;
}

export default function ManageLanguagesSheet({
    projectData,
    visible,
    onClose,
    onSaved,
}: ManageLanguagesSheetProps) {
    const t = useTranslations('MobileMenu');
    const labels = useOfferingLabels();
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingLanguageCode, setPendingLanguageCode] = useState<string>('');
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
    } as const;

    const projectLanguages = projectData.languages || ['en'];
    const sourceLangCode = projectLanguages[0] || 'en';
    const sourceLang = GlobalLanguagesList.find((lang) => lang.code === sourceLangCode) || GlobalLanguagesList[0];

    const currentLanguages = useMemo(
        () => projectLanguages
            .map((code) => GlobalLanguagesList.find((lang) => lang.code === code))
            .filter(Boolean),
        [projectLanguages]
    );

    const addableLanguages = useMemo(() => {
        if (storeDetails?.activeLanguages?.length) {
            return getAvailableLanguagesForOutlet(GlobalLanguagesList, storeDetails.activeLanguages, projectLanguages);
        }
        return getAvailableLanguagesForMaster(GlobalLanguagesList, projectLanguages);
    }, [projectLanguages, storeDetails?.activeLanguages]);

    const handleRemove = async (languageCode: string) => {
        if (projectLanguages.length <= 1) {
            Toast.show({ content: t('atLeastOneLanguageRequired'), duration: 1500 });
            return;
        }

        const language = GlobalLanguagesList.find((item) => item.code === languageCode);
        if (!language) return;

        void Dialog.confirm({
            cancelText: t('keep'),
            confirmText: t('remove'),
            content: t('removeLanguageConfirm', { language: language.nativeName || language.name }),
            onConfirm: async () => {
                setIsSaving(true);
                try {
                    const updated = removeObjRef(projectData);
                    updated.languages = projectLanguages.filter((code) => code !== languageCode);
                    onSaved(updated);
                    Toast.show({ content: t('languageRemoved'), duration: 1200 });
                } catch {
                    Toast.show({ content: t('languageUpdateFailed'), duration: 2000 });
                } finally {
                    setIsSaving(false);
                }
            },
            title: t('removeLanguage'),
        });
    };

    const handleAdd = async () => {
        const targetLang = GlobalLanguagesList.find((lang) => lang.code === pendingLanguageCode);
        if (!targetLang) return;

        void Dialog.confirm({
            cancelText: t('cancel'),
            confirmText: t('addLanguageAction'),
            content: `${targetLang.nativeName || targetLang.name} will be added and translated across this ${labels.offeringPhrase}. This can take a little time.`,
            onConfirm: async () => {
                setIsSaving(true);
                try {
                    let updated = removeObjRef(projectData);
                    updated.languages = [...projectLanguages, targetLang.code];

                    const filesToTranslate = updated.files?.filter((file) => file.extractedData?.data) || [];
                    for (const file of filesToTranslate) {
                        const result = await translateFile(
                            updated,
                            file,
                            targetLang,
                            sourceLang,
                            AI_ACTIONS_TYPES.LANGUAGE_ADDITION
                        );
                        updated = result.updatedProject;
                    }

                    onSaved(updated);
                    setPendingLanguageCode('');
                    Toast.show({ content: t('languageAdded', { language: targetLang.name }), duration: 1200 });
                } catch (error) {
                    if (error instanceof AICapacityError) {
                        Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
                    } else {
                        Toast.show({ content: t('languageAddFailed'), duration: 2000 });
                    }
                } finally {
                    setIsSaving(false);
                }
            },
            title: t('addLanguage'),
        });
    };

    const handleMakePrimary = async (languageCode: string) => {
        if (!projectLanguages.includes(languageCode) || projectLanguages[0] === languageCode) {
            return;
        }

        setIsSaving(true);
        try {
            const updated = removeObjRef(projectData);
            updated.languages = [
                languageCode,
                ...projectLanguages.filter((code) => code !== languageCode),
            ];
            onSaved(updated);
            Toast.show({ content: t('primaryLanguage'), duration: 1200 });
        } catch {
            Toast.show({ content: t('languageUpdateFailed'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    };

    if (!visible) return null;

    return (
        <Popup
            bodyStyle={{ minHeight: '64vh', maxHeight: '92vh', overflowX: 'hidden', padding: 0 }}
            destroyOnClose
            onMaskClick={isSaving ? undefined : onClose}
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar
                    onBack={isSaving ? undefined : onClose}
                    right={isSaving ? <Text type="secondary">{t('updating')}</Text> : undefined}
                >
                    {t('manageLanguages')}
                </NavBar>

                <Flex gap={12} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    {isSaving ? (
                        <AiActionProgressPanel
                            detail={pendingLanguageCode
                                ? `Adding ${GlobalLanguagesList.find((language) => language.code === pendingLanguageCode)?.nativeName || pendingLanguageCode.toUpperCase()}`
                                : undefined}
                            helperText={t('keepScreenOpen')}
                            labels={[
                                t('checkingLanguagesStep'),
                                t('preparingTranslationStep'),
                                t('applyingTranslationsStep'),
                            ]}
                            title={t('updatingOfferingLanguage')}
                        />
                    ) : null}

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={6} vertical>
                            <Flex align="center" gap={8}>
                                <LuLanguages size={16} />
                                <Text strong>{t('availableLanguages')}</Text>
                            </Flex>
                            <Text type="secondary">
                                {t('menuLanguagesDesc')}
                            </Text>
                        </Flex>
                    </Card>

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={12} vertical>
                            {currentLanguages.map((language, index) => (
                                <Flex
                                    align="center"
                                    justify="space-between"
                                    key={language!.code}
                                    style={index > 0 ? { borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 } : undefined}
                                >
                                    <Flex gap={4} vertical>
                                        <Text strong>
                                            {language!.name} {language!.nativeName !== language!.name ? `(${language!.nativeName})` : ''}
                                        </Text>
                                        <Text type="secondary">
                                            {index === 0 ? t('primaryLanguage') : t('languageActive', { code: language!.code.toUpperCase() })}
                                        </Text>
                                    </Flex>
                                    {index === 0 ? (
                                        <Flex align="center" gap={6}>
                                            <LuCheck size={16} />
                                            <Text type="secondary">{t('primary')}</Text>
                                        </Flex>
                                    ) : (
                                        <Flex align="center" gap={6}>
                                            <Button
                                                disabled={isSaving}
                                                fill="outline"
                                                onClick={() => void handleMakePrimary(language!.code)}
                                                size="small"
                                            >
                                                {t('primary')}
                                            </Button>
                                            <Button
                                                color="danger"
                                                disabled={isSaving}
                                                fill="none"
                                                onClick={() => void handleRemove(language!.code)}
                                                size="small"
                                            >
                                                <LuTrash2 size={16} />
                                            </Button>
                                        </Flex>
                                    )}
                                </Flex>
                            ))}
                        </Flex>
                    </Card>

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={10} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{t('addLanguage')}</Text>
                                <Text type="secondary">
                                    {t('languagesLimit', { max: LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT })}
                                </Text>
                            </Flex>
                            <Select
                                onChange={setPendingLanguageCode}
                                options={addableLanguages.map((language) => ({
                                    label: language.nativeName !== language.name ? `${language.name} (${language.nativeName})` : language.name,
                                    value: language.code,
                                }))}
                                placeholder={t('chooseLanguage')}
                                value={pendingLanguageCode || undefined}
                            />
                            <Button
                                block
                                color="primary"
                                disabled={!pendingLanguageCode || isSaving}
                                loading={isSaving}
                                onClick={() => void handleAdd()}
                                size="large"
                            >
                                {t('addLanguageAction')}
                            </Button>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>

        </Popup>
    );
}
