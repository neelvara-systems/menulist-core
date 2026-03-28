import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import styles from './page.module.css';

function ServerSidePageLoader({ page }) {
    return (
        <main className={styles.loadingWrap} data-loader-source={`server-loader-${page}`}>
            <AnimatedVerticalLogo showLabel={false} />
        </main>
    )
}

export default ServerSidePageLoader