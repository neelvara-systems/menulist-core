import { Button, Space, Tooltip } from 'antd';

const circle = 'circle' // must be const, no annotation. let or var will not work
const round = 'round'
const defaultButton = "defaultButton"

declare const ButtonTypes: readonly ["default", "primary", "dashed", "link", "text"];
export type ButtonType = typeof ButtonTypes[number];


declare const ButtonShapes: readonly ["default", "circle", "round"];
export type ButtonShape = typeof ButtonShapes[number];

type ButtonElementProps = {
    icon?: any,
    onClick?: any,
    classNames?: any,
    type?: ButtonType,
    disabled?: boolean,
    text?: string,
    tooltip?: string,
    styles?: any,
    shape?: ButtonShape,
    loading?: boolean
}

export const WithTooltip = ({ tooltip, children }) => {
    return tooltip ? <Tooltip title={tooltip} key='3'>{children}</Tooltip> : <>{children}</>
}

function ButtonElement({ classNames, loading = false, icon, shape = "default", onClick = () => { }, type = "default", styles = {}, text = '', tooltip = '' }: ButtonElementProps) {
    return (
        <>
            <WithTooltip tooltip={tooltip}>
                <Button
                    className={classNames}
                    type={type}
                    shape={shape}
                    icon={icon || <></>}
                    onClick={onClick}
                    style={{ ...styles }}
                    loading={loading}
                >
                    {text && <Space>{text}</Space>}
                </Button>
            </WithTooltip>
        </>
    )
}

export default ButtonElement