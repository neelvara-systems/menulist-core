import { Slider, theme } from 'antd';

type SliderComponentPropsType = {
    value: number,
    onChange: any,
    min: number,
    max: number,
    step: number,
    styles?: any
}

function SliderElement({ value, onChange, min, max, step, styles = { width: "100%" } }: SliderComponentPropsType) {
    const { token } = theme.useToken();
    return (
        <Slider
            min={min}
            max={max}
            style={{ ...styles }}
            className={styles.sliderElementWrap}
            defaultValue={value}
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