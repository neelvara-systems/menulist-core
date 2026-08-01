import { Button } from 'antd'
import type { ComponentType, CSSProperties } from 'react'

interface ActionIconButtonProps {
    icon: ComponentType<{ style?: CSSProperties }>;
    size?: number;
}

function ActionIconButton({ size = 15, icon }: ActionIconButtonProps) {
    const Icon = icon

    return <Button icon={<Icon style={{ fontSize: size }} />} type='text' />
}

export default ActionIconButton
