import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';

interface StarterActivationHoldingPageProps {
    activePlanType?: string | null;
    activeLanguage?: string | null;
    storeName?: string | null;
}

export default function StarterActivationHoldingPage({
    activePlanType,
    activeLanguage,
    storeName,
}: StarterActivationHoldingPageProps) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const direction = getPublicCustomerLanguageDirection(activeLanguage);
    const name = storeName?.trim() || t('common.business');

    return (
        <main
            dir={direction}
            lang={activeLanguage || 'en'}
            style={{
                alignItems: 'center',
                background: '#fafafa',
                color: '#111827',
                display: 'flex',
                justifyContent: 'center',
                minHeight: '100dvh',
                padding: '24px',
            }}
        >
            <section
                aria-labelledby="starter-holding-title"
                style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                    maxWidth: 480,
                    padding: '28px',
                    textAlign: 'center',
                    width: '100%',
                }}
            >
                <p
                    style={{
                        color: '#6b7280',
                        fontSize: 13,
                        letterSpacing: 0,
                        margin: '0 0 10px',
                        textTransform: 'uppercase',
                    }}
                >
                    {t('menu.menuStatus')}
                </p>
                <h1
                    id="starter-holding-title"
                    style={{
                        fontSize: 24,
                        lineHeight: 1.25,
                        margin: '0 0 12px',
                    }}
                >
                    {t('menu.notFinalizedYet', { businessName: name })}
                </h1>
                <p
                    style={{
                        color: '#4b5563',
                        fontSize: 15,
                        lineHeight: 1.6,
                        margin: '0 0 20px',
                    }}
                >
                    {t('menu.contactBusinessCurrentMenu')}
                </p>
                <PublicMenuListAttribution
                    activePlanType={activePlanType}
                    ariaLabel={t('common.createOfficialCustomerLink')}
                    mode="compact"
                    rightsLabel={null}
                    surfaceLabel={t('common.poweredByMenuList')}
                />
            </section>
        </main>
    );
}
