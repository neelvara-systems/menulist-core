'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { LANGUAGE_CONSTANTS } from '@constant/languages';
import GlobalLanguagesList from '@data/languages';
import { updateProject } from '@database/projects';
import { getAvailableLanguagesForMaster, getAvailableLanguagesForOutlet } from '@lib/localization/languageResolver';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { AICapacityError } from '@services/ai/capacityError';
import { removeObjRef } from '@util/utils';
import { useTranslations } from 'next-intl';
import { useContext, useMemo, useState } from 'react';
import { LuCheck, LuLanguages, LuPlus, LuTrash2, LuX } from 'react-icons/lu';
import type { Project } from '../../templates/main-app/projects/types';
import { translateFile } from '../../templates/main-app/projects/utils/translationsUtils';
import { Button, Card, Dialog, Flex, NavBar, Popup, Select, Text, Toast } from '../antd';

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
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingLanguageCode, setPendingLanguageCode] = useState<string>('');

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
                    await updateProject(updated);
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

            await updateProject(updated);
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

                <Flex gap={12} style={{ overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    <Card size="small">
                        <Flex gap={6} vertical>
                            <Flex align="center" gap={8}>
                                <LuLanguages size={16} />
                                <Text strong>{t('menuLanguages')}</Text>
                            </Flex>
                            <Text type="secondary">
                                {t('menuLanguagesDesc')}
                            </Text>
                        </Flex>
                    </Card>

                    <Card size="small">
                        <Flex gap={12} vertical>
                            {currentLanguages.map((language, index) => (
                                <Flex align="center" justify="space-between" key={language!.code}>
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
                                        <Button
                                            color="danger"
                                            disabled={isSaving}
                                            fill="none"
                                            onClick={() => void handleRemove(language!.code)}
                                            size="small"
                                        >
                                            <LuTrash2 size={16} />
                                        </Button>
                                    )}
                                </Flex>
                            ))}
                        </Flex>
                    </Card>

                    <Card size="small">
                        <Flex gap={10} vertical>
                            <Text strong>{t('addLanguage')}</Text>
                            <Select
                                onChange={setPendingLanguageCode}
                                options={addableLanguages.map((language) => ({
                                    label: language.nativeName !== language.name ? `${language.name} (${language.nativeName})` : language.name,
                                    value: language.code,
                                }))}
                                placeholder={t('chooseLanguage')}
                                value={pendingLanguageCode || undefined}
                            />
                            <Text type="secondary">
                                {t('languagesLimit', { max: LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT })}
                            </Text>
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
