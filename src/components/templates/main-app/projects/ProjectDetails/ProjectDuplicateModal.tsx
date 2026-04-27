import { useOfferingLabels } from '@hook/useOfferingLabels';
import { applyLocalizedProjectDraftMap, getLocalizedProjectValue, getProjectLanguageLabel, getProjectManagedLanguages, getProjectPreferredLanguage } from '@lib/localization/projectContent';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { Alert, Button, Card, Flex, Input, Modal, Select, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ProjectMetadata } from '../types';

const { Text } = Typography;
const { useToken } = theme;

interface ProjectDuplicateModalProps {
    open: boolean;
    project: ProjectMetadata | null;
    onCancel: () => void;
    onDuplicate: (
        newName: string,
        newDescription?: string,
        localizedName?: Record<string, string>,
        localizedDescription?: Record<string, string>,
    ) => Promise<void>;
}

export const ProjectDuplicateModal = ({ open, project, onCancel, onDuplicate }: ProjectDuplicateModalProps) => {
    const [loading, setLoading] = useState(false);
    const [languages, setLanguages] = useState<string[]>(['en']);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
    const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({});
    const { token } = useToken();
    const tBusiness = useTranslations('BusinessSettings');
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);

    // Reset form when project changes or modal opens
    useEffect(() => {
        if (open && project) {
            const nextLanguages = getProjectManagedLanguages(project);
            const nextSelectedLanguage = getProjectPreferredLanguage(project);
            const nextNameDrafts = Object.fromEntries(
                nextLanguages.map((languageCode) => [
                    languageCode,
                    getLocalizedProjectValue(project.name, languageCode, ''),
                ])
            );
            nextNameDrafts[nextSelectedLanguage] = `Copy of ${nextNameDrafts[nextSelectedLanguage] || getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Untitled')}`;
            const nextDescriptionDrafts = Object.fromEntries(
                nextLanguages.map((languageCode) => [
                    languageCode,
                    getLocalizedProjectValue(project.description, languageCode, ''),
                ])
            );
            setLanguages(nextLanguages);
            setSelectedLanguage(nextSelectedLanguage);
            setNameDrafts(nextNameDrafts);
            setDescriptionDrafts(nextDescriptionDrafts);
        }
    }, [open, project]);

    const handleSubmit = async () => {
        const nameValue = (nameDrafts[selectedLanguage] || '').trim();
        const descriptionValue = (descriptionDrafts[selectedLanguage] || '').trim();
        const localizedName = applyLocalizedProjectDraftMap(undefined, nameDrafts);
        const localizedDescription = applyLocalizedProjectDraftMap(undefined, descriptionDrafts);

        if (!nameValue || !localizedName) {
            return;
        }

        try {
            setLoading(true);
            await onDuplicate(nameValue, descriptionValue || undefined, localizedName, localizedDescription);
            onCancel();
        } catch (error) {
            console.error('Duplicate failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        onCancel();
    };

    const referenceLanguage = getProjectPreferredLanguage(project);
    const nameValue = nameDrafts[selectedLanguage] || '';
    const descriptionValue = descriptionDrafts[selectedLanguage] || '';
    const referenceName = nameDrafts[referenceLanguage] || '';
    const referenceDescription = descriptionDrafts[referenceLanguage] || '';

    return (
        <Modal
            title={`Duplicate ${offeringName}`}
            open={open}
            onOk={handleSubmit}
            onCancel={handleCancel}
            okText="Duplicate"
            confirmLoading={loading}
            width={520}
        >
                <Alert
                    message="Creating a copy"
                    description={
                        <Flex vertical gap={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Original {labels.offeringPhrase}: <Text strong>{project ? getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Untitled') : ''}</Text>
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                All categories, {labels.itemsPlural}, images, languages, and theme will be copied.
                            </Text>
                        </Flex>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Flex gap={12} vertical style={{ marginBottom: 16 }}>
                    {languages.length > 1 ? (
                        <>
                            <Typography.Text strong>{tBusiness('contentLanguageTitle')}</Typography.Text>
                            <Select
                                onChange={setSelectedLanguage}
                                options={languages.map((languageCode) => ({
                                    label: getProjectLanguageLabel(languageCode),
                                    value: languageCode,
                                }))}
                                value={selectedLanguage}
                            />
                        </>
                    ) : null}
                    <Typography.Text strong>{`New ${offeringName} Name`}</Typography.Text>
                    <Input
                        maxLength={100}
                        onChange={(event) => setNameDrafts((previous) => ({
                            ...previous,
                            [selectedLanguage]: event.target.value,
                        }))}
                        placeholder={`Enter new ${labels.offeringPhrase} name`}
                        value={nameValue}
                    />
                    {selectedLanguage !== referenceLanguage ? (
                        <ReferenceCard
                            onUseReference={() => setNameDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: referenceName,
                            }))}
                            referenceLabel={getProjectLanguageLabel(referenceLanguage)}
                            referenceValue={referenceName}
                            token={token}
                        />
                    ) : null}
                </Flex>

                <Flex gap={12} vertical style={{ marginBottom: 16 }}>
                    <Typography.Text strong>Description (Optional)</Typography.Text>
                    <Input.TextArea
                        maxLength={500}
                        onChange={(event) => setDescriptionDrafts((previous) => ({
                            ...previous,
                            [selectedLanguage]: event.target.value,
                        }))}
                        placeholder={`Enter description (e.g., Seasonal ${offeringName})`}
                        rows={3}
                        value={descriptionValue}
                    />
                    {selectedLanguage !== referenceLanguage ? (
                        <ReferenceCard
                            onUseReference={() => setDescriptionDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: referenceDescription,
                            }))}
                            referenceLabel={getProjectLanguageLabel(referenceLanguage)}
                            referenceValue={referenceDescription}
                            token={token}
                        />
                    ) : null}
                </Flex>

                {/* Helpful Tips */}
                <Card
                    size="small"
                    style={{
                        background: token.colorInfoBg,
                        borderColor: token.colorInfoBorder,
                        borderRadius: 6,
                        marginTop: 8
                    }}
                >
                    <Flex gap={8} align="flex-start">
                        <Text style={{ fontSize: 16 }}>💡</Text>
                        <Flex vertical gap={8}>
                            <Text strong style={{ fontSize: 13 }}>
                                Common Use Cases
                            </Text>
                            <Flex vertical gap={6} style={{ paddingLeft: 8 }}>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        <Text strong>Seasonal updates:</Text> Duplicate your current {labels.offeringPhrase}, then adjust prices, timing, or featured {labels.itemsPlural}
                                    </Text>
                                </Flex>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        <Text strong>Multi-location:</Text> Copy your main {labels.offeringPhrase} and adjust local pricing or availability
                                    </Text>
                                </Flex>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>•</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        <Text strong>Testing Changes:</Text> Duplicate before major edits to keep original safe
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>
        </Modal>
    );
};

function ReferenceCard({
    onUseReference,
    referenceLabel,
    referenceValue,
    token,
}: {
    onUseReference: () => void;
    referenceLabel: string;
    referenceValue: string;
    token: any;
}) {
    return (
        <div
            style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 6,
                padding: 12,
            }}
        >
            <Flex align="center" gap={12} justify="space-between">
                <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Text type="secondary">{`${referenceLabel} reference`}</Text>
                    <Text>{referenceValue || 'No reference content available yet.'}</Text>
                </Flex>
                {referenceValue ? (
                    <Button onClick={onUseReference} size="small">
                        Use reference
                    </Button>
                ) : null}
            </Flex>
        </div>
    );
}
