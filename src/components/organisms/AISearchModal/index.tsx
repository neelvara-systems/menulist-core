'use client';

import { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { Modal, Typography } from 'antd';
import AiSearchBarComponent from './AiSearchBarComponent';

const { Title } = Typography;

interface AISearchModalProps {
    open: boolean;
    onClose: () => void;
    initialCategories: KnowledgeBaseCategoriesType | null;
}

export default function AISearchModal({ open, onClose, initialCategories }: AISearchModalProps) {

    return (
        <Modal
            title={<Title style={{ width: "100%", textAlign: "center", marginBottom: "20px" }} level={4}>✨ Ask Anything, Get Answers ✨</Title>}
            open={open}
            onCancel={onClose}
            footer={null}
            width={800}
            centered
            styles={{ body: { maxHeight: '85vh', overflowY: 'auto' } }}
        >
            <AiSearchBarComponent initialCategories={initialCategories} />
        </Modal>
    );
}
