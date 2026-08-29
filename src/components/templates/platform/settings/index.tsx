'use client'
import SelectedItemCheck from '@atoms/selectedItemCheck';
import { DARK_COLORS, LIGHT_COLORS } from '@constant/common';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import LanguageSwitcher from '@organisms/languageSwitcher';
import ThemeModeSwitcher from '@organisms/themeModeSwitcher';
import TimezoneSwitcher from '@organisms/timezoneSwitcher';
import { getDarkColorState, getDarkModeState, getLightColorState, updateDarkThemeColor, updateLightThemeColor } from '@reduxSlices/clientThemeConfig';
import { convertRGBtoOBJ, hexToRgbA } from '@util/utils';
import { Button, Flex, theme, Typography } from 'antd';
import { Fragment, useState } from 'react';
import { LuCaseUpper, LuImage, LuSettings } from 'react-icons/lu';
import AssetsUploader from '../assets';
import FontPresets from '../fontPresets';
import styles from './settings.module.scss';
const { Text } = Typography;

const colorsList = {
    light: LIGHT_COLORS,
    dark: DARK_COLORS,
}

function PlatformSettings({ initialTab = '' }: { initialTab?: string } = {}) {

    const isDarkMode = useAppSelector(getDarkModeState)
    const dispatch = useAppDispatch()
    const lightThemeColor = useAppSelector(getLightColorState)
    const darkThemeColor = useAppSelector(getDarkColorState)
    const [activetab, setActivetab] = useState(initialTab)
    const { token } = theme.useToken();

    const SETTING_NAVIGATIONS = [
        { active: true, route: "", name: "Settings", icon: <LuSettings /> },
        { active: true, route: "fonts", name: "Font Presets", icon: <LuCaseUpper /> },
        { active: true, route: "assets", name: "Assets", icon: <LuImage /> },
    ]

    const updateThemeColor = (color: any) => {
        if (isDarkMode) {
            dispatch(updateDarkThemeColor(color))
        } else {
            dispatch(updateLightThemeColor(color))
        }
    }

    const getContent = () => {
        switch (activetab) {
            case "assets":
                return <AssetsUploader />
            case "fonts":
                return <FontPresets />
            default:
                return <Flex vertical gap={10}>
                    <Text strong>Change your app appearance and settings</Text>

                    <LanguageSwitcher />

                    <TimezoneSwitcher />

                    <ThemeModeSwitcher />

                    <Flex vertical gap={10}>
                        <Text>Theme Color</Text>
                        <Flex gap={10}>
                            {colorsList[isDarkMode ? "dark" : "light"].map((color: any, i: number) => {
                                const rgbaColors: any = convertRGBtoOBJ(hexToRgbA(color));
                                const isSelected = isDarkMode ? darkThemeColor == color : lightThemeColor == color;
                                return <Fragment key={i}>
                                    <Button
                                        aria-label={`Theme color ${color}`}
                                        aria-pressed={isSelected}
                                        onClick={() => updateThemeColor(color)}
                                        style={{ background: `rgba(${rgbaColors.r}, ${rgbaColors.g}, ${rgbaColors.b}, ${0.6})`, borderColor: color }}>
                                        <SelectedItemCheck active={isSelected} />
                                        <span style={{ background: color, borderRadius: isSelected ? "4px" : "15px" }}></span>
                                    </Button>
                                </Fragment>
                            })}
                        </Flex>
                    </Flex>
                </Flex>
        }
    }

    return (
        <Flex className={styles.settingsWrap} justify='flex-start' align='flex-start' >
            <Flex className={styles.navigations} style={{ boxShadow: token.boxShadow }} justify="flex-start" align="flex-start" vertical gap={10}>
                {SETTING_NAVIGATIONS.map((nav: any, i: number) => {
                    if (!nav.active) return null
                    return <Fragment key={i}>
                        <Button type={(nav.name == "Profile" && !activetab) || activetab == nav.route ? "primary" : "default"}
                            styles={{ icon: { fontSize: 20 } }}
                            size="large"
                            ghost={(nav.name == "Profile" && !activetab) || activetab == nav.route}
                            block
                            onClick={() => setActivetab(nav.route)} icon={nav.icon}>{nav.name}</Button>
                    </Fragment>
                })}
            </Flex>
            <Flex className={styles.contentWrap} style={{ padding: activetab != 'assets' ? 20 : 0 }}>
                {getContent()}
            </Flex>
        </Flex>
    )
}

export default PlatformSettings
