import { Typography } from "antd";
import { LuCheck } from "react-icons/lu";
import styles from "../../styles.module.scss";

const { Title, Text } = Typography;

interface PostActionStateProps {
    action: "shared" | "skipped";
}

/**
 * Post-Action State
 * Shown immediately after user completes or skips a campaign
 * 
 * Philosophy (from ChatGPT):
 * - No confetti
 * - No "Great job!"
 * - No next suggestion
 * - No upsell
 * 
 * "Celebration implies evaluation. Evaluation invites doubt."
 */
const PostActionState = ({ action }: PostActionStateProps) => {
    // Simple, calm confirmation
    const message = action === "shared" ? "Shared" : "Skipped";
    const subMessage = "You're done for today.";

    return (
        <div className={styles.postActionState}>
            <LuCheck className={styles.checkIcon} />
            <Title level={4}>{message}</Title>
            <Text type="secondary">{subMessage}</Text>
        </div>
    );
};

export default PostActionState;
