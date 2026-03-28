'use client';

/**
 * Public Menu Entry — Success Page
 * 
 * /create-menu/success — Shows after successful claim + publish.
 * Displays live URL, QR code, share options, and next steps.
 * Requires authentication (redirected here after claim).
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §6.3
 */

import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import '@/styles/website.css';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuMapPin, LuMessageCircle, LuQrCode } from 'react-icons/lu';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const menuUrl = searchParams.get('menuUrl') || '';
    const subdomain = searchParams.get('subdomain') || '';
    const businessName = searchParams.get('name') || 'Your Business';

    const [copied, setCopied] = useState(false);

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(menuUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = menuUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [menuUrl]);

    const handleWhatsAppShare = () => {
        const msg = `Check out our menu: ${menuUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="ws-page">
            <Header />
            <div style={{
                maxWidth: '560px',
                margin: '0 auto',
                padding: '40px 20px 60px',
                textAlign: 'center',
            }}>
                {/* Success badge */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                }}>
                    <LuCheck size={32} color="#22c55e" />
                </div>

                <h1 style={{
                    fontSize: '26px',
                    fontWeight: 700,
                    color: '#1a1a2e',
                    marginBottom: '8px',
                }}>
                    Your menu page is live!
                </h1>

                <p style={{
                    fontSize: '15px',
                    color: '#64748b',
                    marginBottom: '28px',
                }}>
                    {businessName}&apos;s menu is now available for your customers.
                </p>

                {/* Live URL Card */}
                <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                }}>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Your menu link
                    </p>
                    <a
                        href={menuUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#6366f1',
                            textDecoration: 'none',
                            wordBreak: 'break-all',
                        }}
                    >
                        {menuUrl} <LuExternalLink size={14} style={{ verticalAlign: 'middle' }} />
                    </a>
                </div>

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '32px',
                }}>
                    <button
                        onClick={handleCopyLink}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px 24px',
                            backgroundColor: copied ? '#22c55e' : '#6366f1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            width: '100%',
                        }}
                    >
                        {copied ? <><LuCheck size={18} /> Copied!</> : <><LuCopy size={18} /> Copy Link</>}
                    </button>

                    <button
                        onClick={handleWhatsAppShare}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px 24px',
                            backgroundColor: '#fff',
                            color: '#25D366',
                            border: '1px solid #25D366',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        <LuMessageCircle size={18} /> Share on WhatsApp
                    </button>
                </div>

                {/* QR Code hint */}
                <div style={{
                    backgroundColor: '#fefce8',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    textAlign: 'left',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                }}>
                    <LuQrCode size={20} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#854d0e', marginBottom: '4px' }}>
                            Get your QR code
                        </p>
                        <p style={{ fontSize: '13px', color: '#a16207', lineHeight: 1.4 }}>
                            Sign in to your dashboard to download a QR code poster for your tables and counter.
                        </p>
                    </div>
                </div>

                {/* Google Maps hint */}
                <div style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '32px',
                    textAlign: 'left',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                }}>
                    <LuMapPin size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                            Add to Google Maps
                        </p>
                        <p style={{ fontSize: '13px', color: '#3b82f6', lineHeight: 1.4 }}>
                            Open Google Maps → Find your business → Edit → Website → Paste your menu link. Customers will find your menu when they search for you.
                        </p>
                    </div>
                </div>

                {/* Go to dashboard */}
                <a
                    href="/dashboard"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 28px',
                        backgroundColor: '#fff',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        cursor: 'pointer',
                    }}
                >
                    Go to dashboard →
                </a>
            </div>
            <Footer />
        </div>
    );
}
