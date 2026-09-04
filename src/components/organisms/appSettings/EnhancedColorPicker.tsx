import SelectedItemCheck from '@atoms/selectedItemCheck';
import { getColorDescription } from '@constant/colorMetadata';
import { useRecentColors } from '@hook/useRecentColors';
import { hexToRgbA } from '@util/utils';
import { Button, Flex, Tooltip, Typography } from 'antd';
import { Fragment, memo, type ChangeEvent, type KeyboardEvent } from 'react';
import { LuHeart, LuPipette } from 'react-icons/lu';
import styles from './appSettings.module.scss';

const { Text } = Typography;

interface EnhancedColorPickerProps {
    ariaLabel: string;
    colors: string[];
    selectedColor: string;
    onSelect: (color: string) => void;
}

const EnhancedColorPicker: React.FC<EnhancedColorPickerProps> = ({
    ariaLabel,
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

    const handleCustomColorChange = (event: ChangeEvent<HTMLInputElement>) => {
        handleColorSelect(event.target.value);
    };

    const handleFavoriteKeyDown = (event: KeyboardEvent<HTMLElement>, color: string) => {
        if (event.key.toLowerCase() !== 'f') return;
        event.preventDefault();
        toggleFavorite(color);
    };

    return (
        <Flex vertical gap={16}>
            {/* Custom Color Picker */}
            <Flex vertical gap={8}>
                <Flex justify="space-between" align="center">
                    <Text strong>Custom Color</Text>
                    <Tooltip title="Pick any color">
                        <LuPipette aria-hidden="true" style={{ fontSize: 16 }} />
                    </Tooltip>
                </Flex>
                <Flex align="center" justify="space-between">
                    <Text type="secondary">{selectedColor.toUpperCase()}</Text>
                    <input
                        aria-label={`${ariaLabel}: ${selectedColor.toUpperCase()}`}
                        onChange={handleCustomColorChange}
                        style={{ background: 'transparent', border: 0, cursor: 'pointer', height: 44, padding: 0, width: 44 }}
                        type="color"
                        value={selectedColor}
                    />
                </Flex>
            </Flex>

            {/* Recent Colors */}
            {recentColors.length > 0 && (
                <Flex vertical gap={8}>
                    <Flex justify="space-between" align="center">
                        <Text strong>Recent Colors</Text>
                        <Button aria-label="Clear recent colors" onClick={clearRecent} size="small" type="text">
                            Clear
                        </Button>
                    </Flex>
                    <Flex className={`${styles.skeletonWrap} ${styles.colors}`}>
                        {recentColors.map((color: string) => (
                            <Tooltip key={color} title={`${color}\nClick to select`}>
                                <Button
                                    aria-label={`Select recent ${color} color`}
                                    aria-pressed={selectedColor === color}
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
                                            onKeyDown={(event) => handleFavoriteKeyDown(event, color)}
                                            aria-keyshortcuts="F"
                                            aria-label={`Select ${color} color; press F to remove from favorite colors`}
                                            aria-pressed={isSelected}
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
                                        onKeyDown={(event) => handleFavoriteKeyDown(event, color)}
                                        aria-keyshortcuts="F"
                                        aria-label={`Select ${color} color; press F to ${isFav ? 'remove from' : 'add to'} favorite colors`}
                                        aria-pressed={isSelected}
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
                    Click to select • Double-click or press F to favorite
                </Text>
            </Flex>
        </Flex>
    );
};

export default memo(EnhancedColorPicker);
