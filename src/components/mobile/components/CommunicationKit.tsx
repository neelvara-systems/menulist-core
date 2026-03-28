'use client';

/**
 * Customer Communication Kit — Mobile Component
 *
 * Mobile-optimized message templates using antd-mobile.
 * WhatsApp as primary action (India = WhatsApp-first market).
 *
 * @see __docs__/customer-communication-kit/README.md
 */

import { generateMessageTemplates, getTodayHours, MessageTemplate, type MessageTemplateInput } from '@lib/communication/messageTemplates';
import { Button, Card, Toast } from 'antd-mobile';
import { useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuMessageSquare } from 'react-icons/lu';

interface MobileCommunicationKitProps {
    storeName: string;
    businessType: string;
    menuLink: string;
    address?: string;
    phone?: string;
    workingHours?: Record<string, string>;
    timeZone?: string;
}

export default function MobileCommunicationKit({
    storeName,
    businessType,
    menuLink,
    address,
    phone,
    workingHours,
    timeZone,
}: MobileCommunicationKitProps) {
    const todayResult = useMemo(() => getTodayHours(workingHours, timeZone), [workingHours, timeZone]);

    const input: MessageTemplateInput = useMemo(() => ({
        storeName,
        businessType,
        menuLink,
        address,
        phone,
        todayHours: todayResult.hours,
        isClosedToday: todayResult.isClosed,
    }), [storeName, businessType, menuLink, address, phone, todayResult]);

    const templates = useMemo(() => generateMessageTemplates(input), [input]);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                <LuMessageSquare size={16} className="text-gray-600 dark:text-gray-300" />
                <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Customer Messages</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                Ready-to-send replies — tap to send via WhatsApp or copy
            </p>

            {templates.map((tmpl) => (
                <MobileMessageCard key={tmpl.id} template={tmpl} />
            ))}
        </div>
    );
}

// ── Mobile Message Card ───────────────────────────────────────────

interface MobileMessageCardProps {
    template: MessageTemplate;
}

function MobileMessageCard({ template }: MobileMessageCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(template.message);
            setCopied(true);
            Toast.show({ content: 'Message copied', duration: 1500 });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            Toast.show({ content: 'Could not copy', duration: 1500 });
        }
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(template.message)}`, '_blank');
    };

    return (
        <Card className="rounded-xl">
            <div className="flex flex-col gap-3">
                <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{template.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{template.description}</p>
                </div>

                {/* Message preview */}
                <div
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200"
                    style={{ border: '1px solid var(--adm-color-border)' }}
                >
                    {template.message}
                </div>

                {/* Actions — WhatsApp primary on mobile */}
                <div className="flex gap-2">
                    <Button
                        color="success"
                        fill="solid"
                        size="small"
                        onClick={handleWhatsApp}
                        style={{
                            minHeight: '36px',
                            flex: 1,
                            backgroundColor: '#25D366',
                            borderColor: '#25D366',
                        }}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            <LuMessageSquare size={14} />
                            WhatsApp
                        </span>
                    </Button>
                    <Button
                        fill="outline"
                        size="small"
                        onClick={handleCopy}
                        style={{ minHeight: '36px', flex: 1 }}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                            {copied ? 'Copied' : 'Copy'}
                        </span>
                    </Button>
                </div>
            </div>
        </Card>
    );
}
