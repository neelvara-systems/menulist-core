import { Flex, Typography, theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

type TextSize = "small" | "medium" | "large" | "heading";
type TextType = "default" | "primary" | "secondary";

type TextElementProps = {
    text: ReactNode,
    type?: TextType,
    size?: TextSize,
    styles?: CSSProperties,
    icon?: ReactNode
}
function TextElement({ text, type = "default", size = "small", styles = {}, icon }: TextElementProps) {

    const { Text, Title } = Typography;
    const { token } = theme.useToken();

    const textColor = type === "primary" ? token.colorPrimary : (type === "secondary" ? token.colorTextLabel : token.colorTextBase);
    let textElement = <Text style={{ ...styles, color: textColor }}>{text}</Text>;

    switch (size) {
        case "small":
            textElement = <Text style={{ ...styles, color: textColor }}>{text}</Text>
            break;
        case "medium":
            textElement = <Title level={5} style={{ margin: "unset", ...styles, color: textColor }}>{text}</Title>
            break;
        case "large":
            textElement = <Title level={4} style={{ margin: "unset", ...styles, color: textColor }}>{text}</Title>
            break;
        case "heading":
            textElement = <Title level={3} style={{ margin: "unset", ...styles, color: textColor }}>{text}</Title>
            break;
    }

    return (
        <>
            {icon ? <Flex align='center' gap={5}>{icon} {textElement}</Flex> : <>{textElement}</>}
        </>
    )
}

export default TextElement
