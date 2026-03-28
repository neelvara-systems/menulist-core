import TextElement from '@antdComponent/textElement';
import Saperator from '@atoms/Saperator';
import { DARK_COLORS, LIGHT_COLORS } from '@constant/common';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useFullscreen } from '@hook/useFullscreen';
import AppLayoutSwitcher from '@organisms/appLayoutSwitcher';
import DateFormatSwitcher from '@organisms/dateFormatSwitcher';
import LanguageSwitcher from '@organisms/languageSwitcher';
import ThemeModeSwitcher from '@organisms/themeModeSwitcher';
import TimeFormatSwitcher from '@organisms/timeFormatSwitcher';
import TimezoneSwitcher from '@organisms/timezoneSwitcher';
import { getAppSettingsPanelStatus, getDarkColorState, getDarkModeState, getFullscreenModeState, getLightColorState, getRTLDirectionState, getShowDateInHeaderState, getShowUserDetailsInHeaderState, toggleAppSettingsPanel, toggleRTLDirection, toggleShowDateInHeader, toggleShowUserDetailsInHeader, updateDarkThemeColor, updateLightThemeColor } from '@reduxSlices/clientThemeConfig';
import { Button, Drawer, Flex, Space, Tooltip, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useMemo } from 'react';
import { LuArrowLeftFromLine, LuArrowRightFromLine, LuX } from 'react-icons/lu';
import AdvancedSettings from './AdvancedSettings';
import EnhancedColorPicker from './EnhancedColorPicker';

const colorsList = {
  light: LIGHT_COLORS,
  dark: DARK_COLORS,
}

const { Title } = Typography;

const AppSettingsPanel = () => {
  const t = useTranslations('AppSettings');
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector(getDarkModeState);
  const lightThemeColor = useAppSelector(getLightColorState);
  const darkThemeColor = useAppSelector(getDarkColorState);
  const isOpen = useAppSelector(getAppSettingsPanelStatus);
  const isRTLDirection = useAppSelector(getRTLDirectionState);
  const showDateInHeader = useAppSelector(getShowDateInHeaderState);
  const showUserInHeader = useAppSelector(getShowUserDetailsInHeaderState);
  const fullscreenMode = useAppSelector(getFullscreenModeState);

  // Use custom fullscreen hook
  const { toggleFullscreen } = useFullscreen();

  // Memoized color selection callback
  const updateThemeColor = useCallback((color: string) => {
    if (isDarkMode) {
      dispatch(updateDarkThemeColor(color));
    } else {
      dispatch(updateLightThemeColor(color));
    }
  }, [isDarkMode, dispatch]);

  // Advanced settings configuration
  const advancedSettings = useMemo(() => [
    {
      label: t('showTodaysDate'),
      description: t('showTodaysDateDesc'),
      checked: showDateInHeader,
      onChange: (checked: boolean) => dispatch(toggleShowDateInHeader(checked))
    },
    {
      label: t('showUserName'),
      description: t('showUserNameDesc'),
      checked: showUserInHeader,
      onChange: (checked: boolean) => dispatch(toggleShowUserDetailsInHeader(checked))
    },
    {
      label: t('useFullScreen'),
      description: t('useFullScreenDesc'),
      checked: fullscreenMode,
      onChange: toggleFullscreen
    }
  ], [showDateInHeader, showUserInHeader, fullscreenMode, dispatch, toggleFullscreen, t]);

  const renderTitle = () => {
    return (
      <Space direction='vertical' size={0}>
        <TextElement text={t('title')} size="medium" type='primary' />
        <TextElement text={t('subtitle')} size="small" />
      </Space>
    );
  }

  return (
    <>
      <Drawer
        title={renderTitle()}
        placement="right"
        closable={false}
        onClose={() => dispatch(toggleAppSettingsPanel(false))}
        destroyOnClose={true}
        open={isOpen}
        key="app-settings"
        extra={
          <Tooltip title={t('closeSettings')}>
            <Button
              shape='circle'
              icon={<LuX />}
              onClick={() => dispatch(toggleAppSettingsPanel(false))}
              aria-label="Close settings panel"
            />
          </Tooltip>
        }
      >
        <Flex vertical gap={16}>
          {/* APPEARANCE SECTION */}
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>{t('appearance')}</Title>
            <Flex vertical gap={12}>
              <ThemeModeSwitcher />
              <Saperator />
              <Flex vertical gap={10}>
                <TextElement text={t('themeColors')} size="medium" />
                <EnhancedColorPicker
                  key={isDarkMode ? 'dark-mode' : 'light-mode'}
                  colors={colorsList[isDarkMode ? "dark" : "light"]}
                  selectedColor={isDarkMode ? darkThemeColor : lightThemeColor}
                  onSelect={updateThemeColor}
                />
              </Flex>
            </Flex>
          </div>

          <Saperator />

          {/* LAYOUT SECTION */}
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>{t('layout')}</Title>
            <Flex vertical gap={12}>
              <AppLayoutSwitcher />
              <Flex vertical gap={10}>
                <TextElement text={t('textDirection')} size="medium" />
                <Flex gap={10}>
                  <Button
                    block
                    onClick={() => dispatch(toggleRTLDirection(true))}
                    size="large"
                    type={isRTLDirection ? "primary" : "default"}
                    icon={<LuArrowLeftFromLine />}
                    aria-label={t('rtlAriaLabel')}
                  >
                    {t('rtl')}
                  </Button>
                  <Button
                    block
                    onClick={() => dispatch(toggleRTLDirection(false))}
                    size="large"
                    type={isRTLDirection ? "default" : "primary"}
                    icon={<LuArrowRightFromLine />}
                    aria-label={t('ltrAriaLabel')}
                  >
                    {t('ltr')}
                  </Button>
                </Flex>
              </Flex>
            </Flex>
          </div>

          <Saperator />

          {/* LOCALIZATION SECTION */}
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>{t('localization')}</Title>
            <Flex vertical gap={12}>
              <LanguageSwitcher />
              <Saperator />
              <TimezoneSwitcher />
              <Saperator />
              <Flex gap={10}>
                <DateFormatSwitcher />
                <TimeFormatSwitcher />
              </Flex>
            </Flex>
          </div>

          <Saperator />

          {/* ADVANCED SETTINGS SECTION */}
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>{t('advancedSettings')}</Title>
            <Flex vertical gap={12}>
              <AdvancedSettings settings={advancedSettings} />
            </Flex>
          </div>

        </Flex>
      </Drawer>
    </>
  );
};

export default memo(AppSettingsPanel);
