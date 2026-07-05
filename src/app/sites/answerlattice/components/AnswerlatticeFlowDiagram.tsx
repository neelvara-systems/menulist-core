import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import { LuFileText, LuImage, LuMessageSquare, LuStickyNote, LuTicket, LuVideo } from 'react-icons/lu';
import AnswerlatticeLogoMark from './AnswerlatticeLogoMark';

export type AnswerlatticeDiagramItem = {
    title: string;
    detail: string;
    meta?: string;
};

type AnswerlatticeFlowCardRole = 'source' | 'target' | 'neutral';

type AnswerlatticeDiagramCoreProps = {
    idPrefix: string;
    className?: string;
};

type AnswerlatticeHubDiagramProps = {
    idPrefix: string;
    inputs: AnswerlatticeDiagramItem[];
    outputs: AnswerlatticeDiagramItem[];
    inputLabel?: string;
    outputLabel?: string;
    className?: string;
};

type AnswerlatticeSequenceDiagramProps = {
    idPrefix: string;
    items: AnswerlatticeDiagramItem[];
    splitAfter?: number;
    className?: string;
};

type AnswerlatticeCrossDiagramProps = {
    idPrefix: string;
    items: AnswerlatticeDiagramItem[];
    className?: string;
};

type AnswerlatticeLoopDiagramProps = {
    idPrefix: string;
    items: AnswerlatticeDiagramItem[];
    className?: string;
};

type AnswerlatticeHeroAutomationDiagramProps = {
    className?: string;
};

type AnswerlatticeHeroAutomationSource = {
    label: string;
    Icon: IconType;
    tone: string;
    className: string;
};

const MOBILE_HUB_INPUT_PATH = 'M180 305 C180 332 180 354 180 382';
const MOBILE_HUB_OUTPUT_PATH = 'M180 432 C180 468 180 528 180 573';
const MOBILE_SEQUENCE_INPUT_PATH = 'M180 80 C180 245 180 320 180 380';
const MOBILE_SEQUENCE_OUTPUT_PATH = 'M180 432 C180 500 180 610 180 700';

const HERO_AUTOMATION_INPUT_PATHS = [
    'M218 260 C306 254 382 254 458 282',
    'M104 318 C222 306 334 300 456 290',
    'M68 402 C186 372 318 334 458 306',
    'M318 380 C370 350 416 324 466 310',
    'M170 456 C282 406 374 356 468 318',
    'M346 450 C386 402 426 354 476 322',
];

const HERO_AUTOMATION_OUTPUT_PATHS = [
    'M548 300 C638 250 752 184 956 84',
];

const HERO_AUTOMATION_SOURCES: AnswerlatticeHeroAutomationSource[] = [
    { label: 'Docs', Icon: LuFileText, tone: 'teal', className: 'al-hero-automation__source--docs' },
    { label: 'Screenshots', Icon: LuImage, tone: 'blue', className: 'al-hero-automation__source--screenshots' },
    { label: 'Recordings', Icon: LuVideo, tone: 'coral', className: 'al-hero-automation__source--recordings' },
    { label: 'Tickets', Icon: LuTicket, tone: 'amber', className: 'al-hero-automation__source--tickets' },
    { label: 'Replies', Icon: LuMessageSquare, tone: 'indigo', className: 'al-hero-automation__source--replies' },
    { label: 'Notes', Icon: LuStickyNote, tone: 'green', className: 'al-hero-automation__source--notes' },
];

const HERO_AUTOMATION_OUTPUTS = [
    {
        title: 'Approved answer',
        meta: 'Official',
        className: 'al-hero-automation__output--answer',
    },
    {
        title: 'Widget response',
        meta: 'In app',
        className: 'al-hero-automation__output--widget',
    },
    {
        title: 'Hosted help',
        meta: 'Help center',
        className: 'al-hero-automation__output--help',
    },
    {
        title: 'Owner answer',
        meta: 'Reviewed',
        className: 'al-hero-automation__output--owner',
    },
    {
        title: 'Related help',
        meta: 'Context',
        className: 'al-hero-automation__output--related',
    },
    {
        title: 'Docs',
        meta: 'Docs',
        className: 'al-hero-automation__output--docs',
    },
    {
        title: 'FAQ answer',
        meta: 'FAQ',
        className: 'al-hero-automation__output--faq',
    },
    {
        title: 'Changelog',
        meta: 'Release',
        className: 'al-hero-automation__output--changelog',
    },
    {
        title: 'Ticket fallback',
        meta: 'Fallback',
        className: 'al-hero-automation__output--ticket',
    },
    {
        title: 'Feedback',
        meta: 'Signals',
        className: 'al-hero-automation__output--feedback',
    },
    {
        title: 'Review queue',
        meta: 'Owner review',
        className: 'al-hero-automation__output--review',
    },
    {
        title: 'Gaps',
        meta: 'Coverage',
        className: 'al-hero-automation__output--gaps',
    },
    {
        title: 'Support Board',
        meta: 'Review work',
        className: 'al-hero-automation__output--board',
    },
    {
        title: 'Workflow',
        meta: 'Notification',
        className: 'al-hero-automation__output--workflow',
    },
    {
        title: 'Custom domain',
        meta: 'Hosted',
        className: 'al-hero-automation__output--domain',
    },
    {
        title: 'AI context',
        meta: 'Future',
        className: 'al-hero-automation__output--agent',
    },
];

function cssVars(values: Record<string, string>): CSSProperties {
    return values as CSSProperties;
}

function getFlowRows(count: number) {
    const rows: Record<number, number[]> = {
        1: [210],
        2: [155, 265],
        3: [122, 232, 343],
        4: [86, 169, 252, 335],
        5: [68, 139, 210, 281, 352],
        6: [56, 118, 180, 242, 304, 366],
    };

    return rows[Math.min(Math.max(count, 1), 6)];
}

function getPulseStyle(delay: number) {
    return cssVars({ '--al-diagram-pulse-delay': `${delay}s` });
}

function getArrivalStyle(delay: number) {
    return cssVars({ '--al-diagram-card-pulse-delay': `${delay}s` });
}

export function AnswerlatticeDiagramCore({ idPrefix, className = '' }: AnswerlatticeDiagramCoreProps) {
    return (
        <div className={`al-diagram-core ${className}`.trim()} aria-hidden="true">
            <span className="al-diagram-ring al-diagram-ring--outer" />
            <div className="al-diagram-mark">
                <AnswerlatticeLogoMark height={42} idPrefix={idPrefix} />
            </div>
        </div>
    );
}

export function AnswerlatticeHeroAutomationDiagram({ className = '' }: AnswerlatticeHeroAutomationDiagramProps) {
    return (
        <div
            className={`al-hero-automation ${className}`.trim()}
            aria-label="Scattered product sources move into AnswerLattice and approved support cards come out."
        >
            <div className="al-hero-automation__haze" aria-hidden="true" />
            <svg className="al-hero-automation__paths" viewBox="0 0 1000 520" aria-hidden="true" focusable="false">
                {HERO_AUTOMATION_INPUT_PATHS.map((path) => (
                    <path key={`input-guide-${path}`} className="al-hero-automation__guide al-hero-automation__guide--input" d={path} />
                ))}
                {HERO_AUTOMATION_OUTPUT_PATHS.map((path) => (
                    <path key={`output-guide-${path}`} className="al-hero-automation__guide al-hero-automation__guide--output" d={path} />
                ))}
                <path className="al-hero-automation__pulse al-hero-automation__pulse--input" pathLength={1} d={HERO_AUTOMATION_INPUT_PATHS[0]} />
                <path className="al-hero-automation__pulse al-hero-automation__pulse--input al-hero-automation__pulse--delay-1" pathLength={1} d={HERO_AUTOMATION_INPUT_PATHS[3]} />
                <path className="al-hero-automation__pulse al-hero-automation__pulse--output" pathLength={1} d={HERO_AUTOMATION_OUTPUT_PATHS[0]} />
                <path className="al-hero-automation__pulse al-hero-automation__pulse--output al-hero-automation__pulse--delay-2" pathLength={1} d={HERO_AUTOMATION_OUTPUT_PATHS[0]} />
                <path className="al-hero-automation__pulse al-hero-automation__pulse--output al-hero-automation__pulse--delay-3" pathLength={1} d={HERO_AUTOMATION_OUTPUT_PATHS[0]} />
            </svg>

            <div className="al-hero-automation__target" aria-hidden="true">
                <span className="al-hero-automation__target-shadow" />
                <span className="al-hero-automation__target-base" />
                <span className="al-hero-automation__target-disc">
                    <AnswerlatticeLogoMark
                        height={58}
                        idPrefix="al-hero-automation-logo"
                        className="al-hero-automation__target-logo"
                    />
                </span>
            </div>

            <div className="al-hero-automation__source-layer" aria-hidden="true">
                {HERO_AUTOMATION_SOURCES.map((source, index) => {
                    const Icon = source.Icon;
                    return (
                        <span
                            key={source.label}
                            className={`al-hero-automation__source al-hero-automation__source--${source.tone} ${source.className}`}
                            style={cssVars({ '--al-hero-source-index': `${index}` })}
                        >
                            <span className="al-hero-automation__source-icon">
                                <Icon aria-hidden="true" focusable="false" />
                            </span>
                            <span className="al-hero-automation__source-label">{source.label}</span>
                        </span>
                    );
                })}
            </div>

            <div className="al-hero-automation__output-layer" aria-hidden="true">
                {HERO_AUTOMATION_OUTPUTS.map((output, index) => (
                    <span
                        key={output.title}
                        className={`al-hero-automation__output ${output.className}`}
                        style={cssVars({ '--al-hero-output-index': `${index}` })}
                    >
                        <span className="al-hero-automation__output-dots">
                            <i />
                            <i />
                            <i />
                        </span>
                        <span className="al-hero-automation__output-copy">
                            <strong>{output.title}</strong>
                            <em>{output.meta}</em>
                        </span>
                        <span className="al-hero-automation__output-action" />
                    </span>
                ))}
            </div>
        </div>
    );
}

function AnswerlatticeFlowCard({
    item,
    index,
    role = 'neutral',
    className = '',
    arrivalIndex,
}: {
    item: AnswerlatticeDiagramItem;
    index: number;
    role?: AnswerlatticeFlowCardRole;
    className?: string;
    arrivalIndex?: number;
}) {
    return (
        <article
            className={`al-diagram-card al-diagram-card--${role} ${className}`.trim()}
            style={role === 'target' ? getArrivalStyle(4.6 + (arrivalIndex ?? index) * 0.14) : undefined}
        >
            <div className="al-diagram-card__head">
                <span className="al-diagram-card__index">{String(index + 1).padStart(2, '0')}</span>
                {item.meta ? <span className="al-diagram-card__meta">{item.meta}</span> : null}
            </div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
        </article>
    );
}

export function AnswerlatticeHubDiagram({
    idPrefix,
    inputs,
    outputs,
    inputLabel = 'Inputs',
    outputLabel = 'Outputs',
    className = '',
}: AnswerlatticeHubDiagramProps) {
    const inputRows = getFlowRows(inputs.length);
    const outputRows = getFlowRows(outputs.length);

    return (
        <div className={`al-diagram al-diagram--hub ${className}`.trim()}>
            <svg className="al-diagram-paths al-diagram-paths--desktop" viewBox="0 0 1000 420" aria-hidden="true" focusable="false">
                {inputRows.map((row, index) => (
                    <path key={`input-${row}`} className="al-diagram-path" d={`M344 ${row} C396 ${row} 408 210 461 210`} />
                ))}
                {outputRows.map((row) => (
                    <path key={`output-${row}`} className="al-diagram-path" d={`M539 210 C592 210 604 ${row} 656 ${row}`} />
                ))}
                {inputRows.map((row, index) => (
                    <path
                        key={`input-pulse-${row}`}
                        className="al-diagram-pulse"
                        pathLength={1}
                        style={getPulseStyle(index * 0.16)}
                        d={`M344 ${row} C396 ${row} 408 210 461 210`}
                    />
                ))}
                {outputRows.map((row, index) => (
                    <path
                        key={`output-pulse-${row}`}
                        className="al-diagram-pulse"
                        pathLength={1}
                        style={getPulseStyle(2.9 + index * 0.14)}
                        d={`M539 210 C592 210 604 ${row} 656 ${row}`}
                    />
                ))}
            </svg>

            <svg className="al-diagram-paths al-diagram-paths--mobile" viewBox="0 0 360 780" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="al-diagram-path" d={MOBILE_HUB_INPUT_PATH} />
                <path className="al-diagram-path" d={MOBILE_HUB_OUTPUT_PATH} />
                <path className="al-diagram-pulse" pathLength={1} style={getPulseStyle(0.16)} d={MOBILE_HUB_INPUT_PATH} />
                <path className="al-diagram-pulse" pathLength={1} style={getPulseStyle(2.9)} d={MOBILE_HUB_OUTPUT_PATH} />
            </svg>

            <div className="al-diagram-column">
                <div className="al-diagram-label">{inputLabel}</div>
                {inputs.map((item, index) => (
                    <AnswerlatticeFlowCard key={item.title} item={item} index={index} role="source" />
                ))}
            </div>

            <div className="al-diagram-center">
                <AnswerlatticeDiagramCore idPrefix={`${idPrefix}-core`} />
            </div>

            <div className="al-diagram-column">
                <div className="al-diagram-label">{outputLabel}</div>
                {outputs.map((item, index) => (
                    <AnswerlatticeFlowCard key={item.title} item={item} index={index} role="target" />
                ))}
            </div>
        </div>
    );
}

export function AnswerlatticeSequenceDiagram({
    idPrefix,
    items,
    splitAfter = Math.ceil(items.length / 2),
    className = '',
}: AnswerlatticeSequenceDiagramProps) {
    const before = items.slice(0, splitAfter);
    const after = items.slice(splitAfter);
    const beforeRows = getFlowRows(before.length);
    const afterRows = getFlowRows(after.length);

    return (
        <div className={`al-diagram al-sequence-diagram ${className}`.trim()}>
            <svg className="al-diagram-paths al-sequence-diagram__paths al-diagram-paths--desktop" viewBox="0 0 1000 420" aria-hidden="true" focusable="false">
                {beforeRows.map((row) => (
                    <path key={`before-${row}`} className="al-diagram-path" d={`M344 ${row} C396 ${row} 408 210 461 210`} />
                ))}
                {afterRows.map((row) => (
                    <path key={`after-${row}`} className="al-diagram-path" d={`M539 210 C592 210 604 ${row} 656 ${row}`} />
                ))}
                {beforeRows.map((row, index) => (
                    <path
                        key={`before-pulse-${row}`}
                        className="al-diagram-pulse"
                        pathLength={1}
                        style={getPulseStyle(index * 0.16)}
                        d={`M344 ${row} C396 ${row} 408 210 461 210`}
                    />
                ))}
                {afterRows.map((row, index) => (
                    <path
                        key={`after-pulse-${row}`}
                        className="al-diagram-pulse"
                        pathLength={1}
                        style={getPulseStyle(2.9 + index * 0.14)}
                        d={`M539 210 C592 210 604 ${row} 656 ${row}`}
                    />
                ))}
            </svg>
            <svg className="al-diagram-paths al-sequence-diagram__paths al-diagram-paths--mobile" viewBox="0 0 360 760" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="al-diagram-path" d={MOBILE_SEQUENCE_INPUT_PATH} />
                <path className="al-diagram-path" d={MOBILE_SEQUENCE_OUTPUT_PATH} />
                <path className="al-diagram-pulse" pathLength={1} style={getPulseStyle(0)} d={MOBILE_SEQUENCE_INPUT_PATH} />
                <path className="al-diagram-pulse" pathLength={1} style={getPulseStyle(2.9)} d={MOBILE_SEQUENCE_OUTPUT_PATH} />
            </svg>

            <div className="al-sequence-diagram__rail">
                <div className="al-sequence-diagram__group">
                    {before.map((item, index) => (
                        <AnswerlatticeFlowCard key={item.title} item={item} index={index} role="source" />
                    ))}
                </div>
                <div className="al-sequence-diagram__core">
                    <AnswerlatticeDiagramCore idPrefix={`${idPrefix}-core`} />
                </div>
                <div className="al-sequence-diagram__group">
                    {after.map((item, index) => (
                        <AnswerlatticeFlowCard key={item.title} item={item} index={before.length + index} role="target" arrivalIndex={index} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function AnswerlatticeCrossDiagram({
    idPrefix,
    items,
    className = '',
}: AnswerlatticeCrossDiagramProps) {
    const visibleItems = items.slice(0, 4);
    const linePaths = [
        { key: 'left', d: 'M500 280 L80 280', delay: 0 },
        { key: 'right', d: 'M500 280 L920 280', delay: 0 },
        { key: 'top', d: 'M500 280 L500 54', delay: 0 },
        { key: 'bottom', d: 'M500 280 L500 506', delay: 0 },
    ];

    return (
        <div className={`al-diagram al-cross-diagram ${className}`.trim()}>
            <svg className="al-diagram-paths al-cross-diagram__paths al-diagram-paths--desktop" viewBox="0 0 1000 560" aria-hidden="true" focusable="false">
                <line className="al-cross-diagram__axis" x1="80" y1="280" x2="920" y2="280" />
                <line className="al-cross-diagram__axis" x1="500" y1="54" x2="500" y2="506" />
                {linePaths.map((path) => (
                    <path key={`${path.key}-path`} className="al-diagram-path al-cross-diagram__line" d={path.d} pathLength={1} />
                ))}
                {linePaths.map((path) => (
                    <path
                        key={`${path.key}-pulse`}
                        className="al-diagram-pulse"
                        d={path.d}
                        pathLength={1}
                        style={getPulseStyle(path.delay)}
                    />
                ))}
            </svg>

            <svg className="al-diagram-paths al-cross-diagram__paths al-diagram-paths--mobile" viewBox="0 0 360 860" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="al-diagram-path al-cross-diagram__line" d="M180 48 L180 812" pathLength={1} />
                <path className="al-diagram-pulse" d="M180 430 L180 48" pathLength={1} style={getPulseStyle(0)} />
                <path className="al-diagram-pulse" d="M180 430 L180 812" pathLength={1} style={getPulseStyle(0)} />
            </svg>

            {visibleItems.map((item, index) => (
                <AnswerlatticeFlowCard
                    key={item.title}
                    item={item}
                    index={index}
                    role="neutral"
                    className={`al-cross-diagram__card al-cross-diagram__card--${index}`}
                />
            ))}

            <div className="al-cross-diagram__core">
                <AnswerlatticeDiagramCore idPrefix={`${idPrefix}-core`} />
            </div>
        </div>
    );
}

export function AnswerlatticeLoopDiagram({
    idPrefix,
    items,
    className = '',
}: AnswerlatticeLoopDiagramProps) {
    const splitIndex = Math.ceil(items.length / 2);
    const before = items.slice(0, splitIndex);
    const after = items.slice(splitIndex);

    return (
        <div className={`al-diagram al-loop-diagram ${className}`.trim()}>
            <svg className="al-diagram-paths al-diagram-paths--desktop al-loop-diagram__paths" viewBox="0 0 1000 560" aria-hidden="true" focusable="false">
                <circle className="al-diagram-path" cx="500" cy="280" r="165" pathLength={1} />
                <circle className="al-diagram-pulse al-diagram-pulse--loop" cx="500" cy="280" r="165" pathLength={1} />
            </svg>
            <svg className="al-diagram-paths al-diagram-paths--mobile al-loop-diagram__paths" viewBox="0 0 360 860" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="al-diagram-path" d="M180 80 C180 210 180 285 180 360 C180 445 180 560 180 780" />
                <path className="al-diagram-pulse" pathLength={1} style={getPulseStyle(0)} d="M180 80 C180 210 180 285 180 360 C180 445 180 560 180 780" />
            </svg>
            <div className="al-loop-diagram__cards al-loop-diagram__cards--before">
                {before.map((item, index) => (
                    <AnswerlatticeFlowCard
                        key={item.title}
                        item={item}
                        index={index}
                        role={index === before.length - 1 ? 'target' : 'source'}
                        className={`al-loop-diagram__card al-loop-diagram__card--${index}`}
                    />
                ))}
            </div>
            <div className="al-loop-diagram__center">
                <AnswerlatticeDiagramCore idPrefix={`${idPrefix}-core`} />
            </div>
            <div className="al-loop-diagram__cards al-loop-diagram__cards--after">
                {after.map((item, index) => {
                    const itemIndex = splitIndex + index;

                    return (
                        <AnswerlatticeFlowCard
                            key={item.title}
                            item={item}
                            index={itemIndex}
                            role="target"
                            className={`al-loop-diagram__card al-loop-diagram__card--${itemIndex}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}
