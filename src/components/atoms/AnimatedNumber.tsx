import { motion } from "framer-motion";

// --- Helper Components: For animated visual feedback ---
const AnimatedNumber = ({ value, currencySymbol = '' }: { value: number; currencySymbol?: string }) => {
    const displayValue = Number.isFinite(value) ? Math.round(value).toLocaleString() : '—';
    return (
        <motion.span
            key={`${currencySymbol}${value}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="inline-block"
        >
            {displayValue === '—' ? displayValue : `${currencySymbol}${displayValue}`}
        </motion.span>
    );
};

export default AnimatedNumber;
