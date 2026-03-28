import { theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { GiCheckMark } from 'react-icons/gi';
import styles from './selectedItemCheck.module.scss';

function SelectedItemCheck({ active }) {
    const { token } = theme.useToken();

    return (
        <>
            <AnimatePresence>
                {active ? <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={styles.selectedItemCheck}
                    style={{ color: token.colorBgBase, background: token.colorPrimaryText }}>
                    <GiCheckMark />
                </motion.div> : <></>}
            </AnimatePresence>
        </>
    )
}

export default SelectedItemCheck