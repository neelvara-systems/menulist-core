import { assertKnowledgeBaseCategoriesMutationSucceeded, upsertSectionInCategory } from "@database/knowledgeBase/categories";
import { useAppDispatch } from "@hook/useAppDispatch";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import { getNewIndex } from "@util/utils";
import { Divider, Flex, Form, Input, InputNumber, Modal, Switch, message } from "antd";
import { FormInstance } from 'antd/lib/form';
import { useEffect, useState } from 'react';
import SectionCardPreview from "./SectionCardPreview";

interface SectionModalProps {
    open: boolean;
    editingSection: KnowledgeBaseSection | null;
    form: FormInstance;
    onOk: () => void;
    onCancel: () => void;
    onSuccess?: (updatedCategories: KnowledgeBaseCategoriesType) => void;
    onReviewSuccess?: (updatedSection: KnowledgeBaseSection) => void;
    categoriesData: KnowledgeBaseCategoriesType | null;
    selectedCategory: KnowledgeBaseCategory | null;
    from?: 'review';
}

const SectionModal = ({ open, editingSection, form, onOk, onCancel, onSuccess, onReviewSuccess, categoriesData, selectedCategory, from }: SectionModalProps) => {
    const dispatch = useAppDispatch();
    const [previewData, setPreviewData] = useState<Partial<KnowledgeBaseSection>>({});
    const titleValue = Form.useWatch('title', form);

    useEffect(() => {
        if (!editingSection && Boolean(titleValue)) {
            const slug = titleValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            form.setFieldsValue({ url: slug });
        }
        if (!editingSection && form.getFieldValue('index') === undefined) {
            form.setFieldsValue({ index: getNewIndex(selectedCategory?.sections || []) });
        }
    }, [titleValue, form, selectedCategory, editingSection]);

    useEffect(() => {
        if (open) setPreviewData(form.getFieldsValue());
    }, [open, form, editingSection]);

    const handleFinish = async (values: any) => {
        if (from === "review") {
            if (!onReviewSuccess) throw new Error('knowledge_base_section_review_callback_missing');
            const sectionToSave = { ...editingSection, ...values } as KnowledgeBaseSection;
            onReviewSuccess(sectionToSave);
            return;
        }
        if (!onSuccess) throw new Error('knowledge_base_section_persistence_callback_missing');
        if (!selectedCategory || !categoriesData) return;

        const isEditing = !!editingSection;
        const action = isEditing ? 'updating' : 'creating';
        dispatch(startLoader(`Section ${action}`));

        try {
            let sectionToSave: KnowledgeBaseSection;

            if (isEditing) {
                sectionToSave = { ...editingSection, ...values };
            } else {
                const id = new Date().getTime().toString();
                sectionToSave = { ...values, id, articles: [] };
            }

            const result = await upsertSectionInCategory(selectedCategory.id, sectionToSave);
            assertKnowledgeBaseCategoriesMutationSucceeded(
                result,
                'upsertSection',
                isEditing ? 'platform_kb_section_update_rejected' : 'platform_kb_section_create_rejected',
            );

            message.success(`Section ${isEditing ? 'updated' : 'created'} successfully!`);
            onSuccess({ categories: result.categories });
        } catch (error) {
            message.error("Failed to save section.");
        } finally {
            dispatch(stopLoader(`Section ${action}`));
        }
    };

    return (
        <Modal
            title={editingSection ? "Edit Section" : "Add Section"}
            open={open}
            onOk={onOk}
            onCancel={onCancel}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} onValuesChange={(_, allValues) => setPreviewData(allValues)} >
                <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Flex gap="small" justify="flex-start">
                    <Form.Item name="active" label="Active" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item name="index" label="Index">
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                </Flex>
                <Form.Item name="url" label="URL" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Form>
            <Divider>Preview</Divider>
            <SectionCardPreview section={previewData} />
        </Modal>
    );
}

export default SectionModal;
