export type PageProofStripItem = {
    label: string;
    value: string;
};

type PageProofStripProps = {
    items: PageProofStripItem[];
    className?: string;
};

function getGridClass(count: number) {
    if (count >= 4) return 'lg:grid-cols-4';
    if (count === 3) return 'lg:grid-cols-3';
    return 'lg:grid-cols-2';
}

export default function PageProofStrip({ items, className = '' }: PageProofStripProps) {
    if (items.length === 0) return null;

    return (
        <div className={`grid gap-3 md:grid-cols-2 ${getGridClass(items.length)} ${className}`}>
            {items.map((item) => (
                <article key={`${item.label}-${item.value}`} className="rounded-2xl border border-white/[0.075] bg-white/[0.025] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-teal-200">{item.label}</div>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-[#d6d6ef]">{item.value}</p>
                </article>
            ))}
        </div>
    );
}
