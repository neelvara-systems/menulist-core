import { Button, Divider, Flex, Input, Space, Typography } from 'antd';
import { LuPlus, LuSearch } from 'react-icons/lu';

const { Title } = Typography;

interface PaneHeaderProps {
  title: string;
  buttonText: string | null;
  onButtonClick: () => void | null;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  extra?: React.ReactNode;
}

const PaneHeader = ({ title, buttonText, onButtonClick, searchValue, onSearchChange, extra }: PaneHeaderProps) => {
  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Title level={5} style={{ margin: 0 }}>{title}</Title>
        <Flex gap={8} align="center">
          {extra}
          {buttonText && onButtonClick && <Button icon={<LuPlus />} onClick={onButtonClick}>{buttonText}</Button>}
        </Flex>
      </Space>
      {onSearchChange && (
        <Input
          prefix={<LuSearch />}
          placeholder="Search articles..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          style={{ marginTop: 8 }}
          size="small"
        />
      )}
      <Divider style={{ margin: "12px 0 16px" }} />
    </>
  );
};

export default PaneHeader;
