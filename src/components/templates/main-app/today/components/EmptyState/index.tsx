import { Typography } from "antd";
import { LuCalendarOff } from "react-icons/lu";
import styles from "../../styles.module.scss";

const { Text } = Typography;

/**
 * Empty State
 * Shown when no campaigns qualify for today
 * 
 * Philosophy (from ChatGPT):
 * - Centered vertically
 * - No illustration
 * - No empty-state jokes
 * - No CTA
 * 
 * "This screen teaches owners: 'It's okay to do nothing.' That's trust."
 */
const EmptyState = () => {
    return (
        <div className={styles.emptyState}>
            <LuCalendarOff className={styles.emptyIcon} />
            <Text type="secondary">
                Nothing to do right now.
            </Text>
        </div>
    );
};

export default EmptyState;
