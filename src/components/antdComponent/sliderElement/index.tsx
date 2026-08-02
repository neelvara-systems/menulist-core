import { Slider, theme } from 'antd';
import type { CSSProperties } from 'react';
import type { SliderSingleProps } from 'antd/es/slider';

type SliderComponentPropsType = {
    value: number;
    onChange: SliderSingleProps['onChange'];
    min: number;
    max: number;
    step: number;
    styles?: CSSProperties;
}

function SliderElement({ value, onChange, min, max, step, styles = { width: "100%" } }: SliderComponentPropsType) {
    const { token } = theme.useToken();
    return (
        <Slider
            min={min}
            max={max}
            style={{ ...styles }}
            onChange={onChange}
            value={value}
            step={step}
            styles={{
                track: {
                    background: token.colorPrimary
                },
                rail: {
                    background: token.colorTextDescription
                },
                handle: {
                    background: "red"
                }
            }}
        />
    )
}

export default SliderElement
