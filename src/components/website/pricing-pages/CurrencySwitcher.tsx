"use client";

import { Currency } from '@data/common';
import { useTranslations } from 'next-intl';
import React from 'react';

interface CurrencySwitcherProps {
    currency: Currency;
    onCurrencyChange: (currency: Currency) => void;
}

const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({ currency, onCurrencyChange }) => {
    const t = useTranslations('Website');
    const currencies: Array<{ code: Currency; flag: string }> = [
        { code: 'USD', flag: '🇺🇸' },
        { code: 'INR', flag: '🇮🇳' },
    ];

    return (
        <div
            role="group"
            aria-label={t('Pricing.currencyLabel')}
            className="mx-auto grid w-full max-w-xs grid-cols-2 rounded-lg border border-[var(--ws-border-default)] bg-[var(--ws-bg-subtle)] p-1"
        >
            {currencies.map(({ code, flag }) => {
                const selected = currency === code;
                return (
                    <button
                        key={code}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onCurrencyChange(code)}
                        className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium ${
                            selected
                                ? 'bg-[var(--ws-bg-surface)] text-[var(--ws-text-primary)] shadow-sm'
                                : 'text-[var(--ws-text-secondary)]'
                        }`}
                    >
                        <span aria-hidden="true">{flag}</span>
                        <span>{code}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default CurrencySwitcher;
