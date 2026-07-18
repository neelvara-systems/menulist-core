import type { SignalDeskTargetImportRow } from "@lib/signaldesk/targetContracts";

export const SIGNALDESK_IMPORT_CSV_COLUMNS = [
    "displayName",
    "category",
    "city",
    "country",
    "website",
    "email",
    "phone",
    "currentListUrl",
    "instagram",
    "permissionEvidenceRef",
] as const;

const MAX_INPUT_CHARACTERS = 100_000;
const MAX_ROWS = 50;
const COLUMN_MAXIMUMS = [180, 120, 120, 120, 500, 180, 80, 500, 180, 500] as const;

const csvError = (message: string): never => {
    throw new Error(`SIGNALDESK_IMPORT_CSV_INVALID:${message}`);
};

const isCanonicalHeader = (record: string[]) => record.every((value, index) => (
    value.trim() === SIGNALDESK_IMPORT_CSV_COLUMNS[index]
));

export const parseSignalDeskTargetImportCsv = (input: string): SignalDeskTargetImportRow[] => {
    const source = input.startsWith("\uFEFF") ? input.slice(1) : input;
    if (!source.trim()) csvError("Add at least one target row.");
    if (source.length > MAX_INPUT_CHARACTERS) csvError("The import is too large.");

    const records: string[][] = [];
    let record: string[] = [];
    let field = "";
    let inQuotes = false;
    let quoteClosed = false;

    const finishField = () => {
        record.push(field);
        field = "";
        quoteClosed = false;
    };
    const finishRecord = () => {
        const syntacticallyNonEmpty = record.length > 0 || Boolean(field.trim()) || quoteClosed;
        finishField();
        if (syntacticallyNonEmpty) records.push(record);
        record = [];
        if (records.length > MAX_ROWS + 1) csvError(`Use no more than ${MAX_ROWS} target rows.`);
    };

    for (let index = 0; index < source.length; index += 1) {
        const character = source[index];
        if (inQuotes) {
            if (character === '"') {
                if (source[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = false;
                    quoteClosed = true;
                }
            } else if (character === "\r") {
                if (source[index + 1] === "\n") index += 1;
                field += "\n";
            } else {
                field += character;
            }
            if (field.length > 500) csvError("A field is longer than the allowed limit.");
            continue;
        }

        if (quoteClosed) {
            if (character === ",") {
                finishField();
                continue;
            }
            if (character === "\n" || character === "\r") {
                if (character === "\r" && source[index + 1] === "\n") index += 1;
                finishRecord();
                continue;
            }
            csvError("A quoted field must end before the next comma or row.");
        }

        if (character === ",") {
            finishField();
        } else if (character === "\n" || character === "\r") {
            if (character === "\r" && source[index + 1] === "\n") index += 1;
            finishRecord();
        } else if (character === '"') {
            if (field.length) csvError("Quotes must begin at the start of a field.");
            inQuotes = true;
        } else {
            field += character;
            if (field.length > 500) csvError("A field is longer than the allowed limit.");
        }
    }
    if (inQuotes) csvError("A quoted field is not closed.");
    if (field.length || record.length || quoteClosed) finishRecord();

    const firstRecordIsHeader = records[0]?.length === SIGNALDESK_IMPORT_CSV_COLUMNS.length
        && isCanonicalHeader(records[0]);
    const dataRecords = firstRecordIsHeader ? records.slice(1) : records;
    if (!dataRecords.length) csvError("Add at least one target row after the optional header.");
    if (dataRecords.length > MAX_ROWS) csvError(`Use no more than ${MAX_ROWS} target rows.`);

    return dataRecords.map((values, rowIndex) => {
        if (values.length !== SIGNALDESK_IMPORT_CSV_COLUMNS.length) {
            csvError(`Row ${rowIndex + 1 + (firstRecordIsHeader ? 1 : 0)} must contain exactly 10 columns.`);
        }
        const normalized = values.map((value) => value.trim());
        normalized.forEach((value, columnIndex) => {
            if (value.length > COLUMN_MAXIMUMS[columnIndex]) {
                csvError(`Row ${rowIndex + 1 + (firstRecordIsHeader ? 1 : 0)} has an overlong ${SIGNALDESK_IMPORT_CSV_COLUMNS[columnIndex]} value.`);
            }
        });
        if (!normalized[0]) csvError(`Row ${rowIndex + 1 + (firstRecordIsHeader ? 1 : 0)} needs a display name.`);
        return {
            category: normalized[1],
            city: normalized[2],
            country: normalized[3],
            currentListUrl: normalized[7],
            displayName: normalized[0],
            email: normalized[5],
            instagram: normalized[8],
            permissionEvidenceRef: normalized[9],
            phone: normalized[6],
            website: normalized[4],
        };
    });
};
