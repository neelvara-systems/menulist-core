import { Typography } from 'antd'
const { Text } = Typography

function GradientText({ type = "h", children, fontSize = 12, width = "100%", strong = false, center }) {
    return (
        <Text className={`${type == "h" ? "gradientTextHorizontal" : "gradientText"} `} strong={strong} style={{ fontSize, width, textAlign: center ? "center" : "left" }}>{children}</Text>
    )
}

export default GradientText