import { getFontPresets } from '@database/static/fontPresets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { FontPresetsType } from '@type/assets';
import { addFontFaceStyle } from '@util/utils';
import { Divider, Flex, Select, Typography } from 'antd';
import type { SelectProps } from 'antd';
import FontFaceObserver from 'fontfaceobserver';
import { useContext, useEffect, type CSSProperties } from 'react';
const { Text } = Typography

// Default browser fonts grouped by category
const DEFAULT_BROWSER_FONTS = [
    // Sans-serif Fonts (good for body text and modern designs)
    { name: 'Arial', family: 'Arial, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Verdana', family: 'Verdana, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Helvetica', family: 'Helvetica, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Tahoma', family: 'Tahoma, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Trebuchet MS', family: 'Trebuchet MS, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Arial Black', family: 'Arial Black, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Segoe UI', family: 'Segoe UI, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Roboto', family: 'Roboto, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Open Sans', family: 'Open Sans, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Lato', family: 'Lato, sans-serif', group: 'Sans-serif Fonts' },
    { name: 'Avenir', family: 'Avenir, sans-serif', group: 'Sans-serif Fonts' },

    // Serif Fonts (elegant, classic, upscale restaurant feel)
    { name: 'Times New Roman', family: 'Times New Roman, serif', group: 'Serif Fonts' },
    { name: 'Georgia', family: 'Georgia, serif', group: 'Serif Fonts' },
    { name: 'Garamond', family: 'Garamond, serif', group: 'Serif Fonts' },
    { name: 'Baskerville', family: 'Baskerville, serif', group: 'Serif Fonts' },
    { name: 'Palatino', family: 'Palatino, serif', group: 'Serif Fonts' },
    { name: 'Bodoni MT', family: 'Bodoni MT, serif', group: 'Serif Fonts' },
    { name: 'Cambria', family: 'Cambria, serif', group: 'Serif Fonts' },
    { name: 'Bookman', family: 'Bookman, serif', group: 'Serif Fonts' },

    // Monospace Fonts (fixed-width, technical feel)
    { name: 'Courier New', family: 'Courier New, monospace', group: 'Monospace Fonts' },
    { name: 'Courier', family: 'Courier, monospace', group: 'Monospace Fonts' },
    { name: 'Lucida Console', family: 'Lucida Console, monospace', group: 'Monospace Fonts' },
    { name: 'Monaco', family: 'Monaco, monospace', group: 'Monospace Fonts' },
    { name: 'Consolas', family: 'Consolas, monospace', group: 'Monospace Fonts' },

    // Cursive & Handwriting Fonts (casual, personal feel)
    { name: 'Comic Sans MS', family: 'Comic Sans MS, cursive', group: 'Cursive & Handwriting' },
    { name: 'Brush Script MT', family: 'Brush Script MT, cursive', group: 'Cursive & Handwriting' },
    { name: 'Lucida Handwriting', family: 'Lucida Handwriting, cursive', group: 'Cursive & Handwriting' },
    { name: 'Segoe Script', family: 'Segoe Script, cursive', group: 'Cursive & Handwriting' },
    { name: 'Pacifico', family: 'Pacifico, cursive', group: 'Cursive & Handwriting' },
    { name: 'Dancing Script', family: 'Dancing Script, cursive', group: 'Cursive & Handwriting' },
    { name: 'Great Vibes', family: 'Great Vibes, cursive', group: 'Cursive & Handwriting' },
    { name: 'Sacramento', family: 'Sacramento, cursive', group: 'Cursive & Handwriting' },

    // Decorative Fonts (distinctive, themed restaurants)
    { name: 'Impact', family: 'Impact, fantasy', group: 'Decorative Fonts' },
    { name: 'Papyrus', family: 'Papyrus, fantasy', group: 'Decorative Fonts' },
    { name: 'Copperplate', family: 'Copperplate, fantasy', group: 'Decorative Fonts' },
    { name: 'Luminari', family: 'Luminari, fantasy', group: 'Decorative Fonts' },
    { name: 'Chalkduster', family: 'Chalkduster, fantasy', group: 'Decorative Fonts' },

    // Generic Font Families
    { name: 'Default Sans-serif', family: 'sans-serif', group: 'Generic Families' },
    { name: 'Default Serif', family: 'serif', group: 'Generic Families' },
    { name: 'Default Cursive', family: 'cursive', group: 'Generic Families' },
    { name: 'Default Fantasy', family: 'fantasy', group: 'Generic Families' },
    { name: 'Default Monospace', family: 'monospace', group: 'Generic Families' }
];

interface FontFamilyProps {
    onChange: (field: 'fontFamily', value: string) => void;
    showLabel?: boolean;
    style?: CSSProperties;
    value?: string;
}

export default function FontFamily({ value, onChange, showLabel = false, style = {} }: FontFamilyProps) {

    const dispatch = useAppDispatch()
    const isDark = useAppSelector(getDarkModeState);
    const { fontsList, setFontsList } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)

    useEffect(() => {
        if (fontsList !== null) return;
        getFontPresets().then((res) => {
            if (Array.isArray(res)) {
                setFontsList(res);
                addFontFaceStyle(res)
            }
        }).catch((error) => {
            logRuntimeFailure('font_family_presets_load_failed', error);
        })
    }, [fontsList, setFontsList])

    const onChangeValue = (fontCode: string) => {
        if (!fontCode) return;

        // Check if it's a default browser font by checking against our defined array
        const isDefaultFont = DEFAULT_BROWSER_FONTS.some(font => font.family === fontCode);

        if (isDefaultFont) {
            // For browser default fonts, no need to load
            onChange('fontFamily', fontCode);
            return;
        }

        dispatch(startLoader("FontFamily:onChangeValue"))
        // font loading for canvas
        const font = new FontFaceObserver(fontCode);
        font.load(null, 150000).then(() => {
            onChange('fontFamily', fontCode)
            dispatch(stopLoader("FontFamily:onChangeValue"))
        }).catch((error: unknown) => {
            logRuntimeFailure('font_family_load_failed', error, {
                ...getBoundedRuntimeStringContext('fontCode', fontCode),
            });
            dispatch(stopLoader("FontFamily:onChangeValue"))
        });
    }

    const getFontsList = () => {
        const fonts: NonNullable<SelectProps<string>['options']> = [];

        // Add custom fonts from the database
        [...(fontsList || [])]
            .sort((a, b) => a.index - b.index)
            .forEach((fontDetails: FontPresetsType) => {
                fonts.push(
                    {
                        label: <>
                            <Flex style={{ width: "100%", padding: "2px 0" }} align="center" justify="center">
                                {isDark ?
                                    <img alt={`${fontDetails.code} font preview`} style={{ width: "auto", height: "100%", maxHeight: "20px" }} src={fontDetails.whiteTextUrl} />
                                    :
                                    <img alt={`${fontDetails.code} font preview`} style={{ width: "auto", height: "100%", maxHeight: "20px" }} src={fontDetails.blackTextUrl} />
                                }
                            </Flex>
                        </>,
                        value: fontDetails.code,
                        group: 'Custom Fonts'
                    },
                )
            })

        // Add divider if there are custom fonts
        if (fonts.length > 0) {
            fonts.push({
                label: <Divider style={{ margin: '4px 0' }} />,
                value: 'divider',
                disabled: true
            });
        }

        // Add default browser fonts grouped by categories
        DEFAULT_BROWSER_FONTS.forEach(font => {
            fonts.push({
                label: <>
                    <Flex style={{ width: "100%", padding: "2px 0" }} align="center" justify="center">
                        <Text style={{ fontFamily: font.family }}>{font.name}</Text>
                    </Flex>
                </>,
                value: font.family,
                group: font.group || 'System Fonts'
            });
        });

        return fonts;
    }

    return (
        <Flex vertical gap={10} style={{ width: "100%" }}>
            {showLabel && <Text strong>Font Style</Text>}
            <Select
                showSearch
                defaultValue={value}
                style={{ width: '100%', ...style }}
                onChange={(value) => onChangeValue(value)}
                optionLabelProp="label"
                value={value}
                options={getFontsList()}
                listHeight={400}
                optionFilterProp="value"
                placeholder="Select a font"
            />
        </Flex>

    )
}
