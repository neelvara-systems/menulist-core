import { Flex, Progress, Typography } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
const { Text, Title } = Typography;

const FINISH_MESSAGES = [
    "Finalising content…",
    "Polishing details…",
    "Generating titles & summaries…",
    "Almost there…",
];

interface JobPublishingProgressProps { articlesToEmbedCount: number; articlesEmbeddedCount: number; status: string }
/**
 * Simulated progress bar for a job while backend processing continues.
 * - Uses Firestore `modifiedOn` (job start) to compute elapsed time.
 * - Caps progress at 90% until backend signals completion (NEEDS_REVIEW).
 * - Continues correctly after page reload or navigation.
 */
export default function JobPublishingProgress({ articlesToEmbedCount, articlesEmbeddedCount }: JobPublishingProgressProps) {

    const embeddingProgress = articlesToEmbedCount ? Math.round((articlesEmbeddedCount || 0) / articlesToEmbedCount * 100) : 0;
    const [finishIndex, setFinishIndex] = useState(0);

    useEffect(() => {
        if (embeddingProgress >= 90 && embeddingProgress < 100) {
            const msgTimer = setInterval(() => {
                setFinishIndex((i) => (i + 1) % FINISH_MESSAGES.length);
            }, 2000); // change every 2s
            return () => clearInterval(msgTimer);
        }
    }, [articlesEmbeddedCount]);

    const textContent = embeddingProgress >= 90 && embeddingProgress < 100 ? FINISH_MESSAGES[finishIndex] : `${articlesEmbeddedCount || 0} of ${articlesToEmbedCount} articles completed`;

    return (
        <Flex vertical align='center' gap={8} style={{ marginBottom: 26 }}>
            <Title level={5} style={{ margin: 0 }}>Publishing Articles</Title>
            <Progress
                type="circle"
                size={80}
                percent={Number(embeddingProgress.toFixed(1))}
                strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={textContent} // The key is crucial for AnimatePresence to detect changes
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ minHeight: 22, display: 'flex', alignItems: 'center' }}
                >
                    <Text>{textContent}</Text>
                </motion.div>
            </AnimatePresence>
        </Flex>
    );
}
