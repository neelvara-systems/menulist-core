import { Tooltip } from 'antd'

type TooltipPropsType = {
    title: string,
    children: any,
    styles?: any
}

function TolltipElement({ title = "", children }: TooltipPropsType) {
    return (
        <Tooltip title={title} key={Math.random()}>{children}</Tooltip>
    )
}

export default TolltipElement