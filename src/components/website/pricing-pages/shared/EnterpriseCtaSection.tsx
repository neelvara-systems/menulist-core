"use client";

import { LuArrowRight } from "react-icons/lu";
import { useTranslations } from 'next-intl';
import SectionWrapper from '../../shared/SectionWrapper';

const EnterpriseCtaSection = () => {
    const t = useTranslations('Website');

    return (
        <SectionWrapper variant="subtle">
            <div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
                <h2
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--ws-text-primary)',
                        lineHeight: 1.3,
                        letterSpacing: 0,
                    }}
                >
                    {t('Pricing.enterpriseTitle')}
                </h2>
                <p
                    style={{
                        fontSize: '1rem',
                        color: 'var(--ws-text-secondary)',
                        marginTop: 'var(--ws-space-3)',
                        lineHeight: 1.6,
                    }}
                >
                    {t('Pricing.enterpriseBody')}
                </p>
                <a
                    href="mailto:sales@menulist.ai"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: 'var(--ws-space-6)',
                        padding: '12px 28px',
                        backgroundColor: 'var(--ws-brand-secondary)',
                        color: '#fff',
                        borderRadius: 'var(--ws-radius-md)',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background-color var(--ws-transition-fast)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ws-brand-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--ws-brand-secondary)'; }}
                >
                    {t('Pricing.enterpriseCta')} <LuArrowRight size={16} />
                </a>
            </div>
        </SectionWrapper>
    );
};

export default EnterpriseCtaSection;
