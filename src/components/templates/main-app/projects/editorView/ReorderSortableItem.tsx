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
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: uid });
    const { token } = theme.useToken();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        minHeight: 'max-content',
        minWidth: '100%',
    } as const;

    return (
        <div ref={setNodeRef} style={style}>
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
                }}
            >
                {/* Drag Handle */}
                <button
                    ref={setActivatorNodeRef}
                    type="button"
                    aria-label={`Reorder ${label}`}
                    {...attributes}
                    {...listeners}
                    style={{
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        padding: 0,
                        border: 0,
                        borderRadius: 6,
                        color: 'inherit',
                        background: 'transparent',
                        touchAction: 'none',
                    }}
                >
                    <LuGripVertical aria-hidden="true" size={16} style={{ opacity: 0.5 }} />
                </button>

                {onClick ? (
                    <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={onClick}
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            flex: 1,
                            gap: 12,
                            minHeight: 44,
                            padding: 0,
                            border: 0,
                            color: 'inherit',
                            textAlign: 'start',
                            background: 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        <ItemContent index={index} isSelected={isSelected} label={label} meta={meta} />
                    </button>
                ) : (
                    <ItemContent index={index} isSelected={isSelected} label={label} meta={meta} />
                )}
            </Flex>
        </div>
    );
};

const ItemContent: FC<Pick<Props, 'index' | 'isSelected' | 'label' | 'meta'>> = ({
    index,
    isSelected,
    label,
    meta,
}) => (
    <>
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
    </>
);

export default memo(ReorderSortableItem);
