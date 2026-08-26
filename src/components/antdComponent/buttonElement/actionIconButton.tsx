import { Button } from 'antd'
import type { ComponentType, CSSProperties } from 'react'

interface ActionIconButtonProps {
    ariaLabel: string;
    icon: ComponentType<{ style?: CSSProperties }>;
    size?: number;
}

function ActionIconButton({ ariaLabel, size = 15, icon }: ActionIconButtonProps) {
    const Icon = icon

    return <Button aria-label={ariaLabel} icon={<Icon style={{ fontSize: size }} />} type='text' />
}

export default ActionIconButton
