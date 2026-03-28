import TextElement from '@antdComponent/textElement';
import { Segmented, theme, Tooltip } from 'antd';
import styles from './segmentComponent.module.scss';

export const SEGMENT_OPTIONS_TYPES = {
    ARRAY: 'ARRAY',
    ARRAY_OF_OBJECTS: 'ARRAY_OF_OBJECTS'
}

type SizeType = 'small' | 'middle' | 'large';

const MIDDLE_SIZE: SizeType = "middle";

type props = {}

const SegmentComponent = ({ label, value, onChange, options, type, size = MIDDLE_SIZE, showIcon = false, entity = "", parentClassname = "", hideLabel = false }: any) => {
    const { token } = theme.useToken();

    const getSegmentOptions = () => {
        if (type == SEGMENT_OPTIONS_TYPES.ARRAY) {
            return options.map((option: any) => {
                return {
                    label:
                        <Tooltip title={`${option} ${entity}`}>
                            <div style={{ color: value == option.value ? token.colorBgBase : token.colorTextBase }}
                                className={`${styles.segmentItem} ${value == option.value ? styles.active : ''}`}>
                                <div className={styles.name}>{option}</div>
                            </div>
                        </Tooltip>,
                    value: option
                }
            })

        } else return options.map((option: any) => {
            return {
                label:
                    <Tooltip title={`${option.key} ${entity}`}>
                        <div
                            style={{ color: value == option.value ? token.colorBgBase : token.colorTextBase }}
                            className={`${styles.segmentItem} ${value == option.value ? styles.active : ''}`}>
                            {showIcon && <div className={styles.iconWrap}
                                style={{
                                    color: value == option.key ? token.colorPrimary : token.colorTextSecondary,
                                    // minWidth: size == "small" ? "20px" : "26px",
                                    // minHeight: size == "small" ? "20px" : "26px",
                                    // padding: size == "small" ? "2px" : "6px",
                                    // backgroundColor: size == "small" ? "unset" : token.colorBgBase,
                                }}>
                                {option.icon}
                            </div>}
                            {!hideLabel && <div className={styles.name} style={{ color: token.colorTextBase }}>{option.key}</div>}
                        </div>
                    </Tooltip>,
                value: option.key
            }
        })
    }
    return (
        <div className={`${styles.segmentComponentWrap} ${parentClassname}`} style={{ color: token.colorTextBase }}>
            {label && <TextElement text={label} size={"medium"} />}
            <div className={`${styles.segmentWrap} `}>
                <Segmented
                    value={value}
                    // style={{ background: token.colortext }}
                    size={size}
                    block={true}
                    defaultValue={value}
                    onChange={onChange}
                    options={getSegmentOptions()}
                />
            </div>
        </div>
    )
}

export default SegmentComponent