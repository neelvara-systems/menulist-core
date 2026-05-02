import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import styles from './page.module.css';

function ServerSidePageLoader({ page }: { page?: string }) {
    return (
        <main
            className={styles.loadingWrap}
            data-loader-source={`server-loader-${page || 'app'}`}
            aria-label="MenuList is loading"
        >
            <div className={styles.loadingWatermark} aria-hidden="true">
                <AnimatedVerticalLogo showLabel={false} />
            </div>
            <div className={styles.loadingLogo} aria-hidden="true">
                <AnimatedVerticalLogo showLabel={false} />
            </div>
        </main>
    )
}

export default ServerSidePageLoader
