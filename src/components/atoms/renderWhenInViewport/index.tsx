
import { LoadingOutlined } from '@ant-design/icons';
import useInViewport from '@hook/useInViewport';
import { Spin } from 'antd';
import { useRef } from 'react';

function RenderWhenInViewport({ children, isLoading, styles = {} }) {
    const elementRef = useRef();
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