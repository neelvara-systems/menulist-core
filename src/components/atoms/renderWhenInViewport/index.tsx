
import { LoadingOutlined } from '@ant-design/icons';
import useInViewport from '@hook/useInViewport';
import { Spin } from 'antd';
import { useRef, type CSSProperties, type ReactNode } from 'react';

interface RenderWhenInViewportProps {
    children: ReactNode;
    isLoading: boolean;
    styles?: CSSProperties;
}

function RenderWhenInViewport({ children, isLoading, styles = {} }: RenderWhenInViewportProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const isVisible = useInViewport(elementRef);
    const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

    return (
        <>
            <div ref={elementRef} style={{ position: "relative", ...styles }}>
                {(isVisible && !isLoading) ? <>
                    {children}
                </>
                    : <Spin indicator={antIcon} />}
            </div>
        </>
    )
}

export default RenderWhenInViewport
