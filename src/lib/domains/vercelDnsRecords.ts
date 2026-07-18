export type VercelDomainDnsRecord = {
    name: string;
    type: string;
    value: string;
};

type RankedValue = { rank?: unknown; value?: unknown };

function getPreferredRankedValues(values: unknown): RankedValue[] {
    if (!Array.isArray(values)) return [];
    const records = values.filter((value): value is RankedValue => Boolean(value) && typeof value === 'object');
    const ranked = records
        .map((record) => Number(record.rank))
        .filter((rank) => Number.isFinite(rank));
    if (!ranked.length) return records;
    const preferredRank = Math.min(...ranked);
    return records.filter((record) => Number(record.rank) === preferredRank);
}

export function normalizeVercelDomainDnsRecords(
    config: any,
    projectDomain: any,
    domain: string,
): VercelDomainDnsRecord[] {
    const normalizedDomain = domain.toLowerCase().trim();
    if (!normalizedDomain) return [];

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
        ...(Array.isArray(projectDomain?.verification) ? projectDomain.verification : []),
        ...(Array.isArray(config?.verificationRecords) ? config.verificationRecords : []),
    ];
    challenges.forEach((record: any) => {
        addRecord(record?.type || 'TXT', record?.domain || record?.name, record?.value);
    });

    const providerName = typeof projectDomain?.name === 'string'
        ? projectDomain.name.toLowerCase().trim()
        : normalizedDomain;
    const apexName = typeof projectDomain?.apexName === 'string'
        ? projectDomain.apexName.toLowerCase().trim()
        : '';
    const isApexDomain = apexName ? providerName === apexName : null;
    const recommendedIpv4 = getPreferredRankedValues(config?.recommendedIPv4);
    const recommendedCname = getPreferredRankedValues(config?.recommendedCNAME);

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
