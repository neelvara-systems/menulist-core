import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Flex, theme } from 'antd'
import { FC, memo } from 'react'

interface Props {
    fontData: any
}

const SortableItem: FC<Props> = ({ fontData }) => {

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fontData.uid, data: { fontData } });
    const { token } = theme.useToken();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        // opacity: isDragging ? 0.5 : 1,
        minHeight: "max-content",
        minWidth: "100%"
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Flex
                justify='center'
                align='center'
                style={{ width: "100%", minWidth: "100%", height: 50, border: `1px solid ${token.colorBorder}`, borderRadius: 4 }}
                {...listeners}{...attributes}
            >
                {fontData.name}
            </Flex>
        </div>
    );
}
export default memo(SortableItem);