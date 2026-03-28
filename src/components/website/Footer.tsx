'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import AnimatedVerticalLogo from '../atoms/animatedVerticalLogo';
import LogoMark from './shared/LogoMark';

const productLinkKeys = [
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/features', key: 'features' },
  { href: '/multi-location', key: 'multiLocation' },
  { href: '/pricing', key: 'pricing' },
  { href: '/about', key: 'about' },
];

const legalLinkKeys = [
  { href: '/privacy-policy', key: 'privacyPolicy' },
  { href: '/terms-of-service', key: 'termsOfService' },
  { href: '/refund-policy', key: 'refundPolicy' },
  { href: '/trust-security', key: 'trustSecurity' },
  { href: '/contact', key: 'contact' },
];

const socialLinks = [
  {
    href: 'https://twitter.com/menulistai',
    label: 'X (Twitter)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: 'https://instagram.com/menulistai',
    label: 'Instagram',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: 'https://linkedin.com/company/menulistai',
    label: 'LinkedIn',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    href: 'https://wa.me/message/menulistai',
    label: 'WhatsApp',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const t = useTranslations('Website');
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: '#0f172a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Responsive grid + animated logo styles */}
      <style>{`
        .ws-footer-grid {
          display: grid !important;
          grid-template-columns: 2fr 1fr 1fr !important;
        }
        @media (max-width: 768px) {
          .ws-footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 769px) and (max-width: 960px) {
          .ws-footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>


      {/* Animated logo mark watermark — reuses AnimatedVerticalLogo (same as loader) */}
      <div style={{
        position: 'absolute',
        right: '-80px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '100%',
        height: '730px',
        opacity: 0.07,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        <AnimatedVerticalLogo showLabel={false} />
      </div>

      <div
        className="ws-container ws-footer-grid"
        style={{
          padding: 'var(--ws-space-16) var(--ws-space-6) var(--ws-space-8)',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 'var(--ws-space-12)',
          position: 'relative',
        }}
      >
        {/* Brand Column */}
        <div>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--ws-space-2)',
              textDecoration: 'none',
              color: '#ffffff',
            }}
          >
            <LogoMark height={22} />
            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ffffff' }}>MenuList</span>
          </Link>
          <p
            style={{
              marginTop: 'var(--ws-space-3)',
              color: '#94a3b8',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              maxWidth: '280px',
            }}
          >
            {t('Footer.tagline')}
          </p>
          <p
            style={{
              marginTop: 'var(--ws-space-2)',
              color: '#64748b',
              fontSize: '0.875rem',
            }}
          >
            <a href="mailto:hello@menulist.ai" style={{ color: 'inherit', textDecoration: 'none' }}>
              hello@menulist.ai
            </a>
          </p>

          {/* Social Icons */}
          <div style={{ display: 'flex', gap: 'var(--ws-space-3)', marginTop: 'var(--ws-space-6)' }}>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--ws-radius-md)',
                  backgroundColor: '#1e293b',
                  color: '#64748b',
                  border: '1px solid #334155',
                  transition: 'all var(--ws-transition-fast)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1e293b';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.borderColor = '#334155';
                }}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94a3b8',
              marginBottom: 'var(--ws-space-4)',
            }}
          >
            {t('Footer.productHeading')}
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
            {productLinkKeys.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: '0.9375rem',
                    transition: 'color var(--ws-transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  {t(`Footer.${link.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal Column */}
        <div>
          <h4
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94a3b8',
              marginBottom: 'var(--ws-space-4)',
            }}
          >
            {t('Footer.legalHeading')}
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
            {legalLinkKeys.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: '0.9375rem',
                    transition: 'color var(--ws-transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  {t(`Footer.${link.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="ws-container"
        style={{
          padding: 'var(--ws-space-6) var(--ws-space-6)',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--ws-space-3)',
          position: 'relative',
        }}
      >
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          {t('Footer.copyright', { year: currentYear })}
        </p>
        <p style={{ color: '#475569', fontSize: '0.8125rem' }}>
          {t('Footer.bottomTagline')}
        </p>
      </div>

    </footer>
  );
}
