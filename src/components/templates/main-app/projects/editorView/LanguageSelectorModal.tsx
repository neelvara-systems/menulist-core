import { LANGUAGE_CONSTANTS } from '@constant/languages';
import GlobalLanguagesList from '@data/languages';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getCanonicalProjectSourceLanguage, normalizeProjectLanguages } from '@lib/localization/languagePolicy';
import { canAddLanguage, getAvailableLanguagesForMaster, getAvailableLanguagesForOutlet, getRemainingLanguageSlots } from '@lib/localization/languageResolver';
import { hasMeaningfulDescription } from '@lib/menu/descriptionQuality';
import { StoreDataType } from '@type/platform/store';
import { Button, Flex, App, Modal, Progress, Select, Tag, theme, Tooltip, Typography } from 'antd';
import React, { useMemo, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuFileText, LuLanguages, LuLock, LuPlusCircle, LuSparkles, LuSquare, LuTrash2 } from 'react-icons/lu';
import { LanguageType, Project } from '../types';

const { Text } = Typography;

interface LanguageSelectorModalProps {
    canTranslate: boolean;
    projectData: Project;
    handleLanguageToggle: (updatedLanguages: string[]) => void;
    open?: boolean;
    onClose?: () => void;
    isTranslating?: boolean;
    translationProgress?: { currentFile: number; totalFiles: number; fileName?: string };
    onCancelTranslation?: () => void;
    /** Store data for multi-chain language governance filtering */
    storeDetails?: StoreDataType;
    /** Languages that exist in the master project (outlets can only activate these) */
    masterProjectLanguages?: string[];
    /** Whether this store is linked to a master project */
    isMasterLinked?: boolean;
}

const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
    canTranslate,
    projectData,
    handleLanguageToggle,
    open,
    onClose,
    isTranslating = false,
    translationProgress,
    onCancelTranslation,
    storeDetails,
    masterProjectLanguages,
    isMasterLinked = false
}) => {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const [isModalOpen, setIsModalOpen] = useState(false);
    // State now holds the full Language object or null
    const [languageToRemove, setLanguageToRemove] = useState<LanguageType | null>(null);
    const [languageToAdd, setLanguageToAdd] = useState<LanguageType | null>(null);
    const projectLanguages = useMemo(
        () => normalizeProjectLanguages(projectData.languages),
        [projectData.languages],
    );
    const sourceLanguageCode = getCanonicalProjectSourceLanguage(projectLanguages);
    const requestedDefaultLanguageCode = String(projectData.defaultLanguage || '').trim().toLowerCase();
    const defaultLanguageCode = projectLanguages.includes(requestedDefaultLanguageCode)
        ? requestedDefaultLanguageCode
        : sourceLanguageCode;

    // Calculate translation summary
    const translationSummary = useMemo(() => {
        let totalItems = 0;
        let totalCategories = 0;
        let totalDescriptions = 0;
        const fileCount = projectData.files?.length || 0;

        projectData.files?.forEach(file => {
            const data = file.extractedData?.data;
            if (data) {
                totalCategories += data.categories?.length || 0;
                totalItems += data.items?.length || 0;
                totalDescriptions += data.items?.filter(item =>
                    item.description && Object.values(item.description).some((description) => hasMeaningfulDescription(description))
                ).length || 0;
            }
        });

        return { fileCount, totalItems, totalCategories, totalDescriptions };
    }, [projectData.files]);

    // Calculate removal impact for a specific language
    const getRemovalImpact = (langCode: string) => {
        let itemNames = 0;
        let categoryNames = 0;
        let descriptions = 0;
        let attributes = 0;

        projectData.files?.forEach(file => {
            const data = file.extractedData?.data;
            if (data) {
                // Count categories with this language
                data.categories?.forEach(cat => {
                    if (cat.name?.[langCode]) categoryNames++;
                });
                // Count items with this language
                data.items?.forEach(item => {
                    if (item.name?.[langCode]) itemNames++;
                    if (item.description?.[langCode]) descriptions++;
                    item.attributes?.forEach(attr => {
                        if (attr.name?.[langCode]) attributes++;
                    });
                });
            }
        });

        return { itemNames, categoryNames, descriptions, attributes };
    };

    // Calculate translation quality score for a language
    const getTranslationQuality = (langCode: string) => {
        let translated = 0;
        let total = 0;
        const sourceLang = getCanonicalProjectSourceLanguage(projectData.languages);

        projectData.files?.forEach(file => {
            const data = file.extractedData?.data;
            if (data) {
                // Check categories
                data.categories?.forEach(cat => {
                    if (cat.name?.[sourceLang]) {
                        total++;
                        if (cat.name?.[langCode]?.trim()) translated++;
                    }
                });
                // Check items
                data.items?.forEach(item => {
                    if (item.name?.[sourceLang]) {
                        total++;
                        if (item.name?.[langCode]?.trim()) translated++;
                    }
                    if (hasMeaningfulDescription(item.description?.[sourceLang])) {
                        total++;
                        if (hasMeaningfulDescription(item.description?.[langCode])) translated++;
                    }
                });
            }
        });

        const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;
        return { translated, total, percentage };
    };

    const showModal = () => {
        setIsModalOpen(true);
        setLanguageToRemove(null);
        setLanguageToAdd(null);
    };

    const handleClose = () => {
        if (isTranslating) return; // Prevent closing during translation
        if (onClose) {
            onClose();
        } else {
            setIsModalOpen(false);
        }
        setLanguageToRemove(null);
        setLanguageToAdd(null);
    };

    // Use controlled open prop if provided, otherwise use internal state
    const modalOpen = open !== undefined ? open : isModalOpen;

    // --- Action Handlers ---
    const handleConfirmRemove = () => {
        // Check if languageToRemove and its code exist
        if (!languageToRemove?.code) return;
        const currentLanguages = projectLanguages;
        if (languageToRemove.code === sourceLanguageCode) {
            messageApi.info('English is the source for translations and cannot be removed.');
            return;
        }
        if (languageToRemove.code === defaultLanguageCode) {
            messageApi.info('Change the default customer language before removing it.');
            return;
        }
        if (currentLanguages.length <= 1) {
            messageApi.warning('At least one language must remain selected');
            return;
        }
        // Filter using the code from the stored object
        const updatedLanguages = normalizeProjectLanguages(
            currentLanguages.filter(langCode => langCode !== languageToRemove.code),
        );
        handleLanguageToggle(updatedLanguages);
        handleClose();
    };

    const handleConfirmAdd = () => {
        if (!canTranslate) {
            messageApi.info('You do not have permission to add translated languages.');
            return;
        }
        // Check if languageToAdd and its code exist
        if (!languageToAdd?.code) return;
        const currentLanguages = projectLanguages;
        // Add the code from the stored object
        const updatedLanguages = normalizeProjectLanguages([...currentLanguages, languageToAdd.code]);
        handleLanguageToggle(updatedLanguages);
        // Don't close - let parent control via isTranslating prop
    };

    // --- Staging Handlers ---
    // Accepts the full Language object
    const handleStageRemove = (language: LanguageType | undefined | null) => {
        if (!language) return; // Guard against undefined/null
        setLanguageToRemove(language);
        setLanguageToAdd(null);
    };

    // Accepts the full Language object
    const handleStageAdd = (language: LanguageType | undefined | null) => {
        if (!language) return; // Guard against undefined/null
        setLanguageToAdd(language);
        setLanguageToRemove(null);
    };

    // Get native name helper
    const getNativeLabel = (langData: any) => {
        if (!langData) return '';
        return langData.nativeName !== langData.name
            ? `${langData.nativeName} (${langData.name})`
            : langData.name;
    };

    return (
        <>
            {/* Only show button when not controlled by parent */}
            {open === undefined && (
                <Button icon={<LuLanguages />} onClick={showModal}>
                    Language
                </Button>
            )}
            <Modal
                title={isTranslating ? `🌍 Adding ${languageToAdd?.nativeName || languageToAdd?.name}...` : "Manage Menu Languages"}
                open={modalOpen}
                onCancel={handleClose}
                footer={null}
                width={500}
                maskClosable={!isTranslating}
                closable={!isTranslating}
            >
                {/* Translation Progress View */}
                {isTranslating && translationProgress && (
                    <Flex vertical gap={16} style={{ padding: '8px 0' }}>
                        <Progress
                            percent={Math.round((translationProgress.currentFile / translationProgress.totalFiles) * 100)}
                            status="active"
                            strokeColor={{ from: '#108ee9', to: '#87d068' }}
                        />
                        <Flex vertical align="center" gap={8}>
                            <Flex align="center" gap={8}>
                                <LuFileText size={18} />
                                <Text>
                                    Translating <Text strong>&ldquo;{translationProgress.fileName || 'file'}&rdquo;</Text>
                                </Text>
                            </Flex>
                            <Text type="secondary">
                                File {translationProgress.currentFile} of {translationProgress.totalFiles}
                            </Text>
                        </Flex>
                        <Text type="secondary" style={{ textAlign: 'center', fontSize: 12 }}>
                            Translation in progress...
                        </Text>
                        {onCancelTranslation && (
                            <Button
                                danger
                                icon={<LuSquare size={14} />}
                                onClick={onCancelTranslation}
                                style={{ marginTop: 8 }}
                            >
                                Cancel Translation
                            </Button>
                        )}
                    </Flex>
                )}

                {/* Main Language Selection View */}
                {!isTranslating && (
                    <>
                        {/* Introduction Section */}
                        <div style={{ marginBottom: 16 }}>
                            <Flex align="center" gap={12}>
                                <div style={{ fontSize: 24, color: '#1890ff' }}>
                                    <LuSparkles />
                                </div>
                                <Text type="secondary">
                                    {isMasterLinked
                                        ? `Activate languages from your main ${labels.offeringPhrase}, or remove ones you don't need. Only local ${labels.itemsPlural} will be translated.`
                                        : `Add languages to translate your ${labels.offeringLower} automatically, or remove ones you don't need.`
                                    }
                                </Text>
                            </Flex>
                        </div>

                        <Flex vertical gap={16}>
                            {/* Display Current Languages with Quality Score */}
                            <Flex wrap="wrap" justify='center' align='center' gap={8}>
                                {projectLanguages.map((langCode) => {
                                    const langData = GlobalLanguagesList.find(al => al.code === langCode);
                                    const isStagedForRemoval = languageToRemove?.code === langCode;
                                    const isSourceLanguage = langCode === sourceLanguageCode;
                                    const isDefaultLanguage = langCode === defaultLanguageCode;
                                    const quality = !isSourceLanguage ? getTranslationQuality(langCode) : null;

                                    // Determine color based on quality
                                    let tagColor = 'success';
                                    if (isStagedForRemoval) tagColor = 'error';
                                    else if (quality && quality.percentage < 50) tagColor = 'warning';
                                    else if (quality && quality.percentage < 100) tagColor = 'processing';

                                    // Tooltip content differs for primary vs secondary languages
                                    const tooltipContent = isSourceLanguage ? (
                                        <>
                                            <div style={{ fontWeight: 600 }}>🔒 Translation source</div>
                                            <div style={{ fontSize: 11, opacity: 0.8 }}>{langData?.nativeName || langData?.name}</div>
                                            <div style={{ fontSize: 11, opacity: 0.6 }}>English is the source for all translations</div>
                                        </>
                                    ) : isStagedForRemoval ? (
                                        'Click to confirm removal'
                                    ) : (
                                        <>
                                            <div>{langData?.nativeName || langData?.name}</div>
                                            <div style={{ fontSize: 11, opacity: 0.8 }}>
                                                {quality ? `${quality.percentage}% translated (${quality.translated}/${quality.total})` : ''}
                                            </div>
                                            <div style={{ fontSize: 11, opacity: 0.6 }}>Click to remove</div>
                                        </>
                                    );

                                    return (
                                        <Tooltip key={langCode} title={tooltipContent}>
                                            <Tag
                                                color={isSourceLanguage ? 'blue' : tagColor}
                                                icon={isSourceLanguage ? <LuLock size={12} /> : (isStagedForRemoval ? <LuTrash2 /> : <LuCheck />)}
                                                onClick={() => {
                                                    if (isSourceLanguage) {
                                                        messageApi.info('English is the source for translations and cannot be removed.');
                                                        return;
                                                    }
                                                    if (isDefaultLanguage) {
                                                        messageApi.info('Change the default customer language before removing it.');
                                                        return;
                                                    }
                                                    handleStageRemove(langData);
                                                }}
                                                style={{
                                                    width: 'max-content',
                                                    padding: '6px 12px',
                                                    borderRadius: '16px',
                                                    fontSize: 12,
                                                    cursor: isSourceLanguage ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    margin: 0,
                                                    transition: 'all 0.3s',
                                                }}
                                            >
                                                {langData?.nativeName || langData?.name}
                                                {isSourceLanguage && (
                                                    <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 2 }}>
                                                        Source
                                                    </span>
                                                )}
                                                {isDefaultLanguage && (
                                                    <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 2 }}>
                                                        Default
                                                    </span>
                                                )}
                                                {!isSourceLanguage && quality && quality.percentage < 100 && (
                                                    <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
                                                        {quality.percentage}%
                                                    </span>
                                                )}
                                            </Tag>
                                        </Tooltip>
                                    );
                                })}
                            </Flex>

                            {/* Language Dropdown with Native Names */}
                            {/* MAX_LANGUAGES Check: Disable dropdown when limit reached */}
                            {!canAddLanguage(projectLanguages) ? (
                                <div style={{
                                    background: token.colorInfoBg,
                                    border: `1px solid ${token.colorInfoBorder}`,
                                    borderRadius: 8,
                                    padding: 12,
                                    textAlign: 'center'
                                }}>
                                    <Text type="secondary">
                                        🌍 Maximum {LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT} languages reached.
                                        Remove a language to add another.
                                    </Text>
                                </div>
                            ) : (
                                <>
                                    <Select
                                        aria-label={isMasterLinked ? "Activate menu language" : "Add menu language"}
                                        disabled={!canTranslate}
                                        style={{ width: '100%' }}
                                        placeholder={isMasterLinked
                                            ? `🌍 Activate a language... (${getRemainingLanguageSlots(projectLanguages)} slots remaining)`
                                            : `🌍 Add a new language... (${getRemainingLanguageSlots(projectLanguages)} slots remaining)`
                                        }
                                        showSearch
                                        optionFilterProp="label"
                                        value={languageToAdd?.code}
                                        suffixIcon={<LuPlusCircle />}
                                        onChange={(value) => {
                                            if (value) {
                                                const selectedLangObject = GlobalLanguagesList.find(lang => lang.code === value);
                                                handleStageAdd(selectedLangObject);
                                            }
                                        }}
                                        options={(() => {
                                            // Multi-chain language governance: Filter languages based on store type
                                            const currentProjectLanguages = projectLanguages;
                                            let availableLanguages;

                                            if (isMasterLinked && masterProjectLanguages && masterProjectLanguages.length > 0) {
                                                // Outlet store linked to master: Can ONLY activate languages that master project has
                                                // This ensures outlets don't create new translations - they just activate existing ones
                                                availableLanguages = getAvailableLanguagesForOutlet(
                                                    GlobalLanguagesList,
                                                    masterProjectLanguages,
                                                    currentProjectLanguages
                                                );
                                            } else if (storeDetails?.activeLanguages && storeDetails.activeLanguages.length > 0) {
                                                // Store has activeLanguages defined: use those
                                                availableLanguages = getAvailableLanguagesForOutlet(
                                                    GlobalLanguagesList,
                                                    storeDetails.activeLanguages,
                                                    currentProjectLanguages
                                                );
                                            } else {
                                                // Master store or standalone: Can add any language (triggers AI translation)
                                                availableLanguages = getAvailableLanguagesForMaster(
                                                    GlobalLanguagesList,
                                                    currentProjectLanguages
                                                );
                                            }

                                            return availableLanguages
                                                .filter(lang => lang.code !== languageToRemove?.code)
                                                .map(lang => ({
                                                    label: lang.nativeName !== lang.name
                                                        ? `${lang.nativeName} (${lang.name})`
                                                        : lang.name,
                                                    value: lang.code
                                                }));
                                        })()}
                                    />
                                    {!canTranslate && (
                                        <Text type="secondary">
                                            Translation access is required to add a language. Existing languages can still be reviewed or removed.
                                        </Text>
                                    )}
                                </>
                            )}

                            {/* Action Button Area */}
                            <Flex justify="center" style={{ marginTop: 16 }}>
                                {languageToRemove && (() => {
                                    const impact = getRemovalImpact(languageToRemove.code);
                                    const hasData = impact.itemNames > 0 || impact.categoryNames > 0 || impact.descriptions > 0;
                                    return (
                                        <Flex vertical gap={12} align="center" style={{ width: '100%' }}>
                                            {/* Warning box with impact details */}
                                            <div style={{
                                                background: token.colorWarningBg,
                                                border: `1px solid ${token.colorWarningBorder}`,
                                                borderRadius: 8,
                                                padding: 12,
                                                width: '100%'
                                            }}>
                                                <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
                                                    <LuAlertTriangle size={16} color={token.colorWarning} />
                                                    <Text strong style={{ color: token.colorWarningText }}>
                                                        Remove {languageToRemove.nativeName || languageToRemove.name}?
                                                    </Text>
                                                </Flex>
                                                {hasData ? (
                                                    <Flex vertical gap={4}>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            This will remove the following from your {labels.offeringLower}:
                                                        </Text>
                                                        <Flex vertical gap={2} style={{ fontSize: 12, marginLeft: 8 }}>
                                                            {impact.itemNames > 0 && (
                                                                <Text type="secondary">• {impact.itemNames} translated item names</Text>
                                                            )}
                                                            {impact.categoryNames > 0 && (
                                                                <Text type="secondary">• {impact.categoryNames} translated category names</Text>
                                                            )}
                                                            {impact.descriptions > 0 && (
                                                                <Text type="secondary">• {impact.descriptions} translated descriptions</Text>
                                                            )}
                                                            {impact.attributes > 0 && (
                                                                <Text type="secondary">• {impact.attributes} translated attributes</Text>
                                                            )}
                                                        </Flex>
                                                        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                                                            💡 Translations are saved and can be restored by re-adding the language.
                                                        </Text>
                                                    </Flex>
                                                ) : (
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        No translations exist for this language yet.
                                                    </Text>
                                                )}
                                            </div>
                                            <Flex gap={8}>
                                                <Button onClick={() => setLanguageToRemove(null)}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="primary"
                                                    danger
                                                    icon={<LuTrash2 />}
                                                    onClick={handleConfirmRemove}
                                                >
                                                    Remove Language
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    );
                                })()}
                                {languageToAdd && (
                                    <Button
                                        type="primary"
                                        disabled={!canTranslate}
                                        icon={<LuPlusCircle />}
                                        onClick={handleConfirmAdd}
                                    >
                                        Add {languageToAdd?.nativeName || languageToAdd?.name}
                                    </Button>
                                )}
                                {!languageToRemove && !languageToAdd && (
                                    <Text type="secondary">
                                        Click a language to remove, or select a new one to add.
                                    </Text>
                                )}
                            </Flex>
                        </Flex>
                    </>
                )}
            </Modal >
        </>
    );
};

export default LanguageSelectorModal;
