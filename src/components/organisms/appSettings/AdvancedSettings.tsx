import Saperator from '@atoms/Saperator';
import { Switch, Tooltip, Typography } from 'antd';
import { memo } from 'react';
import styles from './appSettings.module.scss';

const { Text } = Typography;

interface SettingItem {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

interface AdvancedSettingsProps {
    settings: SettingItem[];
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ settings }) => {
    return (
        <>
            {settings.map((setting, index) => (
                <div key={index}>
                    {index > 0 && <Saperator />}
                    <div className={styles.advancedSettingsItem}>
                        <Tooltip title={setting.description} placement="left">
                            <Text className={styles.settingLabel}>{setting.label}</Text>
                        </Tooltip>
                        <Switch
                            checked={setting.checked}
                            onChange={setting.onChange}
                            aria-label={setting.label}
                        />
                    </div>
                </div>
            ))}
        </>
    );
};

export default memo(AdvancedSettings);
