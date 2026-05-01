import styles from './page.module.css';

function ServerSidePageLoader({ page }) {
    return (
        <main className={styles.loadingWrap} data-loader-source={`server-loader-${page}`}>
            <div className={styles.loadingCard}>
                <div className={styles.loadingMark} aria-hidden="true">
                    <span className={styles.loadingDot} />
                    <span className={styles.loadingDot} />
                    <span className={styles.loadingDot} />
                </div>
                <div className={styles.loadingTitle}>MenuList</div>
                <div className={styles.loadingSubtitle}>Opening your workspace...</div>
            </div>
        </main>
    )
}

export default ServerSidePageLoader
