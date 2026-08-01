import { Tag } from 'antd'
import type { MouseEventHandler, ReactNode } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'

interface TagRendererProps {
    active: boolean;
    onClick?: MouseEventHandler<HTMLElement>;
    showSelectIcon?: boolean;
    tag: ReactNode;
}

function TagRenderer({ tag, active, onClick, showSelectIcon = false }: TagRendererProps) {
    return (
        <Tag
            className='animate__animated animate__fadeInRight animate__faster'
            onClick={onClick}
            color={active ? "cyan" : "default"}
            style={{ flexDirection: "row-reverse", gap: 10, textTransform: "capitalize", fontSize: 14, lineHeight: "unset", cursor: "pointer" }}
            closable={showSelectIcon}
            closeIcon={active ? <LuX /> : <LuCheck />}
        >
            {tag}
        </Tag>
    )
}

export default TagRenderer
