import { Alert, Card, Flex, Tag, Typography, theme } from 'antd';
import { LuFileText, LuLanguages, LuSparkles } from 'react-icons/lu';
import type { RepairMenuSummary } from '../../../types/commandCenter.types';
import type { LanguageIssueSummary } from '../../languageRepair.shared';

const { Text } = Typography;

const DISTINCT_SCRIPT_LANGUAGE_CODES = new Set(['ar', 'bn', 'hi', 'mr', 'ta', 'te', 'zh']);

interface RepairMenuActionProps {
    languageIssues: LanguageIssueSummary[];
    repairStep: string | null;
    summary: RepairMenuSummary;
    isRepairing: boolean;
}

export default function RepairMenuAction({
    languageIssues,
    repairStep,
    summary,
    isRepairing,
}: RepairMenuActionProps) {
    const { token } = theme.useToken();
    const languagesNeedingRepair = languageIssues.filter((issue) => issue.total > 0);
    const hasLatinScriptRepairLanguages = languagesNeedingRepair.some(
        (issue) => !DISTINCT_SCRIPT_LANGUAGE_CODES.has(issue.code)
    );

    return (
        <Flex vertical gap={12}>
            <Card size="small" style={{ borderColor: token.colorPrimaryBorder }}>
                <Flex gap={10} vertical>
                    <Flex align="center" gap={8}>
                        <LuSparkles size={18} style={{ color: token.colorPrimary }} />
                        <Flex gap={2} vertical>
                            <Text strong>Repair Menu</Text>
                            <Text type="secondary">
                                Rebuild missing language text, missing item descriptions, and project detail translations in one pass.
                            </Text>
                        </Flex>
                    </Flex>
                    <Text type="secondary">
                        Existing prices and photos stay unchanged. Price and photo gaps are shown here for manual review only.
                    </Text>
                </Flex>
            </Card>

            <Card size="small">
                <Flex gap={10} vertical>
                    <Flex align="center" gap={8}>
                        <LuSparkles size={16} style={{ color: token.colorSuccess }} />
                        <Text strong>{summary.fixableNowCount === 0 ? 'No repair needed' : 'Fix now'}</Text>
                    </Flex>
                    {summary.fixableNowCount > 0 ? (
                        <Flex gap={8} wrap="wrap">
                            {summary.descriptionsToGenerate > 0 ? (
                                <Tag color="success">{summary.descriptionsToGenerate} descriptions</Tag>
                            ) : null}
                            {summary.languageIssueCount > 0 ? (
                                <Tag color="processing">{summary.languageIssueCount} language issues</Tag>
                            ) : null}
                            {summary.projectContentIssueCount > 0 ? (
                                <Tag color="processing">
                                    {summary.projectContentIssueCount} project detail{summary.projectContentIssueCount !== 1 ? 's' : ''}
                                </Tag>
                            ) : null}
                        </Flex>
                    ) : (
                        <Text type="secondary">Menu state is stable.</Text>
                    )}

                    {summary.projectContentLanguagesToRepair > 0 ? (
                        <Flex align="center" gap={8} justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuFileText size={14} style={{ color: token.colorPrimary }} />
                                <Text>Project details</Text>
                            </Flex>
                            <Text type="secondary">
                                {summary.projectContentLanguagesToRepair} language{summary.projectContentLanguagesToRepair !== 1 ? 's' : ''}
                            </Text>
                        </Flex>
                    ) : null}

                    {languagesNeedingRepair.length > 0 ? (
                        <Flex gap={8} vertical>
                            {languagesNeedingRepair.map((issue) => (
                                <Flex align="center" gap={8} key={issue.code} justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <LuLanguages size={14} style={{ color: token.colorPrimary }} />
                                        <Text>{issue.code.toUpperCase()}</Text>
                                    </Flex>
                                    <Text type="secondary">
                                        {issue.missing > 0 ? `${issue.missing} missing` : null}
                                        {issue.missing > 0 && issue.mismatched > 0 ? ' · ' : null}
                                        {issue.mismatched > 0 ? `${issue.mismatched} wrong language` : null}
                                    </Text>
                                </Flex>
                            ))}
                        </Flex>
                    ) : null}
                </Flex>
            </Card>

            {summary.manualReviewCount > 0 ? (
                <Card size="small">
                    <Flex gap={10} vertical>
                        <Flex align="center" gap={8}>
                            <LuFileText size={16} style={{ color: token.colorWarning }} />
                            <Text strong>Needs manual review</Text>
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            {summary.missingPrices > 0 ? (
                                <Tag>{summary.missingPrices} missing prices</Tag>
                            ) : null}
                            {summary.missingImages > 0 ? (
                                <Tag>{summary.missingImages} missing photos</Tag>
                            ) : null}
                        </Flex>
                        <Text type="secondary">
                            Repair Menu does not guess prices or add photos automatically.
                        </Text>
                    </Flex>
                </Card>
            ) : null}

            {hasLatinScriptRepairLanguages ? (
                <Alert
                    showIcon
                    type="info"
                    message="Some languages use the same script as English, so this check only rebuilds clearly missing or duplicated text."
                />
            ) : null}

            {isRepairing ? (
                <Card size="small" style={{ borderColor: token.colorBorderSecondary }}>
                    <Flex gap={8} vertical>
                        <Text strong>Repairing menu</Text>
                        <Text type="secondary">{repairStep || 'Preparing repair'}</Text>
                    </Flex>
                </Card>
            ) : null}
        </Flex>
    );
}
