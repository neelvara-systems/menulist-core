import { APP_THEME_COLOR } from '@constant/common';
import { Button, Tooltip } from 'antd';
import { RiSparkling2Line } from 'react-icons/ri';
import styles from './aiButtonIcon.module.scss';

function AIButtonIcon({ Icon = RiSparkling2Line, label = "", type = "default", onClick = () => { }, tooltip = "", loading = false, size = "default", shape = 'square', tooltipDir = "top" }: any) {
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
                    icon={<Icon style={{ color: APP_THEME_COLOR }} />}>
                    {label}
                </Button>
            </Tooltip>
        </div>
    )
}

export default AIButtonIcon