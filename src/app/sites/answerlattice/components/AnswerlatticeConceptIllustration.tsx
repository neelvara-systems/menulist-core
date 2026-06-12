type AnswerlatticeConceptIllustrationVariant =
    | 'safe-context-boundary'
    | 'install-verification'
    | 'source-to-answer'
    | 'governance-loop'
    | 'positioning-boundary';

type AnswerlatticeConceptIllustrationProps = {
    variant: AnswerlatticeConceptIllustrationVariant;
    className?: string;
    showHeader?: boolean;
};

type CardTone = 'teal' | 'blue' | 'amber' | 'rose' | 'muted';

const CONCEPT_COPY: Record<AnswerlatticeConceptIllustrationVariant, {
    eyebrow: string;
    title: string;
    description: string;
}> = {
    'safe-context-boundary': {
        eyebrow: 'Safe context',
        title: 'Send page hints, not private data.',
        description: 'Allowed page context can guide support while secrets, payment data, and private records stay outside the widget packet.',
    },
    'install-verification': {
        eyebrow: 'Install verification',
        title: 'The widget goes live only after runtime checks pass.',
        description: 'Script, allowed origin, blocked route, safe context, and fallback checks are visible before product users rely on support.',
    },
    'source-to-answer': {
        eyebrow: 'Answer layer',
        title: 'Sources become reviewed support paths.',
        description: 'Docs, tickets, releases, screenshots, recordings, notes, and feedback become approved answers before users see widget or hosted-help output.',
    },
    'governance-loop': {
        eyebrow: 'Governance loop',
        title: 'Missing answers become review work.',
        description: 'Fallback, repeated questions, and stale guidance move into owner review before any answer becomes official.',
    },
    'positioning-boundary': {
        eyebrow: 'Category boundary',
        title: 'Answer authority sits between tools.',
        description: 'AnswerLattice is not the chatbot, helpdesk, or docs CMS. It governs the answers those surfaces depend on.',
    },
};

const MOBILE_STEPS: Record<AnswerlatticeConceptIllustrationVariant, Array<{ title: string; detail: string }>> = {
    'safe-context-boundary': [
        { title: 'Allowed hints', detail: 'Route, workflow, role, plan, and product area can guide support.' },
        { title: 'Safe packet', detail: 'AnswerLattice uses bounded context for answer relevance.' },
        { title: 'Blocked data', detail: 'Tokens, card data, passwords, and private records stay out.' },
    ],
    'install-verification': [
        { title: 'Install script', detail: 'Add the v1 widget script and safe context adapter.' },
        { title: 'Run checks', detail: 'Verify origin, route, context, and fallback readiness.' },
        { title: 'Launch widget', detail: 'Go live only after the runtime checks pass.' },
    ],
    'source-to-answer': [
        { title: 'Add sources', detail: 'Docs, tickets, releases, screenshots, recordings, notes, and feedback enter as evidence.' },
        { title: 'Approve answers', detail: 'AnswerLattice keeps reviewed support truth in the middle.' },
        { title: 'Serve support', detail: 'Widget, hosted help, and the review queue use that approved truth.' },
    ],
    'governance-loop': [
        { title: 'Fallback appears', detail: 'A missing answer becomes visible support work.' },
        { title: 'Owner reviews', detail: 'Draft improvements wait for human approval.' },
        { title: 'Future answer improves', detail: 'Approved guidance serves the next user first.' },
    ],
    'positioning-boundary': [
        { title: 'Other tools remain tools', detail: 'Chatbots, helpdesks, docs, and tickets keep their jobs.' },
        { title: 'Answer authority lives here', detail: 'AnswerLattice governs the support truth they depend on.' },
        { title: 'No replacement claim', detail: 'It works with support tools instead of pretending to be all of them.' },
    ],
};

const TONE_STYLES: Record<CardTone, { fill: string; stroke: string; label: string; text: string }> = {
    teal: {
        fill: 'rgba(45, 212, 191, 0.12)',
        stroke: 'rgba(94, 234, 212, 0.48)',
        label: '#99f6e4',
        text: '#ecfeff',
    },
    blue: {
        fill: 'rgba(56, 189, 248, 0.11)',
        stroke: 'rgba(125, 211, 252, 0.42)',
        label: '#bae6fd',
        text: '#f0f9ff',
    },
    amber: {
        fill: 'rgba(245, 158, 11, 0.11)',
        stroke: 'rgba(251, 191, 36, 0.44)',
        label: '#fde68a',
        text: '#fffbeb',
    },
    rose: {
        fill: 'rgba(244, 63, 94, 0.10)',
        stroke: 'rgba(251, 113, 133, 0.40)',
        label: '#fecdd3',
        text: '#fff1f2',
    },
    muted: {
        fill: 'rgba(255, 255, 255, 0.045)',
        stroke: 'rgba(255, 255, 255, 0.12)',
        label: '#d6d6ef',
        text: '#f8fafc',
    },
};

function Card({
    x,
    y,
    width,
    height,
    title,
    lines = [],
    tone = 'muted',
}: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    lines?: string[];
    tone?: CardTone;
}) {
    const style = TONE_STYLES[tone];

    return (
        <g>
            <rect x={x} y={y} width={width} height={height} rx="18" fill={style.fill} stroke={style.stroke} strokeWidth="1.5" />
            <text x={x + 22} y={y + 34} fill={style.text} fontSize="19" fontWeight="800">
                {title}
            </text>
            {lines.map((line, index) => (
                <text key={line} x={x + 22} y={y + 66 + index * 25} fill="#a7a7c7" fontSize="16" fontWeight="600">
                    {line}
                </text>
            ))}
        </g>
    );
}

function Pill({
    x,
    y,
    label,
    tone = 'muted',
    width = Math.max(116, label.length * 9 + 36),
}: {
    x: number;
    y: number;
    label: string;
    tone?: CardTone;
    width?: number;
}) {
    const style = TONE_STYLES[tone];

    return (
        <g>
            <rect x={x} y={y} width={width} height="34" rx="17" fill={style.fill} stroke={style.stroke} strokeWidth="1.3" />
            <text x={x + 18} y={y + 23} fill={style.label} fontSize="14" fontWeight="800">
                {label}
            </text>
        </g>
    );
}

function Arrow({ d, tone = 'teal' }: { d: string; tone?: CardTone }) {
    return <path d={d} fill="none" stroke={TONE_STYLES[tone].stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#al-concept-arrow)" />;
}

function Shell({
    variant,
    children,
}: {
    variant: AnswerlatticeConceptIllustrationVariant;
    children: ReactNode;
}) {
    const copy = CONCEPT_COPY[variant];

    return (
        <svg
            viewBox="0 0 860 520"
            role="img"
            aria-label={copy.title}
            className="h-auto w-full"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id={`al-concept-bg-${variant}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#0f172a" />
                    <stop offset="0.58" stopColor="#09091a" />
                    <stop offset="1" stopColor="#12253a" />
                </linearGradient>
                <radialGradient id={`al-concept-glow-${variant}`} cx="50%" cy="16%" r="80%">
                    <stop offset="0" stopColor="#2dd4bf" stopOpacity="0.22" />
                    <stop offset="0.55" stopColor="#2dd4bf" stopOpacity="0.06" />
                    <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
                </radialGradient>
                <marker id="al-concept-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M1 1 L9 5 L1 9" fill="none" stroke="rgba(94, 234, 212, 0.72)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
            </defs>
            <rect width="860" height="520" rx="34" fill={`url(#al-concept-bg-${variant})`} />
            <rect width="860" height="520" rx="34" fill={`url(#al-concept-glow-${variant})`} />
            <rect x="22" y="22" width="816" height="476" rx="28" fill="rgba(255,255,255,0.028)" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
            <circle cx="62" cy="62" r="9" fill="#fb7185" />
            <circle cx="92" cy="62" r="9" fill="#facc15" />
            <circle cx="122" cy="62" r="9" fill="#34d399" />
            {children}
        </svg>
    );
}

function SafeContextBoundary() {
    return (
        <Shell variant="safe-context-boundary">
            <text x="64" y="124" fill="#99f6e4" fontSize="15" fontWeight="800" letterSpacing="3">
                ALLOWED HINTS
            </text>
            <Card x={58} y={150} width={210} height={82} title="Route" lines={['/billing/plan']} tone="teal" />
            <Card x={58} y={250} width={210} height={82} title="Workflow" lines={['plan renewal']} tone="teal" />
            <Card x={58} y={350} width={210} height={82} title="Role" lines={['workspace owner']} tone="teal" />

            <Arrow d="M280 260 C328 260 338 260 382 260" />
            <rect x="382" y="172" width="156" height="176" rx="28" fill="rgba(45,212,191,0.14)" stroke="rgba(94,234,212,0.52)" strokeWidth="1.8" />
            <text x="412" y="225" fill="#ecfeff" fontSize="21" fontWeight="850">Safe context</text>
            <text x="423" y="257" fill="#a7f3d0" fontSize="16" fontWeight="700">support packet</text>
            <path d="M426 292 L451 315 L496 262" fill="none" stroke="#5eead4" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <Arrow d="M548 260 C592 260 604 260 642 260" />

            <text x="628" y="124" fill="#fecdd3" fontSize="15" fontWeight="800" letterSpacing="3">
                BLOCKED DATA
            </text>
            <Card x={604} y={150} width={198} height={74} title="Tokens" lines={['not sent']} tone="rose" />
            <Card x={604} y={242} width={198} height={74} title="Card data" lines={['not sent']} tone="rose" />
            <Card x={604} y={334} width={198} height={74} title="Private records" lines={['not sent']} tone="rose" />
            <line x1="588" y1="140" x2="820" y2="420" stroke="rgba(251,113,133,0.45)" strokeWidth="5" strokeLinecap="round" />
        </Shell>
    );
}

function InstallVerification() {
    return (
        <Shell variant="install-verification">
            <Card x={58} y={150} width={250} height={182} title="App shell" lines={['script installed', 'widget key added', 'context adapter']} tone="blue" />
            <text x="82" y="382" fill="#bae6fd" fontSize="17" fontFamily="SFMono-Regular, Menlo, monospace" fontWeight="800">
                {'<script src="/widget.js">'}
            </text>
            <Arrow d="M326 242 C368 242 382 242 420 242" tone="blue" />
            <rect x="418" y="128" width="190" height="250" rx="26" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5" />
            <text x="454" y="172" fill="#f8fafc" fontSize="22" fontWeight="850">Verifier</text>
            {[
                ['Origin allowed', 'teal'],
                ['Route allowed', 'teal'],
                ['Context safe', 'teal'],
                ['Fallback ready', 'amber'],
            ].map(([label, tone], index) => (
                <g key={label}>
                    <circle cx="458" cy={218 + index * 42} r="8" fill={tone === 'teal' ? '#2dd4bf' : '#f59e0b'} />
                    <text x="478" y={224 + index * 42} fill="#d6d6ef" fontSize="16" fontWeight="750">
                        {label}
                    </text>
                </g>
            ))}
            <Arrow d="M622 242 C662 242 678 242 710 242" />
            <Card x={686} y={158} width={128} height={170} title="Widget" lines={['ready', 'bounded', 'tested']} tone="teal" />
            <Pill x={682} y={362} label="Launch only after checks" tone="teal" width={176} />
        </Shell>
    );
}

function SourceToAnswer() {
    return (
        <Shell variant="source-to-answer">
            <text x="70" y="126" fill="#bae6fd" fontSize="15" fontWeight="800" letterSpacing="3">
                SOURCES
            </text>
            <Card x={58} y={150} width={214} height={76} title="Docs" lines={['setup and policy']} tone="blue" />
            <Card x={58} y={242} width={214} height={76} title="FAQ" lines={['common questions']} tone="blue" />
            <Card x={58} y={334} width={214} height={76} title="Signals" lines={['tickets and feedback']} tone="blue" />
            <Arrow d="M288 260 C332 260 348 260 388 260" tone="blue" />
            <rect x="388" y="150" width="174" height="220" rx="32" fill="rgba(45,212,191,0.13)" stroke="rgba(94,234,212,0.50)" strokeWidth="1.8" />
            <circle cx="475" cy="220" r="38" fill="rgba(45,212,191,0.18)" stroke="rgba(94,234,212,0.42)" strokeWidth="1.5" />
            <text x="437" y="226" fill="#ecfeff" fontSize="24" fontWeight="900">AL</text>
            <text x="422" y="284" fill="#ecfeff" fontSize="19" fontWeight="850">Governed</text>
            <text x="426" y="314" fill="#a7f3d0" fontSize="16" fontWeight="700">answer layer</text>
            <Arrow d="M576 260 C620 260 638 260 678 260" />
            <Card x={664} y={140} width={148} height={76} title="Widget" lines={['page answer']} tone="teal" />
            <Card x={664} y={232} width={148} height={76} title="Hosted help" lines={['public safe']} tone="teal" />
            <Card x={664} y={324} width={148} height={76} title="Review" lines={['gaps improve']} tone="amber" />
        </Shell>
    );
}

function GovernanceLoop() {
    return (
        <Shell variant="governance-loop">
            <Card x={72} y={186} width={180} height={96} title="Fallback" lines={['answer missing']} tone="amber" />
            <Card x={342} y={102} width={176} height={96} title="Review queue" lines={['draft fix']} tone="blue" />
            <Card x={608} y={186} width={180} height={96} title="Owner approves" lines={['official answer']} tone="teal" />
            <Card x={342} y={332} width={176} height={96} title="Future users" lines={['trusted help']} tone="teal" />
            <Arrow d="M256 210 C300 154 320 146 340 146" tone="amber" />
            <Arrow d="M520 146 C568 148 594 168 608 204" tone="blue" />
            <Arrow d="M698 292 C664 354 590 382 522 382" />
            <Arrow d="M338 382 C274 374 210 334 172 292" />
            <rect x="330" y="222" width="200" height="74" rx="24" fill="rgba(45,212,191,0.12)" stroke="rgba(94,234,212,0.48)" strokeWidth="1.7" />
            <text x="374" y="254" fill="#ecfeff" fontSize="20" fontWeight="850">Canonical first</text>
            <text x="386" y="280" fill="#a7f3d0" fontSize="15" fontWeight="700">no autopublish</text>
        </Shell>
    );
}

function PositioningBoundary() {
    return (
        <Shell variant="positioning-boundary">
            <Card x={54} y={142} width={190} height={88} title="Chatbot" lines={['conversation UI']} tone="muted" />
            <Card x={54} y={264} width={190} height={88} title="Helpdesk" lines={['agent workflow']} tone="muted" />
            <Card x={616} y={142} width={190} height={88} title="Docs CMS" lines={['published pages']} tone="muted" />
            <Card x={616} y={264} width={190} height={88} title="Tickets" lines={['fallback signal']} tone="muted" />
            <Arrow d="M254 186 C320 186 336 236 384 246" tone="muted" />
            <Arrow d="M254 308 C320 308 336 284 384 274" tone="muted" />
            <Arrow d="M606 186 C540 186 524 236 476 246" tone="muted" />
            <Arrow d="M606 308 C540 308 524 284 476 274" tone="muted" />
            <rect x="342" y="204" width="176" height="128" rx="30" fill="rgba(45,212,191,0.14)" stroke="rgba(94,234,212,0.52)" strokeWidth="1.8" />
            <text x="382" y="250" fill="#ecfeff" fontSize="22" fontWeight="900">Answer</text>
            <text x="382" y="278" fill="#ecfeff" fontSize="22" fontWeight="900">authority</text>
            <text x="380" y="306" fill="#a7f3d0" fontSize="15" fontWeight="700">governed layer</text>
            <Pill x={298} y={388} label="Works with support tools" tone="teal" width={264} />
        </Shell>
    );
}

function IllustrationSvg({ variant }: { variant: AnswerlatticeConceptIllustrationVariant }) {
    if (variant === 'safe-context-boundary') return <SafeContextBoundary />;
    if (variant === 'install-verification') return <InstallVerification />;
    if (variant === 'source-to-answer') return <SourceToAnswer />;
    if (variant === 'governance-loop') return <GovernanceLoop />;
    return <PositioningBoundary />;
}

function MobileConceptSteps({ variant }: { variant: AnswerlatticeConceptIllustrationVariant }) {
    return (
        <div className="grid gap-2 sm:hidden">
            {MOBILE_STEPS[variant].map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                    <div className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/10 text-xs font-bold text-teal-100">
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                            <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                            <p className="mt-1 text-sm leading-relaxed text-[#a0a0c0]">{step.detail}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function AnswerlatticeConceptIllustration({
    variant,
    className = '',
    showHeader = true,
}: AnswerlatticeConceptIllustrationProps) {
    const copy = CONCEPT_COPY[variant];

    return (
        <figure
            className={`rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-4 shadow-2xl shadow-black/30 sm:p-5 ${className}`.trim()}
            data-answerlattice-concept-illustration={variant}
            data-answerlattice-reveal
        >
            {showHeader ? (
                <figcaption className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-300">{copy.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-bold leading-tight text-white">{copy.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{copy.description}</p>
                </figcaption>
            ) : null}
            <MobileConceptSteps variant={variant} />
            <div className="hidden sm:block">
                <IllustrationSvg variant={variant} />
            </div>
        </figure>
    );
}
import type { ReactNode } from 'react';
