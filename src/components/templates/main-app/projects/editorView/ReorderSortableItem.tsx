import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Flex, Typography, theme } from 'antd';
import { FC, memo } from 'react';
import { LuGripVertical } from 'react-icons/lu';

const { Text } = Typography;

interface Props {
    uid: string;
    label: string;
    index: number;
    isSelected?: boolean;
    meta?: string;
    onClick?: () => void;
}

const ReorderSortableItem: FC<Props> = ({ uid, label, index, isSelected, meta, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: uid });
    const { token } = theme.useToken();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        minHeight: 'max-content',
        minWidth: '100%',
    } as const;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Flex
                align="center"
                gap={12}
                style={{
                    width: '100%',
                    minWidth: '100%',
                    minHeight: meta ? 50 : 44,
                    border: `2px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                    borderRadius: 6,
                    padding: '8px 12px',
                    background: isSelected ? token.colorPrimaryBg : token.colorBgBase,
                    cursor: 'pointer',
                }}
                onClick={onClick}
            >
                {/* Drag Handle */}
                <div
                    {...listeners}
                    style={{
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 4px',
                    }}
                >
                    <LuGripVertical size={16} style={{ opacity: 0.5 }} />
                </div>

                <Text type="secondary" style={{ fontSize: 12, minWidth: 24 }}>
                    #{index + 1}
                </Text>

                <Flex vertical style={{ flex: 1 }} gap={2}>
                    <Text style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400 }}>{label}</Text>
                    {meta && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {meta}
                        </Text>
                    )}
                </Flex>
            </Flex>
        </div>
    );
};

export default memo(ReorderSortableItem);
