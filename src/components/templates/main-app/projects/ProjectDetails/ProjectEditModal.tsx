import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getProjectLanguageLabel } from '@lib/localization/projectContent';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, type MediaImageCropIntent, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import { Button, Flex, Form, FormInstance, Input, Modal, Select, Switch, message, theme, Typography } from "antd";
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import { ProjectMetadata } from '../types';

export interface ProjectFormData {
    name: string;
    description?: string;
    active?: boolean;
    isDefault?: boolean;
    projectImage?: string | null;
}


interface ProjectEditModalProps {
    currentDefaultProjectName: string | null;
    isOpen: boolean;
    editingProject: ProjectMetadata | null;
    form: FormInstance<ProjectFormData>;
    languages: string[];
    nameValue: string;
    descriptionValue: string;
    onCancel: () => void;
    onDescriptionChange: (value: string) => void;
    onLanguageChange: (languageCode: string) => void;
    onNameChange: (value: string) => void;
    onGenerateProjectImage?: () => Promise<string | null>;
    onProjectImagePrepared?: (prepared: PreparedMediaImage | null) => void;
    onTranslatePublicContent?: () => void;
    referenceDescription: string;
    referenceLanguage: string;
    referenceName: string;
    onSubmit: () => void;
    onReset: () => void;
    selectedLanguage: string;
    translateActionDisabled?: boolean;
    translateActionLoading?: boolean;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
    currentDefaultProjectName,
    isOpen,
    editingProject,
    form,
    languages,
    nameValue,
    descriptionValue,
    onCancel,
    onDescriptionChange,
    onLanguageChange,
    onNameChange,
    onGenerateProjectImage,
    onProjectImagePrepared,
    onTranslatePublicContent,
    referenceDescription,
    referenceLanguage,
    referenceName,
    onSubmit,
    onReset,
    selectedLanguage,
    translateActionDisabled,
    translateActionLoading,
}) => {
    const { token } = theme.useToken();
    const tBusiness = useTranslations('BusinessSettings');
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);
    const projectImage = Form.useWatch('projectImage', form) as string | null | undefined;
    const isDefault = Form.useWatch('isDefault', form) as boolean | undefined;
    const currentProjectName = nameValue?.trim() || `This ${labels.offeringLower}`;
    const currentDefaultLabel = currentDefaultProjectName || `No default ${labels.offeringLower} is set yet`;
    const [isGeneratingProjectImage, setIsGeneratingProjectImage] = useState(false);
    const [projectImageDraft, setProjectImageDraft] = useState<{
        crop?: MediaImageCropIntent;
        fileName?: string;
        sourceDataUrl?: string;
    } | null>(null);
    const [isProjectImageAdjustOpen, setIsProjectImageAdjustOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setProjectImageDraft(null);
        setIsProjectImageAdjustOpen(false);
    }, [editingProject?.projectId, isOpen]);

    const handleProjectImageSelect = async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'projectImage');
            form.setFieldValue('projectImage', prepared.dataUrl);
            onProjectImagePrepared?.(prepared);
            setProjectImageDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || file.name,
                sourceDataUrl: prepared.sourceDataUrl,
            });
        } catch (error) {
            console.error('Failed to prepare project image:', error);
            message.error(error instanceof Error ? error.message : 'Could not prepare image. Please try again.');
        }

        return false;
    };

    const handleGenerateProjectImage = async () => {
        if (!onGenerateProjectImage) return;
        if (!nameValue.trim()) {
            message.error(`Enter a ${labels.offeringPhrase} name first.`);
            return;
        }

        setIsGeneratingProjectImage(true);
        try {
            const generatedImage = await onGenerateProjectImage();
            if (!generatedImage) {
                message.warning('Add menu items before generating a menu image.');
                return;
            }
            const prepared = await prepareMediaImage(generatedImage, 'projectImage', {
                fileName: 'generated-menu-image.webp',
            });
            form.setFieldValue('projectImage', prepared.dataUrl);
            onProjectImagePrepared?.(prepared);
            setProjectImageDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || 'generated-menu-image.webp',
                sourceDataUrl: prepared.sourceDataUrl,
            });
            message.success('Menu image generated');
        } catch (error: any) {
            message.error(error?.message || 'Failed to generate menu image');
        } finally {
            setIsGeneratingProjectImage(false);
        }
    };

    return (
        <>
        <Modal
            title={editingProject ? `Edit ${offeringName}` : `Create New ${offeringName}`}
            open={isOpen}
            centered
            onOk={onSubmit}
            onCancel={onCancel}
            maskClosable={false}
            footer={
                <Flex justify="space-between" align="center">
                    {/* Reset link - only show when editing */}
                    <div>
                        {editingProject && (
                            <Button
                                type="text"
                                danger
                                size="small"
                                onClick={onReset}
                            >
                                Reset {offeringName}
                            </Button>
                        )}
                    </div>
                    {/* Primary action */}
                    <Button type="primary" onClick={onSubmit}>
                        {editingProject ? 'Update' : 'Create'}
                    </Button>
                </Flex>
            }
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                initialValues={{ active: true, isDefault: false }}
            >
                <Form.Item
                    label={`${offeringName} Name`}
                >
                    <Flex gap={12} vertical>
                        {languages.length > 1 ? (
                            <Flex gap={8} vertical>
                                <Typography.Text strong>{tBusiness('contentLanguageTitle')}</Typography.Text>
                                <Select
                                    onChange={onLanguageChange}
                                    options={languages.map((languageCode) => ({
                                        label: getProjectLanguageLabel(languageCode),
                                        value: languageCode,
                                    }))}
                                    value={selectedLanguage}
                                />
                                <Typography.Text type="secondary">
                                    Edit this {labels.offeringPhrase} label one language at a time.
                                </Typography.Text>
                                {editingProject ? (
                                    <Button
                                        loading={translateActionLoading}
                                        onClick={onTranslatePublicContent}
                                        size="small"
                                        type="default"
                                        disabled={translateActionDisabled}
                                    >
                                        Translate missing public content
                                    </Button>
                                ) : null}
                            </Flex>
                        ) : null}
                        <Input
                            maxLength={100}
                            onChange={(event) => onNameChange(event.target.value)}
                            placeholder={`Enter ${labels.offeringPhrase} name`}
                            value={nameValue}
                        />
                        {selectedLanguage !== referenceLanguage ? (
                            <ReferenceCard
                                onUseReference={() => onNameChange(referenceName)}
                                referenceLabel={getProjectLanguageLabel(referenceLanguage)}
                                referenceValue={referenceName}
                                token={token}
                            />
                        ) : null}
                    </Flex>
                </Form.Item>
                <Form.Item
                    label="Description"
                >
                    <Flex gap={12} vertical>
                        <Input.TextArea
                            maxLength={200}
                            onChange={(event) => onDescriptionChange(event.target.value)}
                            placeholder={`Enter ${labels.offeringPhrase} description`}
                            rows={3}
                            showCount
                            value={descriptionValue}
                        />
                        {selectedLanguage !== referenceLanguage ? (
                            <ReferenceCard
                                onUseReference={() => onDescriptionChange(referenceDescription)}
                                referenceLabel={getProjectLanguageLabel(referenceLanguage)}
                                referenceValue={referenceDescription}
                                token={token}
                            />
                        ) : null}
                    </Flex>
                </Form.Item>
                <Form.Item
                    name="active"
                    label="Active"
                    valuePropName="checked"
                >
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
                {!(editingProject as any)?.isSpecialMenu ? (
                    <>
                        <Form.Item
                            name="isDefault"
                            label="Default"
                            valuePropName="checked"
                        >
                            <Switch checkedChildren="Default" unCheckedChildren="Regular" />
                        </Form.Item>
                        <Form.Item style={{ marginTop: -12 }}>
                            <Flex gap={4} vertical>
                                <Typography.Text type="secondary">
                                    Current default {labels.offeringLower}: <strong>{currentDefaultLabel}</strong>
                                </Typography.Text>
                                <Typography.Text type="secondary">
                                    {isDefault
                                        ? `"${currentProjectName}" will become the default menu used by your main public menu link when you save.`
                                        : editingProject?.isDefault
                                            ? 'If you turn this off, the default role will move to the next available regular menu automatically.'
                                            : 'If this stays off, your main public menu link keeps opening the current default menu.'}
                                </Typography.Text>
                            </Flex>
                        </Form.Item>
                    </>
                ) : null}
                <Form.Item hidden name="projectImage">
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item label={`${offeringName} Image`}>
                    <Flex gap={12} vertical>
                        <MediaImageCard
                            accept={getMediaProfileAcceptAttribute('projectImage')}
                            alt={`${offeringName} preview`}
                            canAdjust={Boolean(projectImageDraft?.sourceDataUrl)}
                            helperText="Optional. This image appears on the Official Business Page menu card."
                            imageType="projectImage"
                            imageUrl={projectImage}
                            onAdjust={() => setIsProjectImageAdjustOpen(true)}
                            onRemove={projectImage ? () => {
                                form.setFieldValue('projectImage', null);
                                onProjectImagePrepared?.(null);
                                setProjectImageDraft(null);
                            } : undefined}
                            onSelectFile={(file) => { void handleProjectImageSelect(file); }}
                            placeholderDescription="Drop, paste, or choose a menu image."
                            placeholderTitle={`${offeringName} image`}
                            replaceLabel="Replace"
                            size="compact"
                        />
                        {onGenerateProjectImage ? (
                            <Button
                                icon={<LuSparkles size={16} />}
                                loading={isGeneratingProjectImage}
                                onClick={handleGenerateProjectImage}
                            >
                                {projectImage ? 'Regenerate image' : 'Generate image'}
                            </Button>
                        ) : null}
                    </Flex>
                </Form.Item>
            </Form>
        </Modal>
        <MediaImageAdjustModal
            fileName={projectImageDraft?.fileName}
            imageType="projectImage"
            initialCrop={projectImageDraft?.crop}
            onApply={(prepared) => {
                form.setFieldValue('projectImage', prepared.dataUrl);
                onProjectImagePrepared?.(prepared);
                setProjectImageDraft({
                    crop: prepared.crop,
                    fileName: prepared.sourceName || projectImageDraft?.fileName,
                    sourceDataUrl: prepared.sourceDataUrl || projectImageDraft?.sourceDataUrl,
                });
            }}
            onClose={() => setIsProjectImageAdjustOpen(false)}
            open={isProjectImageAdjustOpen}
            sourceDataUrl={projectImageDraft?.sourceDataUrl}
        />
        </>
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
                borderRadius: token.borderRadius,
                padding: 12,
            }}
        >
            <Flex align="center" gap={12} justify="space-between">
                <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text type="secondary">{`${referenceLabel} reference`}</Typography.Text>
                    <Typography.Text>{referenceValue || 'No reference content available yet.'}</Typography.Text>
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
