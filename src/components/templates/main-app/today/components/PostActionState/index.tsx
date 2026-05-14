import { Typography } from "antd";
import { LuCheck } from "react-icons/lu";
import styles from "../../styles.module.scss";

const { Title, Text } = Typography;

interface PostActionStateProps {
    action: "shared" | "skipped";
    title?: string;
    description?: string;
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
const PostActionState = ({ action, title, description }: PostActionStateProps) => {
    // Simple, calm confirmation
    const message = title || (action === "shared" ? "Shared" : "Skipped");
    const subMessage = description || (action === "shared"
        ? "This action is marked as done for today."
        : "No action needed. This was skipped for today.");

    return (
        <div className={styles.postActionState}>
            <LuCheck className={styles.checkIcon} />
            <Title level={4}>{message}</Title>
            <Text type="secondary">{subMessage}</Text>
        </div>
    );
};

export default PostActionState;
