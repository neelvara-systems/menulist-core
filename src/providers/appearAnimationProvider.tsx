import { memo } from 'react';
import { useInView } from 'react-intersection-observer';

function AppearAnimationProvider({ children }) {
    const { ref, inView } = useInView({ threshold: 0.5 });

    const Animation = {
        "name": "fadeIn",
        "duration": "0.5s",
        "timingFunction": "ease-in-out"
    }
    const animationStyle = { animation: `${Animation.name} ${Animation.duration} ${Animation.timingFunction}` };
    return <div style={animationStyle} ref={ref}>{children}</div>
}

export default memo(AppearAnimationProvider)