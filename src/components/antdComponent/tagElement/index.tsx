import { Tag } from 'antd';

type PropTypes = {
    content: string,
    type?: 'default' | 'warning' | 'error' | 'info' | undefined
}

function TagElement({ content, type }: PropTypes) {
    let color = 'yellow';
    switch (type) {
        case 'default':
            color = 'yellow';
            break;
        case 'warning':
            color = 'orange';
            break;
        case 'error':
            color = 'red';
            break;
        case 'info':
            color = 'blue';
            break;
    }
    return (
        <Tag color={color} style={{ lineHeight: 2, fontSize: 13 }}>{content}</Tag>
    )
}

export default TagElement