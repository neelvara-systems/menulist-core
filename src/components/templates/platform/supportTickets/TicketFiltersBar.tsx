import { PLATFORM_SUPPORT_TICKET_TAG_OPTIONS, SUPPORT_TICKET_CATEGORY, SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_STATUS } from '@type/supportTicket';
import { Badge, Button, Checkbox, DatePicker, Drawer, Flex, Input, Select, Space, Tag, theme, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { LuClock, LuFilter, LuHelpCircle, LuPlus, LuSearch } from 'react-icons/lu';

const { Option } = Select;
const { Text } = Typography;

interface FiltersState {
    status: string;
    priority: string;
    category: string;
    client: string;
    dateRange: [any, any] | null;
    tags: string[];
    slaStatus: string;
    longRunning: boolean;
}

interface TicketFiltersBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    filters: FiltersState;
    onFilterChange: (key: string, value: any) => void;
    onFiltersUpdate: (filters: FiltersState) => void;
    onNewTicket?: () => void;
    isTrashView?: boolean;
    availableClients?: string[];
}

export default function TicketFiltersBar({
    searchTerm,
    onSearchChange,
    filters,
    onFilterChange,
    onFiltersUpdate,
    onNewTicket,
    isTrashView = false,
    availableClients = []
}: TicketFiltersBarProps) {
    const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
    const { token } = theme.useToken();
    const activeFiltersCount = Object.values(filters).filter(v =>
        v && (Array.isArray(v) ? v.length : true)
    ).length;

    const clearAllFilters = () => {
        onFiltersUpdate({
            status: '',
            priority: '',
            category: '',
            client: '',
            dateRange: null,
            tags: [],
            slaStatus: '',
            longRunning: false
        });
    };

    return (
        <>
            {/* <Card variant='borderless' > */}
            <Flex justify="space-between" align="center" gap={16} wrap="wrap">
                <Input
                    prefix={<LuSearch />}
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                    style={{ maxWidth: 300 }}
                />
                <Space wrap>
                    <Badge count={activeFiltersCount} offset={[-5, 5]}>
                        <Button icon={<LuFilter />} onClick={() => setFilterDrawerVisible(true)}>
                            Filters
                        </Button>
                    </Badge>
                    {filters.dateRange && (
                        <Tag
                            closable
                            onClose={() => onFiltersUpdate({ ...filters, dateRange: null })}
                            style={{ padding: '4px 8px' }}
                        >
                        </Tag>
                    )}
                    {filters.longRunning && (
                        <Tag
                            closable
                            onClose={() => onFilterChange('longRunning', false)}
                            color="orange"
                            icon={<LuClock size={12} />}
                        >
                            Long Running
                        </Tag>
                    )}
                    {!isTrashView && onNewTicket && (
                        <Button type="primary" icon={<LuPlus />} onClick={onNewTicket}>
                            Create Ticket
                        </Button>
                    )}
                </Space>
            </Flex>
            {/* </Card> */}

            {/* Filter Drawer */}
            <Drawer
                title="Filter Tickets"
                placement="right"
                onClose={() => setFilterDrawerVisible(false)}
                open={filterDrawerVisible}
                width={360}
                extra={
                    <Button type="text" onClick={clearAllFilters}>
                        Clear All
                    </Button>
                }
            >
                <Flex vertical gap={20}>
                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Status</Text>
                        <Select
                            placeholder="Select status"
                            style={{ width: '100%' }}
                            onChange={value => onFilterChange('status', value)}
                            value={filters.status || undefined}
                            allowClear
                        >
                            {Object.values(SUPPORT_TICKET_STATUS).map(s => <Option key={s} value={s}>{s}</Option>)}
                        </Select>
                    </div>

                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Priority</Text>
                        <Select
                            placeholder="Select priority"
                            style={{ width: '100%' }}
                            onChange={value => onFilterChange('priority', value)}
                            value={filters.priority || undefined}
                            allowClear
                        >
                            {Object.values(SUPPORT_TICKET_PRIORITY).map(p => <Option key={p} value={p}>{p}</Option>)}
                        </Select>
                    </div>

                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Category</Text>
                        <Select
                            placeholder="Select category"
                            style={{ width: '100%' }}
                            onChange={value => onFilterChange('category', value)}
                            value={filters.category || undefined}
                            allowClear
                        >
                            {Object.values(SUPPORT_TICKET_CATEGORY).map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </div>

                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Client (Store)</Text>
                        <Select
                            placeholder="Select client..."
                            style={{ width: '100%' }}
                            onChange={(value) => onFilterChange('client', value)}
                            value={filters.client || undefined}
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={availableClients.map(client => ({
                                label: client,
                                value: client
                            }))}
                        />
                    </div>

                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Tags</Text>
                        <Select
                            mode="multiple"
                            placeholder="Select tags"
                            style={{ width: '100%' }}
                            onChange={value => onFiltersUpdate({ ...filters, tags: value })}
                            value={filters.tags}
                            allowClear
                        >
                            {PLATFORM_SUPPORT_TICKET_TAG_OPTIONS.map(tag => <Option key={tag} value={tag}>{tag}</Option>)}
                        </Select>
                    </div>

                    <div>
                        <Tooltip
                            title={
                                <div>
                                    <div><strong>SLA = Service Level Agreement</strong></div>
                                    <div style={{ marginTop: 4 }}>Time-based commitments to resolve tickets:</div>
                                    <ul style={{ marginTop: 4, paddingLeft: 16, marginBottom: 0 }}>
                                        <li>🔴 High: 24 hours</li>
                                        <li>🟡 Normal: 72 hours (3 days)</li>
                                        <li>🟢 Low: 168 hours (7 days)</li>
                                    </ul>
                                    <div style={{ marginTop: 8 }}>
                                        <strong>Status:</strong>
                                        <div>• Breached: Over deadline</div>
                                        <div>• At Risk: 80-100% time used</div>
                                        <div>• On Time: Under 80% time</div>
                                    </div>
                                </div>
                            }
                        >
                            <Space size={4} style={{ marginBottom: 8, display: 'flex', cursor: 'help' }}>
                                <Text strong>SLA Status</Text>
                                <LuHelpCircle style={{ fontSize: 12, opacity: 0.5 }} />
                            </Space>
                        </Tooltip>
                        <Select
                            placeholder="Select SLA status"
                            style={{ width: '100%' }}
                            onChange={value => onFiltersUpdate({ ...filters, slaStatus: value || '' })}
                            value={filters.slaStatus || undefined}
                            allowClear
                        >
                            <Option value="breached">🔴 Breached - Over deadline</Option>
                            <Option value="at_risk">⚠️ At Risk - 80-100% time used</Option>
                            <Option value="on_time">✅ On Time - Under 80%</Option>
                        </Select>
                    </div>

                    <div>
                        <Text strong style={{ marginBottom: 8, display: 'block' }}>Date Range</Text>
                        <DatePicker.RangePicker
                            onChange={(dates) => onFiltersUpdate({ ...filters, dateRange: dates as [any, any] | null })}
                            value={filters.dateRange}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <Tooltip title="Show only tickets that have been open for more than 3 days and are still unresolved">
                            <Checkbox
                                checked={filters.longRunning}
                                onChange={e => onFiltersUpdate({ ...filters, longRunning: e.target.checked })}
                            >
                                <Space>
                                    <LuClock size={16} />
                                    <span>Long Running (&gt;3 days)</span>
                                </Space>
                            </Checkbox>
                        </Tooltip>
                    </div>
                </Flex>
            </Drawer>
        </>
    );
}
