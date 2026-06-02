import {
    LuArrowRight,
    LuAlertCircle,
    LuCheck,
    LuMinus,
    LuShieldCheck,
} from 'react-icons/lu';

type Tone = 'good' | 'neutral' | 'caution';

export type AnswerlatticeDecisionItem = {
    title: string;
    detail: string;
    label?: string;
    tone?: Tone;
};

export type AnswerlatticeBeforeAfterItem = {
    title: string;
    context: string;
    question: string;
    before: string;
    after: string;
    outcome?: string;
};

export type AnswerlatticeStatusSnapshot = {
    status: string;
    title: string;
    detail: string;
    rows?: Array<[string, string]>;
    tone?: Tone;
};

function toneClasses(tone: Tone = 'neutral') {
    if (tone === 'good') {
        return {
            card: 'border-emerald-400/20 bg-emerald-400/[0.045]',
            chip: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200',
            icon: 'bg-emerald-400/10 text-emerald-300',
        };
    }

    if (tone === 'caution') {
        return {
            card: 'border-amber-300/20 bg-amber-300/[0.035]',
            chip: 'border-amber-200/20 bg-amber-300/10 text-amber-200',
            icon: 'bg-amber-300/10 text-amber-200',
        };
    }

    return {
        card: 'border-white/[0.075] bg-white/[0.025]',
        chip: 'border-white/[0.08] bg-white/[0.045] text-[#a0a0c0]',
        icon: 'bg-teal-500/10 text-teal-200',
    };
}

function DecisionIcon({ tone = 'neutral' }: { tone?: Tone }) {
    const classes = toneClasses(tone);
    const Icon = tone === 'good' ? LuCheck : tone === 'caution' ? LuAlertCircle : LuMinus;

    return (
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${classes.icon}`}>
            <Icon aria-hidden size={16} />
        </span>
    );
}

export function AnswerlatticeDecisionGrid({ items }: { items: AnswerlatticeDecisionItem[] }) {
    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => {
                const classes = toneClasses(item.tone);

                return (
                    <article key={item.title} className={`rounded-2xl border p-5 ${classes.card}`}>
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <DecisionIcon tone={item.tone} />
                            {item.label ? (
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${classes.chip}`}>
                                    {item.label}
                                </span>
                            ) : null}
                        </div>
                        <h3 className="text-base font-semibold leading-snug text-white">{item.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{item.detail}</p>
                    </article>
                );
            })}
        </div>
    );
}

export function AnswerlatticeBeforeAfterStrip({ items }: { items: AnswerlatticeBeforeAfterItem[] }) {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
                <article key={item.title} className="rounded-[1.5rem] border border-white/[0.075] bg-white/[0.025] p-5">
                    <div className="mb-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">{item.context}</p>
                            <h3 className="mt-2 text-xl font-semibold leading-tight text-white">{item.title}</h3>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#070714] p-4">
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">User asks</div>
                        <p className="text-sm font-semibold leading-relaxed text-white">{item.question}</p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">Generic reply</div>
                            <p className="text-sm leading-relaxed text-[#8f8faa]">{item.before}</p>
                        </div>
                        <div className="hidden items-center justify-center text-teal-200 md:flex">
                            <LuArrowRight aria-hidden size={18} />
                        </div>
                        <div className="rounded-2xl border border-teal-300/20 bg-teal-400/[0.07] p-4">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-teal-200">AnswerLattice reply</div>
                            <p className="text-sm leading-relaxed text-[#d6d6ef]">{item.after}</p>
                        </div>
                    </div>
                    {item.outcome ? (
                        <div className="mt-3 rounded-2xl border border-teal-300/15 bg-teal-400/[0.045] p-4">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-teal-200">Outcome</div>
                            <p className="text-sm leading-relaxed text-[#d6d6ef]">{item.outcome}</p>
                        </div>
                    ) : null}
                </article>
            ))}
        </div>
    );
}

export function AnswerlatticeStatusBoard({ items }: { items: AnswerlatticeStatusSnapshot[] }) {
    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
                const classes = toneClasses(item.tone);

                return (
                    <article key={item.title} className={`rounded-2xl border p-5 ${classes.card}`}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${classes.chip}`}>
                                {item.status}
                            </span>
                            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${classes.icon}`}>
                                <LuShieldCheck aria-hidden size={16} />
                            </span>
                        </div>
                        <h3 className="text-base font-semibold leading-snug text-white">{item.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{item.detail}</p>
                        {item.rows?.length ? (
                            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                                {item.rows.map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#070714]/65 px-3 py-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">{label}</span>
                                        <span className="text-xs font-semibold text-[#d6d6ef]">{value}</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </article>
                );
            })}
        </div>
    );
}
