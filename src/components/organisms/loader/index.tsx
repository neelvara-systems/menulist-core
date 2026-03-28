import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import { useAppSelector } from '@hook/useAppSelector';
import { getLoaderState } from '@reduxSlices/loader';
import { theme } from 'antd';
import Style from './loader.module.scss';

function Loader() {
    const { token } = theme.useToken();
    const loading = useAppSelector(getLoaderState);

    return (
        <>
            {Boolean(loading) ? <div data-loader-source={loading} className={Style.loaderbody} style={{ background: token.colorBgMask }}>
                <AnimatedVerticalLogo showLabel={false} />
            </div> : null}
        </>
    )
}

export default Loader;
