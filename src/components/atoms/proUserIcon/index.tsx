import { Tooltip } from 'antd'
import { LuCrown } from 'react-icons/lu'
import styles from './proIcon.module.scss'

function ProUserIcon() {
    return (
        <div className={styles.proUserIconWrap}>
            <Tooltip title="Available for pro version" color="gold">
                <div className={styles.iconWrap}>
                    <LuCrown fill="currentColor" />
                </div>
            </Tooltip>
        </div>
    )
}

export default ProUserIcon
