import { LuHand, LuTextCursor } from 'react-icons/lu'
import styles from './advanceToggler.module.scss'
function AdvanceToggler() {
    return (
        <label>
            <input className={styles.togglecheckbox} type="checkbox" />
            <div className={styles.toggleslot}>
                <div className={styles.suniconwrapper}>
                    <div className={styles.sunicon} data-icon="feathersun" data-inline="false"><LuHand /></div>
                </div>
                <div className={styles.togglebutton}></div>
                <div className={styles.mooniconwrapper}>
                    <div className={styles.moonicon} data-icon="feathermoon" data-inline="false"><LuTextCursor /></div>
                </div>
            </div>
        </label>

    )
}

export default AdvanceToggler