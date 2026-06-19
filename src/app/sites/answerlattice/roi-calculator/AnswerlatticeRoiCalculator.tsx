'use client';

import { useMemo, useState } from 'react';

const formatCurrency = (value: number) => `₹${Math.max(0, Math.round(value)).toLocaleString('en-IN')}`;

function numberValue(value: string, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export default function AnswerlatticeRoiCalculator() {
    const [questions, setQuestions] = useState('180');
    const [minutes, setMinutes] = useState('8');
    const [hourlyCost, setHourlyCost] = useState('900');
    const [coverageRate, setCoverageRate] = useState('45');
    const [monthlyPlan, setMonthlyPlan] = useState('2999');

    const result = useMemo(() => {
        const monthlyQuestions = numberValue(questions, 180);
        const minutesPerQuestion = numberValue(minutes, 8);
        const hourly = numberValue(hourlyCost, 900);
        const coverage = Math.min(numberValue(coverageRate, 45), 90) / 100;
        const plan = numberValue(monthlyPlan, 2999);

        const shiftedQuestions = monthlyQuestions * coverage;
        const hoursSaved = (shiftedQuestions * minutesPerQuestion) / 60;
        const supportValue = hoursSaved * hourly;
        const net = supportValue - plan;
        const suggestedPlan = monthlyQuestions <= 150 ? 'Starter' : monthlyQuestions <= 500 ? 'Growth' : 'Studio';

        return {
            shiftedQuestions,
            hoursSaved,
            supportValue,
            net,
            suggestedPlan,
        };
    }, [coverageRate, hourlyCost, minutes, monthlyPlan, questions]);

    const inputClass = 'mt-2 w-full rounded-xl border border-white/[0.08] bg-[#070714] px-4 py-3 text-sm text-white outline-none transition focus:border-teal-300/60';

    return (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-[#d6d6ef]">
                        Repeated questions / month
                        <input className={inputClass} inputMode="numeric" value={questions} onInput={(event) => setQuestions((event.target as HTMLInputElement).value)} onChange={(event) => setQuestions(event.target.value)} />
                    </label>
                    <label className="text-sm font-semibold text-[#d6d6ef]">
                        Minutes per manual reply
                        <input className={inputClass} inputMode="numeric" value={minutes} onInput={(event) => setMinutes((event.target as HTMLInputElement).value)} onChange={(event) => setMinutes(event.target.value)} />
                    </label>
                    <label className="text-sm font-semibold text-[#d6d6ef]">
                        Support hourly cost
                        <input className={inputClass} inputMode="numeric" value={hourlyCost} onInput={(event) => setHourlyCost((event.target as HTMLInputElement).value)} onChange={(event) => setHourlyCost(event.target.value)} />
                    </label>
                    <label className="text-sm font-semibold text-[#d6d6ef]">
                        Questions covered by approved answers
                        <input className={inputClass} inputMode="numeric" value={coverageRate} onInput={(event) => setCoverageRate((event.target as HTMLInputElement).value)} onChange={(event) => setCoverageRate(event.target.value)} />
                    </label>
                    <label className="text-sm font-semibold text-[#d6d6ef] sm:col-span-2">
                        Monthly AnswerLattice plan estimate
                        <input className={inputClass} inputMode="numeric" value={monthlyPlan} onInput={(event) => setMonthlyPlan((event.target as HTMLInputElement).value)} onChange={(event) => setMonthlyPlan(event.target.value)} />
                    </label>
                </div>
                <p className="mt-5 text-xs leading-relaxed text-[#6b6b8a]">
                    This is an illustrative planning model. It estimates repeated-question time saved; it does not promise deflection, revenue, or support headcount replacement.
                </p>
            </div>

            <div className="rounded-[1.5rem] border border-teal-300/20 bg-teal-500/[0.07] p-6">
                <div className="mb-5 text-xs font-semibold uppercase tracking-widest text-teal-200">Estimated monthly impact</div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-[#070714]/60 p-4">
                        <div className="text-xs text-[#808099]">Questions handled from approved knowledge</div>
                        <div className="mt-2 text-3xl font-bold text-white">{Math.round(result.shiftedQuestions).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-[#070714]/60 p-4">
                        <div className="text-xs text-[#808099]">Manual support hours avoided</div>
                        <div className="mt-2 text-3xl font-bold text-white">{result.hoursSaved.toFixed(1)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-[#070714]/60 p-4">
                        <div className="text-xs text-[#808099]">Support time value</div>
                        <div className="mt-2 text-3xl font-bold text-white">{formatCurrency(result.supportValue)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-[#070714]/60 p-4">
                        <div className="text-xs text-[#808099]">Value after plan estimate</div>
                        <div className="mt-2 text-3xl font-bold text-white">{formatCurrency(result.net)}</div>
                    </div>
                </div>
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#070714]/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Plan fit signal</div>
                    <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">
                        Based only on repeated-question volume, start evaluation around <strong>{result.suggestedPlan}</strong>. Use the setup path first, then choose capacity after real widget and review activity appears.
                    </p>
                </div>
            </div>
        </div>
    );
}
