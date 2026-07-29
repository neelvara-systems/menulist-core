export type VercelDomainDnsRecord = {
    name: string;
    type: string;
    value: string;
};

type RankedValue = { rank?: unknown; value?: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeRank = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? value : null;
    }
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null;
    const rank = Number(value);
    return Number.isSafeInteger(rank) ? rank : null;
};

function getPreferredRankedValues(values: unknown): RankedValue[] {
    if (!Array.isArray(values)) return [];
    const records = values.filter(isRecord);
    const ranked = records
        .map((record) => normalizeRank(record.rank))
        .filter((rank): rank is number => rank !== null);
    if (!ranked.length) return records;
    const preferredRank = Math.min(...ranked);
    return records.filter((record) => normalizeRank(record.rank) === preferredRank);
}

export function normalizeVercelDomainDnsRecords(
    config: unknown,
    projectDomain: unknown,
    domain: string,
): VercelDomainDnsRecord[] {
    const normalizedDomain = domain.toLowerCase().trim();
    if (!normalizedDomain) return [];
    const configRecord = isRecord(config) ? config : {};
    const projectDomainRecord = isRecord(projectDomain) ? projectDomain : {};

    const records: VercelDomainDnsRecord[] = [];
    const addRecord = (type: unknown, name: unknown, value: unknown) => {
        const normalizedType = typeof type === 'string' ? type.trim().toUpperCase() : '';
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        const normalizedValue = typeof value === 'string' ? value.trim() : '';
        if (!normalizedType || !normalizedName || !normalizedValue) return;
        if (records.some((record) => (
            record.type === normalizedType
            && record.name === normalizedName
            && record.value === normalizedValue
        ))) return;
        records.push({ name: normalizedName, type: normalizedType, value: normalizedValue });
    };

    const challenges = [
        ...(Array.isArray(projectDomainRecord.verification) ? projectDomainRecord.verification : []),
        ...(Array.isArray(configRecord.verificationRecords) ? configRecord.verificationRecords : []),
    ];
    challenges.forEach((value) => {
        if (!isRecord(value)) return;
        addRecord(value.type || 'TXT', value.domain || value.name, value.value);
    });

    const providerName = typeof projectDomainRecord.name === 'string'
        ? projectDomainRecord.name.toLowerCase().trim()
        : normalizedDomain;
    const apexName = typeof projectDomainRecord.apexName === 'string'
        ? projectDomainRecord.apexName.toLowerCase().trim()
        : '';
    const isApexDomain = apexName ? providerName === apexName : null;
    const recommendedIpv4 = getPreferredRankedValues(configRecord.recommendedIPv4);
    const recommendedCname = getPreferredRankedValues(configRecord.recommendedCNAME);

    if (isApexDomain === true || (isApexDomain === null && recommendedIpv4.length > 0 && recommendedCname.length === 0)) {
        recommendedIpv4.forEach((record) => {
            const values = Array.isArray(record.value) ? record.value : [record.value];
            values.forEach((value) => addRecord('A', normalizedDomain, value));
        });
    } else if (isApexDomain === false || (isApexDomain === null && recommendedCname.length > 0 && recommendedIpv4.length === 0)) {
        recommendedCname.forEach((record) => addRecord('CNAME', normalizedDomain, record.value));
    }

    return records;
}
