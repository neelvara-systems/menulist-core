import { Typography } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
const { Text } = Typography

interface GradientTextProps {
    center?: boolean;
    children: ReactNode;
    fontSize?: CSSProperties['fontSize'];
    strong?: boolean;
    type?: 'h' | 'v';
    width?: CSSProperties['width'];
}

function GradientText({ type = "h", children, fontSize = 12, width = "100%", strong = false, center = false }: GradientTextProps) {
    return (
        <Text className={`${type == "h" ? "gradientTextHorizontal" : "gradientText"} `} strong={strong} style={{ fontSize, width, textAlign: center ? "center" : "left" }}>{children}</Text>
    )
}

export default GradientText
