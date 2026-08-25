import { ANSWERLATTICE_INTAKE_REVIEW_TARGET } from '@type/answerlattice';

const cleanInline = (value: unknown, maxLength: number) => String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const cleanBlock = (value: unknown, maxLength: number) => String(value || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);

export type AnswerlatticeStructuredFaqRow = {
    question: string;
    answer: string;
    target: typeof ANSWERLATTICE_INTAKE_REVIEW_TARGET.FAQ
        | typeof ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL;
    riskLevel: 'low' | 'medium' | 'high';
    tags: string[];
    sourceNote: string;
};

export type AnswerlatticeStructuredFaqCsvResult = {
    recognized: boolean;
    rows: AnswerlatticeStructuredFaqRow[];
};

function parseCsvRecords(text: string): string[][] {
    const records: string[][] = [];
    let record: string[] = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (quoted) {
            if (char === '"' && text[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                field += char;
            }
            continue;
        }
        if (char === '"' && field.length === 0) {
            quoted = true;
        } else if (char === ',') {
            record.push(field);
            field = '';
        } else if (char === '\n') {
            record.push(field);
            if (record.some(value => value.trim())) records.push(record);
            record = [];
            field = '';
        } else if (char !== '\r') {
            field += char;
        }
    }
    record.push(field);
    if (record.some(value => value.trim())) records.push(record);
    return records;
}

export function parseAnswerlatticeStructuredFaqCsv(
    text: string,
    maxRows = 120,
): AnswerlatticeStructuredFaqCsvResult {
    const records = parseCsvRecords(String(text || '').replace(/^\uFEFF/, ''));
    if (!records.length) return { recognized: false, rows: [] };
    const headers = records[0].map(value => cleanInline(value, 80).toLowerCase());
    const questionIndex = headers.indexOf('question');
    const answerIndex = headers.indexOf('answer');
    if (questionIndex < 0 || answerIndex < 0) return { recognized: false, rows: [] };

    const targetIndex = headers.indexOf('target');
    const riskIndex = headers.indexOf('risk_level');
    const tagsIndex = headers.indexOf('tags');
    const sourceNoteIndex = headers.indexOf('source_note');
    const rows: AnswerlatticeStructuredFaqRow[] = [];

    for (const record of records.slice(1)) {
        const question = cleanInline(record[questionIndex], 240);
        const answer = cleanBlock(record[answerIndex], 2_000);
        if (question.length < 8 || answer.length < 20) continue;
        const rawTarget = cleanInline(targetIndex >= 0 ? record[targetIndex] : '', 40).toLowerCase();
        if (rawTarget && rawTarget !== ANSWERLATTICE_INTAKE_REVIEW_TARGET.FAQ
            && rawTarget !== ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL) continue;
        const rawRisk = cleanInline(riskIndex >= 0 ? record[riskIndex] : '', 20).toLowerCase();
        const riskLevel = rawRisk === 'high' || rawRisk === 'medium' ? rawRisk : 'low';
        const tags = cleanInline(tagsIndex >= 0 ? record[tagsIndex] : '', 500)
            .split(/[|;]/)
            .map(value => cleanInline(value, 60).toLowerCase())
            .filter(Boolean)
            .slice(0, 20);
        rows.push({
            question: question.endsWith('?') ? question : `${question}?`,
            answer,
            target: rawTarget === ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL
                ? ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL
                : ANSWERLATTICE_INTAKE_REVIEW_TARGET.FAQ,
            riskLevel,
            tags,
            sourceNote: cleanInline(sourceNoteIndex >= 0 ? record[sourceNoteIndex] : '', 500),
        });
        if (rows.length >= maxRows) break;
    }
    return { recognized: true, rows };
}

export function extractAnswerlatticeFaqPairs(text: string) {
    const pairs: Array<{ question: string; answer: string }> = [];
    const qaRegex = /(?:^|\n)\s*(?:q(?:uestion)?[:.)-]\s*)([^\n?]{8,220}\??)\s*(?:\n|\r\n)+\s*(?:a(?:nswer)?[:.)-]\s*)([\s\S]*?)(?=\n\s*(?:q(?:uestion)?[:.)-]\s*)|$)/gi;
    let match: RegExpExecArray | null;
    while ((match = qaRegex.exec(text))) {
        const question = cleanInline(match[1], 240);
        const answer = cleanBlock(match[2], 2_000);
        if (question && answer) pairs.push({ question: question.endsWith('?') ? question : `${question}?`, answer });
    }
    if (pairs.length) return pairs;

    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    for (let index = 0; index < lines.length; index += 1) {
        const question = cleanInline(lines[index].replace(/^\s*(?:[-*+]\s+|#{1,6}\s+)/, ''), 240);
        if (!question.endsWith('?') || question.length < 12) continue;
        const answerLines: string[] = [];
        for (let next = index + 1; next < lines.length; next += 1) {
            const candidate = cleanInline(lines[next].replace(/^\s*(?:[-*+]\s+|#{1,6}\s+)/, ''), 1_200);
            if (candidate.endsWith('?') && candidate.length >= 12) break;
            if (/^#{1,6}\s+/.test(lines[next]) && answerLines.length) break;
            if (candidate) answerLines.push(candidate);
            if (answerLines.join(' ').length >= 1_200) break;
        }
        const answer = cleanBlock(answerLines.join('\n'), 1_200);
        if (answer.length >= 40 && !answer.split('\n').every(line => line.trim().endsWith('?'))) {
            pairs.push({ question, answer });
        }
        if (pairs.length >= 8) break;
    }
    return pairs;
}
