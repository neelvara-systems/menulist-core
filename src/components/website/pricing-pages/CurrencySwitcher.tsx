"use client";

import { Currency } from '@data/common';
import { Tabs, TabsList, TabsTrigger } from '@shadcncomponents/tabs';
import React from 'react';

interface CurrencySwitcherProps {
    currency: Currency;
    onCurrencyChange: (currency: Currency) => void;
}

const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({ currency, onCurrencyChange }) => {
    return (
        <div className="flex justify-center items-center mb-10">
            <Tabs value={currency} onValueChange={(value) => onCurrencyChange(value as Currency)} className="w-full max-w-xs mx-auto">
                <TabsList className="grid w-full grid-cols-2 p-1 h-auto rounded-lg bg-[var(--ws-bg-subtle)] border border-[var(--ws-border-default)]">
                    <TabsTrigger value="USD" className="rounded-md text-[var(--ws-text-secondary)] data-[state=active]:bg-[var(--ws-bg-surface)] data-[state=active]:text-[var(--ws-text-primary)] data-[state=active]:shadow-sm">
                        <div className="flex items-center justify-center gap-2">
                            <span>🇺🇸</span>
                            <span>USD</span>
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="INR" className="rounded-md text-[var(--ws-text-secondary)] data-[state=active]:bg-[var(--ws-bg-surface)] data-[state=active]:text-[var(--ws-text-primary)] data-[state=active]:shadow-sm">
                        <div className="flex items-center justify-center gap-2">
                            <span>🇮🇳</span>
                            <span>INR</span>
                        </div>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
};

export default CurrencySwitcher;
