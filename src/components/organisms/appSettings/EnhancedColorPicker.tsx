import SelectedItemCheck from '@atoms/selectedItemCheck';
import { getColorDescription } from '@constant/colorMetadata';
import { useRecentColors } from '@hook/useRecentColors';
import { hexToRgbA } from '@util/utils';
import { ColorPicker as AntColorPicker, Button, Flex, Tooltip, Typography } from 'antd';
import { Color } from 'antd/es/color-picker';
import { Fragment, memo } from 'react';
import { LuHeart, LuPipette } from 'react-icons/lu';
import styles from './appSettings.module.scss';

const { Text } = Typography;

interface EnhancedColorPickerProps {
    colors: string[];
    selectedColor: string;
    onSelect: (color: string) => void;
}

const EnhancedColorPicker: React.FC<EnhancedColorPickerProps> = ({
    colors,
    selectedColor,
    onSelect
}) => {
    const {
        recentColors,
        favoriteColors,
        addRecentColor,
        toggleFavorite,
        isFavorite,
        clearRecent,
    } = useRecentColors();

    // Handler for colors from Presets or Custom Picker (adds to recent)
    const handleColorSelect = (color: string) => {
        addRecentColor(color);
        onSelect(color);
    };

    // Handler for colors already in Recent/Favorites (doesn't re-sort)
    const handleRecentOrFavoriteClick = (color: string) => {
        onSelect(color); // Just select, don't add to recent again
    };

    const handleCustomColorChange = (color: Color) => {
        const hexColor = color.toHexString();
        handleColorSelect(hexColor);
    };

    return (
        <Flex vertical gap={16}>
            {/* Custom Color Picker */}
            <Flex vertical gap={8}>
                <Flex justify="space-between" align="center">
                    <Text strong>Custom Color</Text>
                    <Tooltip title="Pick any color">
                        <LuPipette style={{ fontSize: 16 }} />
                    </Tooltip>
                </Flex>
                <AntColorPicker
                    value={selectedColor}
                    onChange={handleCustomColorChange}
                    showText
                    size="large"
                    format="hex"
                    presets={[
                        {
                            label: 'Recommended',
                            colors: colors.slice(0, 10),
                        },
                    ]}
                    panelRender={(_, { components: { Picker, Presets } }) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <Picker />
                            <Presets />
                        </div>
                    )}
                />
            </Flex>

            {/* Recent Colors */}
            {recentColors.length > 0 && (
                <Flex vertical gap={8}>
                    <Flex justify="space-between" align="center">
                        <Text strong>Recent Colors</Text>
                        <Button onClick={clearRecent} size="small" type="text">
                            Clear
                        </Button>
                    </Flex>
                    <Flex className={`${styles.skeletonWrap} ${styles.colors}`}>
                        {recentColors.map((color: string) => (
                            <Tooltip key={color} title={`${color}\nClick to select`}>
                                <Button
                                    aria-label={`Select recent ${color} color`}
                                    className={styles.colorElement}
                                    onClick={() => handleRecentOrFavoriteClick(color)}
                                    style={{
                                        background: hexToRgbA(color, 0.6),
                                        borderColor: color,
                                        position: 'relative',
                                    }}
                                >
                                    <SelectedItemCheck active={selectedColor === color} />
                                    <span style={{ background: color, borderRadius: 4 }} />
                                </Button>
                            </Tooltip>
                        ))}
                    </Flex>
                </Flex>
            )}

            {/* Favorite Colors */}
            {favoriteColors.length > 0 && (
                <Flex vertical gap={8}>
                    <Flex justify="space-between" align="center">
                        <Text strong>Favorite Colors</Text>
                        <LuHeart style={{ fontSize: 16, color: '#ff4d4f' }} />
                    </Flex>
                    <Flex className={`${styles.skeletonWrap} ${styles.colors}`}>
                        {favoriteColors.map((color: string) => {
                            const isSelected = selectedColor === color;
                            const colorMeta = getColorDescription(color);
                            
                            const tooltipText = colorMeta 
                                ? `${colorMeta.name} - ${colorMeta.description}\n${color}\nDouble-click to remove from favorites`
                                : `${color}\nDouble-click to remove from favorites`;

                            return (
                                <Fragment key={color}>
                                    <Tooltip title={tooltipText}>
                                        <Button
                                            className={styles.colorElement}
                                            onClick={() => handleRecentOrFavoriteClick(color)}
                                            onDoubleClick={() => toggleFavorite(color)}
                                            aria-label={`Select ${color} color`}
                                            style={{
                                                background: hexToRgbA(color, 0.6),
                                                borderColor: color,
                                                position: 'relative'
                                            }}
                                        >
                                            <SelectedItemCheck active={isSelected} />
                                            <span style={{ background: color, borderRadius: 4 }} />
                                            <LuHeart
                                                style={{
                                                    position: 'absolute',
                                                    top: 2,
                                                    right: 2,
                                                    fontSize: 12,
                                                    color: '#ff4d4f',
                                                    fill: '#ff4d4f'
                                                }}
                                            />
                                        </Button>
                                    </Tooltip>
                                </Fragment>
                            );
                        })}
                    </Flex>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        Double-click to remove from favorites
                    </Text>
                </Flex>
            )}

            {/* Preset Colors */}
            <Flex vertical gap={8}>
                <Text strong>Color Presets</Text>
                <Flex className={`${styles.skeletonWrap} ${styles.colors}`}>
                    {colors.map((color: string, i: number) => {
                        const isSelected = selectedColor === color;
                        const isFav = isFavorite(color);
                        const colorMeta = getColorDescription(color);
                        
                        // Create tooltip text with description
                        const tooltipText = colorMeta 
                            ? `${colorMeta.name} - ${colorMeta.description}\n${color}\n${isFav ? 'Double-click to remove from favorites' : 'Double-click to add to favorites'}`
                            : `${color}\n${isFav ? 'Double-click to remove from favorites' : 'Double-click to add to favorites'}`;

                        return (
                            <Fragment key={`${color}-${i}`}>
                                <Tooltip title={tooltipText}>
                                    <Button
                                        className={styles.colorElement}
                                        onClick={() => handleColorSelect(color)}
                                        onDoubleClick={() => toggleFavorite(color)}
                                        aria-label={`Select ${color} color`}
                                        style={{
                                            background: hexToRgbA(color, 0.6),
                                            borderColor: color,
                                            position: 'relative'
                                        }}
                                    >
                                        <SelectedItemCheck active={isSelected} />
                                        <span style={{ background: color, borderRadius: 4 }} />
                                        {isFav && (
                                            <LuHeart
                                                style={{
                                                    position: 'absolute',
                                                    top: 2,
                                                    right: 2,
                                                    fontSize: 12,
                                                    color: '#ff4d4f',
                                                    fill: '#ff4d4f'
                                                }}
                                            />
                                        )}
                                    </Button>
                                </Tooltip>
                            </Fragment>
                        );
                    })}
                </Flex>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Click to select • Double-click to favorite
                </Text>
            </Flex>
        </Flex>
    );
};

export default memo(EnhancedColorPicker);
