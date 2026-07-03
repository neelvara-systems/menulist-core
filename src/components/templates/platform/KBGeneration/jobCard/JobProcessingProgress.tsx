import { INGESTION_JOB_STATUS, IngestionJob } from "@type/knowledgeBase";
import { Flex, Progress, Typography } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
const { Text, Title } = Typography;

const TIME_REQUIRED_PER_ARTICLE_SEC = 6; // example: 6 seconds

const FINISH_MESSAGES = [
    "Finalising content…",
    "Polishing details…",
    "Generating titles & summaries…",
    "Almost there…",
];

interface JobProcessingProgressProps { job: IngestionJob; totalArticlesCount: number; status: string }
/**
 * Simulated progress bar for a job while backend processing continues.
 * - Uses Firestore `modifiedOn` (job start) to compute elapsed time.
 * - Caps progress at 90% until backend signals completion (NEEDS_REVIEW).
 * - Continues correctly after page reload or navigation.
 */
export default function JobProcessingProgress({ job, totalArticlesCount, status }: JobProcessingProgressProps) {

    const [progress, setProgress] = useState(0);
    const [finishIndex, setFinishIndex] = useState(0);
    const safeTotalArticlesCount = Math.max(0, Math.floor(Number(totalArticlesCount) || 0));

    useEffect(() => {

        if (!job?.modifiedOn) return;

        const startedAtMs = typeof job.modifiedOn.toDate === 'function'
            ? job.modifiedOn.toDate().getTime()
            : Date.now();
        const totalDuration = Math.max(safeTotalArticlesCount, 1) * TIME_REQUIRED_PER_ARTICLE_SEC; // seconds

        const updateProgress = () => {
            const elapsed = (Date.now() - startedAtMs) / 1000; // in seconds
            const pct = Math.min((elapsed / totalDuration) * 100, 90);
            setProgress(status === INGESTION_JOB_STATUS.NEEDS_REVIEW ? 100 : pct);
        };

        updateProgress(); // initial calculation on mount

        const interval = setInterval(updateProgress, 1000);
        return () => clearInterval(interval);
    }, [job.modifiedOn, safeTotalArticlesCount, status]);

    // cycle finishing messages once we reach the threshold
    useEffect(() => {
        if (progress >= 90 && progress < 100) {
            const msgTimer = setInterval(() => {
                setFinishIndex((i) => (i + 1) % FINISH_MESSAGES.length);
            }, 2000); // change every 2s
            return () => clearInterval(msgTimer);
        }
    }, [progress]);

    const processed = Math.floor((progress / 100) * safeTotalArticlesCount);
    const showFinishing = progress >= 90 && progress < 100;

    const textContent = showFinishing
        ? FINISH_MESSAGES[finishIndex]
        : safeTotalArticlesCount > 0
            ? `${processed || 0} of ${safeTotalArticlesCount} articles processed`
            : 'Processing articles';

    return (
        <Flex vertical align='center' gap={8} style={{ marginBottom: 26 }}>
            <Title level={5} style={{ margin: 0 }}>Processing Articles</Title>
            <Progress
                type="circle"
                size={80}
                percent={Number(progress.toFixed(1))}
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
