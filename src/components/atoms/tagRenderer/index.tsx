import { Tag } from 'antd'
import { LuCheck, LuX } from 'react-icons/lu'

function TagRenderer({ tag, active, onClick, showSelectIcon }) {
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