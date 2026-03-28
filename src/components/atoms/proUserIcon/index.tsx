import { Tooltip } from 'antd'
import { PiCrownFill } from 'react-icons/pi'
import styles from './proIcon.module.scss'

function ProUserIcon() {
    return (
        <div className={styles.proUserIconWrap}>
            <Tooltip title="Available for pro version" color="gold">
                <div className={styles.iconWrap}>
                    <PiCrownFill />
                </div>
            </Tooltip>
        </div>
    )
}

export default ProUserIcon