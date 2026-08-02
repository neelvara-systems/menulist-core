import { APP_THEME_COLOR } from '@constant/common';
import { Button, Tooltip } from 'antd';
import type { ButtonProps, TooltipProps } from 'antd';
import type { ReactNode } from 'react';
import { LuSparkles } from 'react-icons/lu';
import styles from './aiButtonIcon.module.scss';

type AIButtonIconProps = {
    icon?: ReactNode;
    label?: ReactNode;
    type?: ButtonProps['type'];
    onClick?: ButtonProps['onClick'];
    tooltip?: ReactNode;
    loading?: ButtonProps['loading'];
    size?: ButtonProps['size'];
    shape?: ButtonProps['shape'];
    tooltipDir?: TooltipProps['placement'];
};

function AIButtonIcon({ icon = <LuSparkles />, label = "", type = "default", onClick, tooltip = "", loading = false, size = "middle", shape = 'default', tooltipDir = "top" }: AIButtonIconProps) {
    return (
        <div className={styles.proUserIconWrap}>
            <Tooltip title={tooltip} placement={tooltipDir}>
                <Button
                    onClick={onClick}
                    size={size}
                    type={type}
                    shape={shape}
                    loading={loading}
                    // className={styles.iconWrap}
                    style={{
                        backgroundImage: `radial-gradient(circle at 5px 5px, ${APP_THEME_COLOR} 1px, transparent 0)`,
                    }}
                    icon={<span style={{ color: APP_THEME_COLOR, display: 'inline-flex' }}>{icon}</span>}>
                    {label}
                </Button>
            </Tooltip>
        </div>
    )
}

export default AIButtonIcon
