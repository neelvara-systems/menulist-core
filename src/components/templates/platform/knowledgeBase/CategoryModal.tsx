import IconPicker from "@atoms/IconPicker";
import { addCategory, assertKnowledgeBaseCategoryWriteSucceeded, type KnowledgeBaseCategoryWriteResult, updateCategory } from "@database/knowledgeBase/categories";
import { useAppDispatch } from "@hook/useAppDispatch";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { KnowledgeBaseCategoriesType, KnowledgeBaseCategory } from "@type/knowledgeBase";
import { getNewIndex } from "@util/utils";
import { Divider, Flex, Form, Input, InputNumber, Modal, Switch, message } from "antd";
import { FormInstance } from 'antd/lib/form';
import { useEffect, useState } from 'react';
import CategoryCardPreview from "./CategoryCardPreview";

interface CategoryModalProps {
    open: boolean;
    editingCategory: KnowledgeBaseCategory | null;
    categoriesData: KnowledgeBaseCategoriesType | null;
    form: FormInstance;
    onOk: () => void;
    onCancel: () => void;
    onSuccess?: (updatedCategories: KnowledgeBaseCategoriesType) => void;
    onReviewSuccess?: (updatedCategory: KnowledgeBaseCategory) => void;
    from?: 'review';
}

const CategoryModal = ({ open, editingCategory, categoriesData, form, onOk, onCancel, onSuccess, onReviewSuccess, from }: CategoryModalProps) => {
    const dispatch = useAppDispatch();
    const [previewData, setPreviewData] = useState<Partial<KnowledgeBaseCategory>>({});
    const titleValue = Form.useWatch('title', form);

    useEffect(() => {
        if (!editingCategory && Boolean(titleValue)) {
            const slug = titleValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            form.setFieldsValue({ url: slug });
        }
        if (!editingCategory && form.getFieldValue('index') === undefined) {
            const categoriesList = categoriesData ? Object.values(categoriesData.categories) : [];
            form.setFieldsValue({ index: getNewIndex(categoriesList) });
        }
    }, [titleValue, form, categoriesData, editingCategory]);

    useEffect(() => {
        if (open) {
            setPreviewData(form.getFieldsValue());
        }
    }, [open, form, editingCategory]);

    const handleFinish = async (values: any) => {
        if (from === "review") {
            if (!onReviewSuccess) throw new Error('knowledge_base_category_review_callback_missing');
            const categoryToSave = { ...editingCategory, ...values } as KnowledgeBaseCategory;
            onReviewSuccess(categoryToSave);
            return;
        }
        if (!onSuccess) throw new Error('knowledge_base_category_persistence_callback_missing');
        const isEditing = !!editingCategory;
        const action = isEditing ? 'updating' : 'creating';
        dispatch(startLoader(`Category ${action}`));

        try {
            let categoryToSave;
            let result: KnowledgeBaseCategoryWriteResult;
            if (isEditing) {
                categoryToSave = { ...editingCategory, ...values };
                result = await updateCategory(categoryToSave);
                assertKnowledgeBaseCategoryWriteSucceeded(
                    result,
                    categoryToSave.id,
                    'platform_kb_category_update_rejected',
                );
            } else {
                const id = new Date().getTime().toString();
                categoryToSave = { ...values, id, sections: [], articles: [] };
                result = await addCategory(categoryToSave);
                assertKnowledgeBaseCategoryWriteSucceeded(
                    result,
                    categoryToSave.id,
                    'platform_kb_category_create_rejected',
                );
            }

            message.success(`Category ${isEditing ? 'updated' : 'created'} successfully!`);
            onSuccess({ categories: result.categories });
        } catch (error) {
            message.error("Failed to save category.");
        } finally {
            dispatch(stopLoader(`Category ${action}`));
        }
    };

    return (
        <Modal
            title={editingCategory ? "Edit Category" : "Add Category"}
            open={open}
            onOk={onOk}
            okText={editingCategory ? "Update" : "Create"}
            onCancel={onCancel}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} onValuesChange={(_, allValues) => setPreviewData(allValues)} >
                <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Flex gap="small" justify="flex-start" align="center">
                    <Form.Item name="icon" label="Icon" rules={[{ required: true }]}>
                        <IconPicker
                            value={form.getFieldValue('icon')}
                            onChange={value => form.setFieldsValue({ icon: value })}
                        />
                    </Form.Item>
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
            <CategoryCardPreview category={previewData} />
        </Modal>
    );
}

export default CategoryModal;
