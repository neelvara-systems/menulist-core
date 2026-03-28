import SelectedItemCheck from '@atoms/selectedItemCheck';
import { convertRGBtoOBJ, hexToRgbA } from '@util/utils';
import { Button, Flex } from 'antd';
import { Fragment, memo } from 'react';
import styles from './appSettings.module.scss';

interface ColorPickerProps {
    colors: string[];
    selectedColor: string;
    onSelect: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ colors, selectedColor, onSelect }) => {
    return (
        <Flex className={`${styles.skeletonWrap} ${styles.colors}`}>
            {colors.map((color: string, i: number) => {
                const rgbaColors: any = convertRGBtoOBJ(hexToRgbA(color));
                const isSelected = selectedColor === color;

                return (
                    <Fragment key={i}>
                        <Button
                            className={styles.colorElement}
                            onClick={() => onSelect(color)}
                            aria-label={`Select ${color} color`}
                            style={{
                                background: `rgba(${rgbaColors.r}, ${rgbaColors.g}, ${rgbaColors.b}, 0.6)`,
                                borderColor: color
                            }}
                        >
                            <SelectedItemCheck active={isSelected} />
                            <span
                                style={{
                                    background: color,
                                    borderRadius: isSelected ? "4px" : "15px"
                                }}
                            />
                        </Button>
                    </Fragment>
                );
            })}
        </Flex>
    );
};

export default memo(ColorPicker);
