import { motion } from "framer-motion";

// --- Helper Components: For animated visual feedback ---
const AnimatedNumber = ({ value, currencySymbol = '' }: { value: number; currencySymbol?: string }) => {
    return (
        <motion.span
            key={`${currencySymbol}${value}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="inline-block"
        >
            {currencySymbol}{Math.round(value).toLocaleString()}
        </motion.span>
    );
};

export default AnimatedNumber;