import { Drawer, Flex, Input, Tabs, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import { allColorGroups, gradientPresets } from './colorPalettes';

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    // Remove the # if present
    hex = hex.replace(/^#/, '');

    // Parse the hex values
    let r, g, b;
    if (hex.length === 3) {
        // For shorthand like #ABC
        r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else if (hex.length === 6) {
        // For full form like #AABBCC
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        return null;
    }

    return { r, g, b };
};

// Check if a color is within range of another color
const isColorInRange = (hex: string, baseColor: string, tolerance: number = 80) => {
    const color1 = hexToRgb(hex);
    const color2 = hexToRgb(baseColor);
    if (!color1 || !color2) return false;

    // Calculate color distance using Euclidean distance
    const distance = Math.sqrt(
        Math.pow(color1.r - color2.r, 2) +
        Math.pow(color1.g - color2.g, 2) +
        Math.pow(color1.b - color2.b, 2)
    );

    return distance <= tolerance;
};

interface ColorPresetsDrawerProps {
    open: boolean;
    colorMode: 'solid' | 'gradient' | 'image';
    onClose: () => void;
    onColorSelect: (color: string | { type: 'gradient', angle: number, colors: Array<{ color: string, position: number }> }) => void;
}

export default function ColorPresetsDrawer({ open, onClose, onColorSelect, colorMode }: ColorPresetsDrawerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(colorMode == 'gradient' ? '2' : '1');
    const { token } = theme.useToken();

    // Reset search when drawer opens
    useEffect(() => {
        if (open) {
            setActiveTab(colorMode == 'gradient' ? '2' : '1');
            setSearchTerm('');
        }
    }, [open]);

    // Base colors with their reference hex values and tolerances
    const baseColors = {
        white: { hex: '#ffffff', tolerance: 60 },
        black: { hex: '#000000', tolerance: 60 },
        gray: { hex: '#808080', tolerance: 70 },
        red: { hex: '#ff0000', tolerance: 70 },
        orange: { hex: '#ffa500', tolerance: 70 },
        yellow: { hex: '#ffff00', tolerance: 70 },
        green: { hex: '#00ff00', tolerance: 70 },
        blue: { hex: '#0000ff', tolerance: 70 },
        purple: { hex: '#800080', tolerance: 70 },
        pink: { hex: '#ffc0cb', tolerance: 80 },
        brown: { hex: '#a52a2a', tolerance: 70 },
        teal: { hex: '#008080', tolerance: 70 },
        cyan: { hex: '#00ffff', tolerance: 70 },
        magenta: { hex: '#ff00ff', tolerance: 70 },
    };

    // Advanced filtering for color groups based on search term
    const filteredColorGroups = useMemo(() => {
        if (!searchTerm.trim()) return allColorGroups;

        const query = searchTerm.toLowerCase().trim();
        const words = query.split(/\s+/);

        return allColorGroups.map(group => {
            // First check if the group name matches the search
            if (group.name.toLowerCase().includes(query)) {
                return group; // Return the whole group if the name matches
            }

            // Filter colors in the group
            const filteredColors = group.colors.filter(color => {
                // Direct match in hex code
                if (color.toLowerCase().includes(query)) return true;

                // Check if any search word matches a known color name
                for (const [colorName, { hex, tolerance }] of Object.entries(baseColors)) {
                    if (words.some(word => word === colorName || colorName.includes(word))) {
                        // Check if this color is within range of the searched color
                        if (isColorInRange(color, hex, tolerance)) {
                            return true;
                        }
                    }
                }

                return false;
            });

            // Return group with filtered colors
            return {
                ...group,
                colors: filteredColors
            };
        }).filter(group => group.colors.length > 0);
    }, [searchTerm]);

    // Advanced filtering for gradients based on search term
    const filteredGradients = useMemo(() => {
        if (!searchTerm.trim()) return gradientPresets;

        const query = searchTerm.toLowerCase().trim();
        const words = query.split(/\s+/);

        return gradientPresets.filter(gradient => {
            // Search in gradient name
            if (gradient.name.toLowerCase().includes(query)) return true;

            // Search in color codes
            if (gradient.colors.some(color => color.toLowerCase().includes(query))) return true;

            // Search for colors by analyzing hex values
            for (const [colorName, { hex, tolerance }] of Object.entries(baseColors)) {
                // If searching for this color
                if (words.some(word => word === colorName || colorName.includes(word))) {
                    // Check if any color in the gradient is within range of this color
                    if (gradient.colors.some(color => isColorInRange(color, hex, tolerance))) {
                        return true;
                    }
                }
            }

            return false;
        });
    }, [searchTerm]);

    // Helper function to get gradient string
    const getGradientString = (colors: string[]) => {
        return `linear-gradient(45deg, ${colors.map((color, index) => {
            const position = index === 0 ? 0 : index === colors.length - 1 ? 100 : Math.round((index / (colors.length - 1)) * 100);
            return `${color} ${position}%`;
        }).join(', ')})`;
    };

    // Handle gradient selection
    const handleGradientSelect = (gradient: { name: string, colors: string[] }) => {
        // Create a structured gradient object instead of a string
        const gradientColors = gradient.colors.map((color, index) => {
            const position = index === 0 ? 0 : index === gradient.colors.length - 1 ? 100 : Math.round((index / (gradient.colors.length - 1)) * 100);
            return { color, position };
        });
        onColorSelect({ type: 'gradient', angle: 45, colors: gradientColors });
        // onClose();
    };

    // Handle solid color selection
    const handleSolidColorSelect = (color: string) => {
        onColorSelect(color);
        // onClose();
    };

    return (
        <Drawer
            title="Color Presets"
            placement="right"
            width={400}
            maskClosable={false}
            onClose={onClose}
            mask={false}
            open={open}
            styles={{ body: { padding: '16px' } }}
        >
            <Flex vertical gap={16}>
                <Input
                    placeholder="Search colors (e.g., blue, pink, #ff...)"
                    prefix={<LuSearch />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                    size="large"
                    style={{ borderRadius: 6 }}
                />

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: '1',
                            label: 'Solid Colors',
                            children: (
                                <Flex vertical gap={24}>
                                    {filteredColorGroups.map((group, groupIndex) => (
                                        <div key={groupIndex} className='animate__animated animate__fadeIn animate__faster'>
                                            <Typography.Title level={5} style={{ marginBottom: 12 }}>
                                                {group.name}
                                            </Typography.Title>
                                            <Flex wrap="wrap" gap={8}>
                                                {group.colors.map((color, colorIndex) => (
                                                    <div
                                                        key={colorIndex}
                                                        onClick={() => handleSolidColorSelect(color)}
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            background: color,
                                                            borderRadius: 8,
                                                            cursor: 'pointer',
                                                            transition: 'transform 0.2s ease',
                                                            position: 'relative',
                                                            border: '1px solid rgba(0,0,0,0.1)',
                                                            boxShadow: token.boxShadowTertiary
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1.1)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                        }}
                                                        title={color}
                                                    />
                                                ))}
                                            </Flex>
                                        </div>
                                    ))}
                                </Flex>
                            ),
                        },
                        {
                            key: '2',
                            label: 'Gradients',
                            children: (
                                <Flex wrap="wrap" gap={16}>
                                    {filteredGradients.map((gradient, index) => (
                                        <div
                                            className='animate__animated animate__fadeIn animate__faster'
                                            key={index}
                                            onClick={() => handleGradientSelect(gradient)}
                                            style={{
                                                width: 'calc(50% - 8px)',
                                                height: 100,
                                                background: getGradientString(gradient.colors),
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s ease',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                boxShadow: token.boxShadowTertiary
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.02)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                            title={gradient.name}
                                        >
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                padding: '4px 8px',
                                                background: 'rgba(0,0,0,0.5)',
                                                color: 'white',
                                                fontSize: '12px'
                                            }}>
                                                {gradient.name}
                                            </div>
                                        </div>
                                    ))}
                                </Flex>
                            ),
                        },
                    ]}
                />
            </Flex>
        </Drawer>
    );
}
