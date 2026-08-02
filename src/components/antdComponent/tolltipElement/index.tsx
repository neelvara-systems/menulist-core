import { Tooltip } from 'antd'
import type { CSSProperties, ReactNode } from 'react';

type TooltipPropsType = {
    title?: ReactNode,
    children: ReactNode,
    styles?: CSSProperties
}

function TolltipElement({ title = "", children }: TooltipPropsType) {
    return (
        <Tooltip title={title}>{children}</Tooltip>
    )
}

export default TolltipElement
