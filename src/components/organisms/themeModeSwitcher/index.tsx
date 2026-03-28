import { useAppDispatch } from "@hook/useAppDispatch";
import { useAppSelector } from "@hook/useAppSelector";
import styles from '@organismsCSS/sidebarComponent/appSettingsPanel.module.scss';
import { getDarkModeState, toggleDarkMode } from "@reduxSlices/clientThemeConfig";
import { showSuccessToast } from "@reduxSlices/toast";
import { Flex, Radio, theme, Typography } from "antd";
import { useTranslations } from "next-intl";
import { LuMoon, LuSun } from "react-icons/lu";

const { Text } = Typography;

function ThemeModeSwitcher() {

    const t = useTranslations('Settings');
    const isDarkMode = useAppSelector(getDarkModeState)
    const dispatch = useAppDispatch()
    const { token } = theme.useToken();
    const toggleDarkModeTheme = (from: string) => {
        if (from === 'light') {
            if (isDarkMode) {
                dispatch(toggleDarkMode(!isDarkMode));
                dispatch(showSuccessToast(t('lightThemeEnabled')))
            }
        } else {
            if (!isDarkMode) {
                dispatch(toggleDarkMode(!isDarkMode));
                dispatch(showSuccessToast(t('darkThemeEnabled')))
            }
        }
    }

    return (
        <Flex vertical className={styles.appSettingsPanelWrap} gap={10}>
            <Text strong>{t('themeMode')}</Text>
            <Flex gap={10}>
                <Radio.Group
                    value={isDarkMode ? "dark" : "light"}
                    onChange={(e) => toggleDarkModeTheme(e.target.value)}
                    style={{ width: '100%', display: 'flex' }}
                    buttonStyle="solid"
                >
                    <Radio.Button
                        value="dark"
                        style={{
                            flex: 1,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14
                        }}
                    >
                        <Flex align="center" justify="center" gap={8}>
                            <LuMoon size={18} />
                            <span>{t('darkMode')}</span>
                        </Flex>
                    </Radio.Button>
                    <Radio.Button
                        value="light"
                        style={{
                            flex: 1,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14
                        }}
                    >
                        <Flex align="center" justify="center" gap={8}>
                            <LuSun size={18} />
                            <span>{t('lightMode')}</span>
                        </Flex>
                    </Radio.Button>
                </Radio.Group>
            </Flex>
        </Flex>
    )
}

export default ThemeModeSwitcher