import KnowledgeBaseExplorer from '@organisms/KnowledgeBaseExplorer';
import { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { Modal } from 'antd';

interface KnowledgeBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoriesData: KnowledgeBaseCategoriesType | null;
}

const KnowledgeBaseModal = ({ isOpen, onClose, categoriesData }: KnowledgeBaseModalProps) => {
    return (
        <Modal
            title=""
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width="90vw"
            style={{ top: 20 }}
            styles={{ body: { maxHeight: '85vh', overflowY: 'auto' }, content: { padding: 0 } }}
        >
            <KnowledgeBaseExplorer from="modal" initialCategoryData={categoriesData} />
        </Modal>
    );
};

export default KnowledgeBaseModal;
