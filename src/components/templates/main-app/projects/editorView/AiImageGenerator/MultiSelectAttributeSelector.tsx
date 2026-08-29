import useDeviceType from '@hook/useDeviceType';
import { Button, Flex, Modal, Tag, Typography, theme } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCheckCircle, LuX } from 'react-icons/lu';
import { NavBar, Popup } from '../../../../../mobile/antd';

interface MultiSelectAttributeSelectorProps {
  label: string;
  tooltip?: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  multi?: boolean;
  displayMode?: 'select' | 'chips';
}

const FIELD_HELPERS: Record<string, string> = {
  Setting: 'Choose where or how the image should feel.',
  Lighting: 'Choose the lighting style for the image.',
  Colors: 'Choose the main colors you want to emphasize.',
  Mood: 'Choose the feeling the image should give.',
  'Camera Angle': 'Choose how the photo should be framed.',
};

const MultiSelectAttributeSelector: React.FC<MultiSelectAttributeSelectorProps> = ({
  label,
  options,
  selected,
  onChange,
  multi = false,
}) => {
  const { token } = theme.useToken();
  const { isMobile } = useDeviceType();
  const [open, setOpen] = useState(false);
  const [draftSelected, setDraftSelected] = useState<string[]>(selected || []);

  useEffect(() => {
    if (open) {
      setDraftSelected(selected || []);
    }
  }, [open, selected]);

  const helperText = FIELD_HELPERS[label] || `Choose ${label.toLowerCase()}.`;
  const mobileFooterButtonStyle = isMobile
    ? {
      flex: 1,
      minHeight: 48,
      minWidth: 0,
    }
    : undefined;

  const selectionLabel = useMemo(() => {
    if (!selected.length) {
      return `Choose ${label.toLowerCase()}.`;
    }
    return `${selected.length} selected`;
  }, [label, selected.length]);

  const toggleOption = (option: string) => {
    if (multi) {
      setDraftSelected((current) =>
        current.includes(option)
          ? current.filter((item) => item !== option)
          : [...current, option]
      );
      return;
    }

    setDraftSelected((current) => (current[0] === option ? [] : [option]));
  };

  const renderOptionRow = (option: string) => {
    const isSelected = draftSelected.includes(option);

    return (
      <Flex
        align="center"
        aria-checked={isSelected}
        gap={10}
        key={option}
        onClick={() => toggleOption(option)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleOption(option);
          }
        }}
        role="checkbox"
        tabIndex={0}
        style={{
          background: token.colorFillAlter,
          border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
          borderRadius: 8,
          cursor: 'pointer',
          padding: '10px 12px',
        }}
      >
        <Flex
          align="center"
          justify="center"
          style={{
            background: 'transparent',
            border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
            borderRadius: '999px',
            color: isSelected ? token.colorPrimary : token.colorTextSecondary,
            flex: '0 0 auto',
            height: 24,
            width: 24,
          }}
        >
          <LuCheck size={12} />
        </Flex>
        <Typography.Text style={{ color: isSelected ? token.colorPrimary : undefined, lineHeight: 1.3 }}>
          {option}
        </Typography.Text>
      </Flex>
    );
  };

  const renderContent = () => (
    <Flex gap={16} vertical>
      <Flex
        gap={10}
        style={{
          background: token.colorFillAlter,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 8,
          padding: 12,
        }}
        vertical
      >
        <Flex align="center" justify="space-between" gap={8}>
          <Flex gap={4} vertical>
            <Typography.Text strong>{label}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {helperText}
            </Typography.Text>
          </Flex>
          {draftSelected.length > 0 ? (
            <Tag color="blue" style={{ flex: '0 0 auto', margin: 0 }}>
              {draftSelected.length} selected
            </Tag>
          ) : null}
        </Flex>
        {multi ? (
          <Button
            disabled={draftSelected.length === 0}
            icon={<LuX />}
            onClick={() => setDraftSelected([])}
            size="small"
            style={{ alignSelf: 'flex-start', color: token.colorError, paddingInline: 0 }}
            type="text"
          >
            Clear selection
          </Button>
        ) : null}
      </Flex>

      <Flex gap={12} vertical>
        {options.map(renderOptionRow)}
      </Flex>
    </Flex>
  );

  const footer = (
    <Flex gap={8} justify="flex-end">
      <Button
        onClick={() => setOpen(false)}
        style={mobileFooterButtonStyle || { minWidth: 96 }}
      >
        Cancel
      </Button>
      <Button
        icon={<LuCheckCircle />}
        onClick={() => {
          onChange(draftSelected);
          setOpen(false);
        }}
        style={mobileFooterButtonStyle || { minWidth: 96 }}
        type="primary"
      >
        Done
      </Button>
    </Flex>
  );

  return (
    <>
      <Button
        block
        onClick={() => setOpen(true)}
        style={{
          background: token.colorBgContainer,
          borderColor: token.colorBorderSecondary,
          height: 'auto',
          padding: 0,
          textAlign: 'left',
        }}
        type="default"
      >
        <Flex gap={10} style={{ padding: 12, width: '100%' }} vertical>
          <Flex align="center" justify="space-between" gap={8}>
            <Flex gap={2} style={{ minWidth: 0 }} vertical>
              <Typography.Text strong>{label}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                {selectionLabel}
              </Typography.Text>
            </Flex>
            <span
              aria-hidden="true"
              style={{
                border: `1px solid ${token.colorBorder}`,
                borderRadius: 6,
                flex: '0 0 auto',
                padding: '4px 12px',
              }}
            >
              Change
            </span>
          </Flex>
          {selected.length > 0 ? (
            <Flex gap={6} wrap="wrap">
              {selected.slice(0, 3).map((item) => (
                <Tag key={item} style={{ borderRadius: 8, margin: 0 }}>
                  {item}
                </Tag>
              ))}
              {selected.length > 3 ? (
                <Tag style={{ borderRadius: 8, margin: 0 }}>
                  +{selected.length - 3} more
                </Tag>
              ) : null}
            </Flex>
          ) : null}
        </Flex>
      </Button>

      {isMobile ? (
        <Popup
          bodyStyle={{ minHeight: '72vh', maxHeight: '92vh', overflowX: 'hidden', padding: 0 }}
          destroyOnClose
          onMaskClick={() => setOpen(false)}
          visible={open}
        >
          <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={() => setOpen(false)}>{label}</NavBar>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 16px' }}>
              {renderContent()}
            </div>
            <div
              style={{
                backgroundColor: token.colorBgContainer,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
              }}
            >
              {footer}
            </div>
          </Flex>
        </Popup>
      ) : (
        <Modal
          footer={footer}
          onCancel={() => setOpen(false)}
          open={open}
          title={label}
          width={760}
          styles={{
            body: {
              maxHeight: 'calc(100vh - 220px)',
              overflowY: 'auto',
              paddingTop: 12,
            },
          }}
        >
          {renderContent()}
        </Modal>
      )}
    </>
  );
};

export default MultiSelectAttributeSelector;
