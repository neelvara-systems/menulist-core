'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { LANGUAGE_CONSTANTS } from '@constant/languages';
import { updateProjectMetadata } from '@database/projects';
import GlobalLanguagesList from '@data/languages';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getAvailableLanguagesForMaster, getAvailableLanguagesForOutlet } from '@lib/localization/languageResolver';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { AICapacityError } from '@services/ai/capacityError';
import translateProjectPublicContent from '@services/ai/projectPublicContent/translateProjectPublicContent';
import { removeObjRef } from '@util/utils';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useMemo, useState } from 'react';
import { LuCheck, LuLanguages, LuSparkles, LuTrash2 } from 'react-icons/lu';
import type { Project, ProjectSummaryData } from '../../templates/main-app/projects/types';
import { translateFile } from '../../templates/main-app/projects/utils/translationsUtils';
import { Button, Card, Dialog, Flex, NavBar, Popup, Select, Text, Toast } from '../antd';
import AiActionProgressPanel from '../components/AiActionProgressPanel';
import { getProjectLanguageIssues, repairLanguageProject } from '../utils/languageRepair';
import { MENU_SHEET_CONTAINER_STYLE, MENU_SHEET_BODY_STYLE } from './menuSheetLayout';

const DISTINCT_SCRIPT_LANGUAGE_CODES = new Set(['ar', 'bn', 'hi', 'mr', 'ta', 'te', 'zh']);

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
    const [savingDetail, setSavingDetail] = useState<string>('');
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

    const languageIssues = useMemo(
        () => getProjectLanguageIssues(projectData, sourceLangCode),
        [projectData, sourceLangCode]
    );

    const languageIssuesByCode = useMemo(
        () => Object.fromEntries(languageIssues.map((issue) => [issue.code, issue])),
        [languageIssues]
    );

    const languagesNeedingRepair = useMemo(
        () => languageIssues.filter((issue) => issue.total > 0),
        [languageIssues]
    );
    const hasLatinScriptRepairLanguages = useMemo(() => (
        languagesNeedingRepair.some((issue) => !DISTINCT_SCRIPT_LANGUAGE_CODES.has(issue.code))
    ), [languagesNeedingRepair]);

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

        setIsSaving(true);
        setSavingDetail(`Adding ${targetLang.nativeName || targetLang.name}`);
        try {
            let updated = removeObjRef(projectData);
            updated.languages = [...projectLanguages, targetLang.code];

            const filesToTranslate = updated.files?.filter((file) => file.extractedData?.data) || [];
            let hadTranslationError = false;

            for (const file of filesToTranslate) {
                const fileLanguages = file.extractedData?.data?.languages || [];
                const hasLanguageOnFile = fileLanguages.some((language) => language.code === targetLang.code);

                if (!hasLanguageOnFile && file.extractedData?.data) {
                    file.extractedData.data.languages = [
                        ...fileLanguages,
                        {
                            code: targetLang.code,
                            isPrimary: false,
                            name: targetLang.name,
                        },
                    ];
                }

                const result = await translateFile(
                    updated,
                    file,
                    targetLang,
                    sourceLang,
                    AI_ACTIONS_TYPES.LANGUAGE_ADDITION
                );

                if (result.messageType === 'error') {
                    hadTranslationError = true;
                    break;
                }

                updated = result.updatedProject;
            }

            if (hadTranslationError) {
                throw new Error('Language translation failed.');
            }

            const translatedProjectContent = await translateProjectPublicContent({
                projectDetails: updated,
                projectId: updated.projectId,
                storeDetails,
                targetLanguageCodes: [targetLang.code],
            });
            const projectMetadataTranslationUpdate: Partial<ProjectSummaryData> = {};

            if (translatedProjectContent) {
                if (translatedProjectContent.name) {
                    updated.name = translatedProjectContent.name as any;
                    projectMetadataTranslationUpdate.name = translatedProjectContent.name;
                }
                if (translatedProjectContent.description) {
                    updated.description = translatedProjectContent.description as any;
                    projectMetadataTranslationUpdate.description = translatedProjectContent.description;
                }
                if (translatedProjectContent.specialNote) {
                    updated.menuSettings = {
                        ...(updated.menuSettings || {}),
                        specialNote: translatedProjectContent.specialNote,
                    };
                }
                if (translatedProjectContent.specialMenuDisplayName) {
                    updated._specialMenu = {
                        ...(updated._specialMenu || {}),
                        displayName: translatedProjectContent.specialMenuDisplayName,
                    };
                    (updated as any).specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                    projectMetadataTranslationUpdate.specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                }
            }

            onSaved(updated);
            if (Object.keys(projectMetadataTranslationUpdate).length > 0) {
                await updateProjectMetadata(updated.projectId, projectMetadataTranslationUpdate);
            }
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
            setSavingDetail('');
        }
    };

    const handleRepairLanguage = async (languageCode: string) => {
        const language = GlobalLanguagesList.find((item) => item.code === languageCode);
        const issue = languageIssuesByCode[languageCode];
        if (!language || !issue || issue.total === 0) return;

        void Dialog.confirm({
            cancelText: t('keep'),
            confirmText: 'Repair',
            content: `This will rebuild ${language.nativeName || language.name} from the primary language, refill missing translations, and replace text that looks like it belongs to the wrong language.`,
            onConfirm: async () => {
                setIsSaving(true);
                setSavingDetail(`Repairing ${language.nativeName || language.name}`);
                try {
                    const updated = await repairLanguageProject(projectData, languageCode, sourceLang.code);
                    onSaved(updated);
                    Toast.show({ content: `${language.name} repaired`, duration: 1400 });
                } catch (error) {
                    if (error instanceof AICapacityError) {
                        Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
                    } else {
                        Toast.show({ content: 'Language repair failed', duration: 2000 });
                    }
                } finally {
                    setIsSaving(false);
                    setSavingDetail('');
                }
            },
            title: `Repair ${language.nativeName || language.name}?`,
        });
    };

    const handleRepairAll = async () => {
        if (languagesNeedingRepair.length === 0) return;

        void Dialog.confirm({
            cancelText: t('keep'),
            confirmText: 'Repair all',
            content: 'This will rebuild every language that has missing or likely wrong text using the primary language as the source.',
            onConfirm: async () => {
                setIsSaving(true);
                setSavingDetail('Repairing all languages');
                try {
                    let updated = removeObjRef(projectData);
                    for (const issue of languagesNeedingRepair) {
                        updated = await repairLanguageProject(updated, issue.code, sourceLang.code);
                    }
                    onSaved(updated);
                    Toast.show({ content: 'All language issues repaired', duration: 1500 });
                } catch (error) {
                    if (error instanceof AICapacityError) {
                        Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
                    } else {
                        Toast.show({ content: 'Language repair failed', duration: 2000 });
                    }
                } finally {
                    setIsSaving(false);
                    setSavingDetail('');
                }
            },
            title: 'Repair all language issues?',
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
            setSavingDetail('');
        }
    };

    if (!visible) return null;

    return (
        <Popup
            bodyStyle={MENU_SHEET_BODY_STYLE}
            destroyOnClose
            onMaskClick={isSaving ? undefined : onClose}
            visible={visible}
        >
            <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                <NavBar
                    onBack={isSaving ? undefined : onClose}
                    right={isSaving ? <Text type="secondary">{t('updating')}</Text> : undefined}
                >
                    {t('manageLanguages')}
                </NavBar>

                <Flex gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    {isSaving ? (
                        <AiActionProgressPanel
                            detail={pendingLanguageCode
                                ? `Adding ${GlobalLanguagesList.find((language) => language.code === pendingLanguageCode)?.nativeName || pendingLanguageCode.toUpperCase()}`
                                : savingDetail || undefined}
                            helperText={t('keepScreenOpen')}
                            labels={[
                                t('checkingLanguagesStep'),
                                t('preparingTranslationStep'),
                                t('applyingTranslationsStep'),
                            ]}
                            title={t('updatingOfferingLanguage')}
                        />
                    ) : null}

                    {!isSaving ? (
                        <>
                            <Card size="small" style={sectionCardStyle}>
                                <Flex gap={6} vertical>
                                    <Flex align="center" gap={8}>
                                        <LuLanguages size={16} />
                                        <Text strong>{t('availableLanguages')}</Text>
                                    </Flex>
                                    <Text type="secondary">
                                        {t('menuLanguagesDesc')}
                                    </Text>
                                    <Text type="secondary">
                                        Added languages become selectable during translation and editing across this {labels.offeringLower}.
                                    </Text>
                                </Flex>
                            </Card>

                            {languagesNeedingRepair.length > 0 ? (
                                <Card size="small" style={sectionCardStyle}>
                                    <Flex gap={10} vertical>
                                        <Flex align="center" gap={8} justify="space-between">
                                            <Flex align="center" gap={8}>
                                                <LuSparkles size={16} />
                                                <Text strong>Language issues</Text>
                                            </Flex>
                                            {languagesNeedingRepair.length > 1 ? (
                                                <Button fill="outline" onClick={() => void handleRepairAll()} size="small">
                                                    Repair all
                                                </Button>
                                            ) : null}
                                        </Flex>
                                        <Text type="secondary">
                                            Fix missing translations and text that looks like it was entered in the wrong language.
                                        </Text>
                                        {hasLatinScriptRepairLanguages ? (
                                            <Text type="secondary">
                                                For languages that use English letters, quickly review a few items after repair.
                                            </Text>
                                        ) : null}
                                    </Flex>
                                </Card>
                            ) : null}

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
                                                    {index === 0
                                                        ? t('primaryLanguage')
                                                        : (() => {
                                                            const issue = languageIssuesByCode[language!.code];
                                                            if (!issue || issue.total === 0) {
                                                                return `${t('languageActive', { code: language!.code.toUpperCase() })} · Ready`;
                                                            }

                                                            const parts = [];
                                                            if (issue.missing > 0) {
                                                                parts.push(`${issue.missing} missing`);
                                                            }
                                                            if (issue.mismatched > 0) {
                                                                parts.push(`${issue.mismatched} likely wrong`);
                                                            }
                                                            return parts.join(' · ');
                                                        })()}
                                                </Text>
                                            </Flex>
                                            {index === 0 ? (
                                                <Flex align="center" gap={6}>
                                                    <LuCheck size={16} />
                                                    <Text type="secondary">{t('primary')}</Text>
                                                </Flex>
                                            ) : (
                                                <Flex align="center" gap={6}>
                                                    {(languageIssuesByCode[language!.code]?.total || 0) > 0 ? (
                                                        <Button
                                                            fill="outline"
                                                            onClick={() => void handleRepairLanguage(language!.code)}
                                                            size="small"
                                                        >
                                                            Repair
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        fill="outline"
                                                        onClick={() => void handleMakePrimary(language!.code)}
                                                        size="small"
                                                    >
                                                        {t('primary')}
                                                    </Button>
                                                    <Button
                                                        color="danger"
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
                                        disabled={!pendingLanguageCode}
                                        onClick={() => void handleAdd()}
                                        size="large"
                                    >
                                        {t('addLanguageAction')}
                                    </Button>
                                </Flex>
                            </Card>
                        </>
                    ) : null}
                </Flex>
            </Flex>

        </Popup>
    );
}
