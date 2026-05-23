import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import CanonicaAnimatedLogo from '@atoms/canonicaAnimatedLogo';
import { useAppSelector } from '@hook/useAppSelector';
import { isCanonicaRuntimeRoute } from '@lib/canonica/sessionScope';
import { getLoaderState } from '@reduxSlices/loader';
import { theme } from 'antd';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Style from './loader.module.scss';

const MIN_VISIBLE_MS = 280;
const HIDE_GRACE_MS = 180;

function Loader() {
    const { token } = theme.useToken();
    const pathname = usePathname();
    const loading = useAppSelector(getLoaderState);
    const [isVisible, setIsVisible] = useState(false);
    const shownAtRef = useRef<number>(0);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const isCanonicaRoute = isCanonicaRuntimeRoute(pathname, currentHostname);

    useEffect(() => {
        if (loading) {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            // Keep the global loader continuous across back-to-back composed requests.
            // We intentionally preserve Redux reference counting rather than suppressing
            // start events while active, because concurrent requests still need correct
            // stop semantics before the overlay can disappear.
            if (!isVisible) {
                shownAtRef.current = Date.now();
                setIsVisible(true);
            }
            return;
        }

        if (!isVisible) {
            return;
        }

        const elapsed = Date.now() - shownAtRef.current;
        const delay = Math.max(HIDE_GRACE_MS, MIN_VISIBLE_MS - elapsed);

        hideTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            hideTimeoutRef.current = null;
        }, delay);

        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
        };
    }, [isVisible, loading]);

    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    return (
        <>
            {isVisible ? <div
                data-loader-source={loading}
                data-loader-brand={isCanonicaRoute ? 'canonica' : 'menulist'}
                className={`${Style.loaderbody} ${isCanonicaRoute ? Style.canonicaLoaderbody : ''}`.trim()}
                style={isCanonicaRoute ? undefined : { background: token.colorBgMask }}
            >
                {isCanonicaRoute
                    ? <CanonicaAnimatedLogo idPrefix="canonica-global-loader" />
                    : <AnimatedVerticalLogo showLabel={false} />}
            </div> : null}
        </>
    )
}

export default Loader;
